'use strict';
/* API do FolhaPro — sem dependências externas (Node 18+).
   Contas (clientes), usuários com perfis e permissões por módulo, MFA (TOTP), sessões, auditoria encadeada (hash),
   dados das empresas com controle de versão e licenças por faixa (empresas, vínculos ativos, usuários).
   Variáveis: PORT, DATA_DIR (disco persistente!), ALLOWED_ORIGIN, PLATFORM_USER, PLATFORM_PASSWORD_HASH (scrypt "s1$N$salt$hash"),
              PLATFORM_TOTP_SECRET (base32, opcional), WEBHOOK_SECRET (HMAC do webhook de pagamento), SESSION_MIN (idle, padrão 30). */
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=+process.env.PORT||8790,DATA=path.resolve(process.env.DATA_DIR||path.join(__dirname,'data'));
const ORIGIN=process.env.ALLOWED_ORIGIN||'*',SESSION_MS=(+process.env.SESSION_MIN||30)*60000,MAX_BODY=25*1024*1024,GRACE_DIAS=7;
fs.mkdirSync(path.join(DATA,'empresas'),{recursive:true});fs.mkdirSync(path.join(DATA,'audit'),{recursive:true});
/* ---------- armazenamento (JSON atômico; trocar por banco mantendo estas funções) ---------- */
const F={tenants:path.join(DATA,'tenants.json'),users:path.join(DATA,'users.json'),planos:path.join(DATA,'planos.json')};
const rd=(f,d)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'));}catch(e){return d;}};
const wr=(f,o)=>{const t=f+'.'+process.pid+'.tmp';fs.writeFileSync(t,JSON.stringify(o));fs.renameSync(t,f);};
let TENANTS=rd(F.tenants,[]),USERS=rd(F.users,[]);
const PLANOS_PADRAO=[
 {id:'essencial',nome:'Essencial (até 10 empresas)',maxEmpresas:10,maxVinculos:300,maxUsuarios:5,preco:null},
 {id:'profissional',nome:'Profissional (até 50 empresas)',maxEmpresas:50,maxVinculos:1500,maxUsuarios:15,preco:null},
 {id:'corporativo',nome:'Corporativo (até 200 empresas)',maxEmpresas:200,maxVinculos:6000,maxUsuarios:50,preco:null}];
let PLANOS=rd(F.planos,null);if(!PLANOS){PLANOS=PLANOS_PADRAO;wr(F.planos,PLANOS);}
const saveT=()=>wr(F.tenants,TENANTS),saveU=()=>wr(F.users,USERS),saveP=()=>wr(F.planos,PLANOS);
/* ---------- módulos e níveis ---------- */
const MODULOS=['cadastros','folha','ferias','esocial','sst','historico','relatorios','config','usuarios','auditoria','contabil','financeiro'];
/* níveis: 0 sem acesso · 1 visualizar · 2 editar · 3 aprovar/fechar/enviar · 4 administrar */
const PERFIS={
 admin:Object.fromEntries(MODULOS.map(m=>[m,4])),
 dp:{cadastros:2,folha:2,ferias:2,esocial:1,sst:2,historico:2,relatorios:2,config:0,usuarios:0,auditoria:0,contabil:0,financeiro:0},
 aprovador:{cadastros:1,folha:3,ferias:3,esocial:3,sst:1,historico:1,relatorios:2,config:0,usuarios:0,auditoria:0,contabil:0,financeiro:0},
 consulta:{cadastros:1,folha:1,ferias:1,esocial:1,sst:1,historico:1,relatorios:1,config:0,usuarios:0,auditoria:0,contabil:0,financeiro:0},
 auditor:{cadastros:1,folha:1,ferias:1,esocial:1,sst:1,historico:1,relatorios:1,config:0,usuarios:0,auditoria:1,contabil:1,financeiro:1}};
/* chave de nível superior do banco do cliente -> módulo que a controla */
const CHAVE_MOD={rf:'esocial',empresa:'cadastros',estabs:'cadastros',lotacoes:'cadastros',cargos:'cadastros',rubricas:'cadastros',empregados:'cadastros',movs:'cadastros',cct:'cadastros',
 comps:'folha',decimo:'folha',dctf:'esocial',ctb:'contabil',fin:'financeiro',ferias:'ferias',rescisoes:'ferias',eventos:'esocial',entregues:'folha',sstCat:'sst',sstAso:'sst',sstRisco:'sst',
 hAdv:'historico',hCurso:'historico',atest:'historico',hAlt:'cadastros',hSnap:'cadastros',saude:'historico',params:'config',cfg:'config',seq:'esocial',updUndo:'config',updApl:'config'};
