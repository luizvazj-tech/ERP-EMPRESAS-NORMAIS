
/* ===================== SEGURANÇA, PRIVACIDADE (LGPD), COOKIES, ACESSIBILIDADE ===================== */
/* Cofre local: PBKDF2-SHA-256 (600.000 iterações) + AES-GCM-256. A senha nunca é gravada; sem ela os dados não são recuperáveis. */
const VK='folhaPro.vault.v1',FAILK='folhaPro.fail.v1',CONSENT_KEY='folhaPro.consent.v1',CONSENT_VER='2026-11-13';
const VAULT={on:false,key:null,salt:null,it:600000,pend:null,busy:false,idleT:null,flushing:null};
let CONSENT=null;
const b64=u=>{u=new Uint8Array(u);let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s);};
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const hex=u=>[...new Uint8Array(u)].map(x=>x.toString(16).padStart(2,'0')).join('');
async function sha256(t){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t)));}
async function deriveKey(pw,salt,it){const m=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:it,hash:'SHA-256'},m,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
async function vEnc(str){const iv=crypto.getRandomValues(new Uint8Array(12));const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},VAULT.key,new TextEncoder().encode(str));
  return JSON.stringify({v:1,it:VAULT.it,salt:b64(VAULT.salt),iv:b64(iv),ct:b64(ct)});}
async function vTry(raw,pw){const o=JSON.parse(raw);const k=await deriveKey(pw,unb64(o.salt),o.it);const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(o.iv)},k,unb64(o.ct));return{key:k,salt:unb64(o.salt),it:o.it,text:new TextDecoder().decode(pt)};}
/* persistência assíncrona com fila (último estado vence) */
function vaultPersist(s){VAULT.pend=s;if(VAULT.busy)return;VAULT.busy=true;VAULT.flushing=(async()=>{try{while(VAULT.pend!=null){const x=VAULT.pend;VAULT.pend=null;const out=await vEnc(x);try{localStorage.setItem(VK,out);}catch(e){toast('Não foi possível gravar os dados (armazenamento cheio ou bloqueado). Exporte um backup agora.','err');}}}finally{VAULT.busy=false;}})();}
const vaultFlush=async()=>{while(VAULT.busy||VAULT.pend!=null){await VAULT.flushing;}};
/* tentativas */
function failGet(){try{return JSON.parse(localStorage.getItem(FAILK)||'{"n":0,"until":0}');}catch(e){return{n:0,until:0};}}
function failSet(o){try{localStorage.setItem(FAILK,JSON.stringify(o));}catch(e){}}
function senhaForca(p){let c=0;if(/[a-z]/.test(p))c++;if(/[A-Z]/.test(p))c++;if(/\d/.test(p))c++;if(/[^A-Za-z0-9]/.test(p))c++;return{ok:p.length>=12&&c>=3,len:p.length,c};}
/* ---------- trilha de auditoria (LGPD, art. 37) ---------- */
function audit(a,d){if(!DB)return;(DB.audit=DB.audit||[]).push({ts:new Date().toISOString(),a:String(a).slice(0,60),d:d==null?'':String(d).slice(0,200)});if(DB.audit.length>3000)DB.audit.splice(0,DB.audit.length-3000);VAULT.audit=DB.audit;}
function wrapAudit(){const re=/(Save|Del|Send|Env|Export|Import|Reset|Demo|Fechar|Reabr|Excl|Cancel|Gerar|Calc|bkFile|bkLoad|titular|ckAll|ckNec|pwd)/;Object.keys(ACT).forEach(k=>{if(!re.test(k)||ACT[k].__au)return;const f=ACT[k];ACT[k]=function(el,ev){try{audit('ação:'+k,(el&&el.dataset&&el.dataset.arg)||NAV.cur.name);}catch(e){}return f.apply(this,arguments);};ACT[k].__au=1;});}

/* ---------- consentimento / cookies ---------- */
function consentLoad(){try{const r=JSON.parse(localStorage.getItem(CONSENT_KEY)||'null');if(r&&r.ver===CONSENT_VER)CONSENT=r;}catch(e){}}
function consentSet(pref){CONSENT={ver:CONSENT_VER,ts:new Date().toISOString(),pref:!!pref};try{localStorage.setItem(CONSENT_KEY,JSON.stringify(CONSENT));}catch(e){}
  if(pref)brandSave();else{try{localStorage.removeItem(BRAND_KEY);}catch(e){}}applyBrand();bannerHide();if(DB)audit('consentimento',pref?'necessários + preferências':'somente necessários');}
