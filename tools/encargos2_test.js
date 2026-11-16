const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');const errs=[];
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',beforeParse(w){w.addEventListener('error',e=>errs.push('ERR '+e.message));w.print=()=>{};w.scrollTo=()=>{};w.__FP_NOGATE=true;}}).window;
const ev=s=>w.eval(s),q=s=>w.document.querySelector(s);let fail=0;const ok=(n,c)=>{console.log((c?'PASS ':'FAIL ')+n);if(!c)fail++;};
ev(`seedDemo('lp')`);const comp=ev(`(Object.keys(DB.comps).sort().pop()||DB.cfg.comp)`);ev(`calcFolha('${comp}')`);
const A0=ev(`dctfApurar('${comp}')`);
ok('sem exposição: sem linha de adicional GILRAT',!A0.L.some(l=>l.cr==='1141-01'));
ok('terceiros divididos por entidade (FPAS 515/507)',A0.L.filter(l=>/CP Terceiros —/.test(l.desc)).length>=2&&Math.abs(A0.L.filter(l=>/CP Terceiros —/.test(l.desc)).reduce((a,l)=>a+l.deb,0)-ev(`totaisComp('${comp}').terc`))<0.03);
const e0=ev(`DB.empregados[0].id`);const baseE=ev(`DB.comps['${comp}'].res['${e0}'].baseCP`);
ev(`DB.empregados[0].apEsp='25'`);ev(`calcFolha('${comp}')`);const A1=ev(`dctfApurar('${comp}')`);const ad=A1.L.find(l=>l.cr==='1141-01');
ok('adicional GILRAT 6% sobre a base do exposto',ad&&Math.abs(ad.deb-Math.floor(baseE*6)/100)<0.02);
ev(`DB.empregados[0].apEsp='15'`);ev(`calcFolha('${comp}')`);ok('adicional 12% (15 anos)',Math.abs(ev(`dctfApurar('${comp}')`).L.find(l=>l.cr==='1141-01').deb-Math.floor(baseE*12)/100)<0.02);
/* CI */
ev(`DB.rf.ci.push({id:'c1',comp:'${comp}',cat:'723',nome:'Sócio',cpf:'52998224725',valor:10000,outras:0,dep:0})`);
const c=ev(`ciCalc(DB.rf.ci[0])`);const teto=ev(`DB.params.tetoInss`);
ok('INSS CI = 11% do teto (pró-labore acima do teto)',Math.abs(c.seg-Math.floor(teto*11)/100)<0.011&&c.excedeTeto);
ok('patronal CI = 20% de 10.000 (Lucro Presumido)',c.pat===2000);
ev(`DB.rf.ci[0].outras=${teto}`);ok('outras fontes no teto: INSS zero',ev(`ciCalc(DB.rf.ci[0]).seg`)===0);
ev(`DB.rf.ci[0].outras=0`);const A2=ev(`dctfApurar('${comp}')`);
ok('CI na DCTFWeb com os códigos do Manual: 1099-01, 1138-04, 0588-06',A2.L.some(l=>l.cr==='1099-01')&&A2.L.some(l=>l.cr==='1138-04')&&A2.L.some(l=>l.cr==='0588-06'));
ok('terceiros com código por entidade (1170, 1176, 1181/1191...)',['1170-01','1176-01'].every(c=>A2.L.some(l=>l.cr===c)));
ev(`DB.empresa.regime='sn';DB.empresa.anexo='std'`);ok('Simples Anexo I–III: patronal CI = 0 (já no DAS)',ev(`ciCalc(DB.rf.ci[0]).pat`)===0);
ev(`DB.empresa.regime='lp'`);
/* CPRB */
ev(`DB.rf.cprb.push({id:'p1',comp:'2026-11',ativ:'TI',rb:100000,aliq:4.5})`);
ok('CPRB 2026: 60% de 4,5% sobre 100.000 = 2.700',ev(`cprbVal(DB.rf.cprb[0])`)===2700);
ev(`DB.rf.cprb[0].comp='2027-03'`);ok('CPRB 2027: 40% = 1.800',ev(`cprbVal(DB.rf.cprb[0])`)===1800);
ev(`DB.rf.cprb[0].comp='2028-01'`);ok('CPRB 2028: extinta = 0',ev(`cprbVal(DB.rf.cprb[0])`)===0);
ev(`DB.rf.cprb[0].comp='2025-06'`);ok('CPRB 2025: 80% = 3.600',ev(`cprbVal(DB.rf.cprb[0])`)===3600);
ev(`DB.rf.cprb[0].comp='${comp}'`);ok('CPRB entra na apuração em 2985-01 sem abater crédito',ev(`dctfApurar('${comp}')`).L.some(l=>l.cr==='2985-01'&&l.cred===0));
/* SENAI adicional */
ev(`DB.lotacoes.forEach(l=>l.fpas='507')`);let n=0;ev(`(function(){const c=DB.comps['${comp}'];const ids=Object.keys(c.res);for(let i=0;i<510;i++){c.res['x'+i]=Object.assign({},c.res[ids[0]]);DB.empregados.push(Object.assign({},DB.empregados[0],{id:'x'+i,categoria:'101'}));}})()`);
const A3=ev(`dctfApurar('${comp}')`);ok('SENAI adicional 1664-01 acima de 500 empregados',A3.L.some(l=>l.cr==='1664-01'&&l.deb>0));
for(const s of ['ciPag','cprbRb','reinfNf','reinfEsp','darf']){ev(`go('${s}',{comp:'${comp}'})`);ok('tela '+s,q('#main').innerHTML.length>400);}
ok('sem erros',errs.length===0);if(errs.length)console.log(errs);console.log(fail?'FALHAS '+fail:'TODOS OK');process.exit(fail?1:0);