const IGNORAR=new Set(['audit','_emps','_id','_exemplo','ver']);
/* ---------- utilidades ---------- */
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const uid=p=>p+crypto.randomBytes(6).toString('hex');
function hashSenha(p){const salt=crypto.randomBytes(16),N=32768;const h=crypto.scryptSync(String(p),salt,64,{N,r:8,p:1,maxmem:128*1024*1024});return `s1$${N}$${salt.toString('hex')}$${h.toString('hex')}`;}
function confSenha(p,s){try{const [v,N,salt,h]=String(s).split('$');if(v!=='s1')return false;const x=crypto.scryptSync(String(p),Buffer.from(salt,'hex'),64,{N:+N,r:8,p:1,maxmem:128*1024*1024});const y=Buffer.from(h,'hex');return x.length===y.length&&crypto.timingSafeEqual(x,y);}catch(e){return false;}}
const senhaOk=p=>{p=String(p||'');let c=0;if(/[a-z]/.test(p))c++;if(/[A-Z]/.test(p))c++;if(/\d/.test(p))c++;if(/[^A-Za-z0-9]/.test(p))c++;return p.length>=12&&c>=3;};
const B32='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const b32enc=b=>{let bits='',o='';for(const x of b)bits+=x.toString(2).padStart(8,'0');for(let i=0;i<bits.length;i+=5)o+=B32[parseInt(bits.slice(i,i+5).padEnd(5,'0'),2)];return o;};
const b32dec=s=>{let bits='';for(const c of String(s).replace(/=+$/,'').toUpperCase())bits+=B32.indexOf(c).toString(2).padStart(5,'0');const o=[];for(let i=0;i+8<=bits.length;i+=8)o.push(parseInt(bits.slice(i,i+8),2));return Buffer.from(o);};
function totp(secret,step){const b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(step));const h=crypto.createHmac('sha1',b32dec(secret)).update(b).digest();const o=h[19]&15;return String((h.readUInt32BE(o)&0x7fffffff)%1000000).padStart(6,'0');}
function totpOk(secret,code,lastUsed){const st=Math.floor(Date.now()/30000);code=String(code||'').replace(/\s/g,'');for(const d of[0,-1,1]){const s=st+d;if(s<=(lastUsed||0))continue;if(code.length===6&&crypto.timingSafeEqual(Buffer.from(totp(secret,s)),Buffer.from(code)))return s;}return 0;}
const novoSegredo=()=>b32enc(crypto.randomBytes(20));
/* ---------- auditoria encadeada ---------- */
function auditar(tenantId,usuario,acao,det){const f=path.join(DATA,'audit',(tenantId||'_plataforma')+'.log');let prev='0'.repeat(64),n=0;
  try{const s=fs.readFileSync(f,'utf8').trimEnd();if(s){const l=s.slice(s.lastIndexOf('\n')+1);const o=JSON.parse(l);prev=o.h;n=o.n;}}catch(e){}
  const r={n:n+1,ts:new Date().toISOString(),u:usuario||'-',a:acao,d:det==null?'':typeof det==='string'?det.slice(0,400):det};r.h=sha(prev+JSON.stringify([r.n,r.ts,r.u,r.a,r.d]));fs.appendFileSync(f,JSON.stringify(r)+'\n');return r;}
