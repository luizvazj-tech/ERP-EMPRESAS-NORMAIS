'use strict';
/* Servidor de atualizações do FolhaPro — sem dependências externas (Node 18+).
   Público:  GET /api/atualizacoes?desde=N · GET /api/arquivos/:id · GET /api/saude
   Admin:    /admin (login por senha) — publica, lista e revoga pacotes assinados.
   Variáveis: PORT, DATA_DIR, ADMIN_USER, ADMIN_PASSWORD_HASH (scrypt "salt:hash" em hex),
              UPDATE_PRIVATE_KEY (PEM ECDSA P-256, com \n literais), ALLOWED_ORIGIN. */
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=+process.env.PORT||8788,DATA=path.resolve(process.env.DATA_DIR||path.join(__dirname,'data'));
const ADMIN_USER=process.env.ADMIN_USER||'admin',ADMIN_HASH=process.env.ADMIN_PASSWORD_HASH||'';
const ORIGIN=process.env.ALLOWED_ORIGIN||'*';
const MAX_BODY=25*1024*1024,MAX_PKG=200,TIPOS=['aviso','parametros','rubricas','arquivo'];
fs.mkdirSync(path.join(DATA,'files'),{recursive:true});
const F_PKG=path.join(DATA,'pacotes.json'),F_AUD=path.join(DATA,'auditoria.log');
let KEY=null;
try{const pem=(process.env.UPDATE_PRIVATE_KEY||'').replace(/\\n/g,'\n');if(pem)KEY=crypto.createPrivateKey(pem);}catch(e){console.error('UPDATE_PRIVATE_KEY inválida:',e.message);}
const load=()=>{try{return JSON.parse(fs.readFileSync(F_PKG,'utf8'));}catch(e){return{seq:0,pacotes:[],revogados:[]};}};
const save=d=>{const t=F_PKG+'.tmp';fs.writeFileSync(t,JSON.stringify(d));fs.renameSync(t,F_PKG);};
const aud=(u,a,d)=>fs.appendFileSync(F_AUD,JSON.stringify({ts:new Date().toISOString(),u,a,d})+'\n');
const sign=s=>crypto.sign('sha256',Buffer.from(s),{key:KEY,dsaEncoding:'ieee-p1363'}).toString('base64');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
/* ---- sessões e limitação de tentativas ---- */
const SESS=new Map(),FAIL=new Map();
function verSenha(p){if(!ADMIN_HASH)return false;const [s,h]=ADMIN_HASH.split(':');if(!s||!h)return false;const x=crypto.scryptSync(String(p),Buffer.from(s,'hex'),64);const y=Buffer.from(h,'hex');return x.length===y.length&&crypto.timingSafeEqual(x,y);}
const ip=r=>String(r.headers['x-forwarded-for']||r.socket.remoteAddress||'').split(',')[0].trim();
const cookie=r=>Object.fromEntries(String(r.headers.cookie||'').split(';').map(c=>c.trim().split('=')).filter(a=>a[0]));
const sessao=r=>{const s=SESS.get(cookie(r).fp_sid);if(!s||s.exp<Date.now()){SESS.delete(cookie(r).fp_sid);return null;}return s;};
const hdr=(extra)=>Object.assign({'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-store'},extra||{});
const json=(res,c,o,h)=>{res.writeHead(c,hdr(Object.assign({'Content-Type':'application/json; charset=utf-8'},h)));res.end(JSON.stringify(o));};
function corpo(req){return new Promise((ok,no)=>{let n=0;const b=[];req.on('data',c=>{n+=c.length;if(n>MAX_BODY){no(new Error('Corpo excede o limite'));req.destroy();}else b.push(c);});req.on('end',()=>ok(Buffer.concat(b)));req.on('error',no);});}
/* ---- validação do conteúdo de cada tipo (o cliente valida de novo) ---- */
const PARAM_OK=['salMin','tetoInss','inss','irrf','depIr','simpl','plrTab','consig','redutor','salFam','fgts','fgtsAprendiz','vtPerc','patronal','rat','fap','terceiros','adNoturno','peric','he50','he100','divisor','cprbFrac','venc'];
const isNum=v=>typeof v==='number'&&isFinite(v);
function validar(tipo,c){
  if(tipo==='aviso')return '';
  if(tipo==='parametros'){if(!c||typeof c!=='object'||Array.isArray(c))return 'Conteúdo deve ser um objeto de parâmetros.';const ks=Object.keys(c);if(!ks.length)return 'Nenhum parâmetro informado.';for(const k of ks)if(!PARAM_OK.includes(k))return 'Parâmetro não permitido: '+k;return '';}
  if(tipo==='rubricas'){if(!Array.isArray(c)||!c.length)return 'Conteúdo deve ser uma lista de rubricas.';for(const r of c){if(!r||!/^[A-Z0-9]{2,12}$/.test(r.sys||''))return 'Rubrica sem identificador (sys) válido.';if(r.nat!=null&&r.nat!==''&&!/^\d{4}$/.test(r.nat))return 'Natureza inválida em '+r.sys;for(const k of ['incCP','incIRRF','incFGTS'])if(r[k]!=null&&!/^\d{1,2}$/.test(String(r[k])))return k+' inválido em '+r.sys;}return '';}
  if(tipo==='arquivo')return '';
  return 'Tipo inválido.';}
