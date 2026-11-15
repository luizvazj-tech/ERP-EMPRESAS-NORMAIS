const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');const errs=[];
const d=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',beforeParse(w){w.addEventListener('error',e=>errs.push('ERR '+e.message));w.print=()=>{};w.__FP_NOGATE=true;}});
const w=d.window,ev=s=>w.eval(s),q=s=>w.document.querySelector(s),qa=s=>[...w.document.querySelectorAll(s)];
(async()=>{
ev(`seedDemo('lp')`);const id=ev('DB.empregados[0].id');
console.log('menu',['Histórico do empregado','Saúde ocupacional','Atestados'].map(t=>q('#side').innerHTML.includes(t)));
// diff cadastral
ev(`saveDB()`);const n0=ev('DB.hAlt.length');ev(`DB.empregados[0].salario=String(Number(DB.empregados[0].salario)+500);DB.empregados[0].banco='999';saveDB()`);
console.log('hAlt novas',ev('DB.hAlt.length')-n0,ev('DB.hAlt.slice(-2).map(x=>x.campo+": "+x.de+" -> "+x.para)'));
// soma atestados: 10d + 10d mesma CID dentro de 60 dias
const push=(o)=>ev(`DB.atest.push(Object.assign({id:uid('a'),empId:'${id}'},${JSON.stringify(o)}))`);
push({tipo:'d',ini:'2026-10-01',dias:10,cid:'J11.1'});push({tipo:'d',ini:'2026-11-01',dias:10,cid:'J11.0'});push({tipo:'d',ini:'2026-12-20',dias:3,cid:'M54'});
const S=ev(`hxSoma('${id}').map(x=>[x.key,x.cad,x.antes,x.emp,x.inss,x.inssDesde,x.gap])`);console.log('soma',JSON.stringify(S));
// >60 dias reinicia
push({tipo:'d',ini:'2027-03-01',dias:5,cid:'J11'});console.log('reinicia',JSON.stringify(ev(`hxSoma('${id}').filter(x=>x.key==='J11').map(x=>[x.cad,x.antes,x.emp,x.inss,x.gap])`)));
// 16o dia: 15 + volta 16o + novo afastamento em 60 dias -> tudo INSS
push({tipo:'d',ini:'2026-05-01',dias:15,cid:'K29'});push({tipo:'d',ini:'2026-06-10',dias:4,cid:'K29'});console.log('16o dia',JSON.stringify(ev(`hxSoma('${id}').filter(x=>x.key==='K29').map(x=>[x.emp,x.inss,x.inssDesde])`)));
// ASO / exames
ev(`DB.sstAso.push({id:uid('s'),empId:'${id}',tpExame:'0',dtAso:'2020-01-01',resAso:'1'})`);ev(`DB.atest.push({id:uid('a'),empId:'${id}',tipo:'at',ini:'2026-09-01',dias:40,cid:'S61'})`);
ev(`go('saude')`);let h=q('#main').innerHTML;console.log('prazos vencido',/vencido|Sem ASO/.test(h),'retorno pendente',/retorno ao trabalho pendente/.test(h));
ev(`go('saude',{tab:'afast'})`);console.log('afast',/Exigível/.test(q('#main').innerHTML));
ev(`go('saude',{tab:'soma',emp:'${id}'})`);h=q('#main').innerHTML;console.log('soma tela',/Decreto 3.048/.test(h),/desde/.test(h));
// demissional dispensável
ev(`DB.empregados[0].desligamento='2026-11-10'`);ev(`DB.sstAso.push({id:uid('s'),empId:'${id}',tpExame:'1',dtAso:'2026-09-15',resAso:'1'})`);console.log('demissional',JSON.stringify(ev(`hxExames(DB.empregados[0]).sit`)));ev(`DB.empregados[0].desligamento=''`);
// crud adv + curso
ev(`go('hAdv')`);ev(`DB.hAdv.push({id:'x1',empId:'${id}',data:'2026-10-02',tipo:'susp',dias:'3',motivo:'Falta injustificada',ciencia:'s'})`);ev(`DB.hCurso.push({id:'c1',empId:'${id}',curso:'NR-35',ch:'8',dtFim:'2026-08-01',validade:'2027-08-01'})`);
ev(`go('atest')`);console.log('atest tela',/Soma \(art. 75\)/.test(q('#main').innerHTML));
console.log('valid susp>30',ev(`CR.hAdv.validate({tipo:'susp',dias:'31'})`));
ev(`HX.emp='${id}';go('hist')`);h=q('#main').innerHTML;console.log('hist cats',['Alteração: Salário','Advertência|Suspensão','Curso: NR-35','ASO Admissional','Admissão'].map(t=>new RegExp(t).test(h)));
ev('ACT.hxPrint()');console.log('print',/HISTÓRICO DO EMPREGADO/.test(q('#printarea').innerHTML)||'limpo');
console.log('ERROS',errs.length?errs:'nenhum');process.exit(0);})().catch(e=>{console.log('FALHA',e.stack);process.exit(1)});