function lerAuditoria(tenantId){try{return fs.readFileSync(path.join(DATA,'audit',tenantId+'.log'),'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));}catch(e){return[];}}
function verificaCadeia(tenantId){let prev='0'.repeat(64);for(const r of lerAuditoria(tenantId)){const h=sha(prev+JSON.stringify([r.n,r.ts,r.u,r.a,r.d]));if(h!==r.h)return{ok:false,ruptura:r.n};prev=r.h;}return{ok:true};}
/* ---------- sessões e limitação ---------- */
const SESS=new Map(),FALHAS=new Map();
const ipDe=r=>String(r.headers['x-forwarded-for']||r.socket.remoteAddress||'').split(',')[0].trim();
function novaSessao(o){const t=crypto.randomBytes(32).toString('base64url');SESS.set(sha(t),Object.assign({exp:Date.now()+SESSION_MS},o));return t;}
function sessaoDe(r){const a=String(r.headers.authorization||'');if(!a.startsWith('Bearer '))return null;const k=sha(a.slice(7));const s=SESS.get(k);if(!s)return null;if(s.exp<Date.now()){SESS.delete(k);return null;}s.exp=Date.now()+SESSION_MS;s.k=k;return s;}
const hdr=x=>Object.assign({'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-store','Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Headers':'Content-Type, Authorization, X-Signature','Access-Control-Allow-Methods':'GET,POST,PUT,PATCH,DELETE,OPTIONS','Vary':'Origin'},x||{});
const json=(res,c,o)=>{res.writeHead(c,hdr({'Content-Type':'application/json; charset=utf-8'}));res.end(JSON.stringify(o));};
class Erro extends Error{constructor(c,m,x){super(m);this.c=c;this.x=x;}}
const corpoRaw=req=>new Promise((ok,no)=>{let n=0;const b=[];req.on('data',c=>{n+=c.length;if(n>MAX_BODY){no(new Erro(413,'Corpo excede o limite.'));req.destroy();}else b.push(c);});req.on('end',()=>ok(Buffer.concat(b)));req.on('error',no);});
async function corpo(req){const b=await corpoRaw(req);if(!b.length)return{};try{return JSON.parse(b.toString('utf8'));}catch(e){throw new Erro(400,'JSON inválido.');}}
/* ---------- licença ---------- */
const hojeISO=()=>new Date().toISOString().slice(0,10);
function estadoLicenca(t){if(t.status==='suspensa')return'suspensa';if(!t.validade)return'ativa';const d=(Date.parse(hojeISO())-Date.parse(t.validade))/864e5;if(d<=0)return'ativa';if(d<=GRACE_DIAS)return'carencia';return'vencida';}
function limitesDe(t){const p=PLANOS.find(x=>x.id===t.plano)||{};return{empresas:t.limites&&t.limites.empresas!=null?t.limites.empresas:p.maxEmpresas,vinculos:t.limites&&t.limites.vinculos!=null?t.limites.vinculos:p.maxVinculos,usuarios:t.limites&&t.limites.usuarios!=null?t.limites.usuarios:p.maxUsuarios};}
const dirEmp=t=>path.join(DATA,'empresas',t);
const listaEmp=t=>{try{return fs.readdirSync(dirEmp(t)).filter(f=>f.endsWith('.json')).map(f=>rd(path.join(dirEmp(t),f),null)).filter(Boolean);}catch(e){return[];}};
const vinculosAtivos=d=>(d&&d.empregados||[]).filter(e=>!e.desligamento).length;
function uso(t){const es=listaEmp(t.id);return{empresas:es.length,vinculos:es.reduce((a,e)=>a+vinculosAtivos(e.dados),0),usuarios:USERS.filter(u=>u.tenant===t.id&&u.ativo).length};}
function exigeEscrita(t){const s=estadoLicenca(t);if(s==='vencida'||s==='suspensa')throw new Erro(402,'Licença '+(s==='vencida'?'vencida':'suspensa')+': o sistema está em modo somente leitura. Regularize a licença para editar.');}
/* ---------- permissões ---------- */
const nivel=(u,m)=>u.perfil==='admin'?4:Math.max(0,Math.min(4,+((u.perms||{})[m]||0)));
const exige=(u,m,n)=>{if(nivel(u,m)<n)throw new Erro(403,'Sem permissão: módulo '+m+' exige nível '+n+'.');};
const pubUser=u=>({id:u.id,nome:u.nome,email:u.email,perfil:u.perfil,perms:u.perfil==='admin'?PERFIS.admin:u.perms,empresas:u.empresas,ativo:u.ativo,mfa:!!(u.mfa&&u.mfa.on),trocar:!!u.trocar});
function usuarioAuth(req,opc){const s=sessaoDe(req);if(!s)throw new Erro(401,'Sessão expirada ou ausente.');if(s.plataforma){if(!opc||!opc.plataforma)throw new Erro(403,'Acesso restrito.');return{s};}
  if(opc&&opc.plataforma)throw new Erro(403,'Acesso restrito.');const u=USERS.find(x=>x.id===s.uid);if(!u||!u.ativo)throw new Erro(401,'Usuário inativo.');
  if(s.escopo!=='pleno'&&!(opc&&opc.limitado))throw new Erro(403,'Conclua a troca de senha/MFA antes de continuar.',{escopo:s.escopo});
  const t=TENANTS.find(x=>x.id===u.tenant);if(!t||t.status==='suspensa')throw new Erro(403,'Conta suspensa.');return{s,u,t};}
const acessaEmpresa=(u,eid)=>u.empresas==='todas'||(Array.isArray(u.empresas)&&u.empresas.includes(eid));
/* ---------- login ---------- */
function falha(chave){const f=FALHAS.get(chave)||{n:0,ate:0};f.n++;if(f.n>=5){f.ate=Date.now()+15*60000;f.n=0;}FALHAS.set(chave,f);}
const bloqueado=chave=>{const f=FALHAS.get(chave);return f&&f.ate>Date.now()?Math.ceil((f.ate-Date.now())/1000):0;};
async function login(req,b){const email=String(b.email||'').trim().toLowerCase();const ck=ipDe(req)+'|'+email,ck2='u|'+email;
  const w=Math.max(bloqueado(ck),bloqueado(ck2));if(w)throw new Erro(429,'Muitas tentativas. Tente novamente em '+Math.ceil(w/60)+' min.');
  const u=USERS.find(x=>x.email===email);const ok=u&&u.ativo&&confSenha(b.senha,u.hash);
  if(!u)crypto.scryptSync('x',Buffer.alloc(16),64,{N:32768,r:8,p:1,maxmem:128*1024*1024});
  if(!ok){falha(ck);falha(ck2);if(u)auditar(u.tenant,u.email,'login falhou','senha');throw new Erro(401,'Usuário ou senha inválidos.');}
  const t=TENANTS.find(x=>x.id===u.tenant);if(!t||t.status==='suspensa')throw new Erro(403,'Conta suspensa. Contate o fornecedor.');
  if(u.mfa&&u.mfa.on){const st=totpOk(u.mfa.secret,b.codigo,u.mfa.ult);if(!b.codigo)return{exigeCodigo:true};if(!st){falha(ck);falha(ck2);auditar(u.tenant,u.email,'login falhou','mfa');throw new Erro(401,'Código de verificação inválido.');}u.mfa.ult=st;saveU();}
  FALHAS.delete(ck);FALHAS.delete(ck2);
  const escopo=u.trocar?'trocar-senha':(u.mfa&&u.mfa.on)?'pleno':'mfa';
  const token=novaSessao({uid:u.id,tenant:u.tenant,escopo});auditar(u.tenant,u.email,'login',escopo);
  return{token,escopo,usuario:pubUser(u),licenca:{estado:estadoLicenca(t),validade:t.validade||null}};}
/* ---------- rotas ---------- */
const R=[];const rota=(m,re,fn)=>R.push([m,new RegExp('^'+re+'$'),fn]);
rota('GET','/api/saude',async()=>({ok:true,versao:'1.0',hora:new Date().toISOString()}));
rota('POST','/api/auth/login',async(req,res,b)=>login(req,b));
rota('POST','/api/auth/logout',async(req)=>{const s=sessaoDe(req);if(s)SESS.delete(s.k);return{ok:true};});
rota('GET','/api/auth/eu',async(req)=>{const{u,t}=usuarioAuth(req,{limitado:true});return{usuario:pubUser(u),conta:{id:t.id,nome:t.nome,plano:t.plano,validade:t.validade||null,estado:estadoLicenca(t),limites:limitesDe(t),uso:uso(t)},modulos:MODULOS};});
rota('POST','/api/auth/senha',async(req,res,b)=>{const{s,u}=usuarioAuth(req,{limitado:true});if(s.escopo==='mfa')throw new Erro(403,'Cadastre o MFA primeiro.');
  if(!confSenha(b.atual,u.hash))throw new Erro(401,'Senha atual incorreta.');if(!senhaOk(b.nova))throw new Erro(400,'A senha deve ter 12+ caracteres e ao menos 3 entre minúscula, maiúscula, número e símbolo.');if(b.nova===b.atual)throw new Erro(400,'A nova senha deve ser diferente.');
  u.hash=hashSenha(b.nova);u.trocar=false;saveU();auditar(u.tenant,u.email,'senha alterada','');s.escopo=(u.mfa&&u.mfa.on)?'pleno':'mfa';return{ok:true,escopo:s.escopo};});
rota('POST','/api/auth/mfa/iniciar',async(req)=>{const{s,u}=usuarioAuth(req,{limitado:true});if(s.escopo==='trocar-senha')throw new Erro(403,'Troque a senha primeiro.');if(u.mfa&&u.mfa.on)throw new Erro(409,'MFA já ativo.');
  u.mfa={on:false,secret:novoSegredo()};saveU();return{segredo:u.mfa.secret,uri:`otpauth://totp/FolhaPro:${encodeURIComponent(u.email)}?secret=${u.mfa.secret}&issuer=FolhaPro&digits=6&period=30`};});
rota('POST','/api/auth/mfa/confirmar',async(req,res,b)=>{const{s,u}=usuarioAuth(req,{limitado:true});if(!u.mfa||!u.mfa.secret||u.mfa.on)throw new Erro(409,'Inicie o cadastro do MFA.');
  const st=totpOk(u.mfa.secret,b.codigo,0);if(!st)throw new Erro(401,'Código inválido.');u.mfa.on=true;u.mfa.ult=st;saveU();s.escopo='pleno';auditar(u.tenant,u.email,'mfa ativado','');return{ok:true,escopo:'pleno'};});
/* usuários */
rota('GET','/api/usuarios',async(req)=>{const{u,t}=usuarioAuth(req);exige(u,'usuarios',1);return{usuarios:USERS.filter(x=>x.tenant===t.id).map(pubUser),perfis:PERFIS,modulos:MODULOS,limite:limitesDe(t).usuarios};});
function validaPerms(p){const o={};for(const m of MODULOS){const n=+((p||{})[m]||0);if(!(n>=0&&n<=4))throw new Erro(400,'Nível inválido em '+m+'.');o[m]=n;}return o;}
rota('POST','/api/usuarios',async(req,res,b)=>{const{u,t}=usuarioAuth(req);exige(u,'usuarios',4);exigeEscrita(t);
  const email=String(b.email||'').trim().toLowerCase();if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))throw new Erro(400,'E-mail inválido.');if(USERS.some(x=>x.email===email))throw new Erro(409,'E-mail já cadastrado.');
  if(USERS.filter(x=>x.tenant===t.id&&x.ativo).length>=limitesDe(t).usuarios)throw new Erro(402,'Limite de usuários do plano atingido ('+limitesDe(t).usuarios+').');
  const perfil=PERFIS[b.perfil]||b.perfil==='custom'?b.perfil:null;if(!perfil)throw new Erro(400,'Perfil inválido.');
  const temp=crypto.randomBytes(9).toString('base64url')+'Aa1!';const n={id:uid('u'),tenant:t.id,nome:String(b.nome||email).slice(0,120),email,hash:hashSenha(temp),perfil,perms:perfil==='custom'?validaPerms(b.perms):Object.assign({},PERFIS[perfil]),empresas:b.empresas==='todas'||!Array.isArray(b.empresas)?'todas':b.empresas.map(String),ativo:true,trocar:true,mfa:null,criado:new Date().toISOString()};
  USERS.push(n);saveU();auditar(t.id,u.email,'usuário criado',n.email+' · '+n.perfil);return{usuario:pubUser(n),senhaTemporaria:temp};});
rota('PATCH','/api/usuarios/([^/]+)',async(req,res,b,m)=>{const{u,t}=usuarioAuth(req);exige(u,'usuarios',4);exigeEscrita(t);const a=USERS.find(x=>x.id===m[1]&&x.tenant===t.id);if(!a)throw new Erro(404,'Usuário não encontrado.');
  const admins=()=>USERS.filter(x=>x.tenant===t.id&&x.ativo&&x.perfil==='admin').length;
  if(b.nome!=null)a.nome=String(b.nome).slice(0,120);
  if(b.perfil!=null){if(!(PERFIS[b.perfil]||b.perfil==='custom'))throw new Erro(400,'Perfil inválido.');if(a.perfil==='admin'&&b.perfil!=='admin'&&admins()<=1)throw new Erro(409,'Deve existir ao menos um administrador ativo.');a.perfil=b.perfil;a.perms=b.perfil==='custom'?validaPerms(b.perms):Object.assign({},PERFIS[b.perfil]);}
  else if(b.perms&&a.perfil==='custom')a.perms=validaPerms(b.perms);
  if(b.empresas!==undefined)a.empresas=b.empresas==='todas'?'todas':(Array.isArray(b.empresas)?b.empresas.map(String):a.empresas);
  if(b.ativo!=null){const v=!!b.ativo;if(!v&&a.perfil==='admin'&&a.ativo&&admins()<=1)throw new Erro(409,'Deve existir ao menos um administrador ativo.');if(v&&!a.ativo&&USERS.filter(x=>x.tenant===t.id&&x.ativo).length>=limitesDe(t).usuarios)throw new Erro(402,'Limite de usuários do plano atingido.');a.ativo=v;if(!v)for(const[k,s]of SESS)if(s.uid===a.id)SESS.delete(k);}
  saveU();auditar(t.id,u.email,'usuário alterado',a.email+' · '+a.perfil+' · ativo='+a.ativo+' · '+JSON.stringify(a.perms));return{usuario:pubUser(a)};});
rota('POST','/api/usuarios/([^/]+)/reiniciar',async(req,res,b,m)=>{const{u,t}=usuarioAuth(req);exige(u,'usuarios',4);exigeEscrita(t);const a=USERS.find(x=>x.id===m[1]&&x.tenant===t.id);if(!a)throw new Erro(404,'Usuário não encontrado.');
  const temp=crypto.randomBytes(9).toString('base64url')+'Aa1!';a.hash=hashSenha(temp);a.trocar=true;if(b.mfa)a.mfa=null;for(const[k,s]of SESS)if(s.uid===a.id)SESS.delete(k);saveU();auditar(t.id,u.email,'senha reiniciada',a.email+(b.mfa?' · mfa removido':''));return{senhaTemporaria:temp};});
/* empresas e dados */
rota('GET','/api/empresas',async(req)=>{const{u,t}=usuarioAuth(req);return{empresas:listaEmp(t.id).filter(e=>acessaEmpresa(u,e.id)).map(e=>({id:e.id,nome:e.nome,cnpj:e.cnpj,versao:e.versao,vinculos:vinculosAtivos(e.dados)}))};});
rota('POST','/api/empresas',async(req,res,b)=>{const{u,t}=usuarioAuth(req);exige(u,'cadastros',3);exigeEscrita(t);
  if(listaEmp(t.id).length>=limitesDe(t).empresas)throw new Erro(402,'Limite de empresas do plano atingido ('+limitesDe(t).empresas+').');
  const e={id:uid('e'),nome:String(b.nome||'Nova empresa').slice(0,160),cnpj:String(b.cnpj||'').replace(/[^0-9A-Za-z]/g,'').toUpperCase().slice(0,14),versao:1,dados:null,criado:new Date().toISOString()};
  fs.mkdirSync(dirEmp(t.id),{recursive:true});wr(path.join(dirEmp(t.id),e.id+'.json'),e);auditar(t.id,u.email,'empresa criada',e.id+' · '+e.nome);return{empresa:{id:e.id,nome:e.nome,cnpj:e.cnpj,versao:e.versao}};});
const carregaEmp=(t,id)=>{if(!/^e[0-9a-f]+$/.test(id))throw new Erro(404,'Empresa não encontrada.');const f=path.join(dirEmp(t.id),id+'.json');const e=rd(f,null);if(!e)throw new Erro(404,'Empresa não encontrada.');return{e,f};};
rota('GET','/api/empresas/([^/]+)/dados',async(req,res,b,m)=>{const{u,t}=usuarioAuth(req);if(!acessaEmpresa(u,m[1]))throw new Erro(403,'Sem acesso a esta empresa.');const{e}=carregaEmp(t,m[1]);
  const visivel=Object.assign({},e.dados||{});for(const k of Object.keys(visivel)){const md=CHAVE_MOD[k];if(md&&nivel(u,md)<1)delete visivel[k];}return{versao:e.versao,dados:e.dados?visivel:null,permissoes:u.perfil==='admin'?PERFIS.admin:u.perms,licenca:estadoLicenca(t)};});
/* Gravação por chave: o cliente envia só as chaves que alterou (mudancas) e a versão em que se baseou. A chave é aceita se ninguém a
   alterou depois dessa versão (kv); as chaves alteradas por outros usuários nesse intervalo voltam em "outras" para o cliente se atualizar. */
rota('PUT','/api/empresas/([^/]+)/dados',async(req,res,b,m)=>{const{u,t}=usuarioAuth(req);if(!acessaEmpresa(u,m[1]))throw new Erro(403,'Sem acesso a esta empresa.');exigeEscrita(t);const{e,f}=carregaEmp(t,m[1]);
  const mud=b.mudancas;if(!mud||typeof mud!=='object'||Array.isArray(mud)||!Number.isInteger(b.versao))throw new Erro(400,'Requisição inválida.');
  const ant=e.dados||{},kv=e.kv||{},ks=Object.keys(mud).filter(k=>!IGNORAR.has(k));
  const mods=new Set();for(const k of ks){const md=CHAVE_MOD[k]||'config';mods.add(md);exige(u,md,2);}
  const conf=ks.filter(k=>(kv[k]||0)>b.versao);if(conf.length)throw new Erro(409,'Os dados ('+conf.join(', ')+') foram alterados por outro usuário. Recarregue antes de salvar.',{versaoServidor:e.versao,chaves:conf});
  const novo=Object.assign({},ant);for(const k of ks)novo[k]=mud[k];
  if(ks.includes('comps')){const a=ant.comps||{},n=novo.comps||{};for(const c of Object.keys(Object.assign({},a,n))){const sa=a[c]&&a[c].status,sn=n[c]&&n[c].status;if((sn==='fechada')!==(sa==='fechada'))exige(u,'folha',3);}}
  if(ks.includes('eventos')){const a=new Map((ant.eventos||[]).map(x=>[x.id,x.status]));for(const x of novo.eventos||[]){if(x.status&&x.status!=='gerado'&&a.get(x.id)!==x.status)exige(u,'esocial',3);}}
  if(ks.includes('empregados')){const lim=limitesDe(t).vinculos,outros=listaEmp(t.id).filter(x=>x.id!==e.id).reduce((s,x)=>s+vinculosAtivos(x.dados),0);const total=outros+vinculosAtivos(novo);if(total>lim&&vinculosAtivos(novo)>vinculosAtivos(ant))throw new Erro(402,'Limite de vínculos ativos do plano atingido ('+lim+'). Atual: '+total+'.');}
  const outras={};for(const k of Object.keys(kv)){if(kv[k]>b.versao&&!ks.includes(k)){const md=CHAVE_MOD[k];if(!md||nivel(u,md)>=1)outras[k]=ant[k];}}
  if(!ks.length)return{versao:e.versao,alteradas:[],outras};
  e.versao++;e.kv=kv;for(const k of ks)e.kv[k]=e.versao;e.dados=novo;
  if(ks.includes('empresa')&&novo.empresa&&novo.empresa.razao){e.nome=String(novo.empresa.razao).slice(0,160);e.cnpj=String(novo.empresa.cnpj||e.cnpj).replace(/[^0-9A-Za-z]/g,'').toUpperCase().slice(0,14);}
  wr(f,e);auditar(t.id,u.email,'dados gravados',{empresa:e.id,versao:e.versao,chaves:ks});return{versao:e.versao,alteradas:ks,outras};});
rota('GET','/api/auditoria',async(req)=>{const{u,t}=usuarioAuth(req);exige(u,'auditoria',1);const l=lerAuditoria(t.id);return{total:l.length,registros:l.slice(-500).reverse()};});
rota('GET','/api/auditoria/verificar',async(req)=>{const{u,t}=usuarioAuth(req);exige(u,'auditoria',1);return verificaCadeia(t.id);});
/* webhook de pagamento (qualquer provedor que assine o corpo com HMAC-SHA256) */
rota('POST','/api/pagamentos/webhook',async(req,res,b,m,raw)=>{const seg=process.env.WEBHOOK_SECRET;if(!seg)throw new Erro(503,'Webhook não configurado.');
  const sig=String(req.headers['x-signature']||''),esp=crypto.createHmac('sha256',seg).update(raw).digest('hex');
  if(sig.length!==esp.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(esp)))throw new Erro(401,'Assinatura inválida.');
  const t=TENANTS.find(x=>x.id===b.conta);if(!t)throw new Erro(404,'Conta não encontrada.');
  if(b.evento==='pago'){const meses=Math.max(1,Math.min(36,+b.meses||1));const base=t.validade&&t.validade>hojeISO()?new Date(t.validade):new Date(hojeISO());base.setMonth(base.getMonth()+meses);t.validade=base.toISOString().slice(0,10);if(b.plano&&PLANOS.some(p=>p.id===b.plano))t.plano=b.plano;if(t.status==='suspensa'&&t.motivoSusp==='inadimplencia')t.status='ativa';}
  else if(b.evento==='inadimplente'){t.status='suspensa';t.motivoSusp='inadimplencia';}else throw new Erro(400,'Evento desconhecido.');
  saveT();auditar(t.id,'webhook','licença '+b.evento,{validade:t.validade,plano:t.plano,status:t.status});return{ok:true,validade:t.validade};});
