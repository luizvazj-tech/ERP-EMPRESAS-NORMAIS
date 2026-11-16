/* ui22 — Empresas cadastradas em carrossel 3D de cards, com busca */
const EC={q:'',sel:null,meta:new Map(),pos:0,tgt:0,gap:200,raf:0};
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
/* Posição contínua (fracionária): todas as propriedades dos cards são interpoladas por quadro (rAF), de modo que arraste,
   roda do mouse, teclado e cliques deslizem sem saltos. A seleção (card ampliado e botões) assenta ao final do movimento. */
const ecRM=()=>window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const ecCl=(v,a,b)=>Math.max(a,Math.min(b,v));
function ecLayout(pos){const st=document.getElementById('ecStage');if(!st)return;const gap=EC.gap||200,cards=st.children;
  for(let i=0;i<cards.length;i++){const c=cards[i];if(!c.classList.contains('ec-card'))continue;const o=i-pos,a=Math.abs(o),sg=o<0?-1:1;
    const sc=a<=1?1.1-.22*a:Math.max(.7,.88-(a-1)*.05),op=(a<=1?1-.42*a:Math.max(.25,.58-(a-1)*.2))*ecCl((3.4-a)/.8,0,1);
    c.style.transform='translateX(calc(-50% + '+(o*gap).toFixed(1)+'px)) translateZ('+(-a*90).toFixed(1)+'px) rotateY('+(-sg*Math.min(38,a*30)).toFixed(2)+'deg) scale('+sc.toFixed(3)+')';
    c.style.opacity=op.toFixed(3);c.style.zIndex=String(Math.round(1000-a*10));c.style.pointerEvents=op<.05?'none':'auto';
    c.classList.toggle('sel',a<.5);}}
function ecSettle(){const st=document.getElementById('ecStage');if(!st)return;const cur=Math.round(EC.pos);st.classList.remove('mov');
  Array.prototype.forEach.call(st.querySelectorAll('.ec-card'),(c,i)=>{const sel=i===cur;c.classList.toggle('sel',sel);c.setAttribute('aria-selected',sel?'true':'false');const b=c.querySelector('.ec-act');if(b)b.hidden=!sel;c.tabIndex=-1;});}
function ecAnim(tgt){cancelAnimationFrame(EC.raf);EC.tgt=tgt;const st=document.getElementById('ecStage');
  if(ecRM()||Math.abs(tgt-EC.pos)<.001){EC.pos=tgt;ecLayout(tgt);ecSettle();return;}
  if(st)st.classList.add('mov');let t0=performance.now();
  const f=t=>{const dt=Math.min(.05,(t-t0)/1000);t0=t;const k=1-Math.exp(-dt*11);EC.pos+=(EC.tgt-EC.pos)*k;
    if(Math.abs(EC.tgt-EC.pos)<.002){EC.pos=EC.tgt;ecLayout(EC.pos);ecSettle();EC.raf=0;return;}ecLayout(EC.pos);EC.raf=requestAnimationFrame(f);};
  EC.raf=requestAnimationFrame(f);}
