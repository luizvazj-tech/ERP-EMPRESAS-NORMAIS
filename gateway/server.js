'use strict';
/* Gateway local FolhaPro → eSocial. Escuta somente em 127.0.0.1. O certificado e a senha ficam apenas na memória deste processo. */
const http = require('http'), fs = require('fs'), path = require('path'), readline = require('readline');
const E = require('./esocial');

const arg = (n) => { const i = process.argv.indexOf('--' + n); return i > 0 ? (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true) : undefined; };
const PORTA = Number(arg('porta') || process.env.PORTA || 8787);
const PRODUCAO = !!arg('producao');                       // produção só com este sinalizador explícito
const AMBIENTE = PRODUCAO ? 1 : 2;
const ORIGENS = (process.env.ESOCIAL_ORIGENS || 'https://folhapro.onrender.com,null,http://localhost:8765,http://127.0.0.1:8765').split(',').map(s => s.trim());
const LOGDIR = process.env.ESOCIAL_LOG || path.join(__dirname, 'log');

function pedirSenha(prompt) {
  return new Promise((ok) => {
    if (!process.stdin.isTTY) { const rl = readline.createInterface({ input: process.stdin }); rl.question('', s => { rl.close(); ok(s); }); return; }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(prompt)) process.stdout.write(s); }; // não ecoa a senha
    rl.question(prompt, s => { rl.close(); process.stdout.write('\n'); ok(s); });
  });
}
function grava(prot, nome, dado) { try { fs.mkdirSync(LOGDIR, { recursive: true }); fs.writeFileSync(path.join(LOGDIR, String(prot).replace(/[^\w.-]/g, '_') + '-' + nome), dado); } catch (e) { console.error('Não gravei o log:', e.message); } }
const agora = () => new Date().toISOString();