/* ---------- plataforma (fornecedor) ---------- */
rota('POST','/api/plataforma/login',async(req,res,b)=>{const ck=ipDe(req)+'|plat';const w=bloqueado(ck);if(w)throw new Erro(429,'Muitas tentativas. Aguarde.');
  const U=process.env.PLATFORM_USER||'admin',H=process.env.PLATFORM_PASSWORD_HASH||'';if(!H||String(b.usuario)!==U||!confSenha(b.senha,H)){falha(ck);auditar(null,String(b.usuario||'').slice(0,60),'login plataforma falhou','');throw new Erro(401,'Credenciais inválidas.');}
  const seg=process.env.PLATFORM_TOTP_SECRET;if(seg){if(!b.codigo)return{exigeCodigo:true};if(!totpOk(seg,b.codigo,0)){falha(ck);throw new Erro(401,'Código inválido.');}}
  FALHAS.delete(ck);auditar(null,U,'login plataforma','');return{token:novaSessao({plataforma:true})};});
rota('GET','/api/plataforma/planos',async(req)=>{usuarioAuth(req,{plataforma:true});return{planos:PLANOS};});
rota('PUT','/api/plataforma/planos',async(req,res,b)=>{usuarioAuth(req,{plataforma:true});if(!Array.isArray(b.planos)||!b.planos.length)throw new Erro(400,'Informe os planos.');
  const ps=b.planos.map(p=>{if(!/^[a-z0-9-]{2,30}$/.test(p.id))throw new Erro(400,'Id de plano inválido.');for(const k of['maxEmpresas','maxVinculos','maxUsuarios'])if(!(Number.isInteger(+p[k])&&+p[k]>0))throw new Erro(400,'Limite inválido em '+p.id+'.');
    if(p.preco!=null&&!(+p.preco>=0))throw new Erro(400,'Preço inválido.');return{id:p.id,nome:String(p.nome||p.id).slice(0,80),maxEmpresas:+p.maxEmpresas,maxVinculos:+p.maxVinculos,maxUsuarios:+p.maxUsuarios,preco:p.preco==null?null:+p.preco};});
  PLANOS=ps;saveP();auditar(null,'plataforma','planos alterados',ps.length+' planos');return{planos:PLANOS};});
