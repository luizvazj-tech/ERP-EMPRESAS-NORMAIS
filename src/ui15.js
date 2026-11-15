
/* ===================== CAMPO DE SENHA COM “OLHO” (mostrar/ocultar) ===================== */
/* Todo input de senha ganha um botão que alterna entre oculto e visível. Vale para telas de acesso, modais e formulários, inclusive os criados depois. */
const PW_OLHO='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const PW_OLHO_X='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 6.2A10.7 10.7 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.6 7.6C3.9 9.3 2 12 2 12s3.6 7 10 7c1.7 0 3.2-.4 4.5-1"/><path d="M9.9 10a3 3 0 0 0 4.1 4.1"/></svg>';
function pwDecora(root){(root||document).querySelectorAll('input[type="password"]:not([data-pw])').forEach(i=>{i.dataset.pw='1';const w=document.createElement('span');w.className='pw';i.parentNode.insertBefore(w,i);w.appendChild(i);
  const b=document.createElement('button');b.type='button';b.className='pwb';b.innerHTML=PW_OLHO;b.title='Mostrar senha';b.setAttribute('aria-label','Mostrar senha');b.setAttribute('aria-pressed','false');
  b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const ver=i.type==='password';i.type=ver?'text':'password';b.innerHTML=ver?PW_OLHO_X:PW_OLHO;b.title=ver?'Ocultar senha':'Mostrar senha';b.setAttribute('aria-label',b.title);b.setAttribute('aria-pressed',ver?'true':'false');i.focus();});
  w.appendChild(b);});}
(function(){pwDecora(document);new MutationObserver(m=>{if(m.some(x=>x.addedNodes.length))pwDecora(document);}).observe(document.body,{childList:true,subtree:true});})();
