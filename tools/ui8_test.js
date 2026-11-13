const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');const errs=[];
const d=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',beforeParse(w){w.addEventListener('error',e=>errs.push('ERR '+e.message));w.print=()=>{};w.__FP_NOGATE=true;}});
const w=d.window,ev=s=>w.eval(s);
(async()=>{
ev(`seedDemo('lp')`);const comp=ev('DB.cfg.comp');
const telas=['cct','bh','regras','sstCat','sstAso','sstRisco','retornos','guias'];
for(const t of telas){try{ev(`go('${t}')`);const h=w.document.querySelector('#main').innerHTML;console.log(t,h.length>200?'ok':'VAZIO');}catch(e){errs.push(t+': '+e.message);}}
// aba regras + salvar
const eid=ev('DB.empregados[0].id');
ev(`go('empForm',{id:'${eid}'})`);
const f=w.document.querySelector('#f')||w.document;console.log('aba regras presente',!!w.document.querySelector('[data-tab=reg] [name=j1236]'));
// CCT + piso + reajuste
ev(`DB.cct.push({id:'c1',nome:'CCT Teste',reaj:'5',pisos:'${ev('byId(DB.cargos,DB.empregados[0].cargo).cbo')};9000,00\\nzzz;1'});DB.empregados[0].cct='c1'`);
console.log('piso',ev('pisoDoEmpregado(DB.empregados[0])'),'salario',ev('DB.empregados[0].salario'));
console.log('conferir',JSON.stringify(ev('conferirRegras().map(x=>x.sev+":"+x.msg.slice(0,60))')));
ev(`document.body.insertAdjacentHTML('beforeend','<div id="mr"><input name="cctId" value="c1"><input name="pct" value="5"><input name="data" value="${comp}-01"></div>')`);
ev('ACT.cctReajOk()');console.log('apos reajuste',ev('DB.empregados[0].salario'),'S-2206',ev(`DB.eventos.filter(e=>e.tipo==='S-2206').length`));
// banco de horas
ev(`DB.bh.push({id:'b1',empId:'${eid}',data:'2025-01-10',h:'10'})`);console.log('saldoBH',ev(`saldoBH('${eid}')`));
// consignado
ev(`DB.empregados[0].consig=[{tipo:'emprestimo',desc:'Banco',parcela:'9999',ini:'2026-01'}];calcFolha('${comp}')`);
console.log('margem',JSON.stringify(ev(`DB.comps['${comp}'].res['${eid}'].margem`)),'alerta',ev(`conferirRegras().some(x=>/Consignado/.test(x.msg))`));
// retornos
const x5001=`<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtBasesTrab/S_01_03_00"><evtBasesTrab><ideEvento><perApur>${comp}</perApur></ideEvento><ideTrabalhador><cpfTrab>${ev('DB.empregados[0].cpf')}</cpfTrab></ideTrabalhador><infoCpCalc><tpCR>108201</tpCR><vrCpSeg>100.00</vrCpSeg><vrDescSeg>100.00</vrDescSeg></infoCpCalc></evtBasesTrab></eSocial>`;
w.__x=x5001;const r=ev('lerRetorno(__x)');console.log('retorno',JSON.stringify(r));
ev(`DB.ret.push(Object.assign(lerRetorno(__x),{per:'${comp}'}))`);console.log('conciliar',JSON.stringify(ev(`conciliar('${comp}')`)));
ev(`go('guias')`);console.log('guias venc',ev(`vencGuia('2026-10',20)`),ev(`vencGuia('2026-11',20)`),ev(`vencGuia('2026-04',20)`));
console.log('ERROS',errs.length?errs:'nenhum');process.exit(0);})().catch(e=>{console.log('FALHA',e.stack);process.exit(1)});