function bannerShow(){if(document.getElementById('ckb'))return;const d=document.createElement('div');d.id='ckb';d.setAttribute('role','dialog');d.setAttribute('aria-labelledby','ckt');d.setAttribute('aria-describedby','ckd');
  d.innerHTML=`<h2 id="ckt">Privacidade e cookies</h2><p id="ckd">Este sistema usa o armazenamento local do navegador <b>estritamente necessário</b> para funcionar (seus dados, criptografados com a sua senha, e o controle de acesso). Se você permitir, também guardamos <b>preferências de aparência</b> (cores e logotipo) e carregamos a <b>fonte da marca</b> do Google Fonts, serviço de terceiro que recebe o seu endereço IP. Não usamos cookies de publicidade nem de análise de comportamento. <a href="#" data-act="ckPolicy" data-arg="cookies">Política de cookies</a> · <a href="#" data-act="ckPolicy" data-arg="privacidade">Política de privacidade</a></p>
  <div class="row"><button class="btn" data-act="ckNec">Somente necessários</button><button class="btn" data-act="ckCustom">Personalizar</button><button class="btn pri" data-act="ckAll">Aceitar todos</button></div>`;document.body.appendChild(d);}
function bannerHide(){const d=document.getElementById('ckb');if(d)d.remove();}
ACT.ckAll=()=>{consentSet(true);toast('Preferências salvas.','ok');if(SC[NAV.cur.name]&&NAV.cur.name==='cookies'&&DB)render();};
ACT.ckNec=()=>{consentSet(false);toast('Somente os cookies/armazenamento necessários permanecem ativos.','ok');if(NAV.cur.name==='cookies'&&DB)render();};
ACT.ckCustom=()=>{modal(`<p class="sub">Escolha o que permitir. O armazenamento necessário não pode ser desativado, pois sem ele o sistema não funciona.</p>
  <div class="card"><label class="chk"><input type="checkbox" checked disabled> <b>Estritamente necessários</b> — cofre de dados criptografado, controle de acesso, registro de consentimento.</label></div>
  <div class="card"><label class="chk"><input type="checkbox" id="ckp" ${CONSENT&&CONSENT.pref?'checked':''}> <b>Preferências e serviços de terceiros</b> — memoriza cores/logotipo e carrega a fonte da marca (Google Fonts).</label></div>
  <div class="row" style="justify-content:flex-end"><button class="btn pri" id="cks">Salvar escolhas</button></div>`,{title:'Preferências de cookies'});$('#cks').onclick=()=>{consentSet($('#ckp').checked);closeModal();toast('Preferências salvas.','ok');};};
ACT.ckPolicy=(el)=>{const k=el.dataset.arg;modal(k==='cookies'?cookiesHTML():privacidadeHTML(),{title:k==='cookies'?'Política de cookies':'Política de privacidade',wide:true});};
ACT.ckReopen=()=>{CONSENT=null;bannerShow();};

