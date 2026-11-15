const {JSDOM}=require('jsdom');const fs=require('fs');
const d=new JSDOM(fs.readFileSync(__dirname+'/../index.html','utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',beforeParse(w){w.print=()=>{};w.__FP_NOGATE=true;}});
const w=d.window,ev=s=>w.eval(s),doc=w.document;
(async()=>{await ev(`(async()=>{seedDemo('lp');await exCarregar();})()`);
const falta=[];const telas=ev('MENU.map(x=>x[1])').concat(['saude:afast','saude:soma']);
for(const t of telas){const [n,tab]=t.split(':');ev(n==='saude'&&tab?`go('saude',{tab:'${tab}',emp:DB.empregados[2].id})`:`go('${n}')`);
 doc.querySelectorAll('#main input:not([type=hidden]),#main select,#main textarea,#side input').forEach(el=>{const id=el.id,has=el.closest('label')||(id&&doc.querySelector('label[for="'+id+'"]'))||el.getAttribute('aria-label')||el.getAttribute('aria-labelledby')||el.getAttribute('title');if(!has)falta.push(t+': '+el.tagName.toLowerCase()+(id?'#'+id:'')+(el.className?'.'+el.className:'')+(el.dataset.k?'[data-k='+el.dataset.k+']':''));});
 doc.querySelectorAll('#main button').forEach(b=>{if(!b.textContent.trim()&&!b.getAttribute('aria-label'))falta.push(t+': botão sem nome');});
 doc.querySelectorAll('#main img').forEach(i=>{if(!i.hasAttribute('alt'))falta.push(t+': img sem alt');});}
const uniq=[...new Set(falta)];console.log('controles sem nome acessível:',uniq.length);uniq.slice(0,60).forEach(x=>console.log(' ',x));process.exit(0);})();
