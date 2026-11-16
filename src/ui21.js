/* ui21 — tema claro/escuro, paleta de comandos, acessibilidade de diálogos e título por tela */
const THEME_KEY='fp_tema';
let THEME_MEM=null;
function themeGet(){if(THEME_MEM)return THEME_MEM;try{const v=localStorage.getItem(THEME_KEY);return v==='light'||v==='dark'?v:'auto';}catch(e){return 'auto';}}
function themeApply(t){const r=document.documentElement;if(t==='light'||t==='dark')r.setAttribute('data-theme',t);else r.removeAttribute('data-theme');
  const b=document.getElementById('btnTema');if(b){const rot={auto:'◐ Tema: auto',light:'☀ Tema: claro',dark:'☾ Tema: escuro'}[t];b.textContent=rot;b.setAttribute('aria-label',rot+' (alternar)');}if(typeof applyBrand==='function'&&document.body)applyBrand();}
try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>themeApply(themeGet()));}catch(e){}
function themeNext(){const t=themeGet(),n=t==='auto'?'light':t==='light'?'dark':'auto';THEME_MEM=n;try{if(n==='auto')localStorage.removeItem(THEME_KEY);else if(typeof CONSENT!=='undefined'&&CONSENT&&CONSENT.pref)localStorage.setItem(THEME_KEY,n);}catch(e){}themeApply(n);toast('Tema: '+({auto:'automático (segue o sistema)',light:'claro',dark:'escuro'})[n]);}
ACT.tema=()=>themeNext();
(function(){const top=document.getElementById('top');if(top&&!document.getElementById('btnTema')){const b=document.createElement('button');b.id='btnTema';b.type='button';b.setAttribute('data-act','tema');const k=document.createElement('button');k.id='btnCmd';k.type='button';k.setAttribute('data-act','cmdk');k.title='Paleta de comandos (Ctrl+K)';k.textContent='⌕ Buscar (Ctrl+K)';const ref=document.getElementById('mnav');top.insertBefore(k,ref);top.insertBefore(b,ref);}themeApply(themeGet());})();

/* ---------- paleta de comandos ---------- */
let CMD_SEL=0,CMD_LST=[],CMD_FROM=null;
function cmdItens(){const it=[];let g='';MENU.forEach(([n,k,l])=>{if(n)g=n;it.push({l:l,g:g||'Início',run:()=>go(k)});});
  it.push({l:'Alternar tema (claro/escuro/automático)',g:'Comando',run:themeNext},{l:'Voltar à tela anterior',g:'Comando',run:()=>back()},{l:'Ir à tela inicial',g:'Comando',run:()=>home()},{l:'Sair do sistema',g:'Comando',run:()=>ACT.sair()},{l:'Atalhos de teclado',g:'Comando',run:cmdAjuda});
  if(typeof exportar==='function'){it.push({l:'Exportar a tela atual em PDF',g:'Comando',run:()=>ACT.expPdf&&ACT.expPdf(document.body)},{l:'Exportar a tela atual em Excel',g:'Comando',run:()=>ACT.expXls&&ACT.expXls(document.body)});}
  return it;}
function cmdFiltra(q){const t=sideNorm(q).split(/\s+/).filter(Boolean);return cmdItens().map(i=>{const h=sideNorm(i.l+' '+i.g);if(!t.every(x=>h.includes(x)))return null;const sc=t.reduce((a,x)=>a+(sideNorm(i.l).startsWith(x)?0:sideNorm(i.l).includes(x)?1:2),0);return {i,sc};}).filter(Boolean).sort((a,b)=>a.sc-b.sc).slice(0,30).map(x=>x.i);}
function cmdDraw(){const ul=document.getElementById('cmdkList');if(!ul)return;ul.innerHTML=CMD_LST.map((i,n)=>`<li role="option" id="cmo${n}" data-n="${n}" aria-selected="${n===CMD_SEL}"><span>${esc(i.l)}</span><small>${esc(i.g)}</small></li>`).join('')||'<li role="presentation" class="empty">Nada encontrado.</li>';
  const q=document.getElementById('cmdkQ');if(q)q.setAttribute('aria-activedescendant',CMD_LST.length?'cmo'+CMD_SEL:'');const s=document.getElementById('cmo'+CMD_SEL);if(s&&s.scrollIntoView)s.scrollIntoView({block:'nearest'});}