/* ---- rotas ---- */
const PUB=path.join(__dirname,'public');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
async function rota(req,res){
  const u=new URL(req.url,'http://x'),p=u.pathname,m=req.method;
  if(m==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'GET','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'86400'});return res.end();}
  const cors={'Access-Control-Allow-Origin':ORIGIN};
  if(p==='/api/saude')return json(res,200,{ok:true,assinatura:!!KEY,admin:!!ADMIN_HASH},cors);
  if(p==='/api/atualizacoes'&&m==='GET'){const d=load(),desde=parseInt(u.searchParams.get('desde')||'0',10)||0;
    return json(res,200,{servidor:'folhapro-atualizacoes',seq:d.seq,pacotes:d.pacotes.filter(x=>x.seq>desde&&!x.revogado).map(x=>({payload:x.payload,sig:x.sig})),revogados:d.pacotes.filter(x=>x.revogado).map(x=>x.id)},cors);}
  let mm=p.match(/^\/api\/arquivos\/([a-f0-9]{32})$/);
  if(mm&&m==='GET'){const d=load(),arq=d.pacotes.filter(x=>!x.revogado).flatMap(x=>x.arquivos||[]).find(a=>a.id===mm[1]);if(!arq)return json(res,404,{erro:'Arquivo não encontrado'},cors);
    const b=fs.readFileSync(path.join(DATA,'files',arq.id));res.writeHead(200,hdr(Object.assign({'Content-Type':'application/octet-stream','Content-Disposition':'attachment; filename*=UTF-8\'\''+encodeURIComponent(arq.nome),'Content-Length':b.length},cors)));return res.end(b);}
  if(p==='/'||p==='/admin'||p==='/admin/'){const b=fs.readFileSync(path.join(PUB,'admin.html'));res.writeHead(200,hdr({'Content-Type':MIME['.html'],'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"}));return res.end(b);}
  if(p==='/admin.js'||p==='/admin.css'){const b=fs.readFileSync(path.join(PUB,p.slice(1)));res.writeHead(200,hdr({'Content-Type':MIME[path.extname(p)]}));return res.end(b);}
  /* ---- admin ---- */
  if(p==='/admin/api/login'&&m==='POST'){const k=ip(req),f=FAIL.get(k)||{n:0,ate:0};if(f.ate>Date.now())return json(res,429,{erro:'Muitas tentativas. Aguarde 15 minutos.'});
    let o;try{o=JSON.parse((await corpo(req)).toString());}catch(e){return json(res,400,{erro:'Requisição inválida'});}
    const ok=o.usuario===ADMIN_USER&&verSenha(o.senha);
    if(!ok){f.n++;if(f.n>=5){f.ate=Date.now()+15*60e3;f.n=0;}FAIL.set(k,f);aud(String(o.usuario||'').slice(0,40),'login falhou',k);return json(res,401,{erro:'Usuário ou senha inválidos'});}
    FAIL.delete(k);const sid=crypto.randomBytes(32).toString('hex'),csrf=crypto.randomBytes(16).toString('hex');SESS.set(sid,{u:ADMIN_USER,csrf,exp:Date.now()+2*3600e3});aud(ADMIN_USER,'login',k);
    const sec=(req.headers['x-forwarded-proto']==='https'||req.socket.encrypted)?'; Secure':'';
    return json(res,200,{ok:true,csrf},{'Set-Cookie':`fp_sid=${sid}; HttpOnly; SameSite=Strict; Path=/admin; Max-Age=7200${sec}`});}
  if(p.startsWith('/admin/api/')){const s=sessao(req);if(!s)return json(res,401,{erro:'Sessão expirada'});
    if(m!=='GET'&&req.headers['x-csrf']!==s.csrf)return json(res,403,{erro:'Falha de verificação (CSRF)'});
    if(p==='/admin/api/logout'&&m==='POST'){SESS.delete(cookie(req).fp_sid);aud(s.u,'logout','');return json(res,200,{ok:true});}
    if(p==='/admin/api/pacotes'&&m==='GET'){const d=load();return json(res,200,{assinatura:!!KEY,pacotes:d.pacotes.map(x=>{const o=JSON.parse(x.payload);return{seq:x.seq,id:x.id,titulo:o.titulo,versao:o.versao,tipo:o.tipo,em:o.publicadoEm,revogado:!!x.revogado,arquivos:(o.arquivos||[]).map(a=>a.nome+' ('+Math.round(a.tam/1024)+' KB)')};}).reverse()});}
    if(p==='/admin/api/auditoria'&&m==='GET'){let t='';try{t=fs.readFileSync(F_AUD,'utf8');}catch(e){}return json(res,200,{linhas:t.trim().split('\n').slice(-200).reverse().map(l=>{try{return JSON.parse(l);}catch(e){return null;}}).filter(Boolean)});}
    if(p==='/admin/api/pacotes'&&m==='POST'){if(!KEY)return json(res,500,{erro:'Chave de assinatura não configurada no servidor (UPDATE_PRIVATE_KEY).'});
      let o;try{o=JSON.parse((await corpo(req)).toString());}catch(e){return json(res,400,{erro:'Requisição inválida ou grande demais'});}
      const tit=String(o.titulo||'').trim().slice(0,120),ver=String(o.versao||'').trim().slice(0,40),notas=String(o.notas||'').slice(0,5000);
      if(!tit)return json(res,400,{erro:'Informe o título.'});if(!TIPOS.includes(o.tipo))return json(res,400,{erro:'Tipo inválido.'});
      let cont=o.conteudo;if(typeof cont==='string'&&o.tipo!=='aviso'&&o.tipo!=='arquivo'){try{cont=JSON.parse(cont);}catch(e){return json(res,400,{erro:'O conteúdo não é um JSON válido.'});}}
      const er=validar(o.tipo,cont);if(er)return json(res,400,{erro:er});
      const d=load();if(d.pacotes.length>=MAX_PKG)return json(res,400,{erro:'Limite de pacotes atingido; revogue os antigos.'});
      const arqs=[];for(const a of (Array.isArray(o.arquivos)?o.arquivos:[]).slice(0,10)){const b=Buffer.from(String(a.base64||''),'base64');if(!b.length)continue;const id=crypto.randomBytes(16).toString('hex');fs.writeFileSync(path.join(DATA,'files',id),b);arqs.push({id,nome:String(a.nome||'arquivo').replace(/[\\/\r\n"]/g,'_').slice(0,120),tam:b.length,sha256:sha(b)});}
      if(o.tipo==='arquivo'&&!arqs.length)return json(res,400,{erro:'Anexe ao menos um arquivo.'});
      d.seq=Math.max(d.seq+1,Math.floor(Date.now()/1000));const pl={seq:d.seq,id:crypto.randomBytes(8).toString('hex'),titulo:tit,versao:ver,tipo:o.tipo,notas,minApp:String(o.minApp||''),conteudo:o.tipo==='aviso'||o.tipo==='arquivo'?null:cont,arquivos:arqs,publicadoEm:new Date().toISOString()};
      const payload=JSON.stringify(pl);d.pacotes.push({seq:d.seq,id:pl.id,payload,sig:sign(payload),arquivos:arqs});save(d);aud(s.u,'publicou',pl.id+' '+tit);return json(res,200,{ok:true,id:pl.id,seq:pl.seq});}
    mm=p.match(/^\/admin\/api\/pacotes\/([a-f0-9]{16})\/revogar$/);
    if(mm&&m==='POST'){const d=load(),x=d.pacotes.find(y=>y.id===mm[1]);if(!x)return json(res,404,{erro:'Pacote não encontrado'});x.revogado=true;save(d);aud(s.u,'revogou',x.id);return json(res,200,{ok:true});}
  }
  json(res,404,{erro:'Não encontrado'});}
http.createServer((q,s)=>{rota(q,s).catch(e=>{console.error(e);try{json(s,500,{erro:'Erro interno'});}catch(_){}});}).listen(PORT,()=>console.log('Atualizações FolhaPro na porta '+PORT+(KEY?'':' (SEM chave de assinatura)')+(ADMIN_HASH?'':' (SEM senha de admin)')));