const FORN=()=>esc(BRAND.fornecedor||'[PREENCHER — razão social e CNPJ do fornecedor do software]');
const DPO=()=>esc(BRAND.dpoNome||'[PREENCHER — nome do encarregado]')+' — '+esc(BRAND.dpoEmail||'[PREENCHER — e-mail do encarregado]');
function cookiesHTML(){return `<div class="legal"><p><b>Versão ${CONSENT_VER}.</b> O sistema <b>não grava cookies HTTP</b>. Para funcionar, usa o <i>armazenamento local</i> do navegador (localStorage), que tratamos, por transparência (LGPD, art. 9º), como equivalente a cookies.</p>
<div class="tw"><table class="t"><thead><tr><th scope="col">Item</th><th scope="col">Categoria</th><th scope="col">Finalidade</th><th scope="col">Duração</th></tr></thead><tbody>
<tr><td class="mono">folhaPro.vault.v1</td><td>Estritamente necessário</td><td>Guarda os dados cadastrais e da folha, criptografados (AES-GCM-256) com chave derivada da sua senha.</td><td>Até a eliminação pelo usuário</td></tr>
<tr><td class="mono">folhaPro.fail.v1</td><td>Estritamente necessário (segurança)</td><td>Conta tentativas de acesso malsucedidas para retardar ataques de adivinhação de senha.</td><td>Até o acesso bem-sucedido</td></tr>
<tr><td class="mono">folhaPro.consent.v1</td><td>Estritamente necessário (conformidade)</td><td>Registra a sua escolha sobre cookies, com data e versão desta política.</td><td>Até a revogação ou nova versão da política</td></tr>
<tr><td class="mono">folhaPro.brand.v1</td><td>Preferência (requer consentimento)</td><td>Memoriza nome, cores e logotipo configurados.</td><td>Até a revogação</td></tr>
<tr><td class="mono">fonts.googleapis.com / fonts.gstatic.com</td><td>Terceiro (requer consentimento)</td><td>Entrega a fonte da marca. O Google recebe o endereço IP e dados técnicos do navegador, conforme a política do próprio Google.</td><td>Sessão de navegação</td></tr></tbody></table></div>
<p>Não utilizamos cookies de publicidade, de perfilamento ou de análise de comportamento. A hospedagem do sistema (provedor de infraestrutura) pode registrar o endereço IP e a data de acesso em logs técnicos de servidor, para segurança e disponibilidade.</p>
<p><b>Como gerir.</b> A qualquer momento você pode alterar a escolha em <i>Sistema → Privacidade e cookies</i> ou pelo botão abaixo. Rejeitar os itens opcionais não reduz as funções do sistema; apenas a fonte da marca é substituída pela fonte padrão do dispositivo e as preferências de aparência valem somente até fechar a página. Também é possível limpar o armazenamento local nas configurações do navegador (isso apaga os dados do sistema; faça backup antes).</p></div>`;}
function privacidadeHTML(){const E=DB&&DB.empresa;return `<div class="legal"><p><b>Versão ${CONSENT_VER}.</b> Esta política descreve o tratamento de dados pessoais no sistema, nos termos da Lei nº 13.709/2018 (LGPD). Os trechos entre colchetes devem ser preenchidos pela empresa licenciada antes da entrada em produção.</p>
<h3>1. Quem é quem</h3><p><b>Controlador:</b> ${E?esc(E.razao)+' (CNPJ '+esc(fmtCNPJ(E.cnpj))+')':'a empresa que utiliza o sistema (identificada no cadastro da empresa)'}, que decide sobre os dados de seus empregados e dependentes. <b>Fornecedor do software:</b> ${FORN()}. <b>Encarregado (art. 41):</b> ${DPO()}.</p>
<h3>2. Dados tratados e finalidades</h3><p>Dados cadastrais de empregados (nome, CPF, nascimento, filiação, endereço, dados contratuais e salariais), de dependentes (inclusive menores, hipótese em que se observa o melhor interesse da criança e do adolescente, art. 14) e do responsável pelo envio ao eSocial. Finalidades: cálculo da folha, recolhimentos e declaração ao eSocial. Movimentações de afastamento por motivo de saúde podem revelar <b>dado pessoal sensível</b> (art. 5º, II), tratado apenas para cumprimento de obrigação legal (art. 11, II, “a”) e com o mínimo necessário.</p>
<h3>3. Bases legais</h3><p>Cumprimento de obrigação legal ou regulatória pelo controlador (art. 7º, II), execução de contrato de trabalho (art. 7º, V) e exercício regular de direitos (art. 7º, VI). Não há tratamento fundado em consentimento para os dados da folha. O consentimento (art. 8º) é usado apenas para os cookies opcionais descritos na política de cookies.</p>
<h3>4. Onde ficam os dados e quem os acessa</h3><p>Os dados ficam <b>apenas no navegador deste dispositivo</b>, criptografados com a senha do usuário; o fornecedor não tem acesso a eles. Ao transmitir ao eSocial por gateway próprio, os dados seguem ao gateway configurado pela empresa e ao ambiente nacional do eSocial. Não há venda nem compartilhamento para publicidade.</p>
<h3>5. Direitos do titular (art. 18)</h3><p>Confirmação, acesso, correção, anonimização, portabilidade, eliminação, informação sobre compartilhamento e revogação de consentimento. O sistema permite <b>exportar os dados de um titular</b> (tela <i>Privacidade e cookies</i>) e corrigir cadastros. A <b>eliminação</b> não se aplica aos dados que a empresa deve conservar por obrigação legal (art. 16, I); os prazos de guarda trabalhista, previdenciária, fiscal e do FGTS devem ser confirmados pelo controlador [VERIFICAR FONTE OFICIAL]. Requisições: ${DPO()}.</p>
<h3>6. Segurança (art. 46)</h3><p>Criptografia em repouso (AES-GCM-256, chave derivada por PBKDF2-SHA-256 com 600.000 iterações), senha com no mínimo 12 caracteres, bloqueio por inatividade, atraso progressivo após tentativas malsucedidas, política de segurança de conteúdo (CSP) restritiva e trilha de auditoria das operações (art. 37). <b>Limites:</b> o sistema não substitui controles do dispositivo (antivírus, bloqueio de tela, atualizações) e a senha esquecida não pode ser recuperada; mantenha backups.</p>
<h3>7. Incidentes (art. 48)</h3><p>Em caso de incidente com risco ou dano relevante aos titulares, o controlador deve comunicar a ANPD e os titulares em prazo razoável, conforme regulamentação da ANPD [VERIFICAR FONTE OFICIAL: prazo vigente]. Registre o fato com o encarregado.</p>
<h3>8. Cookies</h3><p>Veja a política de cookies. As escolhas ficam registradas com data e versão.</p></div>`;}

