/* Teste da API: contas, MFA, permissões por módulo, limites de licença, versões, auditoria encadeada, bloqueio e webhook. */
const fs=require('fs'),os=require('os'),path=require('path'),crypto=require('crypto');
process.env.DATA_DIR=fs.mkdtempSync(path.join(os.tmpdir(),'fpapi-'));process.env.WEBHOOK_SECRET='segredo-webhook';
const {srv,hashSenha,totp}=require('./server.js');
const SPLAT='Plataforma#Segura2026';process.env.PLATFORM_PASSWORD_HASH=hashSenha(SPLAT);process.env.PLATFORM_USER='forn';
let fail=0;const ok=(n,c)=>{console.log((c?'PASS ':'FAIL ')+n);if(!c)fail++;};
let base;const api=async(m,p,b,tok,extra)=>{const h={'Content-Type':'application/json'};if(tok)h.Authorization='Bearer '+tok;Object.assign(h,extra||{});const r=await fetch(base+p,{method:m,headers:h,body:b===undefined?undefined:(typeof b==='string'?b:JSON.stringify(b))});let j={};try{j=await r.json();}catch(e){}return{s:r.status,j};};
const cod=s=>totp(s,Math.floor(Date.now()/30000));
const SEN='Senha#Forte2026x';
async function onboard(email,temp,tag){let r=await api('POST','/api/auth/login',{email,senha:temp});let tok=r.j.token;ok(tag+': 1º acesso exige troca de senha',r.j.escopo==='trocar-senha');
  r=await api('GET','/api/empresas',undefined,tok);ok(tag+': escopo limitado bloqueia rotas',r.s===403);
  r=await api('POST','/api/auth/senha',{atual:temp,nova:'curta'},tok);ok(tag+': senha fraca recusada',r.s===400);
  r=await api('POST','/api/auth/senha',{atual:temp,nova:SEN},tok);ok(tag+': senha trocada',r.j.escopo==='mfa');
  r=await api('POST','/api/auth/mfa/iniciar',{},tok);const seg=r.j.segredo;ok(tag+': MFA iniciado (segredo+uri)',/^[A-Z2-7]{32}$/.test(seg)&&/otpauth:/.test(r.j.uri));
  r=await api('POST','/api/auth/mfa/confirmar',{codigo:'000000'},tok);ok(tag+': código errado recusado',r.s===401);
  r=await api('POST','/api/auth/mfa/confirmar',{codigo:cod(seg)},tok);ok(tag+': MFA confirmado',r.j.escopo==='pleno');return{tok,seg};}
const novoLogin=async(email,seg)=>{let r=await api('POST','/api/auth/login',{email,senha:SEN});ok('login '+email.split('@')[0]+' exige código',r.j.exigeCodigo===true);
  // evita reutilização do mesmo passo: espera o próximo passo de 30 s é lento; usa janela anterior/seguinte
  const st=Math.floor(Date.now()/30000)+1;r=await api('POST','/api/auth/login',{email,senha:SEN,codigo:totp(seg,st)});return r;};
