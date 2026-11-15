const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');const errs=[];
const d=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',beforeParse(w){w.addEventListener('error',e=>errs.push('ERR '+e.message));w.print=()=>{};w.__FP_NOGATE=true;}});
const w=d.window,ev=s=>w.eval(s),q=s=>w.document.querySelector(s);
(async()=>{
ev(`seedDemo('lp')`);const orig=ev('DB.empresa.razao');
const t0=Date.now();await ev(`exCarregar()`);console.log('ms',Date.now()-t0);
console.log('ativa',ev('DB.empresa.razao'),'emps',ev('DB.empregados.length'),'arquivadas',ev('DB._emps.map(x=>x.razao+(x.ex?" [ex]":""))'));
const resumo=ev(`(()=>{const out=[];const dbs=[DB].concat(DB._emps.map(x=>loadDB(x.snap)));dbs.forEach(d=>{const comps=Object.keys(d.comps).sort();const ev_=d.eventos;out.push({emp:d.empresa.razao,regime:d.empresa.regime,n:d.empregados.length,comps:comps.map(c=>c+':'+d.comps[c].status+':'+Object.keys(d.comps[c].res).length),eventos:ev_.length,proc:ev_.filter(e=>e.status==='processado').length,gerado:ev_.filter(e=>e.status==='gerado').length,rej:ev_.filter(e=>e.status==='rejeitado').length,ferias:(d.ferias||[]).length,aso:d.sstAso.length,atest:d.atest.length,adv:d.hAdv.length,cur:d.hCurso.length,hAlt:d.hAlt.length,erroOc:ev_.filter(e=>e.ocorr&&e.ocorr.length).slice(0,2).map(e=>e.tipo+':'+e.ocorr[0])});});return out;})()`);
console.log(JSON.stringify(resumo,null,1));
// liquidos fechados
console.log('liq',ev(`Object.keys(DB.comps).sort().map(c=>c+' '+totaisComp(c).liq)`));
for(const t of ['ficha','relEmp','saude','hist','atest','hAdv','hCurso','folha','painel','regras'])try{ev(`go('${t}')`);console.log(t,q('#main').innerHTML.length>300?'ok':'VAZIO');}catch(e){errs.push(t+': '+e.message);}
ev(`go('saude')`);console.log('alertas saude',/vencido|Sem ASO|pendente/.test(q('#main').innerHTML));
ev(`go('saude',{tab:'soma',emp:DB.empregados[2].id})`);console.log('soma INSS',/desde/.test(q('#main').innerHTML));
// trocar para outra e voltar
ev(`ACT.empTrocar({dataset:{arg:DB._emps[0].id}})`);console.log('troca',ev('DB.empresa.razao'),ev('DB.empregados.length'));
console.log('orig preservada?',ev('DB._emps.some(x=>x.razao==="'+orig+'")'));
// remover exemplo
ev(`ACT.exRemover()`);q('#mcy').click();console.log('apos remover',ev('DB.empresa&&DB.empresa.razao'),ev('DB._emps.length'));
console.log('ERROS',errs.length?errs:'nenhum');process.exit(0);})().catch(e=>{console.log('FALHA',e.stack);process.exit(1)});
