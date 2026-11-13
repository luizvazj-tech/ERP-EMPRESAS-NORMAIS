const {JSDOM}=require('jsdom');const fs=require('fs');
const d=new JSDOM(fs.readFileSync(__dirname+'/../index.html','utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',beforeParse(w){w.print=()=>{};w.__FP_NOGATE=true;Object.defineProperty(w,'crypto',{value:require('crypto').webcrypto});}});
const w=d.window;(async()=>{w.eval(`seedDemo('lp')`);
const r=await w.eval(`(async()=>{const t=JSON.stringify(DB);const c=await bkCifrar(t,'Senha#Forte2026x');const ok=(await bkDecifrar(c,'Senha#Forte2026x'))===t;let bad=false;try{await bkDecifrar(c,'errada');}catch(e){bad=true;}return JSON.stringify({ok,bad,semCpf:!JSON.stringify(c).includes(DB.empregados[0].cpf),it:c.it})})()`);console.log(r);process.exit(0)})();
