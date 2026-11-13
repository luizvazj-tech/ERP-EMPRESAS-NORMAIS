const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(''+(process.env.FP_HTML||__dirname+'/../index.html')+'','utf8');
const errs=[];
function novo(){const d=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',beforeParse(w){w.addEventListener('error',e=>errs.push('ERR '+e.message));w.print=()=>{};w.__FP_NOGATE=true;}});return d.window;}
(async()=>{
 const fs2=require('fs');const out='/home/claude/xsd/out';fs2.rmSync(out,{recursive:true,force:true});fs2.mkdirSync(out,{recursive:true});
 let n=0;const dump=(reg,w)=>{const evs=w.eval('DB.eventos.map(e=>({tipo:e.tipo,xml:e.xml,id:e.id}))');evs.forEach(e=>{if(!e.xml)return;n++;fs2.writeFileSync(out+'/'+reg+'__'+e.tipo+'__'+(n)+'.xml',e.xml);});};
 for(const reg of ['sn','sn4','lp','lr','lpcprb','alfa']){
  const w=novo(),ev=s=>w.eval(s);ev(`seedDemo('${reg==='alfa'?'lp':reg}')`);
  if(reg==='alfa')ev(`(()=>{const m=cnpjGerar('12ABC34501DE');DB.empresa.cnpj=m;DB.estabs.forEach(s=>{if(s.tpInsc==='1')s.nrInsc=s.tipoEstab==='matriz'?m:cnpjGerar('12ABC3450002');});DB.empregados.forEach(e=>{e.sindCnpj=cnpjGerar('A1B2C3D4E5F6');});})()`);const comp=ev('DB.cfg.comp');
  ev(`calcFolha('${comp}')`);
  if(reg==='lp'||reg==='alfa'){
   const mid=ev('DB.empregados[1].id');
   ev(`DB.ferias.push({id:'f1',empId:'${mid}',perAqIni:'2024-08-15',perAqFim:'2025-08-14',faltas:0,diasGozo:20,diasAbono:10,ini:'${comp}-20',fim:'${comp}-30',compPgto:'${comp}',media:0})`);
   ev(`DB.ferias[0].calc=calcFerias(byId(DB.empregados,'${mid}'),DB.ferias[0],DB.params)`);
   try{await ev(`ACT.ferSend({dataset:{arg:'f1'}})`);}catch(e){console.log('ferSend',e.message)}
   const mar=ev('DB.empregados[0].id');
   await ev(`(async()=>{NAV.cur={name:'resc',params:{empId:'${mar}'}};render();document.querySelector('[name=data]').value='${comp}-15';document.querySelector('[name=ferVencPer]').value='1';document.querySelector('[name=saldoFgts]').value='5000';await ACT.rescSave({dataset:{arg:'0'}});})()`);
   ev(`calcFolha('${comp}')`);
   const jo=ev('DB.empregados[1].id');
   ev(`criarEvento('S-2206',{id:'${jo}',mov:{data:'${comp}-01',novoSalario:4000}})`);
   ev(`criarEvento('S-2230',{id:'${jo}',mov:{data:'${comp}-10',motivo:'01',tipo:'afast'}})`);
   ev(`criarEvento('S-2230',{id:'${jo}',mov:{data:'${comp}-20',fim:'${comp}-25'}})`);
   console.log('lp eventos:',ev(`JSON.stringify(DB.eventos.reduce((a,e)=>{const k=e.tipo+':'+e.status;a[k]=(a[k]||0)+1;return a},{}))`));
  }
  ev(`DB.comps['${comp}'].status='fechada'`);
  ev(`go('envio',{comp:'${comp}'})`);await ev(`ACT.envioTudo()`);
  if(reg==='lp')console.log('lp apos envio:',ev(`JSON.stringify(DB.eventos.reduce((a,e)=>{const k=e.tipo+':'+e.status;a[k]=(a[k]||0)+1;return a},{}))`),'resc:',ev('JSON.stringify(Object.keys(DB.rescisoes||{}))'),'S2299 comp plan:',ev(`plano('${comp}').filter(p=>p.tipo==='S-2299').length`));
  if(reg==='alfa'||reg==='lp'){const e0=ev('DB.empregados[0].id');ev(`criarEvento('S-2205',{id:'${e0}'})`);ev(`criarEvento('S-1298',{comp:'${comp}'})`);
   ['S-1200','S-2200','S-1000','S-1210'].forEach(t=>{const id=ev(`(DB.eventos.find(e=>e.tipo==='${t}'&&e.status==='processado')||{}).id`);if(id)ev(`criarEvento('S-3000',{evId:'${id}'})`);else console.log('sem processado p/',t);});}
  dump(reg,w);
 }
 console.log('xml gerados',n);process.exit(0);
})().catch(e=>{console.log('FALHA',e.stack);process.exit(1)});
