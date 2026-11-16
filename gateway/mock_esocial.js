'use strict';
/* Servidor eSocial SIMULADO, apenas para testar o gateway sem acesso ao governo. Exige certificado de cliente (TLS mútuo),
   confere a assinatura XMLDSig de cada evento e devolve retornos no formato do manual (7.5.10, 7.6.10 e 8.6). Não é o eSocial. */
const https = require('https'), crypto = require('crypto'), forge = require('node-forge');
const { SignedXml } = require('xml-crypto');
const E = require('./esocial');
const lotes = new Map(); let seq = 0;
function verificaAssinatura(xmlEvento) {
  const d = E.parse(xmlEvento); const sigs = d.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'Signature');
  if (sigs.length !== 1) return 'sem assinatura única';
  const x509 = sigs[0].getElementsByTagNameNS('*', 'X509Certificate')[0]; if (!x509) return 'sem X509Certificate';
  const ki = sigs[0].getElementsByTagNameNS('*', 'KeyInfo')[0];
  if (ki.getElementsByTagNameNS('*', 'X509Data')[0].childNodes.length !== 1) { /* só o certificado */ }
  const pem = '-----BEGIN CERTIFICATE-----\n' + x509.textContent.trim() + '\n-----END CERTIFICATE-----';
  const chk = new SignedXml({ publicCert: pem });
  chk.loadSignature(sigs[0]);
  const alg = [chk.getSignatureAlgorithm?.() || chk.signatureAlgorithm, chk.canonicalizationAlgorithm].join(' ');
  const ok = chk.checkSignature(xmlEvento);
  const ref = sigs[0].getElementsByTagNameNS('*', 'Reference')[0];
  if (ref.getAttribute('URI') !== '') return 'Reference URI deve ser vazio';
  if (!/rsa-sha256/.test(alg)) return 'algoritmo ' + alg;
  if (!/xmlenc#sha256/.test(sigs[0].toString())) return 'digest não é SHA-256';
  return ok ? null : 'assinatura inválida';
}
function iniciar(porta, { key, cert, ca }) {
  const srv = https.createServer({ key, cert, ca, requestCert: true, rejectUnauthorized: true, minVersion: 'TLSv1.2', maxVersion: 'TLSv1.2' }, (req, res) => {
    const b = []; req.on('data', d => b.push(d)); req.on('end', () => {
      const corpo = Buffer.concat(b).toString('utf8'); const peer = req.socket.getPeerCertificate();
      const resp = (x) => { res.writeHead(200, { 'Content-Type': 'text/xml; charset=utf-8' }); res.end('<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>' + x + '</s:Body></s:Envelope>'); };
      const act = (req.headers.soapaction || '').replace(/"/g, '');
      const d = E.parse(corpo);
      if (/EnviarLoteEventos$/.test(act)) {
        const lote = d.getElementsByTagNameNS('*', 'eSocial')[0]; const env = lote.getElementsByTagNameNS('*', 'envioLoteEventos')[0];
        const evs = [...env.getElementsByTagNameNS('*', 'evento')]; const cn = (peer.subject || {}).CN || '';
        const trans = E.txt(env, 'ideTransmissor', 'nrInsc');
        if (!cn.includes(trans)) return resp('<EnviarLoteEventosResponse xmlns="x"><EnviarLoteEventosResult><eSocial><retornoEnvioLoteEventos><status><cdResposta>404</cdResposta><descResposta>Lote incorreto - Erro certificado (607)</descResposta></status></retornoEnvioLoteEventos></eSocial></EnviarLoteEventosResult></EnviarLoteEventosResponse>');
        const res2 = evs.map(ev => { const filho = [...ev.childNodes].find(n => n.nodeType === 1); const xml = new (require('@xmldom/xmldom').XMLSerializer)().serializeToString(filho); return { id: ev.getAttribute('Id'), erro: verificaAssinatura(xml), tipo: filho.getElementsByTagNameNS('*', 'evtInfoEmpregador').length };});
        const prot = '1.2.' + new Date().toISOString().replace(/\D/g, '').slice(0, 14) + String(++seq).padStart(5, '0'); lotes.set(prot, res2);
        return resp('<EnviarLoteEventosResponse xmlns="http://www.esocial.gov.br/servicos/empregador/lote/eventos/envio/v1_1_0"><EnviarLoteEventosResult><eSocial xmlns="http://www.esocial.gov.br/schema/lote/eventos/envio/retornoEnvio/v1_1_0"><retornoEnvioLoteEventos><ideEmpregador><tpInsc>1</tpInsc><nrInsc>' + E.txt(env, 'ideEmpregador', 'nrInsc') + '</nrInsc></ideEmpregador><ideTransmissor><tpInsc>1</tpInsc><nrInsc>' + trans + '</nrInsc></ideTransmissor><status><cdResposta>201</cdResposta><descResposta>Lote recebido com sucesso.</descResposta></status><dadosRecepcaoLote><dhRecepcao>' + new Date().toISOString() + '</dhRecepcao><versaoAplicativoRecepcao>mock</versaoAplicativoRecepcao><protocoloEnvio>' + prot + '</protocoloEnvio></dadosRecepcaoLote></retornoEnvioLoteEventos></eSocial></EnviarLoteEventosResult></EnviarLoteEventosResponse>');
      }
      if (/ConsultarLoteEventos$/.test(act)) {
        const prot = E.txt(d.getElementsByTagNameNS('*', 'consultaLoteEventos')[0], 'protocoloEnvio'); const l = lotes.get(prot);
        if (!l) return resp('<ConsultarLoteEventosResponse><ConsultarLoteEventosResult><eSocial><retornoProcessamentoLoteEventos><status><cdResposta>201</cdResposta></status></retornoProcessamentoLoteEventos></eSocial></ConsultarLoteEventosResult></ConsultarLoteEventosResponse>');
        l.tentativas = (l.tentativas || 0) + 1;
        if (l.tentativas === 1) return resp('<ConsultarLoteEventosResponse xmlns="http://www.esocial.gov.br/servicos/empregador/lote/eventos/envio/consulta/retornoProcessamento/v1_1_0"><ConsultarLoteEventosResult><eSocial xmlns="http://www.esocial.gov.br/schema/lote/eventos/envio/retornoProcessamento/v1_3_0"><retornoProcessamentoLoteEventos><status><cdResposta>101</cdResposta><descResposta>Lote Aguardando Processamento.</descResposta><tempoEstimadoConclusao>2</tempoEstimadoConclusao></status></retornoProcessamentoLoteEventos></eSocial></ConsultarLoteEventosResult></ConsultarLoteEventosResponse>');
        const evs = l.map((x, i) => {
          const ok = !x.erro && i % 3 !== 2;
          return '<evento Id="' + x.id + '"><retornoEvento><eSocial xmlns="http://www.esocial.gov.br/schema/evt/retornoEvento/v1_2_1"><retornoEvento Id="' + x.id + '"><ideEmpregador><tpInsc>1</tpInsc><nrInsc>12345678</nrInsc></ideEmpregador><recepcao><tpAmb>2</tpAmb></recepcao><processamento><cdResposta>' + (ok ? '201' : '401') + '</cdResposta><descResposta>' + (ok ? 'Sucesso.' : 'Erro no conteúdo do evento.') + '</descResposta></processamento>'
            + (ok ? '<recibo><nrRecibo>1.2.202611' + String(i + 1).padStart(10, '0') + '</nrRecibo><hash>abc</hash></recibo>' : '<ocorrencias><ocorrencia><tipo>1</tipo><codigo>MS0001</codigo><descricao>' + (x.erro || 'Regra de teste do mock') + '</descricao><localizacao>/eSocial</localizacao></ocorrencia></ocorrencias>') + '</retornoEvento></eSocial></retornoEvento></evento>';
        }).join('');
        return resp('<ConsultarLoteEventosResponse xmlns="http://www.esocial.gov.br/servicos/empregador/lote/eventos/envio/consulta/retornoProcessamento/v1_1_0"><ConsultarLoteEventosResult><eSocial xmlns="http://www.esocial.gov.br/schema/lote/eventos/envio/retornoProcessamento/v1_3_0"><retornoProcessamentoLoteEventos><status><cdResposta>201</cdResposta><descResposta>Lote Processado com Sucesso.</descResposta></status><retornoEventos>' + evs + '</retornoEventos></retornoProcessamentoLoteEventos></eSocial></ConsultarLoteEventosResult></ConsultarLoteEventosResponse>');
      }
      res.writeHead(500); res.end('acao desconhecida');
    });
  });
  return new Promise(ok => srv.listen(porta, '127.0.0.1', () => ok(srv)));
}
module.exports = { iniciar };