function ecDraw(anim){const st=document.getElementById('ecStage');if(!st)return;const L=ecFiltra();const cnt=document.getElementById('ecCnt');const total=ecLista().length;
  if(cnt)cnt.textContent=EC.q?(L.length+' de '+total):(total+' empresa'+(total===1?'':'s'));
  if(!L.length){cancelAnimationFrame(EC.raf);st.innerHTML='<div class="empty"><b>Nenhuma empresa encontrada</b>Confira o nome ou o CNPJ digitado.</div>';st.dataset.k='';st.removeAttribute('aria-activedescendant');document.getElementById('ecDots').innerHTML='';return;}
  const key=L.map(e=>e.id+e.razao+e.emp).join('|');let rebuilt=false;
  if(st.dataset.k!==key){st.innerHTML=L.map(ecCard).join('');st.dataset.k=key;rebuilt=true;}
  const cur=ecIdx(L),W=st.clientWidth||800;EC.gap=Math.min(W*0.27,230);
  st.setAttribute('aria-activedescendant','ecc'+cur);
  const dots=document.getElementById('ecDots');if(dots)dots.innerHTML=L.length>1&&L.length<=12?L.map((e,i)=>`<i class="${i===cur?'on':''}"></i>`).join(''):`<small>${cur+1} / ${L.length}</small>`;
  const live=document.getElementById('ecLive');if(live&&anim)live.textContent=L[cur].razao+', '+(cur+1)+' de '+L.length+(L[cur].ativa?', em uso':'');
  if(rebuilt||!anim||typeof EC.pos!=='number'||EC.pos>L.length){cancelAnimationFrame(EC.raf);EC.pos=cur;EC.tgt=cur;ecLayout(cur);ecSettle();}else ecAnim(cur);}
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
  /* arraste: o carrossel acompanha o dedo/mouse e, ao soltar, desliza até o card mais próximo com inércia */
  let dr=null,moved=false;
  st.addEventListener('pointerdown',e=>{if(e.button>0||e.target.closest('button,input,a'))return;dr={x:e.clientX,p:EC.pos,id:e.pointerId,t:performance.now(),v:0,lx:e.clientX,lt:performance.now(),on:false};moved=false;});
  st.addEventListener('pointermove',e=>{if(!dr||e.pointerId!==dr.id)return;const dx=e.clientX-dr.x;
    if(!dr.on){if(Math.abs(dx)<6)return;dr.on=true;moved=true;cancelAnimationFrame(EC.raf);EC.raf=0;st.classList.add('mov','drag');try{st.setPointerCapture(e.pointerId);}catch(x){}}
    const n=st.querySelectorAll('.ec-card').length,now=performance.now();if(now>dr.lt)dr.v=(e.clientX-dr.lx)/(now-dr.lt);dr.lx=e.clientX;dr.lt=now;
    let pos=dr.p-dx/(EC.gap||200);if(pos<0)pos*=.35;else if(pos>n-1)pos=n-1+(pos-(n-1))*.35;EC.pos=pos;ecLayout(pos);});
  const fim=e=>{if(!dr||(e&&e.pointerId!==dr.id))return;const d=dr;dr=null;st.classList.remove('drag');if(!d.on)return;
    try{st.releasePointerCapture(d.id);}catch(x){}
    const L=ecFiltra(),n=L.length;if(!n)return;const proj=EC.pos-d.v*1000/(EC.gap||200)*.18;const t=ecCl(Math.round(proj),0,n-1);EC.sel=L[t].id;ecDraw(true);};
  st.addEventListener('pointerup',fim);st.addEventListener('pointercancel',fim);
  st.addEventListener('click',e=>{if(moved){e.stopPropagation();e.preventDefault();moved=false;}},true);
  /* roda/trackpad horizontal: acompanha o gesto e assenta no card mais próximo ao parar */
  let wt=0;st.addEventListener('wheel',e=>{if(Math.abs(e.deltaX)<Math.abs(e.deltaY)&&!e.shiftKey)return;e.preventDefault();
    const L=ecFiltra(),n=L.length;if(!n)return;cancelAnimationFrame(EC.raf);EC.raf=0;st.classList.add('mov');
    const d=(e.deltaX||e.deltaY)*(e.deltaMode===1?32:1);EC.pos=ecCl((typeof EC.pos==='number'?EC.pos:ecIdx(L))+d/((EC.gap||200)*1.4),-.3,n-.7);ecLayout(EC.pos);
    clearTimeout(wt);wt=setTimeout(()=>{const t=ecCl(Math.round(EC.pos),0,n-1);EC.sel=L[t].id;ecDraw(true);},110);},{passive:false});
  window.addEventListener('resize',()=>{if(document.getElementById('ecStage'))ecDraw(false);},{once:true});};
