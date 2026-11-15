const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');const errs=[];
const d=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',beforeParse(w){w.addEventListener('error',e=>errs.push('ERR '+e.message));w.print=()=>{};w.__FP_NOGATE=true;}});
const w=d.window,ev=s=>w.eval(s),q=s=>w.document.querySelector(s),qa=s=>[...w.document.querySelectorAll(s)];
(async()=>{
ev(`seedDemo('lp')`);const comp=ev('DB.cfg.comp');ev(`calcFolha('${comp}')`);const liq1=ev(`totaisComp('${comp}').liq`);
ev(`ACT.empNovo()`);q('#mcy').click();ev(`seedEmpresa2=1;DB.empresa={cnpj:'11444777000161',razao:'SEGUNDA LTDA',regime:'sn',anexo:'std',cnae:'6201501'};DB.estabs=[];saveDB()`);
console.log('menu',/Relatórios por empresa/.test(q('#side').innerHTML));
ev(`go('relEmp')`);console.log('empresas na tela',qa('.relE').length);
q('[data-act=relGerar]').click();let h=q('#relOutE').innerHTML;
console.log('2 empresas',/DEMONSTRAÇÃO/.test(h),/SEGUNDA LTDA/.test(h),'consolidado',/Consolidado das empresas/.test(h));
console.log('liquido bate',h.includes(ev(`brl(${liq1})`)));
// so a segunda, so cadastro
qa('.relE').forEach(c=>{c.checked=c.value===ev('DB._id');c.dispatchEvent(new w.Event('change'))});
qa('.relS').forEach(c=>{c.checked=c.value==='cad';c.dispatchEvent(new w.Event('change'))});
q('[data-act=relGerar]').click();h=q('#relOutE').innerHTML;console.log('filtrado',/SEGUNDA LTDA/.test(h),!/DEMONSTRAÇÃO/.test(h),!/Folha por compet/.test(h));
// todas via checkbox
q('#relTodas').checked=true;q('#relTodas').dispatchEvent(new w.Event('change'));console.log('todas',ev('REL.emps.size'));
ev('window.__csv=null;dl=function(n,t){window.__csv=t};ACT.relCsvE()');console.log('csv linhas',ev('__csv.split(String.fromCharCode(10)).length'));ev('ACT.relPrintE()');
console.log('ERROS',errs.length?errs:'nenhum');process.exit(0);})().catch(e=>{console.log('FALHA',e.stack);process.exit(1)});
