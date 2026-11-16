const {JSDOM}=require('jsdom');const fs=require('fs');
const d=new JSDOM(fs.readFileSync(__dirname+'/../index.html','utf8'),{runScripts:'dangerously',url:'https://x.test/',beforeParse(w){w.__FP_NOGATE=true;w.print=()=>{}}});const w=d.window;w.eval("seedDemo('lp')");
const r=w.eval(`(()=>{const cb={id:'c1',banco:'001',bancoNome:'BANCO DO BRASIL',ag:'1234',agDv:'5',conta:'98765',contaDv:'0',convenio:'123456',finTED:'00010'};
const mk=(id,f,extra)=>Object.assign({id,favorecido:'FULANO '+id,doc:'52998224725',valor:1234.56,forma:'cc',banco:'001',ag:'1',agDv:'',conta:'22',contaDv:'3',tipoConta:'cc'},extra,{forma:f});
const tits=[mk('T1','cc',{}),mk('T2','cc',{banco:'237'}),mk('T3','cc',{tipoConta:'pp'}),mk('T4','pix',{pix:'fulano@x.com'}),mk('T5','pix',{pix:'52998224725'}),mk('T6','pix',{pix:'+5541999998888'}),mk('T7','pix',{pix:'xx'})];
const r=cnabGerar({conta:cb,tits,dtPag:'2026-11-27',servico:'30',segB:false,nsa:7});return {t:r.texto,n:r.nLinhas,pend:r.pend.map(x=>x.t.id+': '+x.m.join(';')),total:r.total}})()`);
const L=r.t.split('\r\n').filter(Boolean);console.log('linhas',L.length,'todas240',L.every(l=>l.length===240),'pend',r.pend);
L.forEach(l=>console.log(l[7],l.slice(0,3),l.slice(3,7),l[7]==='3'?l[13]:'', l[7]==='1'?'lote vers='+l.slice(13,16)+' forma='+l.slice(11,13)+' ind='+JSON.stringify(l.slice(222,224)):'', l[7]==='3'&&l[13]==='A'?'cam='+l.slice(17,20)+' bco='+l.slice(20,23)+' fin='+JSON.stringify(l.slice(219,224)):'',l[7]==='3'&&l[13]==='B'?'ini='+JSON.stringify(l.slice(14,17))+' chave='+JSON.stringify(l.slice(127,226).trim()):'',l[7]==='5'?'qtd='+l.slice(17,23)+' soma='+l.slice(23,41):'',l[7]==='9'?'lotes='+l.slice(17,23)+' regs='+l.slice(23,29):''));
// retorno
const ret=L.map(l=>l[7]==='3'&&l[13]==='A'?l.slice(0,230)+'00        ':l).join('\n');
console.log(JSON.stringify(w.eval('cnabRetorno('+JSON.stringify(ret)+').map(x=>x.doc+":"+x.st)')));
const rt2=[ 'A'.repeat(0)];
const ln=L.find(l=>l[7]==='3'&&l[13]==='A');
const mkr=oc=>ln.slice(0,230)+oc.padEnd(10,' ');
console.log(JSON.stringify(w.eval('cnabRetorno('+JSON.stringify([mkr('02'),mkr('BD'),mkr('ZA'),mkr('AGAN'),L[0].slice(0,230)+'HI        '].join('\n'))+')')), w.eval('cnabRetorno('+JSON.stringify(L[0].slice(0,230)+'HI        ')+').avisos.join()'));
const A=(n,c)=>{console.log((c?'PASS ':'FALHA ')+n);if(!c)process.exitCode=1;};
A('todas as linhas com 240 posições',L.every(l=>l.length===240));
A('versão do lote 046',L.filter(l=>l[7]==='1').every(l=>l.slice(13,16)==='046'));
A('formas 01, 05, 41 e 45 em lotes distintos',['01','05','41','45'].every(f=>L.some(l=>l[7]==='1'&&l.slice(11,13)===f)));
A('Pix: câmara 009 e Segmento B obrigatório',L.filter(l=>l[7]==='3'&&l[13]==='A'&&l.slice(17,20)==='009').length===3&&L.filter(l=>l[7]==='3'&&l[13]==='B').length===3);
A('chave Pix inválida fica pendente',r.pend.length===1);
A('trailer do arquivo: 4 lotes e 19 registros',L[L.length-1].slice(17,23)==='000004'&&L[L.length-1].slice(23,29)==='000019');
process.exit(process.exitCode||0)
