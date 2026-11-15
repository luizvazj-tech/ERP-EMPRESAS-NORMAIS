/* ===================== Atualizações assinadas (botão “Atualizar”) ===================== */
const APP_VER='%%APPVER%%';
const UPD={url:'https://folhapro-atualizacoes.onrender.com',pub:{"kty":"EC","x":"yMeg8ADMV3XzNLNb22NoUAG_1Q2OYnsihF4ZNRiBxO8","y":"JdUxlwqBLfNjzU20pZD4IvxmoT33YfXFlcNU8MKrmg0","crv":"P-256"}};
const UPD_OK={salMin:1,tetoInss:1,inss:1,irrf:1,depIr:1,simpl:1,plrTab:1,consig:1,redutor:1,salFam:1,fgts:1,fgtsAprendiz:1,vtPerc:1,patronal:1,rat:1,fap:1,terceiros:1,adNoturno:1,peric:1,he50:1,he100:1,divisor:1,cprbFrac:1,venc:1};
let UPDS={app:null,pacotes:[],invalidos:0,erro:'',em:null},_updKey=null;
const updUrl=()=>{const u=String((DB&&DB.cfg&&DB.cfg.updUrl)||UPD.url||'').replace(/\/+$/,'');return /^https:\/\//.test(u)||/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(u)?u:'';};
async function updFetch(url,ms){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms||12000);try{const r=await fetch(url,{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:c.signal});if(!r.ok)throw new Error('HTTP '+r.status);return r;}finally{clearTimeout(t);}}
async function updVerificar(env){if(!_updKey)_updKey=await crypto.subtle.importKey('jwk',UPD.pub,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  const ok=await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},_updKey,unb64(env.sig),new TextEncoder().encode(env.payload));if(!ok)return null;try{return JSON.parse(env.payload);}catch(e){return null;}}
async function updChecar(silent){UPDS.erro='';UPDS.invalidos=0;
  try{const r=await updFetch('version.json?'+Date.now(),8000);const j=await r.json();UPDS.app={remota:j.versao,novo:!!j.versao&&j.versao!==APP_VER};}catch(e){UPDS.app=null;}
  const base=updUrl();UPDS.pacotes=[];
  if(!base){UPDS.erro='Servidor de atualizações não configurado.';}
  else if(DB){try{const seq=(DB.cfg&&DB.cfg.updSeq)||0;const r=await updFetch(base+'/api/atualizacoes?desde='+seq);const j=await r.json();
    for(const env of (j.pacotes||[])){const p=await updVerificar(env);if(!p||p.seq<=seq){UPDS.invalidos++;continue;}if(p.minApp&&String(p.minApp)>APP_VER)continue;UPDS.pacotes.push(p);}
    UPDS.pacotes.sort((a,b)=>a.seq-b.seq);}catch(e){UPDS.erro='Não foi possível consultar o servidor de atualizações ('+(e.name==='AbortError'?'tempo esgotado':e.message)+').';}}
  UPDS.em=new Date();updBadge();if(!silent)updModal();}
function updBadge(){const b=$('#btnUpd');if(!b)return;const n=UPDS.pacotes.length+(UPDS.app&&UPDS.app.novo?1:0);b.textContent=n?'⟳ Atualizar ('+n+')':'⟳ Atualizar';b.classList.toggle('upd-has',n>0);}
/* validação e aplicação (espelha o servidor; o cliente nunca confia só nele) */
const _fin=v=>typeof v==='number'&&isFinite(v);
function updMesclar(atual,novo,caminho){if(Array.isArray(atual)){if(!Array.isArray(novo)||!novo.length)throw new Error(caminho+': lista inválida');return novo.map((x,i)=>{const mod=atual[Math.min(i,atual.length-1)];return updMesclar(mod,x,caminho+'['+i+']');});}
  if(atual&&typeof atual==='object'){if(!novo||typeof novo!=='object'||Array.isArray(novo))throw new Error(caminho+': objeto inválido');const o=Object.assign({},atual);Object.keys(novo).forEach(k=>{if(!(k in atual))throw new Error(caminho+'.'+k+': campo desconhecido');o[k]=updMesclar(atual[k],novo[k],caminho+'.'+k);});return o;}
  if(typeof atual==='number'){if(!_fin(novo)||novo<0)throw new Error(caminho+': número inválido');return novo;}throw new Error(caminho+': tipo não suportado');}