rota('GET','/api/plataforma/contas',async(req)=>{usuarioAuth(req,{plataforma:true});return{contas:TENANTS.map(t=>Object.assign({},t,{limitesCustom:t.limites||null,estado:estadoLicenca(t),limites:limitesDe(t),uso:uso(t)}))};});
rota('POST','/api/plataforma/contas',async(req,res,b)=>{usuarioAuth(req,{plataforma:true});const email=String(b.adminEmail||'').trim().toLowerCase();if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))throw new Erro(400,'E-mail do administrador inválido.');if(USERS.some(x=>x.email===email))throw new Erro(409,'E-mail já cadastrado.');
  if(!PLANOS.some(p=>p.id===b.plano))throw new Erro(400,'Plano inexistente.');const t={id:uid('t'),nome:String(b.nome||'').slice(0,160),plano:b.plano,validade:b.validade||null,status:'ativa',limites:null,criado:new Date().toISOString()};if(!t.nome)throw new Erro(400,'Informe o nome do cliente.');
  const temp=crypto.randomBytes(9).toString('base64url')+'Aa1!';const a={id:uid('u'),tenant:t.id,nome:String(b.adminNome||'Administrador').slice(0,120),email,hash:hashSenha(temp),perfil:'admin',perms:Object.assign({},PERFIS.admin),empresas:'todas',ativo:true,trocar:true,mfa:null,criado:new Date().toISOString()};
  TENANTS.push(t);USERS.push(a);saveT();saveU();auditar(t.id,'plataforma','conta criada',t.nome+' · '+t.plano);return{conta:t,admin:pubUser(a),senhaTemporaria:temp};});
