/* ===================== DCTFWeb: apuração, créditos, prazos e multas =====================
   Fonte: Manual de Orientação da DCTFWeb (janeiro/2025) e MOS eSocial S-1.3 (consolidado até a NO S-1.3 – 12.2026).
   Espelho de conferência: a DCTFWeb é gerada pela RFB a partir do S-1299 e do R-2099 e transmitida no e-CAC; este módulo
   não a transmite nem emite DARF. Valores apurados aqui são estimativas e devem ser conferidos com o S-5011 **. */
const dctfDB=()=>{DB.dctf=DB.dctf||{};const d=DB.dctf;d.cred=d.cred||{};d.trans=d.trans||{};return d;};
const diaUtilPosterior=d=>{const f=x=>FERIADOS_FIXOS.includes(x.toISOString().slice(5,10));while(d.getUTCDay()===0||d.getUTCDay()===6||f(d))d=new Date(d.getTime()+864e5);return d;};
const isoD=d=>d.toISOString().slice(0,10),dUTC=iso=>new Date(iso+'T00:00:00Z');
const proxComp=comp=>{const [a,m]=comp.split('-').map(Number);return m===12?(a+1)+'-01':a+'-'+String(m+1).padStart(2,'0');};
/* último dia útil do mês seguinte (Manual DCTFWeb, item 4.2) */
const dctfPrazoEntrega=comp=>{const [a,m]=proxComp(comp).split('-').map(Number);return isoD(diaUtilAnterior(new Date(Date.UTC(a,m,0))));};
/* dia 15 do mês seguinte, postergado (MOS S-1.3: S-1200, S-1210, S-1299) */
const esocPrazo15=comp=>{const [a,m]=proxComp(comp).split('-').map(Number);return isoD(diaUtilPosterior(new Date(Date.UTC(a,m-1,15))));};
/* 13º salário: dia 20 de dezembro, antecipado */
const prazo13=ano=>isoD(diaUtilAnterior(new Date(Date.UTC(ano,11,20))));

function dctfApurar(comp){
  const C=DB.comps[comp];if(!C||!Object.keys(C.res||{}).length)return null;
  const P=DB.params,E=DB.empresa||{},cr=dctfDB().cred[comp]||{};
  const A={inssM:0,inssD:0,patM:0,patD:0,ratM:0,ratD:0,tercM:0,tercD:0,irM:0,irD:0,plr:0,sf:0,fgts:0};
  for(const id in C.res){const r=C.res[id],e=byId(DB.empregados,id);
    const i13=r.inss13||0,ir13=r.irrf13||0;
    A.inssM+=Math.max(0,r.inss-i13);A.inssD+=i13;A.irM+=Math.max(0,r.irrf-ir13);A.irD+=ir13;A.plr+=r.irrfPlr||0;A.sf+=r.sf||0;A.fgts+=r.fgts||0;
    const em=encargosEmpresa(Object.assign({},r,{baseCP13:0}),P,E,e,comp,true),ed=encargosEmpresa(Object.assign({},r,{baseCP:0}),P,E,e,comp,true);
    A.patM+=em.patronal;A.ratM+=em.rat;A.tercM+=em.terc;A.patD+=ed.patronal;A.ratD+=ed.rat;A.tercD+=ed.terc;}
  for(const k in A)A[k]=tr2(A[k]);
  const L=[ /* [cr, descrição, grupo, valor, categoria] */
   ['1082-01','CP Segurados — empregados/avulsos','seg',A.inssM,'M'],['1138-01','CP Patronal — empregados/avulsos','pat',A.patM,'M'],['1646-01','CP Patronal — GILRAT ajustado (RAT × FAP)','pat',A.ratM,'M'],
   ['(por entidade)','CP Terceiros — outras entidades e fundos, conforme FPAS/código de terceiros da lotação','terc',A.tercM,'M'],
   ['0561-07','IRRF — rendimentos do trabalho assalariado','ir',A.irM,'M'],['3562-01','IRRF — participação nos lucros ou resultados (PLR)','ir',A.plr,'M'],
   ['1082-21','CP Segurados — 13º salário','seg',A.inssD,'D'],['1138-21','CP Patronal — 13º salário','pat',A.patD,'D'],['1646-21','CP Patronal — GILRAT ajustado — 13º salário','pat',A.ratD,'D'],
   ['(por entidade)','CP Terceiros — 13º salário','terc',A.tercD,'D'],['0561-07','IRRF — 13º salário (confirmar código na tabela do Anexo I)','ir',A.irD,'D']].filter(l=>l[3]>0).map(l=>({cr:l[0],desc:l[1],grp:l[2],deb:l[3],cat:l[4],cred:0,creditos:{}}));
  /* créditos vinculáveis — ordem padrão: pagamentos, salário-família, salário-maternidade, retenção Lei 9.711/98; só abatem CP e terceiros (PA ≥ 09/2023) */
  const creds=[['sf','Salário-família',A.sf],['sm','Salário-maternidade',num(cr.sm)],['ret','Retenção Lei 9.711/98',num(cr.ret)]];
  const ordem=['seg','pat','terc'],alvo=L.filter(l=>l.cat==='M'&&ordem.includes(l.grp)).sort((a,b)=>ordem.indexOf(a.grp)-ordem.indexOf(b.grp));
  const sobra={};
  creds.forEach(([k,n,v])=>{let rest=r2(v);alvo.forEach(l=>{const disp=r2(l.deb-l.cred),u=Math.min(rest,disp);if(u>0){l.cred=r2(l.cred+u);l.creditos[k]=r2((l.creditos[k]||0)+u);rest=r2(rest-u);}});sobra[k]=rest;});
  L.forEach(l=>{l.saldo=r2(l.deb-l.cred);});
  const tot=(f)=>r2(L.filter(f).reduce((a,l)=>a+l.saldo,0));
  const deb=r2(L.reduce((a,l)=>a+l.deb,0)),cre=r2(L.reduce((a,l)=>a+l.cred,0));
  return{L,creds,sobra,deb,cre,saldoM:tot(l=>l.cat==='M'),saldoD:tot(l=>l.cat==='D'),saldo:r2(deb-cre),fgts:A.fgts,sn:E.regime==='sn'&&E.anexo==='std',cprb:!!E.cprb};
}
const dctfSt=comp=>{const t=dctfDB().trans[comp];if(!t||!t.data)return['Não transmitida','warn'];return t.data>dctfPrazoEntrega(comp)?['Transmitida em atraso (MAED)','err']:['Transmitida no prazo','ok'];};

