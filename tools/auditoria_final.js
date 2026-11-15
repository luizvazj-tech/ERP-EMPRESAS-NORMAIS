/* Auditoria final: roda sobre o ambiente de exemplo (3 empresas x 10 empregados). Saída: PASS/FAIL por verificação. */
const {JSDOM}=require('jsdom');const fs=require('fs'),crypto=require('crypto');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');const jsErr=[];
const d=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',beforeParse(w){w.addEventListener('error',e=>jsErr.push('ERR '+e.message));w.print=()=>{};w.__FP_NOGATE=true;}});
const w=d.window,ev=s=>w.eval(s),q=s=>w.document.querySelector(s);
const R=[];const chk=(area,nome,ok,det)=>{R.push({area,nome,ok:!!ok,det:det||''});};
(async()=>{
await ev(`(async()=>{seedDemo('lp');await exCarregar();})()`);
const dbs=ev(`(()=>{const l=[{db:DB,nome:DB.empresa.razao}];DB._emps.filter(x=>x.ex).forEach(x=>l.push({db:loadDB(x.snap),nome:x.razao}));return l.map(x=>x.nome)})()`);
const withDb=(i,fn)=>ev(`(()=>{const o=DB;const l=[DB].concat(DB._emps.filter(x=>x.ex).map(x=>loadDB(x.snap)));DB=l[${i}];try{return (${fn})()}finally{DB=o}})()`);
/* A. folha */
for(let i=0;i<3;i++){const r=withDb(i,`()=>{const P=DB.params,out={n:0,bad:[]};const comps=Object.keys(DB.comps).sort();
 comps.forEach(c=>{const rs=DB.comps[c].res;for(const id in rs){const r=rs[id];out.n++;const nm=byId(DB.empregados,id).nome+' '+c;
  const soma=r2(r.itens.filter(x=>x.tp===1).reduce((s,x)=>s+x.valor,0)),sd=r2(r.itens.filter(x=>x.tp===2).reduce((s,x)=>s+x.valor,0));
  if(Math.abs(soma-r.totProv)>0.01||Math.abs(sd-r.totDesc)>0.01)out.bad.push('totais '+nm);
  if(Math.abs(r.liquido-(r.totProv-r.totDesc))>0.011)out.bad.push('liquido '+nm);
  if(r.liquido<0)out.bad.push('liquido negativo '+nm);
  if(JSON.stringify(r).match(/NaN|undefined|Infinity/))out.bad.push('NaN '+nm);
  if(r.inss>r2(P.tetoInss*0.14)+0.01)out.bad.push('INSS acima do teto '+nm);
  const e=byId(DB.empregados,id);
  if(!r.rescisao&&r.baseCP>0){const b=Math.min(r.baseCP,P.tetoInss);let prev=0,t=0;for(const [lim,al] of P.inss){if(b>prev)t+=(Math.min(b,lim)-prev)*al/100;prev=lim;}t=r2(t);const it=r.itens.find(x=>x.sys==='INSS');const v=it?it.valor:0;if(Math.abs(v-t)>0.02)out.bad.push('INSS recalc '+nm+' '+v+' x '+t);}
  if(r.baseFGTS>0&&Math.abs(r.fgts-r2(r.baseFGTS*r.aliqFgts/100))>0.02)out.bad.push('FGTS '+nm);
  if(r.irrfInfo){const I=r.irrfInfo;if(Math.abs((r.irrf||0)-Math.max(0,r2(I.imposto-I.reducao)))>0.02&&!r.irrfPlr)out.bad.push('IRRF imposto-reducao '+nm+' '+r.irrf+' x '+r2(I.imposto-I.reducao));}
 }});return out;}`);
 chk('Cálculo da folha',`${dbs[i]}: ${r.n} contracheques — totais, líquido, INSS progressivo e FGTS recalculados`,r.bad.length===0,r.bad.slice(0,4).join(' | '));}
/* B. ficha e relatórios */
for(let i=0;i<3;i++){const r=withDb(i,`()=>{const out=[];const ano=DB.cfg.comp.slice(0,4);const ms=fichMeses(ano,false);const L=fichLinhas(ms,m=>Object.values(m.c.res));
  ms.forEach((m,k)=>{if(!m)return;const t=totaisComp(m.k);if(Math.abs(L.tot.liq[k]-t.liq)>0.011)out.push('liq '+m.k);if(Math.abs(L.tot.prov[k]-t.prov)>0.011)out.push('prov '+m.k);if(Math.abs(L.tot.inss[k]-t.inss)>0.011)out.push('inss '+m.k);});
  const soma=fichSoma(DB.empregados.map(e=>{const mm=ms.map(m=>m&&m.c.res[e.id]?m:null);return fichSoma(fichLinhas(mm,m=>[m.c.res[e.id]]).tot.liq);}));if(Math.abs(soma-fichSoma(L.tot.liq))>0.05)out.push('soma individuais x consolidada '+soma+' '+fichSoma(L.tot.liq));
  const ras=fichMeses(ano,true).filter(Boolean).length,of=ms.filter(Boolean).length;if(ras!==of+1)out.push('rascunho deve incluir a competência calculada ('+ras+' x '+of+')');
  const rel=relSecoes(DB,new Set(REL_SECS.map(s=>s[0])),'','');const fo=rel.find(s=>s.t==='Folha por competência');const tot=fo.l[fo.l.length-1];if(Math.abs(tot[5]-fichSoma(Object.keys(DB.comps).map(c=>totaisComp(c).liq)))>0.05)out.push('relatório x folha');return out;}`);
 chk('Ficha Financeira e relatórios',`${dbs[i]}: ficha consolidada = soma das individuais = totais da folha; rascunho inclui competência não fechada; relatório por empresa = folha`,r.length===0,r.join(' | '));}
/* C. soma de atestados (tabela de casos) */
const casos=[
 ['15 dias únicos: tudo empresa',[['d','2026-01-01',15,'J11']],[[15,0,'']]],
 ['16 dias únicos: 1 dia INSS a partir do 16º',[['d','2026-01-01',16,'J11']],[[15,1,'2026-01-16']]],
 ['7 + 8 em 20 dias de intervalo: 15 empresa, 0 INSS',[['d','2026-01-01',7,'J11'],['d','2026-01-28',8,'J11.1']],[[7,0,''],[8,0,'']]],
 ['7 + 9 mesma doença: 1 dia INSS',[['d','2026-01-01',7,'J11'],['d','2026-01-28',9,'J11']],[[7,0,''],[8,1,'2026-02-05']]],
 ['intervalo de 60 dias do retorno ainda soma',[['d','2026-01-01',10,'J11'],['d','2026-03-12',10,'J11']],[[10,0,''],[5,5,'2026-03-17']]],
 ['intervalo de 61 dias reinicia a contagem',[['d','2026-01-01',10,'J11'],['d','2026-03-13',10,'J11']],[[10,0,''],[10,0,'']]],
 ['CIDs diferentes não somam',[['d','2026-01-01',10,'J11'],['d','2026-01-20',10,'M54']],[[10,0,''],[10,0,'']]],
 ['grupo manual vincula CIDs diferentes',[['d','2026-01-01',10,'J11','g1'],['d','2026-01-20',10,'M54','g1']],[[10,0,''],[5,5,'2026-01-25']]],
 ['sem CID e sem grupo não soma',[['d','2026-01-01',10,''],['d','2026-01-20',10,'']],[[10,0,''],[10,0,'']]],
 ['após exceder 15 dias, novo afastamento em 60 dias é INSS desde o 1º dia',[['d','2026-01-01',20,'J11'],['d','2026-02-10',3,'J11']],[[15,5,'2026-01-16'],[0,3,'2026-02-10']]],
 ['datas sobrepostas descontam a sobreposição',[['d','2026-01-01',10,'J11'],['d','2026-01-06',10,'J11']],[[10,0,''],[5,0,'']]]];
for(const [nome,L,esp] of casos){const got=ev(`(()=>{const id=DB.empregados[0].id;const bk=DB.atest;DB.atest=${JSON.stringify(L)}.map((x,i)=>({id:'t'+i,empId:id,tipo:x[0],ini:x[1],dias:x[2],cid:x[3],grupo:x[4]||''}));const r=hxSoma(id).map(x=>[x.emp,x.inss,x.inssDesde]);DB.atest=bk;return r;})()`);
 chk('Soma de atestados (Dec. 3.048/1999, art. 75)',nome,JSON.stringify(got)===JSON.stringify(esp),'obtido '+JSON.stringify(got)+' esperado '+JSON.stringify(esp));}
/* D. saúde: limites do demissional e periódico */
for(const [g,dias,esp] of [['12',134,'gray'],['12',136,'warn'],['34',89,'gray'],['34',91,'warn']]){const r=ev(`(()=>{DB.saude.grau='${g}';const e=DB.empregados[0];const ds=e.desligamento,sa=DB.sstAso;e.desligamento=hxAdd(hojeISO(),3);DB.sstAso=[{id:'x',empId:e.id,tpExame:'1',dtAso:hxAdd(e.desligamento,-${dias}),resAso:'1'},{id:'y',empId:e.id,tpExame:'0',dtAso:'2020-01-01'}];const s=hxExames(e).sit[1];e.desligamento=ds;DB.sstAso=sa;DB.saude.grau='12';return s;})()`);
 chk('Saúde ocupacional (NR-7)',`Demissional, grau ${g==='12'?'1-2':'3-4'}, último exame há ${dias} dias`,r===esp,'obtido '+r+' esperado '+esp);}
/* E. multiempresa e integridade */
const mi=ev(`(()=>{const out=[];const l=[DB].concat(DB._emps.map(x=>loadDB(x.snap)));const ids=new Set(),cn=new Set();
 l.forEach(x=>{if(x.empresa){if(cn.has(x.empresa.cnpj))out.push('CNPJ duplicado');cn.add(x.empresa.cnpj);if(!cnpjValido(x.empresa.cnpj))out.push('CNPJ inválido '+x.empresa.razao);}
  x.empregados.forEach(e=>{if(ids.has(e.id))out.push('id duplicado');ids.add(e.id);if(!cpfValido(e.cpf))out.push('CPF inválido '+e.nome);if(!byId(x.cargos,e.cargo))out.push('cargo órfão '+e.nome);if(!byId(x.lotacoes,e.lotacao))out.push('lotação órfã '+e.nome);if(!byId(x.estabs,e.estab))out.push('estab órfão');});
  const ok=id=>byId(x.empregados,id);['hAdv','hCurso','atest','sstAso','sstCat','bh','ferias','movs','hAlt'].forEach(k=>(x[k]||[]).forEach(r=>{if(r.empId&&!ok(r.empId))out.push('órfão '+k);}));
  Object.keys(x.entregues||{}).forEach(k=>{if(!ok(k.split('|')[1]))out.push('entrega órfã');});
  x.eventos.forEach(e=>{if(!e.xml)out.push('evento sem xml');});});return out;})()`);
chk('Integridade e multiempresa','CNPJ/CPF válidos e únicos, ids únicos, sem registros órfãos nas 4 bases',mi.length===0,mi.slice(0,5).join(' | '));
const rt=ev(`(()=>{const out=[];const l=DB._emps.filter(x=>x.ex);const a=loadDB(l[0].snap);const s1=JSON.stringify(a);const b=loadDB(s1);if(JSON.stringify(b)!==s1)out.push('ida e volta difere');
 const n0=DB.empregados.length,r0=DB.empresa.razao;for(let i=0;i<6;i++){ACT.empTrocar({dataset:{arg:DB._emps[0].id}});}
 const total=1+DB._emps.length;if(total!==4)out.push('contagem de empresas '+total);const ex=[DB].concat(DB._emps.map(x=>loadDB(x.snap))).filter(x=>x._exemplo).length;if(ex!==3)out.push('exemplos '+ex);
 return out;})()`);
chk('Integridade e multiempresa','Ida e volta de snapshot idêntica; 6 trocas sucessivas preservam as 4 empresas',rt.length===0,rt.join(' | '));
await ev(`(async()=>{await exCarregar();})()`);
/* F. histórico */
const hx=ev(`(()=>{const out=[];const n0=DB.hAlt.length;saveDB();saveDB();saveDB();if(DB.hAlt.length!==n0)out.push('saveDB repetido gerou '+(DB.hAlt.length-n0)+' registros');const e=DB.empregados[1];e.salario=Number(e.salario)+100;saveDB();if(DB.hAlt.length!==n0+1)out.push('uma alteração deveria gerar 1 registro, gerou '+(DB.hAlt.length-n0));
 const last=DB.hAlt[DB.hAlt.length-1];if(!/Salário/.test(last.campo)||!/R\\$/.test(last.de))out.push('registro: '+JSON.stringify(last));e.salario=Number(e.salario)-100;saveDB();return out;})()`);
chk('Histórico do empregado','saveDB sem mudança não gera ruído; uma alteração gera exatamente um registro com valores antes/depois',hx.length===0,hx.join(' | '));
/* G. telas: todas, nas 3 empresas, sem exceção e sem NaN/undefined */
const telas=ev('MENU.map(x=>x[1])');const bad=[];
for(let i=0;i<3;i++){ev(`(()=>{const l=[DB].concat(DB._emps.filter(x=>x.ex).map(x=>loadDB(x.snap)));window.__o=DB;DB=l[${i}];NAV.stack=[];})()`);
 for(const t of telas){try{ev(`go('${t}')`);const h=q('#main').innerHTML;if(h.length<150)bad.push(t+' vazia');if(/undefined|NaN|\[object|Infinity/.test(h.replace(/<script[\s\S]*?<\/script>/g,'')))bad.push(`${t} (${dbs[i]}) contém undefined/NaN`);}catch(e){bad.push(t+': '+e.message);}}
 for(const t of ['prazos','afast','soma'])try{ev(`go('saude',{tab:'${t}',emp:DB.empregados[2].id})`);const h=q('#main').innerHTML;if(/undefined|NaN|\[object/.test(h))bad.push('saude/'+t+' undefined');}catch(e){bad.push('saude/'+t+': '+e.message);}
 ev(`DB=window.__o`);}
chk('Telas e navegação',`${telas.length} telas × 3 empresas + abas de saúde: sem exceção, sem "undefined/NaN"`,bad.length===0,[...new Set(bad)].slice(0,6).join(' | '));
/* H. segurança: XSS em telas novas */
const xs=ev(`(()=>{const o=[];const e=DB.empregados[0];const nome=e.nome;const pay='<img src=x onerror=alert(1)>"><script>alert(2)</script>';e.nome=pay;DB.empresa.razao=pay;DB.hAdv.push({id:'xs',empId:e.id,data:'2026-01-01',tipo:'verbal',motivo:pay,ciencia:'s'});DB.hCurso.push({id:'xc',empId:e.id,curso:pay,dtFim:'2026-01-01'});DB.atest.push({id:'xa',empId:e.id,tipo:'d',ini:'2026-01-01',dias:3,cid:pay,obs:pay});
 ['ficha','relEmp','saude','hist','atest','hAdv','hCurso','empresa','empregados','home','folha','holerite'].forEach(t=>{HX.emp=e.id;try{go(t,t==='relEmp'?{}:{});if(t==='relEmp')ACT.relGerar();if(t==='ficha'){FICH_SEL.add(e.id);go('ficha',{modo:'indiv',ano:DB.cfg.comp.slice(0,4)});}}catch(x){}const h=document.querySelector('#main').innerHTML;if(/<img src=x|<script>alert/.test(h))o.push(t);});
 e.nome=nome;DB.hAdv.pop();DB.hCurso.pop();DB.atest.pop();return o;})()`);
chk('Segurança',"Injeção de HTML (nome, curso, CID, motivo) neutralizada em 12 telas",xs.length===0,'vaza em: '+xs.join(', '));
const h2=html;const sc=h2.slice(h2.lastIndexOf('<script>')+8,h2.lastIndexOf('</script>'));const hash=crypto.createHash('sha256').update(sc).digest('base64');
chk('Segurança','Hash da CSP confere com o script publicado',h2.includes('sha256-'+hash));
chk('Segurança','Sem manipuladores inline (onclick=…) nem eval/new Function no código',!/\son(click|change|input|load|error)=/i.test(h2.replace(sc,''))&&!/\beval\(|new Function\(/.test(sc));
/* I. capacidade e desempenho */
const cap=ev(`(()=>{const o={};const full=JSON.stringify(DB);o.kbAtiva=Math.round(full.length/1024);o.kbTotal=Math.round((full.length+DB._emps.reduce((s,x)=>s+x.snap.length,0))/1024);return o;})()`);
chk('Capacidade',`Dados com 3 empresas de exemplo ocupam ${cap.kbTotal} KB (limite típico do localStorage ≈ 5.000 KB)`,cap.kbTotal<3500,cap.kbTotal+' KB');
const pf=ev(`(()=>{const o=DB.empregados.slice();const base=o[0];for(let i=0;i<490;i++){const c=JSON.parse(JSON.stringify(base));c.id='p'+i;c.mat=String(100+i);c.cpf=cpfGer(String(200000000+i*7919));DB.empregados.push(c);}
 let t0=Date.now();calcFolha(DB.cfg.comp);const tc=Date.now()-t0;t0=Date.now();saveDB();const ts=Date.now()-t0;t0=Date.now();const L=fichLinhas(fichMeses(DB.cfg.comp.slice(0,4),true),m=>Object.values(m.c.res));const tf=Date.now()-t0;
 DB.empregados=o;return{tc,ts,tf};})()`);
chk('Desempenho',`500 empregados: cálculo da folha ${pf.tc} ms, gravação ${pf.ts} ms, ficha consolidada ${pf.tf} ms`,pf.tc<5000&&pf.ts<3000,JSON.stringify(pf));
/* I2. datas (limites de mês e datas inválidas) */
const dt=ev(`(()=>{const o=[];const c=[['hxMeses',['2026-08-31',6],'2027-02-28'],['hxMeses',['2024-02-29',12],'2025-02-28'],['hxMeses',['2026-01-31',1],'2026-02-28'],['hxMeses',['2026-03-15',-3],'2025-12-15'],['hxAdd',['2026-02-28',1],'2026-03-01'],['hxAdd',['',3],''],['hxMeses',['',3],'']];
 c.forEach(([f,a,e])=>{let r;try{r=eval(f)(...a);}catch(x){r='EXC '+x.name;}if(r!==e)o.push(f+JSON.stringify(a)+' = '+r+' (esperado '+e+')');});return o;})()`);
chk('Datas e prazos','Soma de meses limita no fim do mês; datas vazias/inválidas não geram exceção',dt.length===0,dt.join(' | '));
/* J. eventos: dump para XSD */
fs.rmSync('/home/claude/xsd/out',{recursive:true,force:true});fs.mkdirSync('/home/claude/xsd/out',{recursive:true});let nx=0;
for(let i=0;i<3;i++){const xmls=ev(`(()=>{const l=[DB].concat(DB._emps.filter(x=>x.ex).map(x=>loadDB(x.snap)));return l[${i}].eventos.map(e=>({t:e.tipo,x:e.xml}))})()`);xmls.forEach(e=>{nx++;fs.writeFileSync(`/home/claude/xsd/out/ex${i+1}__${e.t}__${nx}.xml`,e.x);});}
chk('eSocial',`${nx} XML gerados pelo ambiente de exemplo exportados para validação XSD`,nx>300,String(nx));
chk('Execução','Nenhuma exceção JavaScript durante toda a auditoria',jsErr.length===0,jsErr.slice(0,3).join(' | '));
console.log(JSON.stringify(R,null,1));
const f=R.filter(x=>!x.ok);console.log('\nRESUMO',R.length-f.length+'/'+R.length,'FALHAS:',f.length);f.forEach(x=>console.log(' ✖',x.area,'—',x.nome,'—',x.det));
process.exit(0);})().catch(e=>{console.log('FALHA',e.stack);process.exit(1)});