rota('PATCH','/api/plataforma/contas/([^/]+)',async(req,res,b,m)=>{usuarioAuth(req,{plataforma:true});const t=TENANTS.find(x=>x.id===m[1]);if(!t)throw new Erro(404,'Conta não encontrada.');
  if(b.plano!=null){if(!PLANOS.some(p=>p.id===b.plano))throw new Erro(400,'Plano inexistente.');t.plano=b.plano;}
  if(b.validade!==undefined)t.validade=b.validade||null;if(b.status!=null){if(!['ativa','suspensa'].includes(b.status))throw new Erro(400,'Status inválido.');t.status=b.status;if(b.status==='ativa')delete t.motivoSusp;}
  if(b.limites!==undefined)t.limites=b.limites?{empresas:b.limites.empresas!=null?+b.limites.empresas:undefined,vinculos:b.limites.vinculos!=null?+b.limites.vinculos:undefined,usuarios:b.limites.usuarios!=null?+b.limites.usuarios:undefined}:null;
  saveT();auditar(t.id,'plataforma','licença alterada',{plano:t.plano,validade:t.validade,status:t.status,limites:t.limites});return{conta:Object.assign({},t,{estado:estadoLicenca(t),limites:limitesDe(t),uso:uso(t)})};});
/* ---------- servidor ---------- */
const ESTATICO={'/plataforma':['plataforma.html','text/html; charset=utf-8'],'/plataforma.js':['plataforma.js','application/javascript; charset=utf-8'],'/plataforma.css':['plataforma.css','text/css; charset=utf-8']};
const srv=http.createServer(async(req,res)=>{try{if(req.method==='OPTIONS'){res.writeHead(204,hdr());return res.end();}
  const url=new URL(req.url,'http://x');const p=url.pathname.replace(/\/+$/,'')||'/';
  if(req.method==='GET'&&ESTATICO[p]){res.writeHead(200,hdr({'Content-Type':ESTATICO[p][1]}));return res.end(fs.readFileSync(path.join(__dirname,'public',ESTATICO[p][0])));}
  for(const[mt,re,fn]of R){if(mt!==req.method)continue;const m=p.match(re);if(!m)continue;const raw=(req.method==='GET')?Buffer.alloc(0):await corpoRaw(req);let b={};if(raw.length){try{b=JSON.parse(raw.toString('utf8'));}catch(e){throw new Erro(400,'JSON inválido.');}}
    return json(res,200,await fn(req,res,b,m,raw));}
  json(res,404,{erro:'Rota não encontrada.'});}catch(e){if(e instanceof Erro)return json(res,e.c,Object.assign({erro:e.message},e.x||{}));console.error(e);json(res,500,{erro:'Erro interno.'});}});
if(require.main===module)srv.listen(PORT,()=>console.log('FolhaPro API na porta '+PORT));
module.exports={srv,hashSenha,totp,PERFIS,MODULOS};