SC.dctfApur={view(p){const comp=p.comp||DB.cfg.comp,A=dctfApurar(comp),d=dctfDB(),cr=d.cred[comp]||{},P=DB.params;
  const pz=dctfPrazoEntrega(comp),venc=vencGuia(comp,P.venc.inss),st=dctfSt(comp),tr=d.trans[comp]||{};
  const ret=(DB.ret||[]).filter(r=>r.tipo==='S-5011'&&r.per===comp)[0];
  return `<h1>DCTFWeb — apuração e saldo a pagar</h1><p class="sub">Espelho da declaração da competência, montado a partir da folha calculada. A DCTFWeb é gerada pela Receita Federal a partir do S-1299 (eSocial) e do R-2099 (EFD-Reinf), conferida e transmitida no e-CAC. Este sistema não a transmite nem emite o DARF.</p>${exigeEmpresa()}
  <div class="card"><div class="row"><div class="f"><label>Competência</label><input type="month" id="dcComp" value="${comp}"></div></div>
  <p class="sub">Transmissão até <b>${fmtData(pz)}</b> (último dia útil do mês seguinte) · DARF com vencimento em <b>${fmtData(venc)}</b> · situação: ${badge(st[0],st[1])}${venc<pz?' · <b>o vencimento antecede o prazo de entrega</b>: transmita antes do vencimento ou emita o DARF pelo Sicalcweb (Manual da DCTFWeb, item 16.3)':''}</p></div>
  ${A?`<div class="card"><h2>Débitos apurados e créditos vinculados</h2><div class="tw"><table class="t"><thead><tr><th>Código de receita</th><th>Descrição</th><th class="r">Débito</th><th class="r">Crédito vinculado</th><th class="r">Saldo a pagar</th></tr></thead><tbody>
  ${A.L.map(l=>`<tr><td>${esc(l.cr)}</td><td>${esc(l.desc)}${l.cat==='D'?' '+badge('DCTFWeb 13º','gray'):''}${Object.keys(l.creditos).length?`<br><small>${Object.entries(l.creditos).map(([k,v])=>A.creds.find(c=>c[0]===k)[1]+' R$ '+brl(v)).join(' · ')}</small>`:''}</td><td class="r">${brl(l.deb)}</td><td class="r">${l.cred?brl(l.cred):''}</td><td class="r">${brl(l.saldo)}</td></tr>`).join('')}
  <tr><td colspan="2"><b>Total</b></td><td class="r"><b>${brl(A.deb)}</b></td><td class="r"><b>${brl(A.cre)}</b></td><td class="r"><b>${brl(A.saldo)}</b></td></tr></tbody></table></div>
  <p class="sub">Declaração mensal: saldo de R$ ${brl(A.saldoM)}${A.saldoD?` · DCTFWeb 13º salário (anual, até ${fmtData(prazo13(+comp.slice(0,4)))}): R$ ${brl(A.saldoD)}`:''}. FGTS (R$ ${brl(A.fgts)}) <b>não</b> integra a DCTFWeb: é recolhido no FGTS Digital.</p>
  ${A.creds.filter(c=>A.sobra[c[0]]>0).map(c=>`<div class="note warn">Crédito de ${c[1]} sem débito para abater: R$ ${brl(A.sobra[c[0]])}. O saldo remanescente deve ser objeto de pedido de reembolso/compensação por PER/DCOMP Web (Manual da DCTFWeb, itens 12.1 e 12.2).</div>`).join('')}</div>
  <div class="card"><h2>Créditos informados fora da folha</h2><div class="grid">${F('Salário-maternidade pago (R$)','sm',cr.sm||'',{t:'money',w:4,hint:'Vem do eSocial; este sistema ainda não calcula o benefício.'})+F('Retenção Lei 9.711/98 sofrida (R$)','ret',cr.ret||'',{t:'money',w:4,hint:'Retenção na nota fiscal de serviços com cessão de mão de obra.'})+F('DARF já pago (R$)','pg',cr.pg||'',{t:'money',w:4})}</div>
  <div class="row"><button class="btn pri" data-act="dcCredSave">💾 Salvar créditos</button></div>
  ${cr.pg>0?`<p class="sub">Saldo após pagamentos informados: <b>R$ ${brl(Math.max(0,r2(A.saldo-num(cr.pg))))}</b></p>`:''}</div>`:'<div class="note warn">Calcule a folha da competência para apurar a DCTFWeb.</div>'}
  <div class="card"><h2>Registro da transmissão</h2><div class="grid">${F('Data da transmissão','tdata',tr.data||'',{t:'date',w:3})+F('Número do recibo','trec',tr.rec||'',{w:6})}</div><div class="row"><button class="btn pri" data-act="dcTransSave">Registrar</button></div></div>
  <div class="card"><h2>Conciliação com o S-5011 (eSocial)</h2>${ret&&A?(()=>{const calc=r2(A.L.filter(l=>l.cat==='M'&&l.cr==='1082-01').reduce((a,l)=>a+l.deb,0)),gov=ret.vrDescCP;const ok=Math.abs(calc-gov)<=0.01;return `<p>Contribuição descontada dos segurados (1082-01): sistema R$ ${brl(calc)} × S-5011 R$ ${brl(gov)} — ${ok?badge('confere','ok'):badge('diferença R$ '+brl(r2(gov-calc)),'err')}</p>`;})():'<p class="sub">Importe o retorno S-5011 da competência em “Retornos e conciliação” para comparar.</p>'}</div>
  <div class="note info"><b>Regras aplicadas:</b> vinculação automática na ordem padrão — contribuições dos segurados, patronais e, por último, terceiros; créditos aproveitados na sequência pagamento, salário-família, salário-maternidade e Retenção Lei 9.711/98, e somente sobre contribuições previdenciárias e de terceiros desde o PA 09/2023 (Manual da DCTFWeb, itens 9 e 12.1). Valores truncados na 2ª casa decimal, como nos totalizadores do eSocial (MOS S-1.3, S-5011, item 1.5). <b>Não calculados:</b> adicional GILRAT/aposentadoria especial (1141-01), contribuintes individuais (1099-xx), CPRB e demais tributos recebidos da EFD-Reinf, e a contribuição adicional ao SENAI (&gt; 500 empregados, FPAS 507/833, desde 05/2026). Terceiros aparece em total; o código de receita por entidade depende do código de terceiros da lotação (Anexo I do Manual) **. IRRF do 13º: confirme o código de receita na tabela do Anexo I **.</div>`;},
  actions:()=>[],mount(){const i=$('#dcComp');if(i)i.addEventListener('change',()=>refresh({comp:i.value}));}};