SC.cookies={view(){const c=CONSENT;return `<h1>Política de cookies</h1><p class="sub">Transparência sobre o armazenamento local e serviços de terceiros.</p>
 <div class="card"><h2>Sua escolha atual</h2><p>${c?`Registrada em <b>${esc(new Date(c.ts).toLocaleString('pt-BR'))}</b> (política ${esc(c.ver)}): necessários${c.pref?' + preferências e fonte de terceiros':' somente'}.`:'Nenhuma escolha registrada.'}</p>
 <div class="row"><button class="btn" data-act="ckNec">Somente necessários</button><button class="btn" data-act="ckCustom">Personalizar</button><button class="btn pri" data-act="ckAll">Aceitar todos</button></div></div>
 <div class="card">${cookiesHTML()}</div>`;},actions:()=>[]};
SC.privacidade={view(){return `<h1>Privacidade e LGPD</h1><p class="sub">Política de privacidade, direitos do titular e eliminação segura.</p>
 <div class="card">${privacidadeHTML()}</div>
 <div class="card"><h2>Exportar dados de um titular (art. 18, II e V)</h2><div class="row"><div class="f"><label for="ttcpf">CPF do titular</label><input id="ttcpf" data-mask="cpf" inputmode="numeric" autocomplete="off"></div><button class="btn pri" data-act="titularExport" style="align-self:flex-end">Gerar arquivo</button></div><p class="sub">Gera um arquivo JSON com o cadastro, dependentes, férias, movimentações e lançamentos do empregado.</p></div>
 <div class="card"><h2>Cookies</h2><p><a href="#" data-act="go" data-to="cookies">Gerenciar preferências de cookies</a></p></div>`;},actions:()=>[]};
function pickById(o,id,d){d=d||0;if(d>6||o==null||typeof o!=='object')return undefined;if(Array.isArray(o)){const r=o.map(x=>pickById(x,id,d+1)).filter(x=>x!==undefined);return r.length?r:undefined;}
  const out={};let hit=false;for(const k of Object.keys(o)){if(k===id){out[k]=o[k];hit=true;continue;}if(o[k]&&typeof o[k]==='object'){const r=pickById(o[k],id,d+1);if(r!==undefined){out[k]=r;hit=true;}}else if(o[k]===id&&(k==='empId'||k==='id')){out[k]=o[k];hit=true;}}return hit?out:undefined;}
function dl(name,text,mime){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:mime||'application/json'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);}
ACT.titularExport=()=>{const cpf=onlyD($('#ttcpf').value);if(!cpfValido(cpf)){toast('Informe um CPF válido.','err');return;}const e=DB.empregados.find(x=>x.cpf===cpf);if(!e){toast('Nenhum empregado com este CPF.','err');return;}
  const out={titular:e,ferias:DB.ferias.filter(x=>x.empId===e.id),movimentacoes:DB.movs.filter(x=>x.empId===e.id),rescisao:(DB.rescisoes||{})[e.id]||null,competencias:pickById(DB.comps,e.id)||{},geradoEm:new Date().toISOString()};
  dl('dados-titular-'+cpf.slice(0,3)+'.json',JSON.stringify(out,null,2));toast('Arquivo gerado.','ok');};