function updPrever(p){if(p.tipo==='parametros'){const D=defaultParams(),out=[];Object.keys(p.conteudo||{}).forEach(k=>{if(!UPD_OK[k]||!(k in D))throw new Error('Parâmetro não permitido: '+k);const n=updMesclar(DB.params[k]!==undefined?DB.params[k]:D[k],p.conteudo[k],k);if(JSON.stringify(n)!==JSON.stringify(DB.params[k]))out.push(k+': '+JSON.stringify(DB.params[k])+' → '+JSON.stringify(n));});return out;}
  if(p.tipo==='rubricas'){const out=[];(p.conteudo||[]).forEach(r=>{const x=DB.rubricas.find(y=>y.sys===r.sys);if(!x)throw new Error('Rubrica inexistente: '+r.sys);['nat','incCP','incIRRF','incFGTS'].forEach(k=>{if(r[k]!=null&&String(r[k])!==String(x[k]||'')){if(k==='nat'?!/^(\d{4})?$/.test(r[k]):!/^\d{1,2}$/.test(String(r[k])))throw new Error(k+' inválido em '+r.sys);out.push(r.sys+'.'+k+': '+(x[k]||'—')+' → '+r[k]);}});});return out;}
  return [];}
function updAplicarUm(p){const prev=updPrever(p);
  if(p.tipo==='parametros'){const D=defaultParams();Object.keys(p.conteudo).forEach(k=>{DB.params[k]=updMesclar(DB.params[k]!==undefined?DB.params[k]:D[k],p.conteudo[k],k);});}
  if(p.tipo==='rubricas'){p.conteudo.forEach(r=>{const x=DB.rubricas.find(y=>y.sys===r.sys);['nat','incCP','incIRRF','incFGTS'].forEach(k=>{if(r[k]!=null)x[k]=String(r[k]);});});}
  (DB.updApl=DB.updApl||[]).push({seq:p.seq,id:p.id,tipo:p.tipo,titulo:p.titulo,versao:p.versao,em:agoraISO()});DB.cfg.updSeq=Math.max(DB.cfg.updSeq||0,p.seq);if(DB.updUndo)DB.updUndo.seqs.push(p.seq);audit('atualização aplicada','#'+p.seq+' '+p.tipo+' '+p.titulo);}
ACT.updAplicar=()=>{const L=UPDS.pacotes.slice();if(!L.length)return;let n=0;
  DB.updUndo=L.some(p=>p.tipo==='parametros'||p.tipo==='rubricas')?{seqs:[],ts:agoraISO(),titulo:L.length+' pacote(s)',seqAntes:DB.cfg.updSeq||0,params:JSON.parse(JSON.stringify(DB.params)),rubricas:JSON.parse(JSON.stringify(DB.rubricas))}:null;
  try{L.forEach(p=>{updAplicarUm(p);n++;});}catch(e){saveDB();toast('Atualização interrompida no pacote nº '+L[n].seq+': '+e.message,'err');UPDS.pacotes=UPDS.pacotes.filter(p=>p.seq>(DB.cfg.updSeq||0));updBadge();updModal();return;}
  saveDB();UPDS.pacotes=[];updBadge();toast(n+' atualização(ões) aplicada(s).','ok');updModal();};
ACT.updDesfazer=()=>{const u=DB.updUndo;if(!u)return;modalConfirm('Restaurar parâmetros e rubricas ao estado anterior à última aplicação ('+u.seqs.length+' pacote(s), nº '+u.seqs.join(', ')+')? Dados de empregados e folhas não são alterados. Os pacotes voltarão a aparecer como pendentes.',()=>{DB.params=u.params;DB.rubricas=u.rubricas;DB.updApl=(DB.updApl||[]).filter(x=>!u.seqs.includes(x.seq));DB.cfg.updSeq=u.seqAntes;DB.updUndo=null;audit('atualização desfeita','#'+u.seqs.join(','));saveDB();toast('Atualização desfeita.','ok');updChecar(false);},{yes:'Desfazer'});};
ACT.updRecarregar=async()=>{try{if(typeof vaultFlush==='function')await vaultFlush();}catch(e){}audit('recarga para nova versão',(UPDS.app||{}).remota||'');location.href=location.pathname+'?v='+Date.now();};
ACT.updBaixar=async el=>{const id=el.dataset.id,nome=el.dataset.nome,h=el.dataset.sha;try{const r=await updFetch(updUrl()+'/api/arquivos/'+id,60000);const b=await r.arrayBuffer();const d=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b))).map(x=>x.toString(16).padStart(2,'0')).join('');
  if(d!==h){toast('Arquivo recusado: o SHA-256 não confere com o assinado.','err');return;}const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([b]));a.download=nome;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);audit('arquivo baixado',nome);}catch(e){toast('Falha no download: '+e.message,'err');}};
