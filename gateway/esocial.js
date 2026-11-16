'use strict';
/* Núcleo do gateway: certificado, assinatura XMLDSig, lote, SOAP 1.1 e leitura dos retornos.
   Base: Manual de Orientação do Desenvolvedor do eSocial v1.16, seções 6.6, 6.7, 7.2, 7.5 e 7.6 e 8.6. */
const https = require('https'), fs = require('fs'), crypto = require('crypto');
const forge = require('node-forge');
const { SignedXml } = require('xml-crypto');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');

const URL_BASE = {
  2: { envio: 'https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/enviarloteeventos/WsEnviarLoteEventos.svc',
       consulta: 'https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/consultarloteeventos/WsConsultarLoteEventos.svc' },
  1: { envio: 'https://webservices.envio.esocial.gov.br/servicos/empregador/enviarloteeventos/WsEnviarLoteEventos.svc',
       consulta: 'https://webservices.consulta.esocial.gov.br/servicos/empregador/consultarloteeventos/WsConsultarLoteEventos.svc' }
};
/* Versões dos esquemas de comunicação. Conferir com `npm run diagnostico` (lê o WSDL do serviço) e, se mudarem, ajustar pelas variáveis de ambiente. */
const VER = {
  lote: process.env.ESOCIAL_VER_LOTE || 'v1_1_1',
  consulta: process.env.ESOCIAL_VER_CONSULTA || 'v1_0_0',
  servico: process.env.ESOCIAL_VER_SERVICO || 'v1_1_0',
  servicoConsulta: process.env.ESOCIAL_VER_SERVICO_CONSULTA || 'v1_1_0'
};
const NS = () => ({
  lote: 'http://www.esocial.gov.br/schema/lote/eventos/envio/' + VER.lote,
  consulta: 'http://www.esocial.gov.br/schema/lote/eventos/envio/consulta/retornoProcessamento/' + VER.consulta,
  svcEnvio: 'http://www.esocial.gov.br/servicos/empregador/lote/eventos/envio/' + VER.servico,
  svcConsulta: 'http://www.esocial.gov.br/servicos/empregador/lote/eventos/envio/consulta/retornoProcessamento/' + VER.servicoConsulta
});
const ACTION = () => ({
  envio: process.env.ESOCIAL_ACTION_ENVIO || NS().svcEnvio + '/ServicoEnviarLoteEventos/EnviarLoteEventos',
  consulta: process.env.ESOCIAL_ACTION_CONSULTA || NS().svcConsulta + '/ServicoConsultarLoteEventos/ConsultarLoteEventos'
});

/* ---------- certificado ---------- */
function carregarCertificado({ pfxPath, pfxPass, certPem, keyPem }) {
  let key, chain;
  if (pfxPath) {
    const der = forge.util.createBuffer(fs.readFileSync(pfxPath).toString('binary'));
    let p12;
    try { p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(der), pfxPass || ''); }
    catch (e) { throw new Error('Não foi possível abrir o arquivo do certificado (senha incorreta ou arquivo inválido): ' + e.message); }
    const kb = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] || p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag];
    if (!kb || !kb.length) throw new Error('O arquivo não contém chave privada.');
    key = forge.pki.privateKeyToPem(kb[0].key);
    const certs = (p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || []).map(b => b.cert);
    const mod = kb[0].key.n.toString(16);
    const folha = certs.find(c => c.publicKey.n.toString(16) === mod);
    if (!folha) throw new Error('Não encontrei, no arquivo, o certificado correspondente à chave privada.');
    chain = [folha, ...certs.filter(c => c !== folha)].map(c => forge.pki.certificateToPem(c)).join('');
  } else if (certPem && keyPem) { key = fs.readFileSync(keyPem, 'utf8'); chain = fs.readFileSync(certPem, 'utf8'); }
  else throw new Error('Informe o certificado A1 (.pfx/.p12) em ESOCIAL_PFX, ou ESOCIAL_CERT_PEM e ESOCIAL_KEY_PEM.');
  const folhaPem = chain.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/)[0];
  const x = new crypto.X509Certificate(folhaPem);
  const cn = (x.subject.match(/CN=([^\n]+)/) || [])[1] || '';
  const doc = (cn.split(':').pop() || '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  let tp = 0, nr = '';
  if (/^[0-9A-Z]{14}$/.test(doc) && !/^\d{11}$/.test(doc)) { tp = 1; nr = doc; } else if (/^\d{11}$/.test(doc)) { tp = 2; nr = doc; }
  return { key, chain, folhaPem, subject: x.subject.replace(/\n/g, ', '), emissor: x.issuer.replace(/\n/g, ', '), validoAte: new Date(x.validTo), validoDe: new Date(x.validFrom),
           tpInsc: tp, nrInsc: nr, base64: folhaPem.replace(/-----[A-Z ]+-----|\s/g, '') };
}