ACT.dcCredSave=()=>{const comp=$('#dcComp').value,o=readForm($('#main'));const d=dctfDB();d.cred[comp]={sm:num(o.sm),ret:num(o.ret),pg:num(o.pg)};saveDB();audit('DCTFWeb créditos',comp);toast('Créditos salvos.','ok');refresh({comp});};
ACT.dcTransSave=()=>{const comp=$('#dcComp').value,o=readForm($('#main'));const d=dctfDB();d.trans[comp]={data:o.tdata,rec:o.trec};saveDB();audit('DCTFWeb transmissão',comp+' '+o.tdata);const st=dctfSt(comp);toast('Registrado: '+st[0]+'.',st[1]==='err'?'err':'ok');refresh({comp});};

/* ---------- calendário de prazos eSocial e DCTFWeb ---------- */
function prazosComp(comp){
  const P=DB.params,a=+comp.slice(0,4),m=+comp.slice(5),out=[];const hj=hoje();
  const proc=(t)=>DB.eventos.some(e=>e.tipo===t&&e.status==='processado'&&((e.gen&&e.gen.args&&e.gen.args.comp)?e.gen.args.comp===comp:true));
  const add=(obrig,data,base,feito)=>out.push({obrig,data,base,feito:!!feito});
  add('S-1200 — remuneração do trabalhador',esocPrazo15(comp),'MOS S-1.3, S-1200: dia 15 do mês seguinte, postergado se dia não útil',proc('S-1200'));
  add('S-1210 — pagamentos de rendimentos',esocPrazo15(comp),'MOS S-1.3, S-1210: dia 15, postergado se dia não útil',proc('S-1210'));
  add('S-1299 — fechamento dos eventos periódicos',esocPrazo15(comp),'MOS S-1.3, S-1299: dia 15, postergado; após S-1200/S-1210',proc('S-1299'));
  add('DCTFWeb mensal — transmissão',dctfPrazoEntrega(comp),'Manual da DCTFWeb, item 4.2: último dia útil do mês seguinte',!!(dctfDB().trans[comp]&&dctfDB().trans[comp].data));
  add('DARF da DCTFWeb (CP, terceiros e IRRF)',vencGuia(comp,P.venc.inss),'Parâmetros legais (dia '+P.venc.inss+', antecipado) — Lei 8.212/1991, art. 30, I, “b” **',false);
  add('FGTS Digital — guia mensal',vencGuia(comp,P.venc.fgts),'Parâmetros legais (dia '+P.venc.fgts+', antecipado) — Lei 8.036/1990, art. 15 **',false);
  if(m===12){add('S-1200/S-1299 anual — 13º salário',prazo13(a),'MOS S-1.3: dia 20 de dezembro, antecipado se dia não útil',false);add('DCTFWeb 13º salário — transmissão',prazo13(a),'Manual da DCTFWeb, item 4.2: até 20 de dezembro',false);}
  DB.empregados.forEach(e=>{
    if(e.admissao&&e.admissao.slice(0,7)===proxComp(comp)&&!e.admPre)add('S-2200 — admissão de '+e.nome,isoD(new Date(dUTC(e.admissao).getTime()-864e5)),'MOS S-1.3, S-2200, alínea “a”: até o dia imediatamente anterior ao início da prestação (empregado)',DB.eventos.some(x=>x.tipo==='S-2200'&&x.status==='processado'&&x.gen&&x.gen.args&&x.gen.args.id===e.id));
    if(e.desligamento&&e.desligamento.slice(0,7)===comp){const lim=isoD(diaUtilAnterior(new Date(dUTC(e.desligamento).getTime()+10*864e5)));
      add('S-2299 — desligamento de '+e.nome,lim,'MOS S-1.3, S-2299: até 10 dias do desligamento (exclui o dia), antecipado se dia não útil',DB.eventos.some(x=>x.tipo==='S-2299'&&x.status==='processado'&&x.gen&&x.gen.args&&x.gen.args.id===e.id));
      const dd=+e.desligamento.slice(8);if(dd>=1&&dd<=4)add('S-1200 de '+e.nome+' (mês anterior ao desligamento)',lim,'MOS S-1.3, S-1200: desligamento do 1º ao 4º dia — remuneração do mês anterior até o 10º dia seguinte ao desligamento',false);}});
  return out.sort((x,y)=>x.data<y.data?-1:x.data>y.data?1:0).map(x=>Object.assign(x,{sit:x.feito?['Cumprido','ok']:x.data<hj?['Vencido','err']:(dUTC(x.data)-dUTC(hj))/864e5<=7?['Vence em até 7 dias','warn']:['A vencer','gray']}));
}
SC.dctfPrazos={view(p){const comp=p.comp||DB.cfg.comp,L=prazosComp(comp);
  return `<h1>Calendário de prazos — eSocial e DCTFWeb</h1><p class="sub">Prazos da competência selecionada, conforme o Manual de Orientação do eSocial S-1.3 e o Manual da DCTFWeb. Só são considerados feriados nacionais fixos; feriados móveis, estaduais e municipais devem ser conferidos.</p>${exigeEmpresa()}
  <div class="card"><div class="row"><div class="f"><label>Competência</label><input type="month" id="pzComp" value="${comp}"></div></div>
  <div class="tw"><table class="t"><thead><tr><th>Obrigação</th><th>Prazo</th><th>Situação</th><th>Base</th></tr></thead><tbody>${L.map(x=>`<tr><td>${esc(x.obrig)}</td><td>${fmtData(x.data)}</td><td>${badge(x.sit[0],x.sit[1])}</td><td><small>${esc(x.base)}</small></td></tr>`).join('')}</tbody></table></div>
  <p class="sub">A situação “cumprido” dos eventos considera o envio processado nesta ferramenta; confira sempre no portal do eSocial e no e-CAC.</p></div>`;},
  actions:()=>[],mount(){const i=$('#pzComp');if(i)i.addEventListener('change',()=>refresh({comp:i.value}));}};