ACT.updSalvarUrl=()=>{const v=String($('#updUrl').value||'').trim();if(v&&!/^https:\/\//.test(v)&&!/^http:\/\/(localhost|127\.0\.0\.1)/.test(v)){toast('Use um endereço https://.','err');return;}DB.cfg.updUrl=v;saveDB();toast('Endereço salvo.','ok');updChecar(false);};
ACT.updVerificar=()=>{UPDS.em=null;updModal();updChecar(false);};
function updModal(){const pend=UPDS.pacotes,apl=(DB&&DB.updApl||[]).slice(-8).reverse();let prevs={};pend.forEach(p=>{try{prevs[p.seq]=updPrever(p);}catch(e){prevs[p.seq]=['⚠ '+e.message];}});
  const arq=p=>(p.arquivos||[]).map(a=>`<button class="btn" data-act="updBaixar" data-id="${a.id}" data-nome="${esc(a.nome)}" data-sha="${a.sha256}">⬇ ${esc(a.nome)} (${Math.round(a.tam/1024)} KB)</button>`).join(' ');
  modal(`<h2>Atualizações do sistema</h2>
  <p class="sub">Versão instalada: <b class="mono">${esc(APP_VER)}</b>. A verificação envia ao servidor apenas o número da última atualização aplicada, sem cookies e sem dados de empregados, empresas ou folhas. Cada pacote só é aplicado se a assinatura digital conferir.</p>
  ${UPDS.em?'':'<p>Verificando…</p>'}
  ${UPDS.app&&UPDS.app.novo?`<div class="note ok"><b>Há uma nova versão do sistema.</b> Ao recarregar, seus dados são mantidos (ficam neste navegador), e será preciso informar a senha de acesso novamente. <div class="row" style="margin-top:8px"><button class="btn pri" data-act="updRecarregar">Recarregar com a nova versão</button></div></div>`:(UPDS.app?'<p>O código do sistema está na versão mais recente.</p>':'')}
  ${UPDS.erro?'<div class="note err">'+esc(UPDS.erro)+'</div>':''}${UPDS.invalidos?'<div class="note err">'+UPDS.invalidos+' pacote(s) com assinatura inválida foram ignorados.</div>':''}
  ${pend.length?`<h3>Pendentes (${pend.length})</h3><div class="tw"><table class="t"><thead><tr><th>Nº</th><th>Tipo</th><th>Título</th><th>O que muda</th></tr></thead><tbody>${pend.map(p=>`<tr><td>${p.seq}</td><td>${esc(p.tipo)}</td><td><b>${esc(p.titulo)}</b><br><small>${esc(p.versao||'')} · ${esc(dtHora(p.publicadoEm))}</small><br><small>${esc(p.notas||'')}</small></td><td><small>${(prevs[p.seq]||[]).map(esc).join('<br>')||'—'}</small>${p.arquivos&&p.arquivos.length?'<br>'+arq(p):''}</td></tr>`).join('')}</tbody></table></div>
  <div class="row" style="margin-top:8px"><button class="btn pri" data-act="updAplicar">Aplicar ${pend.length} atualização(ões)</button></div><p class="sub">Parâmetros e rubricas alteram os cálculos. Confira o quadro “O que muda” e, se necessário, use “Desfazer” depois.</p>`:(UPDS.em&&!UPDS.erro?'<p>Nenhuma atualização pendente.</p>':'')}
  ${DB&&DB.updUndo?`<p>Última aplicação alterou parâmetros/rubricas (pacotes nº ${DB.updUndo.seqs.join(', ')}). <button class="btn" data-act="updDesfazer">Desfazer</button></p>`:''}
  ${apl.length?`<h3>Aplicadas recentemente</h3><div class="tw"><table class="t"><tbody>${apl.map(a=>`<tr><td>${a.seq}</td><td>${esc(a.tipo)}</td><td>${esc(a.titulo)}</td><td>${esc(dtHora(a.em))}</td></tr>`).join('')}</tbody></table></div>`:''}
  <details style="margin-top:10px"><summary>Servidor de atualizações</summary><div class="row"><div class="f" style="flex:1"><label for="updUrl">Endereço</label><input id="updUrl" value="${esc((DB&&DB.cfg&&DB.cfg.updUrl)||'')}" placeholder="${esc(UPD.url)}"></div><button class="btn" data-act="updSalvarUrl">Salvar</button></div></details>
  <div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn" data-act="updVerificar">Verificar novamente</button> <button class="btn" data-act="closeModal">Fechar</button></div>`);}
ACT.atualizar=()=>{if(!DB){toast('Entre no sistema para verificar atualizações.','err');return;}UPDS.em=null;updModal();updChecar(false);};
if(!window.__FP_NOGATE&&!window.__SVON)window.addEventListener('load',()=>{setTimeout(()=>{if(DB)updChecar(true);},4000);setInterval(()=>{if(DB)updChecar(true);},30*60e3);});
