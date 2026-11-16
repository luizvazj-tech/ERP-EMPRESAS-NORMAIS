/* ui22 — Empresas cadastradas em carrossel 3D de cards, com busca */
const EC={q:'',sel:null,meta:new Map(),wheelT:0};
function ecLista(){const L=[],a=DB.empresa;
  L.push({id:'__ativa',ativa:true,razao:(a&&a.razao)||'(novo cadastro em branco)',fant:(a&&a.fantasia)||'',cnpj:(a&&a.cnpj)||'',regime:(a&&a.regime)||'',emp:(DB.empregados||[]).length,ex:!!DB._exemplo});
  (DB._emps||[]).forEach(x=>{const k=x.id+'|'+x.em;let m=EC.meta.get(k);if(!m){m={regime:'',emp:0,fant:''};try{const s=JSON.parse(x.snap);m={regime:(s.empresa&&s.empresa.regime)||'',emp:(s.empregados||[]).length,fant:(s.empresa&&s.empresa.fantasia)||''};}catch(e){}EC.meta.set(k,m);}
    L.push({id:x.id,ativa:false,razao:x.razao||'(sem razão social)',fant:m.fant,cnpj:x.cnpj||'',regime:m.regime,emp:m.emp,ex:!!x.ex});});
  return L;}
function ecFiltra(){const q=sideNorm(EC.q||'').trim(),d=onlyC(EC.q||'');const L=ecLista();if(!q)return L;
  return L.filter(e=>sideNorm(e.razao+' '+e.fant).includes(q)||(d&&onlyC(e.cnpj).includes(d))||sideNorm(fmtCNPJ(e.cnpj)).includes(q));}
