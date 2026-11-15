const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');const errs=[];
const d=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',beforeParse(w){w.addEventListener('error',e=>errs.push('ERR '+e.message));w.print=()=>{};w.__FP_NOGATE=true;}});
const w=d.window,ev=s=>w.eval(s),q=s=>w.document.querySelector(s),qa=s=>[...w.document.querySelectorAll(s)];
let fail=0;const ok=(n,c)=>{console.log((c?'PASS ':'FAIL ')+n);if(!c)fail++;};
(async()=>{
ev(`seedDemo('lp')`);const id=ev('DB.empregados[0].id'),id2=ev('DB.empregados[1].id');
ev(`go('rubricas')`);let h=q('#main').innerHTML;
ok('botão Incluir rubrica',/Incluir rubrica/.test(h));
ok('sem Excluir/Pausar em rubricas do sistema',!/data-act="crudDel"/.test(h)&&!/data-act="rubPausar"/.test(h));
// incluir via formulário
q('[data-act="crudNovo"]').click();
const set=(n,v)=>{const e=q('#f [name="'+n+'"]');if(e.type==='checkbox')e.checked=v;else e.value=v;};
set('desc','AJUDA DE CUSTO HOME OFFICE');set('valor','150,00');set('nat','1099');set('incCP','11');set('incIRRF','11');set('incFGTS','11');set('ini','2026-01');
ok('código sugerido 201',q('#f [name="cod"]').value==='201');
q('[data-act="crudSave"]').click();
const r=ev(`DB.rubricas.find(x=>x.custom)`);ok('rubrica criada custom/opt',r&&r.custom&&r.opt===1&&r.tp===1&&r.valor===150);
const sys=r.sys;
const calc=(c,e)=>ev(`calcEmpregado(DB.empregados.find(x=>x.id==='${e||id}'),'${c}',{},DB.params,DB.empresa)`);
let c1=calc('2026-10'),it=c1.itens.find(i=>i.sys==='${sys}'.replace('${sys}',sys));
ok('entra no cálculo (R$ 150)',it&&it.valor===150&&it.tp===1);
ok('entra na base de INSS/IRRF/FGTS',c1.baseCP>=150);
// antes da vigência
ok('antes do início não calcula',!calc('2025-12').itens.some(i=>i.sys===sys));
// pausa a partir de 2026-11
ev(`(()=>{const r=DB.rubricas.find(x=>x.sys==='${sys}');const el=document.createElement('button');el.dataset.id='${sys}';ACT.rubPausar(el);})()`);
q('#rubMes').value='2026-11';q('#rubOk').click();
await new Promise(r=>setTimeout(r,50));
const pz=ev(`DB.rubricas.find(x=>x.sys==='${sys}').pausas`);
ok('pausa registrada de 2026-11',pz.length===1&&pz[0].de==='2026-11'&&!pz[0].ate);
ok('competência anterior à pausa mantém a rubrica',calc('2026-10').itens.some(i=>i.sys===sys));
ok('a partir da pausa não calcula',!calc('2026-11').itens.some(i=>i.sys===sys)&&!calc('2027-03').itens.some(i=>i.sys===sys));
ev(`go('rubricas')`);h=q('#main').innerHTML;ok('situação Pausada e botão Retomar',/Pausada desde 11\/2026/.test(h)&&/rubRetomar/.test(h));
// retomar em 2027-02
ev(`(()=>{const el=document.createElement('button');el.dataset.id='${sys}';ACT.rubRetomar(el);})()`);
q('#rubMes').value='2027-02';q('#rubOk').click();
ok('retomada: pausa fecha em 2027-01',ev(`DB.rubricas.find(x=>x.sys==='${sys}').pausas[0].ate`)==='2027-01');
ok('mês pausado continua sem; retomado volta',!calc('2026-12').itens.some(i=>i.sys===sys)&&!calc('2027-01').itens.some(i=>i.sys===sys)&&calc('2027-02').itens.some(i=>i.sys===sys));
// percentual, seleção e desconto
ev(`DB.rubricas.push({sys:'rX',cod:'202',desc:'DESCONTO TESTE',tp:2,nat:'9299',incCP:'00',incIRRF:'9',incFGTS:'00',reduz:false,custom:true,opt:1,calc:'pct',valor:10,aplica:'sel',emps:['${id}'],ini:'2026-01',pausas:[]})`);
const a=calc('2026-10').itens.find(i=>i.sys==='rX'),sal=Number(ev(`DB.empregados.find(x=>x.id==='${id}').salario`));
ok('percentual do salário (10%)',a&&Math.abs(a.valor-Math.round(sal*10)/100)<0.011&&a.tp===2);
ok('seleção: outro empregado não recebe',!calc('2026-10',id2).itens.some(i=>i.sys==='rX'));
ok('líquido = proventos − descontos',Math.abs(calc('2026-10').liquido-(calc('2026-10').totProv-calc('2026-10').totDesc))<0.011);
// exclusão: usada em folha → bloqueia; não usada → apaga
ev(`DB.comps['2026-10']=DB.comps['2026-10']||{res:{}};DB.comps['2026-10'].res=DB.comps['2026-10'].res||{};DB.comps['2026-10'].res['${id}']=${JSON.stringify(c1)}`);
ok('exclusão barrada se usada',/não pode ser apagada/.test(ev(`CR.rubricas.delCheck(DB.rubricas.find(x=>x.sys==='${sys}'))`)||''));
ok('exclusão liberada se nunca usada',ev(`CR.rubricas.delCheck(DB.rubricas.find(x=>x.sys==='rX'))`)===null);
ev(`go('rubricas')`);q('[data-act="crudDel"][data-id="rX"]').click();q('#mcy').click();
ok('rubrica excluída (apagada)',!ev(`DB.rubricas.some(x=>x.sys==='rX')`));
ok('rubrica do sistema não exclui',/sistema/.test(ev(`CR.rubricas.delCheck(DB.rubricas.find(x=>x.sys==='SAL'))`)));
// validações
ev(`go('rubricas')`);q('[data-act="crudNovo"]').click();
const set2=(n,v)=>{const e=q('#f [name="'+n+'"]');if(e.type==='checkbox')e.checked=v;else e.value=v;};
set2('cod','201');set2('desc','X');set2('valor','5');set2('ini','2026-01');
ok('código duplicado barrado',/Já existe rubrica/.test(ev(`CR.rubricas.validate(readForm($('#f')))`)||''));
set2('cod','203');set2('valor','0');ok('valor zero barrado',/maior que zero/.test(ev(`CR.rubricas.validate(readForm($('#f')))`)||''));
set2('valor','5');set2('aplica','sel');ok('seleção vazia barrada',/Selecione/.test(ev(`CR.rubricas.validate(readForm($('#f')))`)||''));
// sistema: folha integra e recarga preserva
const bk=ev(`JSON.stringify(DB)`);
ev(`DB=loadDB(${JSON.stringify(bk)})`);ok('persistência (recarregar)',ev(`DB.rubricas.some(x=>x.sys==='${sys}'&&x.pausas.length===1)`));
console.log('erros JS:',errs.length?errs:'nenhum');ok('sem erros de script',!errs.length);
console.log(fail?'FALHAS '+fail:'TODOS OK');process.exit(fail?1:0);
})();
