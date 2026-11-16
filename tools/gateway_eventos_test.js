/* Pega eventos REAIS gerados pelo FolhaPro, assina com o gateway (certificado de teste), monta o lote e valida cada evento assinado contra o XSD oficial. */
const {JSDOM}=require('jsdom');const fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process');
const G=require('../gateway/esocial');
const XSD=process.env.XSD_DIR||'/home/claude/xsd/a';
const T=fs.mkdtempSync(path.join(os.tmpdir(),'gwev-'));const sh=(...a)=>cp.execFileSync('openssl',a,{cwd:T,stdio:'pipe'});
sh('req','-x509','-newkey','rsa:2048','-nodes','-keyout','k.pem','-out','c.pem','-subj','/C=BR/CN=EMPRESA TESTE LTDA:12345678000199','-days','2');
sh('pkcs12','-export','-inkey','k.pem','-in','c.pem','-out','c.pfx','-passout','pass:x');
const cert=G.carregarCertificado({pfxPath:path.join(T,'c.pfx'),pfxPass:'x'});
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',beforeParse(w){w.print=()=>{};w.__FP_NOGATE=true;}}).window;const ev=s=>w.eval(s);
ev("seedDemo('lp')");
const evs=JSON.parse(ev(`JSON.stringify((()=>{const o=[];o.push(criarEvento('S-1000',{}));DB.estabs.forEach(s=>o.push(criarEvento('S-1005',{id:s.id})));DB.lotacoes.forEach(l=>o.push(criarEvento('S-1020',{id:l.id})));DB.empregados.slice(0,3).forEach(f=>o.push(criarEvento('S-2200',{id:f.id})));return o.map(e=>({id:e.id,tipo:e.tipo,xml:e.xml}));})())`));
let ok=0,fal=0;const assin=[];
for(const e of evs){
  try{const i=G.idEvento(e.xml);const s=G.assinarEvento(e.xml,cert);assin.push({id:i.id,xml:s});
    const f=path.join(T,e.tipo+'.xml');fs.writeFileSync(f,s);
    const nome={'S-1000':'evtInfoEmpregador','S-1005':'evtTabEstab','S-1020':'evtTabLotacao','S-2200':'evtAdmissao'}[e.tipo];
    let r='';try{cp.execFileSync('xmllint',['--noout','--schema',path.join(XSD,nome+'.xsd'),f],{stdio:'pipe'});}catch(x){r=String(x.stderr||x.message).split('\n').slice(0,3).join(' | ');}
    if(r){fal++;console.log('✖',e.tipo,i.id,r.slice(0,300));}else{ok++;}
  }catch(x){fal++;console.log('✖',e.tipo,x.message);}
}
const lote=G.montarLote({grupo:1,empregador:{tpInsc:1,nrInsc:'12345678000199'},transmissor:cert,eventosAssinados:assin});
console.log('eventos reais assinados e válidos no XSD:',ok,'/',evs.length,' · lote',(lote.length/1024).toFixed(1),'kB');
console.log(fal?'FALHAS '+fal:'GW_EVENTOS_OK');process.exit(fal?1:0);
