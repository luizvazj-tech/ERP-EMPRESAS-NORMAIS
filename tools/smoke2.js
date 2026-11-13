const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(''+(process.env.FP_HTML||__dirname+'/../index.html')+'','utf8');
const errs=[];
function novo(){const d=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',beforeParse(w){w.addEventListener('error',e=>errs.push('ERR '+e.message));w.print=()=>{};w.__FP_NOGATE=true;}});return d.window;}
(async()=>{
 const res={};
 for(const reg of ['sn','sn4','lp','lr','lpcprb']){
  const w=novo(),ev=s=>w.eval(s);ev(`seedDemo('${reg}')`);const comp=ev('DB.cfg.comp');
  const screens=['home','empresa','estabs','lotacoes','estrutura','cargos','rubricas','empregados','movs','lanc','folha','painel','cmp','ferias','d13','resc','holerite','relat','envio','biblioteca','integr','params','backup','marca'];
  for(const s of screens){try{ev(`go('${s}',{comp:'${comp}'})`);}catch(e){errs.push(reg+' '+s+': '+e.stack.split('\n').slice(0,3).join(' | '));}}
  ev(`calcFolha('${comp}')`);
  const T=ev(`totaisComp('${comp}')`);
  res[reg]={classTrib:ev('DB.empresa.classTrib'),pat:T.pat,rat:T.rat,terc:T.terc,inss:T.inss,fgts:T.fgts,irrf:T.irrf};
  const ck=ev('checarEstrutura()').filter(x=>x.n==='err');if(ck.length)errs.push(reg+' estrutura: '+JSON.stringify(ck));
  // todos os eventos de tabelas devem validar
  const ids=ev(`(()=>{const o=[];o.push(criarEvento('S-1000',{}).id);DB.estabs.forEach(s=>o.push(criarEvento('S-1005',{id:s.id}).id));DB.lotacoes.forEach(l=>o.push(criarEvento('S-1020',{id:l.id}).id));return o;})()`);
  const oc=ev(`DB.eventos.filter(e=>['S-1000','S-1005','S-1020'].includes(e.tipo)).map(e=>validarEvento(e).filter(x=>!x.startsWith('Dependência')))`).flat();
  if(oc.length)errs.push(reg+' validação tabelas: '+JSON.stringify(oc));
  if(reg==='sn'){const x=ev(`DB.eventos.find(e=>e.tipo==='S-1005').xml`);if(x.includes('aliqGilrat'))errs.push('sn std não deveria ter aliqGilrat');const l=ev(`DB.eventos.find(e=>e.tipo==='S-1020').xml`);if(!l.includes('<codTercs>0000'))errs.push('sn codTercs');}
  if(reg==='lpcprb'){if(!ev(`DB.eventos.find(e=>e.tipo==='S-1000').xml`).includes('<indDesFolha>1'))errs.push('cprb indDesFolha');}
  if(reg==='lp'){const x=ev(`DB.eventos.find(e=>e.tipo==='S-1020').xml`);if(!x.includes('<codTercs>0115'))errs.push('lp codTercs 0115');}
 }
 console.log(JSON.stringify(res,null,1));
 // --- férias, 13º, rescisão em lp
 const w=novo(),ev=s=>w.eval(s);ev(`seedDemo('lp')`);const comp=ev('DB.cfg.comp');
 const mid=ev('DB.empregados[1].id');// João 3600
 ev(`DB.ferias.push({id:'f1',empId:'${mid}',perAqIni:'2024-08-15',perAqFim:'2025-08-14',faltas:0,diasGozo:20,diasAbono:10,ini:'${comp}-20',fim:'${comp}-30',compPgto:'${comp}',media:0})`);
 ev(`DB.ferias[0].calc=calcFerias(byId(DB.empregados,'${mid}'),DB.ferias[0],DB.params)`);
 console.log('férias',JSON.stringify(ev('DB.ferias[0].calc')),'valid',JSON.stringify(ev(`validarFerias(byId(DB.empregados,'${mid}'),DB.ferias[0],DB.params)`)));
 ev(`calcFolha('${comp}')`);
 const r=ev(`DB.comps['${comp}'].res['${mid}']`);
 console.log('folha c/ férias:',r.itens.map(i=>i.cod+' '+i.desc+' '+i.valor).join(' | '),'liq',r.liquido,'inss',r.inss,'irrf',r.irrf,'dias',r.dias);
 // 13º
 const ano=comp.slice(0,4);
 ev(`go('d13',{ano:'${ano}'});`);ev(`NAV.cur.params={ano:'${ano}',p1:'${ano}-11',p2:'${ano}-12'};render();ACT.d13Calc()`);
 console.log('13º',JSON.stringify(ev(`Object.values(DB.decimo).map(d=>({avos:d.avos,bruto:d.bruto,p1:d.p1.valor,inss:d.inss13,irrf:d.irrf13,liq2:d.liq2}))`)));
 ev(`calcFolha('${ano}-12')`);
 const r12=ev(`DB.comps['${ano}-12'].res['${mid}']`);
 console.log('dez c/13º:',r12.itens.map(i=>i.cod+' '+i.valor).join(' | '),'liq',r12.liquido);
 // rescisão
 const mar=ev('DB.empregados[0].id');
 ev(`NAV.cur={name:'resc',params:{empId:'${mar}'}};render();`);
 const v=ev(`calcRescisaoVerbas(Object.assign({},byId(DB.empregados,'${mar}'),{desligamento:'${comp}-15'}),{motivo:'02',aviso:'indenizado',ferVencPer:1,saldoFgts:5000,media:0},DB.params)`);
 console.log('rescisão verbas',JSON.stringify(v));
 await ev(`(async()=>{NAV.cur={name:'resc',params:{empId:'${mar}'}};render();document.querySelector('[name=data]').value='${comp}-15';document.querySelector('[name=ferVencPer]').value='1';document.querySelector('[name=saldoFgts]').value='5000';await ACT.rescSave({dataset:{arg:'0'}});})()`);
 const rr=ev(`DB.comps['${comp}'].res['${mar}']`);
 console.log('folha c/ rescisão:',rr.itens.map(i=>i.cod+' '+i.valor).join(' | '),'liq',rr.liquido,'multa',rr.multaFgts);
 const x2299=ev(`DB.eventos.find(e=>e.tipo==='S-2299').xml`);console.log('S-2299 verbasResc?',x2299.includes('verbasResc'),'detVerbas',(x2299.match(/detVerbas>/g)||[]).length/2);
 console.log('plano comp:',ev(`plano('${comp}').map(p=>p.tipo).filter((t,i,a)=>a.indexOf(t)===i).join(',')`));
 // fluxo de envio completo na rescisão
 ev(`DB.comps['${comp}'].status='fechada'`);
 ev(`go('envio',{comp:'${comp}'})`);await ev(`ACT.envioTudo()`);
 console.log('eventos',ev(`JSON.stringify(DB.eventos.reduce((a,e)=>{const k=e.tipo+':'+e.status;a[k]=(a[k]||0)+1;return a},{}))`));
 console.log('ERROS',errs.length?errs:'nenhum');process.exit(0);
})().catch(e=>{console.log('FALHA',e.stack);process.exit(1)});
