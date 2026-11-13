const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(''+(process.env.FP_HTML||__dirname+'/../index.html')+'','utf8');
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',beforeParse(w){w.print=()=>{};w.__FP_NOGATE=true;}}).window;
const ev=s=>w.eval(s);ev(`seedDemo('lp')`);
let ok=0,bad=0;
const chk=(nome,got,exp)=>{const d=Math.abs(got-exp)<=0.011;d?ok++:bad++;console.log((d?'OK   ':'DIVERGE ')+nome+' obtido='+got+' esperado='+exp);};
// INSS: referências por soma de faixas (cálculo independente)
const inssRef=b=>{b=Math.min(b,8475.55);const f=[[1621,7.5],[2902.84,9],[4354.27,12],[8475.55,14]];let p=0,t=0;for(const [l,a] of f){if(b>p)t+=(Math.min(b,l)-p)*a/100;p=l;}return Math.round(t*100)/100;};
for(const b of [1621,2000,3600,5000,8475.55,12000])chk('INSS '+b,ev(`calcInss(${b},DB.params)`),inssRef(b));
chk('INSS teto 988,09 (Portaria 13/2026)',ev('calcInss(9999,DB.params)'),988.09);
// IRRF: exemplos oficiais Receita Federal (rend 6000; base 5392,80 -> 574,29; redutor 179,75 -> 394,54)
const ir=(r,i,d)=>ev(`calcIrrf(${r},${i},${d||0},0,DB.params)`);
chk('IRRF Receita ex. 6000 (simplificado)',ir(6000,0).irrf,394.54);
chk('IRRF Receita redutor 6000',ir(6000,0).reducao,179.75);
chk('IRRF Senior 5900 inss 635,60 (legal 5264,40)',ir(5900,635.60).irrf,345.92);
chk('IRRF até 5000 zera',ir(5000,0).irrf,0);
chk('IRRF 7350 redutor 0 (7350*0,133145=978,62)',ir(7350,800).reducao,0.0);
chk('IRRF 8000 sem redutor',ir(8000,988.09).reducao,0);
chk('IRRF 13º 3600 (agora com redutor)',ev(`calc13(DB.empregados[1],2026,DB.params,0).irrf13`),0);
console.log('RESUMO ok='+ok+' diverge='+bad);