async function main() {
  const pfx = process.env.ESOCIAL_PFX; const pem = process.env.ESOCIAL_CERT_PEM, key = process.env.ESOCIAL_KEY_PEM;
  if (!pfx && !(pem && key)) { console.error('Defina ESOCIAL_PFX (caminho do certificado A1 .pfx/.p12) ou ESOCIAL_CERT_PEM e ESOCIAL_KEY_PEM. Veja o README.'); process.exit(2); }
  let senha = process.env.ESOCIAL_PFX_PASS;
  if (pfx && senha === undefined) senha = await pedirSenha('Senha do certificado (não será exibida): ');
  const cert = E.carregarCertificado({ pfxPath: pfx, pfxPass: senha, certPem: pem, keyPem: key });
  senha = undefined; delete process.env.ESOCIAL_PFX_PASS;
  const hoje = new Date();
  console.log('Certificado: ' + cert.subject); console.log('Emissor    : ' + cert.emissor);
  console.log('Validade   : ' + cert.validoDe.toLocaleDateString('pt-BR') + ' a ' + cert.validoAte.toLocaleDateString('pt-BR'));
  console.log('Inscrição  : ' + (cert.tpInsc === 1 ? 'CNPJ ' : cert.tpInsc === 2 ? 'CPF ' : '(não identificada no CN) ') + cert.nrInsc);
  if (hoje > cert.validoAte || hoje < cert.validoDe) { console.error('✖ Certificado fora da validade. O eSocial rejeitará o envio.'); process.exit(3); }
  if (!cert.tpInsc) { console.error('✖ Não consegui identificar o CNPJ/CPF no nome do certificado (esperado e-CNPJ ou e-CPF ICP-Brasil, CN "NOME:DOCUMENTO").'); process.exit(3); }
  const inseguro = process.env.ESOCIAL_TLS_INSEGURO === '1';
  if (inseguro && PRODUCAO) { console.error('✖ ESOCIAL_TLS_INSEGURO não é permitido em produção.'); process.exit(3); }
  if (inseguro) console.warn('⚠ Verificação do certificado do servidor DESATIVADA (somente homologação).');
  const urls = Object.assign({}, E.URL_BASE[AMBIENTE]);
  if (!PRODUCAO && process.env.ESOCIAL_URL_ENVIO) { urls.envio = process.env.ESOCIAL_URL_ENVIO; urls.consulta = process.env.ESOCIAL_URL_CONSULTA; console.warn('⚠ Endereços de teste em uso: ' + urls.envio); }
  const cfg = { urls, agente: E.agente(cert, { ca: process.env.ESOCIAL_CA, inseguro }), timeout: 60000 };
  console.log('Ambiente   : ' + (PRODUCAO ? '1 – PRODUÇÃO (valor jurídico)' : '2 – Produção restrita (testes)'));

  if (arg('diagnostico')) {
    try { console.log(JSON.stringify(await E.diagnosticoWsdl(cfg), null, 2)); console.log('\nVersões em uso: ' + JSON.stringify(E.VER) + '\nSe os namespaces acima indicarem outra versão, ajuste ESOCIAL_VER_LOTE / ESOCIAL_VER_CONSULTA / ESOCIAL_VER_SERVICO / ESOCIAL_VER_SERVICO_CONSULTA.'); }
    catch (e) { console.error('✖ Falha no diagnóstico: ' + e.message); process.exit(1); }
    return;
  }

  const cors = (req, res) => {
    const o = req.headers.origin;
    if (o && ORIGENS.includes(o)) { res.setHeader('Access-Control-Allow-Origin', o); res.setHeader('Vary', 'Origin'); }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Private-Network', 'true'); res.setHeader('Access-Control-Max-Age', '600');
  };
  const json = (res, c, o) => { res.writeHead(c, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(o)); };
  const corpo = (req) => new Promise((ok, no) => { let n = 0; const b = []; req.on('data', d => { n += d.length; if (n > 2 * 1024 * 1024) { no(Object.assign(new Error('Corpo muito grande.'), { http: 413 })); req.destroy(); } else b.push(d); }); req.on('end', () => ok(Buffer.concat(b).toString('utf8'))); req.on('error', no); });

  const srv = http.createServer(async (req, res) => {
    cors(req, res);
    if (req.headers.origin && !ORIGENS.includes(req.headers.origin)) return json(res, 403, { erro: 'Origem não autorizada. Inclua-a em ESOCIAL_ORIGENS.' });
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    const url = new URL(req.url, 'http://x');
    try {
      if (req.method === 'GET' && url.pathname === '/status') return json(res, 200, { ok: true, ambiente: AMBIENTE, transmissor: { tpInsc: cert.tpInsc, nrInsc: cert.nrInsc }, certificadoValidoAte: cert.validoAte.toISOString(), versoes: E.VER });
      if (req.method === 'POST' && url.pathname === '/lotes') {
        const b = JSON.parse(await corpo(req));
        if (Number(b.ambiente) !== AMBIENTE) return json(res, 409, { erro: 'O sistema pede o ambiente ' + b.ambiente + ', mas este gateway está em ' + AMBIENTE + (PRODUCAO ? ' (produção)' : ' (produção restrita)') + '. Nada foi enviado.' });
        if (!b.empregador || !b.empregador.nrInsc) return json(res, 400, { erro: 'Empregador não informado.' });
        const r = await E.enviarLote(cfg, cert, b);
        const ref = r.protocolo || ('SEM-PROTOCOLO-' + Date.now());
        grava(ref, 'lote-assinado.xml', r._lote); grava(ref, 'soap-envio.xml', r._soap); grava(ref, 'soap-resposta-envio.xml', r._resp);
        console.log(agora() + ' envio  grupo ' + b.grupo + ' · ' + r.ids.length + ' evento(s) · resposta ' + r.cdResposta + ' ' + r.descResposta + (r.protocolo ? ' · protocolo ' + r.protocolo : ''));
        if (!['201', '202', '203'].includes(r.cdResposta) || !r.protocolo)
          return json(res, 422, { erro: 'O eSocial não recebeu o lote: ' + r.cdResposta + ' – ' + r.descResposta, cdResposta: r.cdResposta, ocorrencias: r.ocorrencias });
        return json(res, 200, { protocolo: r.protocolo, cdResposta: r.cdResposta, descResposta: r.descResposta, dhRecepcao: r.dhRecepcao, ocorrencias: r.ocorrencias });
      }
      const m = url.pathname.match(/^\/lotes\/([^/]+)$/);
      if (req.method === 'GET' && m) {
        const prot = decodeURIComponent(m[1]); const r = await E.consultarLote(cfg, cert, prot);
        grava(prot, 'soap-consulta.xml', r._soap); grava(prot, 'soap-resposta-consulta.xml', r._resp);
        console.log(agora() + ' consulta ' + prot + ' · ' + r.cdResposta + ' ' + r.descResposta + ' · ' + r.eventos.length + ' evento(s)');
        if (r.cdResposta === '101') return json(res, 200, { status: 'processando', cdResposta: r.cdResposta, descResposta: r.descResposta, tempoEstimado: r.tempoEstimado });
        if (/^20[12]$/.test(r.cdResposta)) return json(res, 200, { status: 'processado', cdResposta: r.cdResposta, descResposta: r.descResposta, eventos: r.eventos });
        return json(res, 200, { status: 'erro', cdResposta: r.cdResposta, descResposta: r.descResposta, ocorrencias: r.ocorrencias, mensagem: r.cdResposta + ' – ' + r.descResposta });
      }
      return json(res, 404, { erro: 'Rota inexistente.' });
    } catch (e) {
      console.error(agora() + ' ✖ ' + e.message);
      return json(res, e.http || 502, { erro: e.message });
    }
  });
  srv.listen(PORTA, '127.0.0.1', () => console.log('\nGateway pronto em http://127.0.0.1:' + PORTA + '  (informe esse endereço em Integração › URL do gateway). Ctrl+C encerra.'));
}
if (require.main === module) main().catch(e => { console.error('✖ ' + e.message); process.exit(1); });
module.exports = { main };