/* ---------- multas e acréscimos ---------- */
function maedCalc(o){/* o:{montante,prazo,entrega,perfil:'geral'|'sn'|'mei',semFato,espontanea} */
  const T=dUTC(somaDiasIso(o.prazo,1)),En=dUTC(o.entrega);if(En<=dUTC(o.prazo))return{meses:0,multa:0,minimo:0,base:0};
  const meses=(En.getUTCFullYear()*12+En.getUTCMonth())-(T.getUTCFullYear()*12+T.getUTCMonth())+1;
  const fator=o.perfil==='mei'?0.1:o.perfil==='sn'?0.5:1;const minimo=r2((o.semFato?200:500)*fator);
  const pct=Math.min(20,2*meses),base=r2(o.montante*pct/100);let multa=Math.max(base,minimo);
  if(o.espontanea)multa=Math.max(r2(multa*0.5),minimo);
  return{meses,pct,base,minimo,multa:r2(multa)};
}
const somaDiasIso=(iso,n)=>new Date(dUTC(iso).getTime()+n*864e5).toISOString().slice(0,10);
function moraCalc(o){/* o:{valor,venc,pag,selic} */
  if(o.pag<=o.venc)return{dias:0,multa:0,juros:0,total:o.valor};
  const dias=Math.round((dUTC(o.pag)-dUTC(o.venc))/864e5),pm=Math.min(20,0.33*dias),multa=r2(o.valor*pm/100),jp=num(o.selic)+1,juros=r2(o.valor*jp/100);
  return{dias,pm:r2(pm),multa,jp,juros,total:r2(o.valor+multa+juros)};
}
SC.dctfMulta={view(p){const E=DB.empresa||{},q=p.q||{},perfilPad=E.regime==='sn'?'sn':'geral';
  const o={montante:num(q.montante),prazo:q.prazo||dctfPrazoEntrega(DB.cfg.comp),entrega:q.entrega||'',perfil:q.perfil||perfilPad,semFato:!!q.semFato,espontanea:q.espontanea!=='0'};
  const m=o.entrega&&o.montante>=0?maedCalc(o):null;
  const z={valor:num(q.valor),venc:q.venc||'',pag:q.pag||'',selic:q.selic||0},mo=z.valor>0&&z.venc&&z.pag?moraCalc(z):null;
  return `<h1>Multas e acréscimos legais — DCTFWeb</h1><p class="sub">Simulação da multa por atraso na entrega (MAED) e dos acréscimos moratórios do DARF. O valor oficial é o da notificação de lançamento emitida pela Receita Federal.</p>
  <div class="card" id="fm"><h2>MAED — multa por atraso na entrega da declaração</h2><div class="grid">${F('Montante das contribuições declaradas (R$)','montante',o.montante||'',{t:'money',w:4})+F('Prazo de entrega','prazo',o.prazo,{t:'date',w:4})+F('Data da efetiva entrega','entrega',o.entrega,{t:'date',w:4})+F('Perfil do declarante','perfil',o.perfil,{t:'select',opts:[['geral','Demais empresas'],['sn','ME/EPP do Simples Nacional'],['mei','MEI']],w:4})+F('Declaração sem fatos geradores','semFato',o.semFato,{t:'check',w:4,cl:'Sem movimento (mínimo de R$ 200,00)'})+F('Entrega espontânea','espontanea',o.espontanea,{t:'check',w:4,cl:'Antes de qualquer procedimento de ofício (redução de 50%)'})}</div>
  <div class="row"><button class="btn pri" data-act="mmCalc">Calcular MAED</button></div>
  ${m?`<div class="note ${m.multa>0?'warn':'info'}">${m.meses?`Atraso de <b>${m.meses}</b> mês(es)-calendário ou fração: 2% ao mês, limitado a 20% (${m.pct}%) sobre R$ ${brl(o.montante)} = R$ ${brl(m.base)}; multa mínima R$ ${brl(m.minimo)}${o.espontanea?'; reduzida em 50% observado o mínimo':''}. <b>MAED estimada: R$ ${brl(m.multa)}</b> (DARF código 5440-01).`:'Entrega dentro do prazo: não há MAED.'}</div>`:''}
  <p class="sub">Base: Manual da DCTFWeb, itens 5.1, 5.3 e 5.4. Multa mínima de R$ 500,00 (R$ 200,00 sem fatos geradores), reduzida em 90% para o MEI e em 50% para ME/EPP do Simples Nacional; prazo de impugnação de 30 dias (item 5.5). A não transmissão impede a emissão da CND. Incorreções ou omissões: R$ 20,00 por grupo de dez informações, observada a multa mínima (item 5.2).</p></div>
  <div class="card" id="fz"><h2>Pagamento em atraso — multa de mora e juros</h2><div class="grid">${F('Valor do tributo (R$)','valor',z.valor||'',{t:'money',w:3})+F('Vencimento','venc',z.venc,{t:'date',w:3})+F('Data do pagamento','pag',z.pag,{t:'date',w:3})+F('Selic acumulada (%) do mês seguinte ao vencimento até o mês anterior ao do pagamento','selic',z.selic||'',{w:3,hint:'Informe a taxa acumulada divulgada pela RFB.'})}</div>
  <div class="row"><button class="btn pri" data-act="mzCalc">Calcular acréscimos</button></div>
  ${mo?`<div class="note info">${mo.dias?`${mo.dias} dia(s) de atraso: multa de mora de 0,33% ao dia, limitada a 20% (${brl(mo.pm)}%) = R$ ${brl(mo.multa)}; juros Selic acumulada + 1% no mês do pagamento (${brl(mo.jp)}%) = R$ ${brl(mo.juros)}. <b>Total: R$ ${brl(mo.total)}</b>.`:'Pagamento no prazo: sem acréscimos.'} O sistema oficial (Sicalcweb/DCTFWeb) calcula a multa a partir do primeiro dia útil subsequente ao vencimento; confira o valor na emissão do DARF.</div>`:''}
  <p class="sub">Base: Manual da DCTFWeb, item 5.6.</p></div>`;},actions:()=>[]};
ACT.mmCalc=()=>{const o=readForm($('#fm'));refresh({q:Object.assign({},NAV.cur.params.q,{montante:o.montante,prazo:o.prazo,entrega:o.entrega,perfil:o.perfil,semFato:o.semFato,espontanea:o.espontanea?'1':'0'})});};
ACT.mzCalc=()=>{const o=readForm($('#fz'));refresh({q:Object.assign({},NAV.cur.params.q,{valor:o.valor,venc:o.venc,pag:o.pag,selic:o.selic})});};