/* ---------- assinatura (6.7): enveloped, C14N 1.0, RSA-SHA256, digest SHA-256, só X509Certificate ---------- */
function limparEvento(xml) {
  return String(xml).replace(/^﻿/, '').replace(/<\?xml[^>]*\?>\s*/i, '').replace(/<Signature[\s\S]*?<\/Signature>/g, '').trim();
}
function assinarEvento(xml, cert) {
  const limpo = limparEvento(xml);
  const sig = new SignedXml({
    privateKey: cert.key,
    publicCert: cert.folhaPem,
    signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    canonicalizationAlgorithm: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    getKeyInfoContent: () => '<X509Data><X509Certificate>' + cert.base64 + '</X509Certificate></X509Data>'
  });
  sig.addReference({
    xpath: '/*', isEmptyUri: true,
    transforms: ['http://www.w3.org/2000/09/xmldsig#enveloped-signature', 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'],
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256'
  });
  sig.computeSignature(limpo, { location: { reference: '/*', action: 'append' } });
  return sig.getSignedXml();
}

/* ---------- utilidades XML ---------- */
const parse = (xml) => new DOMParser({ onError: () => {} }).parseFromString(xml, 'text/xml');
const filhos = (n, nome) => { const r = []; const l = n ? n.childNodes : []; for (let i = 0; i < l.length; i++) if (l[i].nodeType === 1 && (nome === '*' || l[i].localName === nome)) r.push(l[i]); return r; };
const acha = (n, ...cam) => { let c = [n]; for (const nome of cam) { c = c.flatMap(x => filhos(x, nome)); } return c; };
const txt = (n, ...cam) => { const r = acha(n, ...cam)[0]; return r ? (r.textContent || '').trim() : ''; };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ser = (n) => new XMLSerializer().serializeToString(n);

/* ---------- lote (7.5.9) ---------- */
function idEvento(xml) {
  const d = parse(limparEvento(xml)); const raiz = d.documentElement;
  if (!raiz || raiz.localName !== 'eSocial') throw new Error('O XML não tem a raiz <eSocial>.');
  const evt = filhos(raiz, '*')[0]; if (!evt) throw new Error('O XML não tem o evento dentro de <eSocial>.');
  const id = evt.getAttribute('Id'); if (!/^ID[0-9]{1}[0-9A-Z]{14}[0-9]{14}[0-9]{5}$/.test(id || '')) throw new Error('Id do evento fora do padrão (ID + tipo de inscrição + 14 posições + data/hora + sequencial): ' + id);
  const nr = txt(evt, 'ideEmpregador', 'nrInsc'), tp = txt(evt, 'ideEmpregador', 'tpInsc');
  return { id, nome: evt.localName, tpInsc: tp, nrInsc: nr };
}
function montarLote({ grupo, empregador, transmissor, eventosAssinados }) {
  const nrEmp = String(empregador.nrInsc).toUpperCase();
  const emp = Number(empregador.tpInsc) === 1 && nrEmp.length === 14 ? nrEmp.slice(0, 8) : nrEmp;
  return '<eSocial xmlns="' + NS().lote + '"><envioLoteEventos grupo="' + Number(grupo) + '">'
    + '<ideEmpregador><tpInsc>' + Number(empregador.tpInsc) + '</tpInsc><nrInsc>' + esc(emp) + '</nrInsc></ideEmpregador>'
    + '<ideTransmissor><tpInsc>' + transmissor.tpInsc + '</tpInsc><nrInsc>' + esc(transmissor.nrInsc) + '</nrInsc></ideTransmissor>'
    + '<eventos>' + eventosAssinados.map(e => '<evento Id="' + esc(e.id) + '">' + e.xml + '</evento>').join('') + '</eventos></envioLoteEventos></eSocial>';
}
function montarConsulta(protocolo) {
  return '<eSocial xmlns="' + NS().consulta + '"><consultaLoteEventos><protocoloEnvio>' + esc(protocolo) + '</protocoloEnvio></consultaLoteEventos></eSocial>';
}

/* ---------- SOAP 1.1 document/literal (6.4) ---------- */
function envelope(operacao, ns, param, corpo) {
  return '<?xml version="1.0" encoding="utf-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v1="' + ns + '"><soapenv:Header/><soapenv:Body><v1:' + operacao + '><v1:' + param + '>' + corpo + '</v1:' + param + '></v1:' + operacao + '></soapenv:Body></soapenv:Envelope>';
}
function agente(cert, opts) {
  const o = { key: cert.key, cert: cert.chain, minVersion: 'TLSv1.2', maxVersion: 'TLSv1.2', keepAlive: false };
  if (opts.ca) o.ca = [...require('tls').rootCertificates, fs.readFileSync(opts.ca, 'utf8')];
  if (opts.inseguro) o.rejectUnauthorized = false;
  return new https.Agent(o);
}
function post(url, soapAction, corpo, ag, timeoutMs) {
  return new Promise((ok, no) => {
    const u = new URL(url);
    const req = https.request({ method: 'POST', hostname: u.hostname, port: u.port || 443, path: u.pathname + u.search, agent: ag, timeout: timeoutMs || 60000,
      headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': '"' + soapAction + '"', 'Content-Length': Buffer.byteLength(corpo) } }, (res) => {
      const b = []; res.on('data', d => b.push(d)); res.on('end', () => ok({ status: res.statusCode, corpo: Buffer.concat(b).toString('utf8') }));
    });
    req.on('timeout', () => req.destroy(new Error('Tempo esgotado na chamada ao eSocial.')));
    req.on('error', no); req.write(corpo); req.end();
  });
}
function extrairResultado(soap, nomeResultado, interno) {
  const d = parse(soap); const f = d.getElementsByTagNameNS ? d.getElementsByTagNameNS('*', 'Fault') : [];
  if (f && f.length) throw new Error('SOAP Fault: ' + ((f[0].textContent || '').trim().slice(0, 400)));
  const el = d.getElementsByTagNameNS('*', nomeResultado)[0]; if (!el) throw new Error('Resposta sem <' + nomeResultado + '>: ' + soap.slice(0, 300));
  const inner = d.getElementsByTagNameNS('*', interno)[0]; if (!inner) throw new Error('Resposta sem <' + interno + '>: ' + soap.slice(0, 300));
  return inner;
}
const ocorr = (n) => acha(n, 'ocorrencias', 'ocorrencia').map(o => ({ tipo: txt(o, 'tipo'), codigo: txt(o, 'codigo'), descricao: txt(o, 'descricao'), localizacao: txt(o, 'localizacao') }));

/* ---------- operações ---------- */
async function enviarLote(cfg, cert, { grupo, empregador, eventos }) {
  if (!Array.isArray(eventos) || !eventos.length) throw Object.assign(new Error('Lote sem eventos.'), { http: 400 });
  if (eventos.length > 50) throw Object.assign(new Error('O lote admite no máximo 50 eventos (validação 611).'), { http: 400 });
  if (![1, 2, 3].includes(Number(grupo))) throw Object.assign(new Error('Grupo inválido (1 tabelas, 2 não periódicos, 3 periódicos).'), { http: 400 });
  const base = String(empregador.nrInsc || '').toUpperCase().slice(0, 8);
  const assinados = eventos.map(e => {
    const i = idEvento(e.xml);
    if (e.id && e.id !== i.id) throw Object.assign(new Error('O Id informado (' + e.id + ') difere do Id do XML (' + i.id + ').'), { http: 400 });
    if (i.nrInsc && i.nrInsc.toUpperCase() !== base && i.nrInsc.toUpperCase() !== String(empregador.nrInsc).toUpperCase()) throw Object.assign(new Error('Evento ' + i.id + ' pertence a outro empregador (' + i.nrInsc + ').'), { http: 400 });
    return { id: i.id, xml: assinarEvento(e.xml, cert) };
  });
  const lote = montarLote({ grupo, empregador, transmissor: cert, eventosAssinados: assinados });
  const soap = envelope('EnviarLoteEventos', NS().svcEnvio, 'loteEventos', lote);
  if (Buffer.byteLength(soap) > 750 * 1024) throw Object.assign(new Error('A mensagem SOAP excede 750 kB (validação 612). Reduza o número de eventos do lote.'), { http: 400 });
  const r = await post(cfg.urls.envio, ACTION().envio, soap, cfg.agente, cfg.timeout);
  const ret = extrairResultado(r.corpo, 'EnviarLoteEventosResult', 'retornoEnvioLoteEventos');
  const cd = txt(ret, 'status', 'cdResposta');
  return { cdResposta: cd, descResposta: txt(ret, 'status', 'descResposta'), ocorrencias: ocorr(ret),
           protocolo: txt(ret, 'dadosRecepcaoLote', 'protocoloEnvio'), dhRecepcao: txt(ret, 'dadosRecepcaoLote', 'dhRecepcao'),
           ids: assinados.map(a => a.id), _lote: lote, _soap: soap, _resp: r.corpo, httpStatus: r.status };
}
async function consultarLote(cfg, cert, protocolo) {
  const soap = envelope('ConsultarLoteEventos', NS().svcConsulta, 'consulta', montarConsulta(protocolo));
  const r = await post(cfg.urls.consulta, ACTION().consulta, soap, cfg.agente, cfg.timeout);
  const ret = extrairResultado(r.corpo, 'ConsultarLoteEventosResult', 'retornoProcessamentoLoteEventos');
  const cd = txt(ret, 'status', 'cdResposta');
  const eventos = acha(ret, 'retornoEventos', 'evento').map(ev => {
    const re = acha(ev, 'retornoEvento')[0]; const e = re ? (filhos(re, '*')[0] || re) : null;
    const proc = e ? acha(e, 'retornoEvento', 'processamento')[0] || acha(e, 'processamento')[0] : null;
    const cdE = proc ? txt(proc, 'cdResposta') : '';
    const caminhos = [['retornoEvento', 'processamento', 'ocorrencias', 'ocorrencia'], ['retornoEvento', 'ocorrencias', 'ocorrencia'], ['processamento', 'ocorrencias', 'ocorrencia'], ['ocorrencias', 'ocorrencia']];
    const oc = e ? (caminhos.map(c => acha(e, ...c)).find(l => l.length) || []) : [];
    const rec = e ? (txt(e, 'retornoEvento', 'recibo', 'nrRecibo') || txt(e, 'recibo', 'nrRecibo')) : '';
    return { id: ev.getAttribute('Id'), cdResposta: cdE, descResposta: proc ? txt(proc, 'descResposta') : '', recibo: rec, duplicado: ev.getAttribute('evtDupl') || '',
             situacao: (cdE === '201' || cdE === '202') ? 'sucesso' : 'rejeitado',
             ocorrencias: oc.map(o => ({ tipo: txt(o, 'tipo'), codigo: txt(o, 'codigo'), descricao: txt(o, 'descricao'), localizacao: txt(o, 'localizacao') })),
             totalizadores: acha(ev, 'tot').map(t => t.getAttribute('tipo')) };
  });
  return { cdResposta: cd, descResposta: txt(ret, 'status', 'descResposta'), tempoEstimado: txt(ret, 'status', 'tempoEstimadoConclusao'),
           ocorrencias: ocorr(ret), eventos, _soap: soap, _resp: r.corpo, httpStatus: r.status };
}
/* Diagnóstico: baixa o WSDL de cada serviço e mostra os namespaces e SOAPActions realmente publicados. */
async function diagnosticoWsdl(cfg) {
  const out = {};
  for (const k of ['envio', 'consulta']) {
    const u = new URL(cfg.urls[k]);
    const r = await new Promise((ok, no) => { const q = https.request({ method: 'GET', hostname: u.hostname, path: u.pathname + '?singleWsdl', agent: cfg.agente, timeout: 30000 }, s => { const b = []; s.on('data', d => b.push(d)); s.on('end', () => ok({ status: s.statusCode, corpo: Buffer.concat(b).toString('utf8') })); }); q.on('error', no); q.on('timeout', () => q.destroy(new Error('timeout'))); q.end(); });
    const ns = [...new Set((r.corpo.match(/(?:targetNamespace|xmlns:\w+)="http:\/\/www\.esocial\.gov\.br\/[^"]+"/g) || []).map(s => s.replace(/^[^=]+="|"$/g, '')))];
    out[k] = { http: r.status, soapActions: [...new Set((r.corpo.match(/soapAction="[^"]+"/g) || []).map(s => s.slice(12, -1)))], namespaces: ns, endereco: (r.corpo.match(/location="[^"]+"/g) || []).slice(0, 2) };
  }
  return out;
}
module.exports = { URL_BASE, VER, NS, ACTION, carregarCertificado, assinarEvento, limparEvento, idEvento, montarLote, montarConsulta, envelope, agente, post, enviarLote, consultarLote, diagnosticoWsdl, parse, txt, acha, filhos };
