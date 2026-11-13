const {JSDOM}=require('jsdom');const fs=require('fs');
const d=new JSDOM(fs.readFileSync(__dirname+'/../index.html','utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',beforeParse(w){w.print=()=>{};w.__FP_NOGATE=true;}});
const w=d.window,ev=s=>w.eval(s);ev(`seedDemo('lp')`);const comp=ev('DB.cfg.comp');
ev(`DB.comps['${comp}'].lanc[DB.empregados[0].id]={plr:'8000'};calcFolha('${comp}')`);
(async()=>{const r=await ev(`(async()=>{const x=criarEvento('S-1010',{id:'PLR'});const rr=await enviarEventos([x]);return JSON.stringify({st:x.status,oc:x.ocorr})})()`);console.log(r);process.exit(0)})();