function ecIni(r){const p=String(r||'?').replace(/[^A-Za-zÀ-ÿ0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>2||/^\d+$/.test(w));return ((p[0]||'?')[0]+((p[1]||'')[0]||'')).toUpperCase();}
function ecMat(s){let h=0;String(s).split('').forEach(c=>h=(h*31+c.charCodeAt(0))%360);return h;}
function ecCard(e,i){const h=ecMat(e.cnpj||e.razao);
  return `<div class="ec-card" role="option" id="ecc${i}" data-act="ecSel" data-arg="${e.id}" aria-selected="false" style="--h:${h}">
  <div class="ec-ban"><span class="ec-av" aria-hidden="true">${esc(ecIni(e.razao))}</span>${e.ativa?'<span class="badge b-ok">Em uso</span>':''}${e.ex?'<span class="badge b-blue">Exemplo</span>':''}</div>
  <div class="ec-nm">${esc(e.razao)}</div><div class="ec-fn">${esc(e.fant||'')}</div>
  <div class="ec-cn">${e.cnpj?'CNPJ '+fmtCNPJ(e.cnpj):'CNPJ não informado'}</div>
  <div class="ec-mt"><span>${esc(REGIMES[e.regime]||'Regime não definido')}</span><span>${e.emp} empregado${e.emp===1?'':'s'}</span></div>
  <div class="ec-act" hidden>${e.ativa?`<button class="btn sm" data-act="empJaAberta">Empresa em uso</button>`:`<button class="btn sm pri" data-act="empAbrirConf" data-arg="${e.id}">Abrir empresa</button>`}<button class="btn sm" data-act="empExcluir" data-arg="${e.ativa?'':e.id}">Excluir</button></div></div>`;}
function ecShell(){return `<div class="card ecar" id="ecar"><div class="ec-top"><h2>Empresas cadastradas</h2><div class="ec-busca"><input type="search" id="ecQ" value="${esc(EC.q)}" placeholder="Buscar por razão social, nome fantasia ou CNPJ…" aria-label="Buscar empresa cadastrada" autocomplete="off"><span class="sub" id="ecCnt" aria-hidden="true"></span></div></div>
  <div class="ec-stage" id="ecStage" tabindex="0" role="listbox" aria-label="Empresas cadastradas. Use as setas do teclado para girar o carrossel e Enter para abrir."></div>
  <div class="ec-nav"><button class="btn sm" data-act="ecPrev" aria-label="Empresa anterior">‹</button><div class="ec-dots" id="ecDots" aria-hidden="true"></div><button class="btn sm" data-act="ecNext" aria-label="Próxima empresa">›</button></div>
  <div class="sr-only" id="ecLive" aria-live="polite"></div></div>`;}
function ecIdx(L){let i=L.findIndex(e=>e.id===EC.sel);if(i<0){i=Math.max(0,L.findIndex(e=>e.ativa));EC.sel=L[i]&&L[i].id;}return i;}
function ecDraw(anim){const st=document.getElementById('ecStage');if(!st)return;const L=ecFiltra();const cnt=document.getElementById('ecCnt');const total=ecLista().length;
  if(cnt)cnt.textContent=EC.q?(L.length+' de '+total):(total+' empresa'+(total===1?'':'s'));
  if(!L.length){st.innerHTML='<div class="empty"><b>Nenhuma empresa encontrada</b>Confira o nome ou o CNPJ digitado.</div>';st.dataset.k='';st.removeAttribute('aria-activedescendant');document.getElementById('ecDots').innerHTML='';return;}
  if(st.dataset.k!==L.map(e=>e.id+e.razao+e.emp).join('|')){st.innerHTML=L.map(ecCard).join('');st.dataset.k=L.map(e=>e.id+e.razao+e.emp).join('|');}
  const cur=ecIdx(L),W=st.clientWidth||800,gap=Math.min(W*0.27,230),cards=st.querySelectorAll('.ec-card');
  cards.forEach((c,i)=>{const o=i-cur,a=Math.abs(o),sel=o===0;c.classList.toggle('sel',sel);c.setAttribute('aria-selected',sel?'true':'false');c.querySelector('.ec-act').hidden=!sel;
    c.style.transform=`translateX(calc(-50% + ${o*gap}px)) translateZ(${-a*90}px) rotateY(${o===0?0:(o>0?-1:1)*Math.min(38,a*30)}deg) scale(${sel?1.1:Math.max(.7,.88-a*.05)})`;
    c.style.opacity=a>3?0:String(sel?1:Math.max(.25,.78-a*.2));c.style.zIndex=String(100-a);c.style.pointerEvents=a>3?'none':'auto';c.tabIndex=-1;});
  st.setAttribute('aria-activedescendant','ecc'+cur);
  const dots=document.getElementById('ecDots');if(dots)dots.innerHTML=L.length>1&&L.length<=12?L.map((e,i)=>`<i class="${i===cur?'on':''}"></i>`).join(''):`<small>${cur+1} / ${L.length}</small>`;
  const live=document.getElementById('ecLive');if(live&&anim)live.textContent=L[cur].razao+', '+(cur+1)+' de '+L.length+(L[cur].ativa?', em uso':'');}
function ecStep(d){const L=ecFiltra();if(!L.length)return;const i=ecIdx(L);EC.sel=L[(i+d+L.length)%L.length].id;ecDraw(true);}
ACT.ecPrev=()=>ecStep(-1);ACT.ecNext=()=>ecStep(1);
ACT.ecSel=el=>{const L=ecFiltra();const id=el.dataset.arg;if(!L.some(e=>e.id===id)||id===EC.sel)return;EC.sel=id;ecDraw(true);};
const _empView22=SC.empresa.view;
SC.empresa.view=function(p){let h=_empView22.call(this,p);const a=h.indexOf('<div class="card"><h2>Empresas cadastradas</h2>');if(a<0)return h;const b=h.indexOf('</table></div>',a);if(b<0)return h;return h.slice(0,a)+ecShell()+h.slice(b+14);};
const _empMount22=SC.empresa.mount;
SC.empresa.mount=function(p){_empMount22&&_empMount22.call(this,p);const q=document.getElementById('ecQ'),st=document.getElementById('ecStage');if(!st)return;
  if(!EC.sel||!ecLista().some(e=>e.id===EC.sel))EC.sel=null;ecDraw(false);
  q.addEventListener('input',()=>{EC.q=q.value;const L=ecFiltra();if(L.length&&!L.some(e=>e.id===EC.sel))EC.sel=L[0].id;ecDraw(true);});
  q.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();st.focus();}else if(e.key==='ArrowDown'){e.preventDefault();st.focus();}else if(e.key==='Escape'&&q.value){q.value='';EC.q='';ecDraw(true);}});
  st.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){ecStep(1);e.preventDefault();}else if(e.key==='ArrowLeft'){ecStep(-1);e.preventDefault();}else if(e.key==='Home'){const L=ecFiltra();if(L[0]){EC.sel=L[0].id;ecDraw(true);}e.preventDefault();}else if(e.key==='End'){const L=ecFiltra();if(L.length){EC.sel=L[L.length-1].id;ecDraw(true);}e.preventDefault();}
    else if(e.key==='Enter'){const L=ecFiltra(),s=L[ecIdx(L)];if(s&&!s.ativa){ACT.empAbrirConf({dataset:{arg:s.id}});}else if(s){ACT.empJaAberta();}e.preventDefault();}});
  let x0=null;st.addEventListener('pointerdown',e=>{x0=e.clientX;});st.addEventListener('pointerup',e=>{if(x0===null)return;const dx=e.clientX-x0;x0=null;if(Math.abs(dx)>45)ecStep(dx<0?1:-1);});
  st.addEventListener('wheel',e=>{if(Math.abs(e.deltaX)<Math.abs(e.deltaY)&&!e.shiftKey)return;e.preventDefault();const n=Date.now();if(n-EC.wheelT<260)return;EC.wheelT=n;ecStep((e.deltaX||e.deltaY)>0?1:-1);},{passive:false});
  window.addEventListener('resize',()=>{if(document.getElementById('ecStage'))ecDraw(false);},{once:true});};
