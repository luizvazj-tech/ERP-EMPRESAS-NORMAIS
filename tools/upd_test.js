const {JSDOM}=require('jsdom');const fs=require('fs'),cp=require('child_process'),os=require('os'),path=require('path');
const K=fs.readFileSync('/tmp/fp_keys/chaves.txt','utf8').split('\n');
const idx=s=>K.findIndex(l=>l.includes(s));
const PEM=K[idx('UPDATE_PRIVATE_KEY')+1],HASH=K[idx('ADMIN_PASSWORD_HASH')+1],PW=K[idx('SENHA DO ADMIN')+1];
const PORT=8791,BASE='http://127.0.0.1:'+PORT,DATA=fs.mkdtempSync(path.join(os.tmpdir(),'upd-'));
const srv=cp.spawn('node',[__dirname+'/../server/server.js'],{env:Object.assign({},process.env,{PORT,DATA_DIR:DATA,UPDATE_PRIVATE_KEY:PEM,ADMIN_PASSWORD_HASH:HASH}),stdio:'inherit'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let falhas=0;const ok=(c,m)=>{console.log((c?'ok   ':'FALHA ')+m);if(!c)falhas++;};
let cookie='',csrf='';
async function api(m,u,b,hdr){const r=await fetch(BASE+u,{method:m,headers:Object.assign({'Content-Type':'application/json',cookie},hdr||(csrf&&m!=='GET'?{'X-CSRF':csrf}:{})),body:b?JSON.stringify(b):undefined});const sc=r.headers.get('set-cookie');if(sc)cookie=sc.split(';')[0];let j={};try{j=await r.json();}catch(e){}return{s:r.status,j};}
(async()=>{await sleep(700);
 let r=await api('POST','/admin/api/login',{usuario:'admin',senha:'errada'});ok(r.s===401,'login com senha errada recusado');
 r=await api('GET','/admin/api/pacotes');ok(r.s===401,'painel sem sessão recusado');
 r=await api('POST','/admin/api/login',{usuario:'admin',senha:PW});ok(r.s===200&&r.j.csrf,'login correto');csrf=r.j.csrf;
 r=await api('POST','/admin/api/pacotes',{titulo:'x',tipo:'aviso'},{});ok(r.s===403,'POST sem token CSRF recusado');
 r=await api('POST','/admin/api/pacotes',{titulo:'Mal',tipo:'parametros',conteudo:{evil:1}});ok(r.s===400,'parâmetro fora da lista recusado: '+r.j.erro);
 r=await api('POST','/admin/api/pacotes',{titulo:'Mal2',tipo:'rubricas',conteudo:[{sys:'PLANO',nat:'abc'}]});ok(r.s===400,'natureza inválida recusada');
 r=await api('POST','/admin/api/pacotes',{titulo:'Aviso de teste',versao:'1',tipo:'aviso',notas:'Notas do aviso'});ok(r.s===200,'aviso publicado');
 r=await api('POST','/admin/api/pacotes',{titulo:'Salário mínimo',versao:'2',tipo:'parametros',notas:'Reajuste',conteudo:{salMin:1700,consig:{emp:35,cartao:5}}});ok(r.s===200,'parâmetros publicados');
 r=await api('POST','/admin/api/pacotes',{titulo:'Natureza plano',versao:'3',tipo:'rubricas',conteudo:JSON.stringify([{sys:'PLANO',nat:'9912'}])});ok(r.s===200,'rubricas publicadas');
 const conteudo=Buffer.from('conteudo do arquivo de teste');
 r=await api('POST','/admin/api/pacotes',{titulo:'Manual',versao:'4',tipo:'arquivo',arquivos:[{nome:'manual teste.txt',base64:conteudo.toString('base64')}]});ok(r.s===200,'arquivo publicado');
 const pub=await (await fetch(BASE+'/api/atualizacoes?desde=0')).json();ok(pub.pacotes.length===4,'API pública lista 4 pacotes');
 // front
 const d=new JSDOM(fs.readFileSync(__dirname+'/../index.html','utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',beforeParse(w){w.print=()=>{};w.__FP_NOGATE=true;Object.defineProperty(w,'crypto',{value:require('crypto').webcrypto});
  w.fetch=async(u,o)=>{if(/^version\.json/.test(u))return{ok:true,json:async()=>({versao:'9999.0+novo'})};if(w.__adult&&/api\/atualizacoes/.test(u)){const r=await fetch(u);const j=await r.json();j.pacotes[1].payload=j.pacotes[1].payload.replace('1700','9999');return{ok:true,json:async()=>j};}return fetch(u,o);};
  w.AbortController=AbortController;}});
 const w=d.window,ev=s=>w.eval(s);ev(`seedDemo('lp');DB.cfg.updUrl='${BASE}'`);
 w.__adult=true;await ev('updChecar(true)');
 ok(ev('UPDS.invalidos')===1,'pacote adulterado detectado (assinatura inválida): '+ev('UPDS.invalidos'));ok(ev('UPDS.pacotes.length')===3,'3 pacotes legítimos aceitos');ok(ev('UPDS.app.novo')===true,'nova versão do código detectada');
 w.__adult=false;await ev('updChecar(true)');ok(ev('UPDS.pacotes.length')===4&&ev('UPDS.invalidos')===0,'sem adulteração: 4 pacotes verificados');
 const antes=ev('DB.params.salMin'),natAntes=ev(`DB.rubricas.find(r=>r.sys==='PLANO').nat`);
 ev('ACT.updAplicar()');
 ok(ev('DB.params.salMin')===1700,'salário mínimo aplicado ('+antes+' → '+ev('DB.params.salMin')+')');ok(ev(`DB.rubricas.find(r=>r.sys==='PLANO').nat`)==='9912','natureza da rubrica aplicada (antes: "'+natAntes+'")');
 ok(ev('DB.cfg.updSeq')===4&&ev('DB.updApl.length')===4,'histórico e sequência registrados');
 await ev('updChecar(true)');ok(ev('UPDS.pacotes.length')===0,'nada pendente após aplicar');
 // download
 const a=pub.pacotes[3],pl=JSON.parse(a.payload).arquivos[0];let baixado=null;
 w.URL.createObjectURL=b=>{baixado=b;return 'blob:x';};w.URL.revokeObjectURL=()=>{};
 w.document.body.insertAdjacentHTML('beforeend',`<button id="bx" data-id="${pl.id}" data-nome="${pl.nome}" data-sha="${pl.sha256}"></button>`);
 await ev(`ACT.updBaixar(document.getElementById('bx'))`);ok(!!baixado&&baixado.size===conteudo.length,'arquivo baixado com SHA-256 conferido');
 w.document.getElementById('bx').dataset.sha='00'.repeat(32);baixado=null;await ev(`ACT.updBaixar(document.getElementById('bx'))`);ok(baixado===null,'arquivo com hash divergente recusado');
 // desfazer
 w.modalConfirm=(m,yes)=>yes();ev('ACT.updDesfazer()');ok(ev('DB.params.salMin')===antes&&ev(`DB.rubricas.find(r=>r.sys==='PLANO').nat`)===natAntes&&ev('DB.cfg.updSeq')===0&&ev('DB.updApl.length')===0,'desfazer restaura parâmetros e rubricas');
 console.log('   após desfazer: salMin',ev('DB.params.salMin'),'nat',ev(`DB.rubricas.find(r=>r.sys==='PLANO').nat`),'seq',ev('DB.cfg.updSeq'));
 // revogação
 const lst=await api('GET','/admin/api/pacotes');const id=lst.j.pacotes.find(p=>p.tipo==='aviso').id;r=await api('POST','/admin/api/pacotes/'+id+'/revogar',{});ok(r.s===200,'revogação');
 const pub2=await (await fetch(BASE+'/api/atualizacoes?desde=0')).json();ok(pub2.pacotes.length===3&&pub2.revogados.length===1,'pacote revogado deixa de ser servido');
 // limite de tentativas
 cookie='';for(let i=0;i<5;i++)await api('POST','/admin/api/login',{usuario:'admin',senha:'x'+i});r=await api('POST','/admin/api/login',{usuario:'admin',senha:PW});ok(r.s===429,'bloqueio após 5 tentativas erradas');
 const aud=fs.readFileSync(path.join(DATA,'auditoria.log'),'utf8').trim().split('\n').length;ok(aud>=8,'registro de operações do servidor ('+aud+' linhas)');
 console.log(falhas?'FALHAS: '+falhas:'TUDO OK');srv.kill();process.exit(falhas?1:0);})().catch(e=>{console.log('ERRO',e.stack);srv.kill();process.exit(1);});
