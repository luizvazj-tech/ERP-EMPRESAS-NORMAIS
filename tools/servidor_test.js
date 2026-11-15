/* Ponta a ponta do modo servidor: o app (jsdom) contra a API real — login, troca de senha, MFA, empresa, gravação, permissões, usuários. */
const fs=require('fs'),os=require('os'),path=require('path');
process.env.DATA_DIR=fs.mkdtempSync(path.join(os.tmpdir(),'fpe2e-'));
const api=require('../api/server.js');const {JSDOM}=require('jsdom');
const SPLAT='Plataforma#Segura2026';process.env.PLATFORM_PASSWORD_HASH=api.hashSenha(SPLAT);process.env.PLATFORM_USER='forn';
let fail=0;const ok=(n,c)=>{console.log((c?'PASS ':'FAIL ')+n);if(!c)fail++;};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
api.srv.listen(0,async()=>{const URL_='http://127.0.0.1:'+api.srv.address().port;
 const call=async(m,p,b,t)=>{const r=await fetch(URL_+p,{method:m,headers:Object.assign({'Content-Type':'application/json'},t?{Authorization:'Bearer '+t}:{}),body:b===undefined?undefined:JSON.stringify(b)});return{s:r.status,j:await r.json()};};
 try{
 const PT=(await call('POST','/api/plataforma/login',{usuario:'forn',senha:SPLAT})).j.token;
 const c=(await call('POST','/api/plataforma/contas',{nome:'Cliente E2E',plano:'essencial',adminEmail:'adm@e2e.com',adminNome:'Adm E2E',validade:'2099-01-01'},PT)).j;
 const html=fs.readFileSync(__dirname+'/../index.html','utf8').replace('<meta name="fp-api" content="">','<meta name="fp-api" content="'+URL_+'">');
 const errs=[];
 const novo=()=>{const d=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',beforeParse(w){w.addEventListener('error',e=>errs.push('ERR '+e.message));w.print=()=>{};Object.defineProperty(w,'crypto',{value:require('crypto').webcrypto,configurable:true});w.fetch=(u,o)=>fetch(u,o);w.scrollTo=()=>{};}});return d.window;};
 const ent=async(w,email,senha)=>{const q=s=>w.document.querySelector(s);q('#sve').value=email;q('#svs').value=senha;q('#svok').click();await sleep(700);};
 const totp=api.totp;const cod=(seg,extra)=>totp(seg,Math.floor(Date.now()/30000)+(extra||0));
 // ---- administrador: 1º acesso
 let w=novo();await sleep(900);const q=s=>w.document.querySelector(s),ev=s=>w.eval(s);
 ok('modo servidor ativo: tela de login, sem dados no navegador',!!q('#gate')&&!!q('#sve')&&ev('DB')===null&&!Object.keys(w.localStorage).some(k=>/folhaPro\.v1|vault|^fp\.v/i.test(k)));
 await ent(w,'adm@e2e.com','senhaerrada');ok('senha errada mostra erro',/inválidos/.test(q('#sver').textContent));
 await ent(w,'adm@e2e.com',c.senhaTemporaria);ok('1º acesso: pede nova senha',!!q('#svn'));
 const SEN='Senha#Forte2026x';q('#svn').value='fraca';q('#svn2').value='fraca';q('#svok').click();await sleep(400);ok('senha fraca recusada na tela',/12\+? caracteres/.test(q('#sver').textContent));
 q('#svn').value=SEN;q('#svn2').value=SEN;q('#svok').click();await sleep(700);ok('segue para o cadastro do MFA',!!q('#svk'));
 const seg=q('#svk').textContent;q('#svc').value=cod(seg);q('#svok').click();await sleep(900);
 ok('MFA ativado: escolha de empresa',/Escolha|Nenhuma empresa/.test(q('#gate').textContent)&&/Essencial|essencial/i.test(q('#gate').textContent));
 w.eval(`ACT.svNovaEmp()`);q('#svnn').value='Padaria Teste';q('#svnok').click();await sleep(900);
 ok('empresa criada e aberta (app carregado)',ev('SV.emp')&&ev('DB')&&!q('#gate')&&/Início|Cadastr/.test(q('#side').textContent));
 ok('botões Sair e Empresa no topo',!!q('#svsair')&&!!q('#svtroca'));
 // gravação
 ev(`DB.empregados.push({id:'x1',nome:'Teste Um',salario:'2000'});saveDB()`);await sleep(1200);
 let r=await call('GET','/api/empresas',undefined,ev('SV.tok'));const emp=r.j.empresas[0];ok('alteração gravada no servidor (versão avançou, 1 vínculo)',emp.versao>=2&&emp.vinculos===1);
 ok('nada gravado no navegador (sem chaves de dados)',!Object.keys(w.localStorage).some(k=>/folhaPro\.v1|vault|^fp\.v/i.test(k))&&!Object.values(w.localStorage).some(v=>/Teste Um/.test(v)));
 // menu completo do admin
 const side=q('#side').textContent;ok('admin vê Usuários, Licença e Registro de ações',/Usuários e permissões/.test(side)&&/Licença e plano/.test(side)&&/Registro de ações/.test(side));
 ok('itens do modo local (cofre/segurança local, trilha local) ocultos',!w.document.querySelector('#side [data-to="seguranca"]')&&!w.document.querySelector('#side [data-to="auditoria"]'));
 // telas
 ev(`go('licenca')`);await sleep(600);ok('tela de licença mostra limites e uso',/Empresas/.test(q('#svlic').textContent)&&/Vínculos/.test(q('#svlic').textContent));
 ev(`go('usuarios')`);await sleep(700);ok('tela de usuários lista o administrador',/adm@e2e.com/.test(q('#svusr').textContent));
 // criar usuário Consulta via formulário
 ev(`ACT.svUsrNovo()`);q('[name=nome]').value='Carlos Consulta';q('[name=email]').value='cons@e2e.com';q('[name=perfil]').value='consulta';q('[name=perfil]').onchange();q('#svusok').click();await sleep(900);
 const tmp=(q('#modal code')||{}).textContent;ok('usuário criado e senha temporária exibida uma vez',!!tmp);
 // custom: muda um nível e perfil vira personalizado
 ev(`closeModal()`);await sleep(100);
 // ---- usuário Consulta
 const w2=novo();await sleep(900);const q2=s=>w2.document.querySelector(s),ev2=s=>w2.eval(s);
 await ent(w2,'cons@e2e.com',tmp);q2('#svn').value=SEN;q2('#svn2').value=SEN;q2('#svok').click();await sleep(700);const seg2=q2('#svk').textContent;q2('#svc').value=cod(seg2);q2('#svok').click();await sleep(900);
 q2('[data-act="svAbrir"]').click();await sleep(900);
 ok('consulta abre a empresa',!!ev2('DB')&&!q2('#gate'));
 const s2=q2('#side').textContent;ok('consulta não vê Usuários nem Registro de ações',!/Usuários e permissões/.test(s2)&&!/Registro de ações/.test(s2)&&/Empregados/.test(s2));
 ev2(`go('usuarios')`);await sleep(200);ok('navegação a módulo sem acesso é barrada',ev2('NAV.cur.name')!=='usuarios');
 ev2(`go('empregados')`);await sleep(300);ok('consulta: tela só leitura (banner)',/Somente visualização/.test(q2('#main').textContent));
 ev2(`DB.empregados.push({id:'x2',nome:'Intruso',salario:'1'});saveDB()`);await sleep(1200);
 ok('servidor recusou a gravação do consulta e a tela voltou ao estado do servidor',ev2('DB.empregados.length')===1);
 // ---- admin altera o perfil do consulta para editar cadastros (custom) e o usuário passa a gravar
 const us=(await call('GET','/api/usuarios',undefined,ev('SV.tok'))).j.usuarios.find(u=>u.email==='cons@e2e.com');
 await call('PATCH','/api/usuarios/'+us.id,{perfil:'dp'},ev('SV.tok'));
 q2('#svsair').click();await sleep(300);
 // ---- licença vencida: leitura apenas
 await call('PATCH','/api/plataforma/contas/'+c.conta.id,{validade:'2000-01-01'},PT);
 ev(`ACT.svTroca()`);await sleep(600);q('[data-act="svAbrir"]').click();await sleep(900);
 ok('licença vencida: aviso no topo da tela',/Licença:/.test(q('#main').textContent));
 ev(`DB.empregados.push({id:'x3',nome:'Bloq',salario:'1'});saveDB()`);await sleep(1200);ok('licença vencida: gravação recusada e revertida',ev('DB.empregados.length')===1);
 // ---- conflito de versão
 await call('PATCH','/api/plataforma/contas/'+c.conta.id,{validade:'2099-01-01'},PT);
 const tokB=(await call('POST','/api/auth/login',{email:'cons@e2e.com',senha:SEN,codigo:cod(seg2,1)})).j.token;ok('login por API com MFA do 2º usuário',!!tokB);
 const verSrv=(await call('GET','/api/empresas/'+emp.id+'/dados',undefined,tokB)).j.versao;
 const d=(await call('GET','/api/empresas/'+emp.id+'/dados',undefined,tokB)).j.dados;d.empregados.push({id:'y1',nome:'Outro usuário',salario:'1'});
 await call('PUT','/api/empresas/'+emp.id+'/dados',{versao:verSrv,mudancas:{empregados:d.empregados}},tokB);
 ev(`DB.empregados.push({id:'x4',nome:'Conflito',salario:'1'});saveDB()`);await sleep(1300);
 ok('conflito de versão: aviso de recarga ao usuário',/outro usuário/i.test(q('#modal').textContent));
 q('[data-act="svRecarregar"]').click();await sleep(900);ok('após recarregar aparece o dado do outro usuário',ev('DB.empregados.some(e=>e.id==="y1")'));
 // auditoria na tela
 ev(`go('auditSrv')`);await sleep(700);ok('registro de ações exibido na tela',/dados gravados/.test(q('#svau').textContent)&&/login/.test(q('#svau').textContent));
 q('[data-act="svAudVer"]');ev(`ACT.svAudVer()`);await sleep(400);ok('verificação de integridade pela tela',/íntegra/.test(q('#toast').textContent));
 // sair
 q('#svsair').click();await sleep(500);ok('sair volta ao login e limpa os dados da memória',!!q('#sve')&&ev('DB')===null);
 ok('sem erros de script',!errs.length);if(errs.length)console.log(errs.slice(0,5));
 }catch(e){console.log('EXCEÇÃO',e);fail++;}
 console.log(fail?'FALHAS '+fail:'TODOS OK');api.srv.close();fs.rmSync(process.env.DATA_DIR,{recursive:true,force:true});process.exit(fail?1:0);});