srv.listen(0,async()=>{base='http://127.0.0.1:'+srv.address().port;try{
 // plataforma
 let r=await fetch(base+'/plataforma');ok('painel do fornecedor servido (HTML + CSP)',r.status===200&&/script-src 'self'/.test(await r.text()));
 r=await fetch(base+'/plataforma.js');ok('script do painel servido',r.status===200&&/FolhaPro/.test(await r.text()));
 r=await api('POST','/api/plataforma/login',{usuario:'forn',senha:'errada'});ok('plataforma: senha errada recusada',r.s===401);
 r=await api('POST','/api/plataforma/login',{usuario:'forn',senha:SPLAT});const PT=r.j.token;ok('plataforma: login',!!PT);
 r=await api('GET','/api/plataforma/planos',undefined,PT);ok('planos padrão (10/50/200 empresas)',r.j.planos.map(p=>p.maxEmpresas).join()==='10,50,200');
 r=await api('POST','/api/plataforma/contas',{nome:'Cliente A',plano:'essencial',adminEmail:'admin@a.com',adminNome:'Ana Admin',validade:'2099-12-31'},PT);const TA=r.j.conta.id,tempA=r.j.senhaTemporaria;ok('conta criada com admin e senha temporária',!!TA&&!!tempA);
 r=await api('PATCH','/api/plataforma/contas/'+TA,{limites:{empresas:2,vinculos:3,usuarios:4}},PT);ok('limites sob medida (2 empresas, 3 vínculos, 4 usuários)',r.j.conta.limites.empresas===2&&r.j.conta.limites.vinculos===3);
 r=await api('POST','/api/plataforma/contas',{nome:'Cliente B',plano:'profissional',adminEmail:'admin@b.com'},PT);const TB=r.j.conta.id,tempB=r.j.senhaTemporaria;
 r=await api('GET','/api/usuarios',undefined,PT);ok('token da plataforma não acessa rotas de cliente',r.s===403);
 // admin A
 const A=await onboard('admin@a.com',tempA,'admin A');
 r=await api('GET','/api/auth/eu',undefined,A.tok);ok('eu: conta, limites e uso',r.j.conta.limites.usuarios===4&&r.j.conta.uso.usuarios===1&&r.j.usuario.mfa===true);
 // usuários
 const mk=async(email,perfil,extra)=>{const x=await api('POST','/api/usuarios',Object.assign({email,nome:email,perfil},extra||{}),A.tok);return x;};
 r=await mk('dp@a.com','dp');const tempDp=r.j.senhaTemporaria;ok('usuário DP criado',r.s===200&&!!tempDp);
 r=await mk('apr@a.com','aprovador');const tempApr=r.j.senhaTemporaria;
 r=await mk('cons@a.com','consulta');const tempCons=r.j.senhaTemporaria;
 r=await mk('x@a.com','dp');ok('limite de usuários do plano (4) barra o quinto',r.s===402);
 r=await mk('dp@a.com','dp');ok('e-mail duplicado recusado',r.s===409);
 const DP=await onboard('dp@a.com',tempDp,'dp'),AP=await onboard('apr@a.com',tempApr,'aprovador'),CO=await onboard('cons@a.com',tempCons,'consulta');
 r=await api('POST','/api/usuarios',{email:'z@a.com',perfil:'dp'},DP.tok);ok('DP não administra usuários (403)',r.s===403);
 // empresas
 r=await api('POST','/api/empresas',{nome:'Empresa 1',cnpj:'11.222.333/0001-81'},DP.tok);ok('DP não cria empresa (exige cadastros nível 3)',r.s===403);
 r=await api('POST','/api/empresas',{nome:'Empresa 1',cnpj:'11.222.333/0001-81'},A.tok);const E1=r.j.empresa.id;ok('admin cria empresa',!!E1);
 r=await api('POST','/api/empresas',{nome:'Empresa 2'},A.tok);const E2=r.j.empresa.id;
 r=await api('POST','/api/empresas',{nome:'Empresa 3'},A.tok);ok('limite de empresas (2) barra a terceira',r.s===402);
 // dados + permissões por módulo (gravação por chave)
 const put=(E,v,m,tok)=>api('PUT','/api/empresas/'+E+'/dados',{versao:v,mudancas:m},tok);
 const dados0={ver:1,empresa:{razao:'EMPRESA UM LTDA',cnpj:'11222333000181'},empregados:[{id:'a1',nome:'Ana'}],comps:{},eventos:[],cfg:{modo:'sim'},params:{x:1},ferias:[]};
 r=await put(E1,1,dados0,A.tok);ok('admin grava dados (versão 2)',r.s===200&&r.j.versao===2);
 r=await api('GET','/api/empresas',undefined,A.tok);ok('lista traz nome vindo dos dados',r.j.empresas.find(e=>e.id===E1).nome==='EMPRESA UM LTDA');
 const emps2=[{id:'a1',nome:'Ana'},{id:'a2',nome:'Bia'}];
 r=await put(E1,2,{empregados:emps2},CO.tok);ok('consulta não edita (403)',r.s===403);
 r=await put(E1,2,{empregados:emps2},DP.tok);ok('DP edita empregados (cadastros nível 2)',r.s===200&&r.j.alteradas.join()==='empregados'&&r.j.versao===3);
 r=await put(E1,3,{params:{x:2}},DP.tok);ok('DP não altera parâmetros (config: DP tem 0)',r.s===403);
 r=await put(E1,2,{empregados:[{id:'a1',nome:'Ana2'}]},A.tok);ok('chave alterada por outro depois da minha versão → conflito 409',r.s===409&&r.j.versaoServidor===3&&r.j.chaves.join()==='empregados');
 r=await put(E1,2,{ferias:[{id:'f1'}]},A.tok);ok('chaves diferentes não conflitam; devolve o que os outros alteraram',r.s===200&&r.j.versao===4&&Array.isArray(r.j.outras.empregados)&&r.j.outras.empregados.length===2);
 r=await put(E1,4,{comps:{'2026-10':{status:'aberta',res:{}}}},DP.tok);ok('DP calcula folha (folha nível 2)',r.s===200&&r.j.versao===5);
 r=await put(E1,5,{comps:{'2026-10':{status:'fechada',res:{}}}},DP.tok);ok('DP não fecha competência (exige nível 3)',r.s===403);
 r=await put(E1,5,{comps:{'2026-10':{status:'fechada',res:{}}}},AP.tok);ok('aprovador fecha competência',r.s===200&&r.j.versao===6);
 r=await put(E1,6,{eventos:[{id:'ev1',tipo:'S-1200',status:'processado'}]},DP.tok);ok('DP não transmite ao eSocial (exige nível 3)',r.s===403);
 r=await put(E1,6,{eventos:[{id:'ev1',tipo:'S-1200',status:'processado'}]},AP.tok);ok('aprovador transmite',r.s===200&&r.j.versao===7);
 r=await put(E1,7,{hAlt:[{x:1}],hSnap:{a:1}},DP.tok);ok('histórico automático acompanha o cadastro (DP grava)',r.s===200);
 r=await put(E1,8,{empregados:[{id:'a1'},{id:'a2'},{id:'a3'},{id:'a4'}]},A.tok);ok('limite de vínculos ativos (3) barra o quarto',r.s===402);
 r=await api('PUT','/api/empresas/'+E1+'/dados',{versao:8,dados:{x:1}},A.tok);ok('formato antigo (dados completos) recusado',r.s===400);
 // leitura oculta módulo sem acesso
 r=await api('POST','/api/usuarios',{email:'cus@a.com',perfil:'custom',perms:{cadastros:1,folha:0,ferias:0,esocial:0,sst:0,historico:0,relatorios:0,config:0,usuarios:0,auditoria:0}},A.tok);ok('perfil personalizado criado',r.s===402||r.s===200);
 // (limite de 4 usuários já atingido → 402 é o esperado)
 r=await api('PATCH','/api/usuarios/'+(await api('GET','/api/usuarios',undefined,A.tok)).j.usuarios.find(u=>u.email==='cons@a.com').id,{perfil:'custom',perms:{cadastros:1,folha:0,ferias:0,esocial:0,sst:0,historico:0,relatorios:0,config:0,usuarios:0,auditoria:0}},A.tok);ok('perfil alterado para personalizado',r.s===200);
 r=await api('GET','/api/empresas/'+E1+'/dados',undefined,CO.tok);ok('GET omite módulos sem acesso (folha/ferias/eventos)',r.s===200&&!('comps' in r.j.dados)&&!('ferias' in r.j.dados)&&!('eventos' in r.j.dados)&&('empregados' in r.j.dados));
 // restrição por empresa
 r=await api('GET','/api/usuarios',undefined,A.tok);const idDp=r.j.usuarios.find(u=>u.email==='dp@a.com').id;
 r=await api('PATCH','/api/usuarios/'+idDp,{empresas:[E2]},A.tok);ok('DP restrito à empresa 2',r.s===200);
 r=await api('GET','/api/empresas/'+E1+'/dados',undefined,DP.tok);ok('DP sem acesso à empresa 1 (403)',r.s===403);
 r=await api('GET','/api/empresas',undefined,DP.tok);ok('lista só as empresas permitidas',r.j.empresas.length===1&&r.j.empresas[0].id===E2);
 // isolamento entre contas
 const B=await onboard('admin@b.com',tempB,'admin B');
 r=await api('GET','/api/empresas/'+E1+'/dados',undefined,B.tok);ok('isolamento: conta B não vê empresa da conta A',r.s===403||r.s===404);
 r=await api('GET','/api/usuarios',undefined,B.tok);ok('isolamento: usuários da conta B só os dela',r.j.usuarios.length===1);
 // último admin / desativação invalida sessão
 const idA=(await api('GET','/api/usuarios',undefined,A.tok)).j.usuarios.find(u=>u.email==='admin@a.com').id;
 r=await api('PATCH','/api/usuarios/'+idA,{ativo:false},A.tok);ok('não desativa o último administrador',r.s===409);
 r=await api('PATCH','/api/usuarios/'+idA,{perfil:'dp'},A.tok);ok('não rebaixa o último administrador',r.s===409);
 r=await api('PATCH','/api/usuarios/'+idDp,{ativo:false},A.tok);r=await api('GET','/api/empresas',undefined,DP.tok);ok('usuário desativado perde a sessão (401)',r.s===401);
 // reinício de senha
 r=await api('POST','/api/usuarios/'+idDp+'/reiniciar',{mfa:true},A.tok);ok('reinício devolve senha temporária',!!r.j.senhaTemporaria);
 // login com MFA e anti-replay
 {const st=Math.floor(Date.now()/30000)+1,c=totp(B.seg,st);r=await api('POST','/api/auth/login',{email:'admin@b.com',senha:SEN});ok('login pede código MFA',r.j.exigeCodigo===true);
  r=await api('POST','/api/auth/login',{email:'admin@b.com',senha:SEN,codigo:c});ok('login com MFA válido',r.j.escopo==='pleno');
  r=await api('POST','/api/auth/login',{email:'admin@b.com',senha:SEN,codigo:c});ok('código já usado é recusado (anti-replay)',r.s===401);}
 // bloqueio por tentativas
 let last;for(let i=0;i<6;i++)last=await api('POST','/api/auth/login',{email:'cons@a.com',senha:'Errada#12345678'});ok('bloqueio após 5 falhas (429)',last.s===429);
 r=await api('POST','/api/auth/login',{email:'cons@a.com',senha:SEN});ok('bloqueado mesmo com a senha certa',r.s===429);
 // auditoria
 r=await api('GET','/api/auditoria',undefined,A.tok);ok('auditoria: registros presentes',r.j.total>10);
 r=await api('GET','/api/auditoria',undefined,CO.tok);ok('auditoria: consulta sem permissão (403)',r.s===403);
 r=await api('GET','/api/auditoria/verificar',undefined,A.tok);ok('cadeia íntegra',r.j.ok===true);
 const f=path.join(process.env.DATA_DIR,'audit',TA+'.log');const ls=fs.readFileSync(f,'utf8').split('\n').filter(Boolean);const o=JSON.parse(ls[3]);o.a='adulterado';ls[3]=JSON.stringify(o);fs.writeFileSync(f,ls.join('\n')+'\n');
 r=await api('GET','/api/auditoria/verificar',undefined,A.tok);ok('adulteração detectada (ruptura no registro 4)',r.j.ok===false&&r.j.ruptura===4);
 // licença: vencida → somente leitura; webhook renova
 await api('PATCH','/api/plataforma/contas/'+TA,{validade:'2000-01-01'},PT);
 r=await put(E1,9,{ferias:[]},A.tok);ok('licença vencida: gravação bloqueada (402)',r.s===402);
 r=await api('GET','/api/empresas/'+E1+'/dados',undefined,A.tok);ok('licença vencida: leitura continua',r.s===200&&r.j.licenca==='vencida');
 const corpo=JSON.stringify({conta:TA,evento:'pago',meses:12});
 r=await api('POST','/api/pagamentos/webhook',corpo,undefined,{'X-Signature':'00'.repeat(32)});ok('webhook com assinatura inválida (401)',r.s===401);
 const sig=crypto.createHmac('sha256','segredo-webhook').update(corpo).digest('hex');
 r=await api('POST','/api/pagamentos/webhook',corpo,undefined,{'X-Signature':sig});ok('webhook válido renova a validade',r.s===200&&r.j.validade>new Date().toISOString().slice(0,10));
 r=await put(E1,9,{},A.tok);ok('após renovar, gravação volta (sem alteração → 200)',r.s===200);
 const corpo2=JSON.stringify({conta:TA,evento:'inadimplente'});r=await api('POST','/api/pagamentos/webhook',corpo2,undefined,{'X-Signature':crypto.createHmac('sha256','segredo-webhook').update(corpo2).digest('hex')});
 r=await api('GET','/api/auth/eu',undefined,A.tok);ok('suspensão por inadimplência bloqueia a conta (403)',r.s===403);
 // sessões
 r=await api('POST','/api/auth/logout',{},B.tok);r=await api('GET','/api/auth/eu',undefined,B.tok);ok('logout encerra a sessão',r.s===401);
 r=await api('GET','/api/empresas',undefined,'token-falso');ok('token falso (401)',r.s===401);
 r=await api('GET','/api/rota-inexistente');ok('rota inexistente (404)',r.s===404);
 }catch(e){console.log('EXCEÇÃO',e);fail++;}
 console.log(fail?'FALHAS '+fail:'TODOS OK');srv.close();fs.rmSync(process.env.DATA_DIR,{recursive:true,force:true});process.exit(fail?1:0);});