/* ---------- trilha de auditoria (tela) e segurança ---------- */
SC.auditoria={view(){const a=(DB.audit||[]).slice(-400).reverse();return `<h1>Trilha de auditoria</h1><p class="sub">Registro das operações relevantes (acessos, alterações, envios, exportações) — LGPD, art. 37. Guarda as 3.000 últimas entradas neste navegador.</p>
 <div class="row" style="margin-bottom:10px"><button class="btn" data-act="auditCsv">Exportar CSV</button></div>
 <div class="tw"><table class="t"><thead><tr><th scope="col">Data e hora</th><th scope="col">Operação</th><th scope="col">Detalhe</th></tr></thead><tbody>${a.map(x=>`<tr><td>${esc(new Date(x.ts).toLocaleString('pt-BR'))}</td><td>${esc(x.a)}</td><td>${esc(x.d)}</td></tr>`).join('')||'<tr><td colspan="3" class="c">Sem registros.</td></tr>'}</tbody></table></div>
 <div class="note info">Limite: o registro fica no mesmo navegador e pode ser apagado por quem controla o dispositivo. Auditoria imutável exige servidor (ver planilha de pendências).</div>`;},actions:()=>[]};
ACT.auditCsv=()=>{const q=s=>'"'+String(s).replace(/"/g,'""')+'"';dl('auditoria.csv','﻿data_hora;operacao;detalhe\n'+(DB.audit||[]).map(x=>[x.ts,x.a,x.d].map(q).join(';')).join('\n'),'text/csv');};
SC.seguranca={view(){const id=DB.cfg.idle||15;return `<h1>Segurança e acesso</h1><p class="sub">Senha do cofre, bloqueio automático e estado da proteção.</p>
 <div class="card"><h2>Estado</h2><p>Criptografia em repouso: <b>${VAULT.on?'ativa (AES-GCM-256, PBKDF2 600.000 iterações)':'inativa (modo de teste)'}</b>. Bloqueio por inatividade: <b>${id} min</b>.</p>
 <div class="row"><button class="btn" data-act="lock">Bloquear agora</button></div></div>
 <div class="card"><h2>Bloqueio por inatividade</h2><div class="row"><div class="f"><label for="idle">Minutos (5 a 60)</label><input id="idle" type="number" min="5" max="60" value="${id}"></div><button class="btn" data-act="idleSave" style="align-self:flex-end">Salvar</button></div></div>
 <div class="card"><h2>Alterar senha</h2><div class="grid"><div class="f" style="grid-column:span 4"><label for="pw0">Senha atual</label><input id="pw0" type="password" autocomplete="current-password"></div><div class="f" style="grid-column:span 4"><label for="pw1">Nova senha (mín. 12, com 3 tipos de caractere)</label><input id="pw1" type="password" autocomplete="new-password"></div><div class="f" style="grid-column:span 4"><label for="pw2">Repita a nova senha</label><input id="pw2" type="password" autocomplete="new-password"></div></div>
 <div class="row" style="margin-top:10px"><button class="btn pri" data-act="pwdChange">Alterar senha</button></div></div>
 <div class="note warn">A senha não é recuperável. Mantenha um backup (Sistema → Backup e dados). Um único usuário acessa o cofre; perfis, permissões por usuário e login corporativo exigem servidor (ver planilha de pendências).</div>`;},actions:()=>[]};
ACT.idleSave=()=>{const v=Math.max(5,Math.min(60,parseInt($('#idle').value,10)||15));DB.cfg.idle=v;saveDB();vaultIdle();toast('Salvo.','ok');render();};
ACT.pwdChange=async()=>{const a=$('#pw0').value,b=$('#pw1').value,c=$('#pw2').value;if(b!==c){toast('As novas senhas não conferem.','err');return;}if(!senhaForca(b).ok){toast('A nova senha deve ter ao menos 12 caracteres e 3 tipos (maiúscula, minúscula, número, símbolo).','err');return;}
  try{await vaultFlush();await vTry(localStorage.getItem(VK),a);}catch(e){toast('Senha atual incorreta.','err');return;}
  VAULT.salt=crypto.getRandomValues(new Uint8Array(16));VAULT.key=await deriveKey(b,VAULT.salt,VAULT.it);audit('senha alterada');saveDB();await vaultFlush();toast('Senha alterada.','ok');render();};
ACT.lock=async()=>{await vaultFlush();vaultLock();};
function vaultIdle(){clearTimeout(VAULT.idleT);if(!VAULT.on)return;VAULT.idleT=setTimeout(()=>{ACT.lock();},((DB&&DB.cfg&&DB.cfg.idle)||15)*60000);}
function vaultLock(){VAULT.key=null;VAULT.on=false;DB=null;clearTimeout(VAULT.idleT);closeModal();$('#main').innerHTML='';$('#bar').innerHTML='';$('#side').innerHTML='';$('#topemp').textContent='Sessão bloqueada';gateUnlock('Sessão bloqueada por segurança.');}

/* ---------- tela de acesso ---------- */
function gate(html){let g=document.getElementById('gate');if(!g){g=document.createElement('div');g.id='gate';g.setAttribute('role','dialog');g.setAttribute('aria-modal','true');g.setAttribute('aria-labelledby','gt');document.body.appendChild(g);}g.innerHTML=`<div class="gbox">${html}<p class="gl"><a href="#" data-act="ckPolicy" data-arg="privacidade">Privacidade</a> · <a href="#" data-act="ckPolicy" data-arg="cookies">Cookies</a> · <a href="#" data-act="ckReopen">Preferências de cookies</a></p></div>`;const f=g.querySelector('input');f&&f.focus();return g;}
function gateClose(){const g=document.getElementById('gate');if(g)g.remove();}
function gateSetup(){const legacy=(()=>{try{return localStorage.getItem(LS_KEY);}catch(e){return null;}})();
  const g=gate(`<h1 id="gt">${esc(BRAND.nome)} ${esc(BRAND.produto)}</h1><p>Primeiro acesso: crie a senha que protege os dados deste navegador.${legacy?' <b>Foram encontrados dados anteriores sem proteção; eles serão criptografados e a cópia aberta será removida.</b>':''}</p>
  <div class="f"><label for="g1">Senha (mínimo 12 caracteres, com 3 tipos entre maiúscula, minúscula, número e símbolo)</label><input id="g1" type="password" autocomplete="new-password"></div>
  <div class="f"><label for="g2">Repita a senha</label><input id="g2" type="password" autocomplete="new-password"></div>
  <p class="gm" id="gmsg" role="alert"></p><div class="note warn">Esta senha <b>não pode ser recuperada</b>. Sem ela, os dados só voltam por backup.</div>
  <button class="btn pri" id="gok" style="width:100%">Criar senha e entrar</button>`);
  const go=async()=>{const a=$('#g1').value,b=$('#g2').value,m=$('#gmsg');if(a!==b){m.textContent='As senhas não conferem.';return;}if(!senhaForca(a).ok){m.textContent='Senha fraca: use 12 ou mais caracteres e ao menos 3 tipos.';return;}
    $('#gok').disabled=true;m.textContent='Gerando chave…';try{VAULT.salt=crypto.getRandomValues(new Uint8Array(16));VAULT.key=await deriveKey(a,VAULT.salt,VAULT.it);
      let txt=legacy||null;DB=loadDB(txt);VAULT.on=true;audit('cofre criado');saveDB();await vaultFlush();try{localStorage.removeItem(LS_KEY);}catch(e){}startApp();}catch(e){m.textContent='Falha ao criar o cofre: '+e.message;$('#gok').disabled=false;}};
  $('#gok').onclick=go;g.addEventListener('keydown',e=>{if(e.key==='Enter')go();});}
function gateUnlock(msg){const g=gate(`<h1 id="gt">${esc(BRAND.nome)} ${esc(BRAND.produto)}</h1><p>${msg?esc(msg)+' ':''}Informe a senha para abrir os dados.</p>
  <div class="f"><label for="g1">Senha</label><input id="g1" type="password" autocomplete="current-password"></div><p class="gm" id="gmsg" role="alert"></p>
  <button class="btn pri" id="gok" style="width:100%">Entrar</button><p style="margin-top:12px"><a href="#" id="gforg">Esqueci a senha</a></p>`);
  const go=async()=>{const f=failGet(),now=Date.now(),m=$('#gmsg');if(f.until>now){m.textContent='Aguarde '+Math.ceil((f.until-now)/1000)+' s para tentar novamente.';return;}
    $('#gok').disabled=true;m.textContent='Verificando…';try{const raw=localStorage.getItem(VK);const r=await vTry(raw,$('#g1').value);VAULT.key=r.key;VAULT.salt=r.salt;VAULT.it=r.it;failSet({n:0,until:0});DB=loadDB(r.text);VAULT.on=true;audit('acesso');startApp();}
    catch(e){const n=(f.n||0)+1;const wait=n>=5?Math.min(900,30*Math.pow(2,n-5)):0;failSet({n,until:wait?Date.now()+wait*1000:0});m.textContent='Senha incorreta.'+(wait?' Nova tentativa em '+wait+' s.':'');$('#gok').disabled=false;$('#g1').select();}};
  $('#gok').onclick=go;g.addEventListener('keydown',e=>{if(e.key==='Enter')go();});
  $('#gforg').onclick=e=>{e.preventDefault();gate(`<h1 id="gt">Esqueci a senha</h1><p>A senha não pode ser recuperada. Se houver um <b>backup</b>, apague os dados deste navegador, crie nova senha e restaure o backup. Para confirmar a eliminação, digite <b>APAGAR</b>.</p><div class="f"><label for="g1">Confirmação</label><input id="g1" autocomplete="off"></div><div class="row"><button class="btn" id="gb">Voltar</button><button class="btn danger" id="gd">Apagar dados</button></div>`);
    $('#gb').onclick=()=>gateUnlock();$('#gd').onclick=()=>{if($('#g1').value.trim()!=='APAGAR')return;try{localStorage.removeItem(VK);localStorage.removeItem(FAILK);}catch(x){}gateSetup();};};}
function startApp(){gateClose();wrapAudit();['mousemove','keydown','click','scroll','touchstart'].forEach(ev=>document.addEventListener(ev,vaultIdleThrottle,{passive:true}));NAV={stack:[],cur:{name:'home',params:{}}};vaultIdle();render();}
let _idt=0;function vaultIdleThrottle(){const n=Date.now();if(n-_idt>5000){_idt=n;vaultIdle();}}

/* ---------- acessibilidade ---------- */
(function(){const _render=render,_modal=modal,_close=closeModal;let last='',opener=null;
  render=function(){_render();const m=$('#main');const nm=NAV.cur.name;
    $$('#side a,.tabs a,a[data-act]:not([href])').forEach(a=>{a.tabIndex=0;a.setAttribute('role','link');});
    $$('#side a.on').forEach(a=>a.setAttribute('aria-current','page'));$$('th').forEach(t=>{if(!t.scope)t.scope='col';});
    const mn=document.getElementById('mnav');if(mn){mn.innerHTML=MENU.map(x=>`<option value="${x[1]}" ${x[1]===nm?'selected':''}>${esc(x[2])}</option>`).join('');}
    if(nm!==last){last=nm;m.setAttribute('tabindex','-1');try{m.focus({preventScroll:true});}catch(e){}}};
  modal=function(h,o){opener=document.activeElement;_modal(h,o);const d=$('#modal');d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');const f=d.querySelector('input,select,textarea,button,a');f&&f.focus();};
  closeModal=function(){_close();if(opener&&opener.focus&&document.contains(opener))try{opener.focus();}catch(e){}opener=null;};
  document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('[role="link"]')){e.preventDefault();e.target.click();}
    if(e.key==='Tab'){const d=document.getElementById('gate')||($('#modal.on'));if(d){const f=$$('input,select,textarea,button,a[href],[tabindex="0"]',d).filter(x=>!x.disabled&&x.offsetParent!==null);if(f.length){const a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement===a){z.focus();e.preventDefault();}else if(!e.shiftKey&&document.activeElement===z){a.focus();e.preventDefault();}}}}});
  document.addEventListener('change',e=>{if(e.target.id==='mnav')go(e.target.value);});
  window.addEventListener('beforeunload',e=>{if(typeof DIRTY!=='undefined'&&DIRTY){e.preventDefault();e.returnValue='';}});
})();

/* ---------- inicialização ---------- */
function boot(){brandLoad();consentLoad();applyBrand();if(!CONSENT)bannerShow();
  if(window.__FP_NOGATE){DB=loadDB();render();return;}
  if(!(window.crypto&&crypto.subtle)){document.body.innerHTML='<div style="padding:30px;font:16px system-ui"><h1>Navegador sem suporte à criptografia</h1><p>O sistema exige HTTPS e um navegador atual (WebCrypto). Acesse por https:// ou atualize o navegador.</p></div>';return;}
  let has=null;try{has=localStorage.getItem(VK);}catch(e){}
  if(has)gateUnlock();else gateSetup();
  try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();}catch(e){}}
ACT.skipMain=()=>{const m=document.getElementById('main');m.setAttribute('tabindex','-1');m.focus();};