function cmdOpen(){if(document.getElementById('gate')||document.getElementById('cmdk'))return;if(typeof NAV==='undefined'||!NAV||!NAV.cur)return;CMD_FROM=document.activeElement;
  const d=document.createElement('div');d.id='cmdk';d.className='on';d.innerHTML='<div class="cb" role="dialog" aria-modal="true" aria-label="Paleta de comandos"><input id="cmdkQ" type="text" role="combobox" aria-expanded="true" aria-controls="cmdkList" aria-autocomplete="list" placeholder="Digite o nome de uma tela ou comando…" autocomplete="off"><ul id="cmdkList" role="listbox" aria-label="Resultados"></ul><div class="ft"><kbd>↑</kbd> <kbd>↓</kbd> navegar · <kbd>Enter</kbd> abrir · <kbd>Esc</kbd> fechar</div></div>';
  document.body.appendChild(d);CMD_SEL=0;CMD_LST=cmdFiltra('');cmdDraw();const q=document.getElementById('cmdkQ');q.focus();
  q.addEventListener('input',()=>{CMD_LST=cmdFiltra(q.value);CMD_SEL=0;cmdDraw();});
  q.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){CMD_SEL=Math.min(CMD_SEL+1,CMD_LST.length-1);cmdDraw();e.preventDefault();}else if(e.key==='ArrowUp'){CMD_SEL=Math.max(CMD_SEL-1,0);cmdDraw();e.preventDefault();}else if(e.key==='Enter'){e.preventDefault();cmdRun(CMD_SEL);}else if(e.key==='Tab'){e.preventDefault();}});
  d.addEventListener('click',e=>{const li=e.target.closest&&e.target.closest('li[data-n]');if(li)cmdRun(+li.dataset.n);else if(e.target===d)cmdClose();});}
function cmdClose(){const d=document.getElementById('cmdk');if(d)d.remove();if(CMD_FROM&&CMD_FROM.focus&&document.contains(CMD_FROM))CMD_FROM.focus();CMD_FROM=null;}
function cmdRun(n){const i=CMD_LST[n];if(!i)return;CMD_FROM=null;cmdClose();i.run();}
function cmdAjuda(){modal(`<table class="t"><thead><tr><th>Atalho</th><th>Ação</th></tr></thead><tbody><tr><td><kbd>Ctrl</kbd>+<kbd>K</kbd></td><td>Paleta de comandos (buscar qualquer tela)</td></tr><tr><td><kbd>Alt</kbd>+<kbd>I</kbd></td><td>Tela inicial</td></tr><tr><td><kbd>Alt</kbd>+<kbd>V</kbd></td><td>Voltar</td></tr><tr><td><kbd>Alt</kbd>+<kbd>S</kbd></td><td>Salvar a tela atual</td></tr><tr><td><kbd>Alt</kbd>+<kbd>E</kbd></td><td>Enviar ao eSocial, quando disponível</td></tr><tr><td><kbd>?</kbd></td><td>Esta ajuda</td></tr><tr><td><kbd>Esc</kbd></td><td>Fechar janela ou paleta</td></tr></tbody></table>`,{title:'Atalhos de teclado'});}
ACT.cmdk=()=>cmdOpen();
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==='k'){e.preventDefault();document.getElementById('cmdk')?cmdClose():cmdOpen();return;}
  if(e.key==='Escape'&&document.getElementById('cmdk')){e.stopPropagation();cmdClose();return;}
  if(e.key==='?'&&!e.ctrlKey&&!e.altKey){const t=e.target&&e.target.tagName;if(t==='INPUT'||t==='TEXTAREA'||t==='SELECT'||(e.target&&e.target.isContentEditable))return;if(document.getElementById('gate')||!NAV||!NAV.cur)return;e.preventDefault();cmdAjuda();}},true);

/* ---------- diálogos acessíveis: papel, foco inicial, armadilha de foco e devolução do foco ---------- */
let MODAL_FROM=null;
const _modal21=modal,_closeModal21=closeModal;
modal=function(html,o){const was=$('#modal').classList.contains('on');if(!was)MODAL_FROM=document.activeElement;_modal21(html,o);const b=document.querySelector('#modal .mbox');if(b){b.setAttribute('role','dialog');b.setAttribute('aria-modal','true');const h=b.querySelector('h2');if(h){h.id='mdlTitulo';b.setAttribute('aria-labelledby','mdlTitulo');}b.tabIndex=-1;const f=b.querySelector('input:not([type=hidden]),select,textarea,button.pri,button');(f||b).focus();}};
closeModal=function(){const was=$('#modal').classList.contains('on');_closeModal21();if(was&&MODAL_FROM&&MODAL_FROM.focus&&document.contains(MODAL_FROM))MODAL_FROM.focus();MODAL_FROM=null;};
document.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const m=document.getElementById('modal');if(!m||!m.classList.contains('on'))return;const f=[...m.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(x=>x.offsetParent!==null);if(!f.length)return;const a=f[0],z=f[f.length-1];if(e.shiftKey&&(document.activeElement===a||!m.contains(document.activeElement))){z.focus();e.preventDefault();}else if(!e.shiftKey&&(document.activeElement===z||!m.contains(document.activeElement))){a.focus();e.preventDefault();}});

/* ---------- título da página acompanha a tela (leitores de tela e histórico do navegador) ---------- */
const _render21=render,TIT_BASE=document.title;
render=function(){_render21();try{const m=MENU.find(x=>x[1]===NAV.cur.name);const h=document.querySelector('#main h1');const t=(h&&h.textContent.trim())||(m&&m[2]);if(t)document.title=t+' · '+TIT_BASE;}catch(e){}};
