/* Rubricas incluídas pelo usuário: proporcionalidade, geração de S-1010/S-1200/S-1210 e gravação dos XML em /home/claude/xsd/out (reg "rub") para xsdval.py e xmlcheck.py */
const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');const errs=[];
const d=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',beforeParse(w){w.addEventListener('error',e=>errs.push('ERR '+e.message));w.print=()=>{};w.__FP_NOGATE=true;}});
const w=d.window,ev=s=>w.eval(s);let fail=0;const ok=(n,c)=>{console.log((c?'PASS ':'FAIL ')+n);if(!c)fail++;};
(async()=>{
ev(`seedDemo('lp')`);const comp=ev('compAtual()');
const e0=ev('DB.empregados[0].id'),e1=ev('DB.empregados[1].id');
const add=(o)=>ev(`DB.rubricas.push(Object.assign({custom:true,opt:1,pausas:[],aplica:'todos',ini:'2020-01',incCP:'11',incIRRF:'11',incFGTS:'11',reduz:false,conf:false},${JSON.stringify(o)}))`);
add({sys:'rA',cod:'201',desc:'AJUDA DE CUSTO HOME OFFICE',tp:1,nat:'1099',calc:'fixo',valor:300,prop:'int'});
add({sys:'rB',cod:'202',desc:'BONUS ASSIDUIDADE',tp:1,nat:'1099',calc:'pct',valor:5,prop:'dias'});
add({sys:'rC',cod:'203',desc:'MENSALIDADE SINDICAL ASSOCIATIVA',tp:2,nat:'9299',calc:'fixo',valor:40,prop:'adm',incCP:'00',incIRRF:'9',incFGTS:'00'});
add({sys:'rD',cod:'204',desc:'DESCONTO QUE REDUZ BASES',tp:2,nat:'9209',calc:'fixo',valor:25,prop:'int',reduz:true});
// proporcionalidade
const E=ev(`DB.empregados.find(x=>x.id==='${e0}')`);
const calc=(c,id)=>ev(`calcEmpregado(DB.empregados.find(x=>x.id==='${id||e0}'),'${c}',{},DB.params,DB.empresa)`);
const val=(c,s,id)=>{const i=calc(c,id).itens.find(x=>x.sys===s);return i?i.valor:0;};
const sal=Number(ev(`DB.empregados.find(x=>x.id==='${e0}').salario`));
ok('integral: R$ 300 em mês cheio',val('2026-02','rA')===300);
// admissão no meio do mês: dia 11 -> 20/30
ev(`DB.empregados.find(x=>x.id==='${e1}').admissao='2026-02-11'`);
ok('adm: 20/30 do desconto sindical (R$ 26,67)',Math.abs(val('2026-02','rC',e1)-26.67)<0.011);
ok('dias: 20/30 de 5% do salário',Math.abs(val('2026-02','rB',e1)-Math.round(Number(ev(`DB.empregados.find(x=>x.id==='${e1}').salario`))*5/100*20/30*100)/100)<0.011);
ok('integral não proporcionaliza na admissão',val('2026-02','rA',e1)===300);
// férias no mês: só "dias" reduz
ev(`DB.ferias.push({id:'fx',empId:'${e0}',perAqIni:'2024-01-01',perAqFim:'2024-12-31',faltas:0,diasGozo:15,diasAbono:0,ini:'2026-03-10',fim:'2026-03-24',compPgto:'2026-03',media:0})`);
ev(`DB.ferias[DB.ferias.length-1].calc=calcFerias(byId(DB.empregados,'${e0}'),DB.ferias[DB.ferias.length-1],DB.params)`);
const diasFer=calc('2026-03').dias;
ok('férias: dias trabalhados < 30 no mês',diasFer<30);
ok('adm ignora férias (R$ 40 integral)',val('2026-03','rC')===40);
ok('dias considera férias',Math.abs(val('2026-03','rB')-Math.round(sal*5/100*diasFer/30*100)/100)<0.011);
// desligamento
ev(`DB.empregados.find(x=>x.id==='${e1}').desligamento='2026-05-15'`);
ok('desligamento dia 15: 15/30',Math.abs(val('2026-05','rC',e1)-20)<0.011);
ev(`DB.empregados.find(x=>x.id==='${e1}').desligamento=''`);ev(`DB.empregados.find(x=>x.id==='${e1}').admissao='2022-02-01'`);ev(`DB.ferias.pop()`);
// reduz bases
const bA=calc(comp).baseCP;ev(`DB.rubricas.find(x=>x.sys==='rD').reduz=false`);const bB=calc(comp).baseCP;ev(`DB.rubricas.find(x=>x.sys==='rD').reduz=true`);ok('desconto que reduz bases diminui a base em R$ 25',Math.abs((bB-bA)-25)<0.011);
// folha, envio e XML
ev(`calcFolha('${comp}')`);ev(`DB.comps['${comp}'].status='fechada'`);
ev(`go('envio',{comp:'${comp}'})`);await ev(`ACT.envioTudo()`);
const st=ev(`JSON.stringify(DB.eventos.reduce((a,e)=>{const k=e.tipo+':'+e.status;a[k]=(a[k]||0)+1;return a},{}))`);console.log('eventos',st);
ok('S-1010 das 4 rubricas novas geradas e processadas',['rA','rB','rC','rD'].every(s=>ev(`DB.eventos.some(e=>e.tipo==='S-1010'&&e.gen&&e.gen.args.id==='${s}'&&e.status==='processado')`)));
ok('nenhum evento rejeitado',!/rejeitado/.test(st));
// bloqueio sem natureza
ev(`DB.rubricas.find(x=>x.sys==='rA').nat=''`);
const oc=ev(`JSON.stringify(validarBase(criarEvento('S-1200',{id:'${e0}',comp:'${comp}'})))`);
console.log('sem natureza ->',oc.slice(0,200));ok('S-1200 bloqueado sem natureza da rubrica nova',/natureza|Natureza/.test(oc));
ev(`DB.rubricas.find(x=>x.sys==='rA').nat='1099'`);
const out='/home/claude/xsd/out';fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});let n=0;
ev('DB.eventos.map(e=>({t:e.tipo,x:e.xml}))').forEach(e=>{if(!e.x)return;n++;fs.writeFileSync(`${out}/rub__${e.t}__${n}.xml`,e.x);});
console.log('XML gravados',n);
console.log('erros JS:',errs.length?errs:'nenhum');ok('sem erros de script',!errs.length);
console.log(fail?'FALHAS '+fail:'TODOS OK');process.exit(fail?1:0);
})();
