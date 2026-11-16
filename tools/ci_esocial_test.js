const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');const errs=[];
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',beforeParse(w){w.addEventListener('error',e=>errs.push('ERR '+e.message));w.print=()=>{};w.scrollTo=()=>{};w.__FP_NOGATE=true;}}).window;
const ev=s=>w.eval(s);let fail=0;const ok=(n,c)=>{console.log((c?'PASS ':'FAIL ')+n);if(!c)fail++;};
ev(`seedDemo('lp')`);const comp=ev(`DB.cfg.comp`);
ev(`DB.rf.ci.push({id:'c1',comp:'${comp}',cat:'723',nome:'Sócio Teste',cpf:'52998224725',valor:8000,outras:0,dep:0,dtInicio:'2026-01-01',dtPgto:'${comp}-28',sexo:'M',racaCor:'6',estCiv:'2',grauInstr:'09',nasc:'1980-05-10',cep:'80000000',logr:'Rua A',nr:'10',bairro:'Centro',codMunic:'4106902',uf:'PR'},{id:'c2',comp:'${comp}',cat:'701',nome:'Autônomo Teste',cpf:'11144477735',valor:3000,outras:2000,outrasCnpj:'11222333000181',dep:0,dtPgto:'${comp}-28',nasc:'1985-02-02',cbo:'251605'},{id:'c3',comp:'${comp}',cat:'738',nome:'Cooperado',cpf:'39053344705',valor:5000,apEsp:'20',dtInicio:'2026-01-01',dtPgto:'${comp}-28',nasc:'1979-03-03'})`);
fs.rmSync('/home/claude/xsd/out',{recursive:true,force:true});fs.mkdirSync('/home/claude/xsd/out',{recursive:true});
ev(`DB.rubricas.filter(r=>/^CI/.test(r.sys)).forEach(r=>DB.eventos.unshift({tipo:'S-1010',status:'processado',gen:{args:{id:r.sys}}}))`);
let n=0;for(const [tp,args,reg] of [['S-2300',{id:'c1'},'a'],['S-1200',{ci:'c1',comp},'a'],['S-1210',{ci:'c1',comp},'a'],['S-1200',{ci:'c2',comp},'b'],['S-1210',{ci:'c2',comp},'b'],['S-2300',{id:'c3'},'c']]){
  const x=ev(`criarEvento('${tp}',${JSON.stringify(args)}).xml`);fs.writeFileSync(`/home/claude/xsd/out/${reg}__${tp}__${n++}.xml`,x);}
ok('XML gerados',n===6);
const x1=ev(`criarEvento('S-1200',{ci:'c1',comp:'${comp}'}).xml`),x2=ev(`criarEvento('S-1200',{ci:'c2',comp:'${comp}'}).xml`);
ok('sócio (723) usa a rubrica de natureza 3508 e autônomo (701) a 3501',x1.includes('<codRubr>303</codRubr>')&&x2.includes('<codRubr>301</codRubr>'));
ok('plano de saúde e coparticipação com natureza 9219',ev(`['PLANO','COPART'].every(s=>DB.rubricas.find(r=>r.sys===s).nat==='9219')`));
/* adicional cooperado de produção: 20 anos = 9 p.p. */
ok('adicional cooperado produção 9% de 5.000 = 450',ev(`ciCalc(DB.rf.ci[2]).adic`)===450);
ok('INSS CI com outra fonte (2.000): 11% sobre o restante até o teto',ev(`ciCalc(DB.rf.ci[1]).seg`)===Math.floor(Math.min(3000,ev(`DB.params.tetoInss`)-2000)*11)/100);
/* validação local do fluxo: S-1200 sem S-2300 processado deve ser rejeitado para 723 */
const e1=ev(`criarEvento('S-1200',{ci:'c1',comp:'${comp}'})`);const oc=ev(`validarEvento(DB.eventos[0])`);
ok('S-1200 de sócio sem S-2300 processado é barrado',oc.some(o=>/S-2300/.test(o)));
const e2=ev(`validarEvento(criarEvento('S-1200',{ci:'c2',comp:'${comp}'}))`);ok('S-1200 de autônomo (701) não exige S-2300',!e2.some(o=>/S-2300/.test(o)));
ev(`DB.rf.nf.push({id:'n1',comp:'${comp}',tipo:'tom',nome:'Coop',nf:'1',valor:10000,aliq:11,coopGrau:'20'})`);
ev(`calcFolha('${comp}')`);const A=ev(`dctfApurar('${comp}')`);ok('DCTFWeb: 1141-05 = 450 (cooperativa de produção)',(A.L.find(x=>x.cr==='1141-05')||{}).deb===450);
ok('adicional do tomador de cooperativa de trabalho = 700, com código ainda a conferir',(A.L.find(x=>/cooperativa de trabalho/.test(x.desc))||{}).deb===700);
ok('sem erros de script',errs.length===0);if(errs.length)console.log(errs);console.log(fail?'FALHAS '+fail:'TODOS OK');process.exit(fail?1:0);
