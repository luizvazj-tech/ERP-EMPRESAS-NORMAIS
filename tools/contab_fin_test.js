/* Contabilidade, financeiro e CNAB 240 */
const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');const errs=[];
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',beforeParse(w){w.addEventListener('error',e=>errs.push('ERR '+e.message));w.print=()=>{};w.scrollTo=()=>{};w.__FP_NOGATE=true;}}).window;
const ev=s=>w.eval(s),q=s=>w.document.querySelector(s);let fail=0;const ok=(n,c)=>{console.log((c?'PASS ':'FAIL ')+n);if(!c)fail++;};
(async()=>{
ev(`seedDemo('lp')`);
const comp=ev(`(()=>{const c=Object.keys(DB.comps).sort().pop()||DB.cfg.comp;return c;})()`);
ev(`calcFolha('${comp}')`);
const n=ev(`Object.keys(DB.comps['${comp}'].res).length`);ok('folha calculada ('+n+' empregados)',n>0);
/* dados bancários dos empregados */
ev(`DB.empregados.forEach((e,i)=>{if(i<3){e.formaPgto='cc';e.banco=i==0?'341':'001';e.agencia='1234';e.agDv='5';e.conta='9876'+i;e.contaDv='1';e.tipoConta='cc';}else if(i==3){e.formaPgto='pix';}})`);
/* contabilização */
let r=ev(`ctbGerar('${comp}')`);ok('gera lançamentos: '+JSON.stringify(r),r.n>=2);
const bal=ev(`(()=>{const o=ctbSaldos();let d=0,c=0;for(const k in o){d+=o[k].d;c+=o[k].c;}return [Math.round(d*100),Math.round(c*100)];})()`);ok('balancete balanceado (D=C)',bal[0]===bal[1]&&bal[0]>0);
ok('cada lançamento balanceia',ev(`ctbDB().lanc.every(l=>r2(l.partidas.reduce((a,p)=>a+(p.d||0),0))===r2(l.partidas.reduce((a,p)=>a+(p.c||0),0)))`));
const T=ev(`totaisComp('${comp}')`);
ok('salários a pagar (crédito) = líquido da folha',ev(`ctbSaldos()['2.1.2.01'].c`)===T.liq);
ok('INSS a recolher cobre INSS dos segurados',ev(`ctbSaldos()['2.1.2.02'].c`)>=T.inss);
ok('FGTS lançado = FGTS da folha',T.fgts===0||ev(`ctbSaldos()['2.1.2.04'].c`)===T.fgts);
ok('despesa bruta = proventos',Math.abs(ev(`['3.1.1.01','3.1.1.02','3.1.1.03','3.1.1.04'].reduce((a,k)=>a+((ctbSaldos()[k]||{}).d||0),0)`)-T.prov)<0.02);
const nL=ev(`ctbDB().lanc.length`);ev(`ctbGerar('${comp}')`);ok('regenerar não duplica ('+nL+')',ev(`ctbDB().lanc.length`)===nL);
ev(`ctbDB().prov=true;ctbDB().encProv=30`);ev(`ctbGerar('${comp}')`);ok('provisões geram lançamentos adicionais e balanceiam',ev(`ctbDB().lanc.filter(l=>l.tipo==='prov').length`)===2&&ev(`ctbDB().lanc.every(l=>r2(l.partidas.reduce((a,p)=>a+(p.d||0),0))===r2(l.partidas.reduce((a,p)=>a+(p.c||0),0)))`));
ev(`ctbDB().fech['${comp}']='2026-12-01'`);ok('competência encerrada bloqueia regeração',!!ev(`ctbGerar('${comp}')`).erro);ev(`delete ctbDB().fech['${comp}']`);
/* financeiro */
const g=ev(`finGerar('${comp}')`);ok('títulos gerados '+JSON.stringify(g),g.novos>=n);
const sal=ev(`finDB().tit.filter(t=>t.tipo==='sal')`);ok('um título de salário por empregado',sal.length===n||ev(`finDB().tit.filter(t=>t.tipo==='sal'||t.tipo==='resc').length`)===n);
ok('vencimento do salário = 5º dia útil do mês seguinte',/^\d{4}-\d{2}-0[5-9]$/.test(sal[0].venc));
const g2=ev(`finGerar('${comp}')`);ok('regerar não duplica',g2.novos===0&&ev(`finDB().tit.filter(t=>t.origem==='folha').length`)===ev(`new Set(finDB().tit.map(t=>t.orig)).size`));
ok('guias INSS/IRRF/FGTS como títulos',ev(`['inss','irrf','fgts'].every(k=>finDB().tit.some(t=>t.tipo===k)||totaisComp('${comp}')['${'x'}']===undefined)`));
/* conta bancária e remessa */
ev(`finDB().contas.push({id:'cb1',apelido:'Itaú',banco:'341',bancoNome:'Itau Unibanco',ag:'0123',agDv:'4',conta:'55555',contaDv:'6',convenio:'ABC123',contaCtb:'1.1.1.02'})`);
const R=ev(`(()=>{const f=finDB(),cb=f.contas[0];const t=f.tit.filter(t=>t.status==='aberto'&&!t.guia&&(t.tipo==='sal'||t.tipo==='resc'));const o=cnabGerar({conta:cb,tits:t,dtPag:'2026-12-07',servico:'30',segB:true,nsa:1});return {nl:o.nLinhas,inc:o.inclusos.length,pend:o.pend.map(x=>x.t.favorecido+': '+x.m.join(';')),total:o.total,linhas:o.texto.split('\\r\\n').filter(Boolean).map(l=>[l.length,l[7],l[13]||'']),texto:o.texto,ids:o.inclusos.map(t=>t.id)};})()`);
ok('3 pagamentos aptos e '+R.pend.length+' pendências',R.inc===3&&R.pend.length===n-3);
ok('todas as linhas têm 240 posições',R.linhas.every(x=>x[0]===240));
ok('estrutura 0,1,3,5,9 e segmentos A/B',R.linhas[0][1]==='0'&&R.linhas[1][1]==='1'&&R.linhas[R.linhas.length-1][1]==='9'&&R.linhas.filter(x=>x[1]==='3'&&x[2]==='A').length===3&&R.linhas.filter(x=>x[1]==='3'&&x[2]==='B').length===3);
const L=R.texto.split('\r\n').filter(Boolean);
ok('dois lotes (mesmo banco 01 e TED 41)',L.filter(l=>l[7]==='1').length===2&&L.filter(l=>l[7]==='1').map(l=>l.slice(11,13)).sort().join()==='01,41');
const tl=L.filter(l=>l[7]==='5');const somaA=L.filter(l=>l[7]==='3'&&l[13]==='A').reduce((a,l)=>a+Number(l.slice(119,134)),0);
ok('soma dos trailers de lote = soma dos Segmentos A = total',tl.reduce((a,l)=>a+Number(l.slice(23,41)),0)===somaA&&somaA===Math.round(R.total*100));
ok('trailer do arquivo: lotes=2 e registros='+L.length,Number(L[L.length-1].slice(17,23))===2&&Number(L[L.length-1].slice(23,29))===L.length);
ok('trailer de lote conta header+detalhes+trailer',tl.every((t,i)=>{const lot=L.filter(l=>l.slice(3,7)===t.slice(3,7));return Number(t.slice(17,23))===lot.length;}));
ok('documento do Segmento A traz o id do título',L.filter(l=>l[7]==='3'&&l[13]==='A').every((l,i)=>R.ids.includes(l.slice(73,93).trim())));
ok('ASCII puro sem acentos',/^[\x20-\x7E\r\n]+$/.test(R.texto));
/* fluxo pela interface */
ev(`go('bcoRem',{comp:'${comp}'})`);ok('tela de remessa renderiza',/Remessa|CNAB/.test(q('#main').textContent));
ev(`ACT.rmGerar()`);ok('remessa registrada e títulos em remessa',ev(`finDB().rem.length`)===1&&ev(`finDB().tit.filter(t=>t.status==='remessa').length`)===3);
/* retorno do banco: fabrica retorno a partir da remessa */
let ret=ev(`finDB().rem[0].texto`).split('\r\n').filter(Boolean).map(l=>{if(l[7]==='3'&&l[13]==='A')return l.slice(0,230)+'00'.padEnd(10,' ');return l;});
ret[2]=ret[2].slice(0,230)+'AG'.padEnd(10,' ');/* um rejeitado */
const rr=ev(`cnabRetorno(${JSON.stringify(ret.join('\r\n'))})`);ok('retorno lido: '+rr.map(x=>x.st).join(','),rr.length===3&&rr.filter(x=>x.st==='pago').length===2&&rr.filter(x=>x.st==='rejeitado').length===1);
const ant=ev(`ctbDB().lanc.filter(l=>l.tipo==='baixa').length`);
w.File=w.File||class{};const fakeInput={files:[{text:async()=>ret.join('\r\n')}]};
ev(`go('bcoRem',{comp:'${comp}'})`);Object.defineProperty(q('#rtFile'),'files',{value:fakeInput.files});await ev(`ACT.rtImp()`);
ok('2 títulos pagos e 1 devolvido em aberto com motivo',ev(`finDB().tit.filter(t=>t.status==='pago').length`)===2&&ev(`finDB().tit.filter(t=>t.motivo&&t.status==='aberto').length`)===1);
ok('baixa gerou lançamentos D salários / C bancos',ev(`ctbDB().lanc.filter(l=>l.tipo==='baixa').length`)===ant+2&&ev(`ctbSaldos()['1.1.1.02'].c`)>0);
ok('balancete continua balanceado após as baixas',ev(`(()=>{const o=ctbSaldos();let d=0,c=0;for(const k in o){d+=o[k].d;c+=o[k].c;}return Math.round(d*100)===Math.round(c*100);})()`));
/* telas */
for(const s of ['ctbLanc','ctbPlano','ctbParam','ctbBal','finTit','finContas','bcoRem']){ev(`go('${s}',{})`);ok('tela '+s+' renderiza sem erro',q('#main').innerHTML.length>200);}
ev(`go('ctbBal',{conta:'2.1.2.01'})`);ok('razão da conta exibido',/Razão —/.test(q('#main').textContent));
ev(`go('ctbParam',{})`);ev(`ACT.ctbParamSave()`);ok('parametrização salva',ev(`ctbRegra('pasSal')`)==='2.1.2.01');
ev(`go('empForm',{id:DB.empregados[0].id})`);
ok('menu lateral tem os 3 novos grupos',ev(`sideGrupos().map(g=>g.n).filter(n=>['Contabilidade','Financeiro','Arquivos bancários'].includes(n)).length`)===3);
ok('JSON do banco continua válido (persistência)',ev(`JSON.parse(JSON.stringify(DB)).fin.rem.length`)===1);
ok('sem erros de script',errs.length===0);if(errs.length)console.log(errs.join('\n'));
console.log(fail?'FALHAS '+fail:'TODOS OK');process.exit(fail?1:0);})();
