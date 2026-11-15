/* ===================== CONTABILIDADE · FINANCEIRO · ARQUIVOS BANCÁRIOS =====================
   Contabilização automática da folha (partidas dobradas), contas a pagar da folha e remessa/retorno CNAB 240.
   Premissas: regime de competência (Lei 6.404/1976, art. 177; Código Civil, arts. 1.179 e 1.183 **).
   O leiaute CNAB 240 segue o padrão FEBRABAN; cada banco adota variações (convênio, câmara, finalidade, códigos de ocorrência).
   Toda remessa precisa ser homologada com o banco antes do uso em produção **. */

/* ---------- utilitários ---------- */
const ctbDB=()=>{DB.ctb=DB.ctb||{};const c=DB.ctb;c.regra=c.regra||{};c.lanc=c.lanc||[];c.fech=c.fech||{};c.seq=c.seq||0;if(!c.plano||!c.plano.length)c.plano=ctbPlanoPadrao();return c;};
const finDB=()=>{DB.fin=DB.fin||{};const f=DB.fin;f.contas=f.contas||[];f.tit=f.tit||[];f.rem=f.rem||[];f.seq=f.seq||0;return f;};
const ctbUlt=comp=>{const [a,m]=comp.split('-').map(Number);return new Date(Date.UTC(a,m,0)).toISOString().slice(0,10);};
const ctbSemAc=s=>String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^\x20-\x7E]/g,' ').toUpperCase();
const cnA=(s,n)=>ctbSemAc(s).slice(0,n).padEnd(n,' ');
const cnN=(v,n)=>{const s=String(Math.max(0,Math.round(Number(v)||0))).replace(/\D/g,'');if(s.length>n)throw new Error('Campo numérico excede '+n+' posições: '+s);return s.padStart(n,'0');};
const cnV=(v,n)=>cnN(Math.round(r2(v)*100),n);
const cnD=iso=>iso?iso.slice(8,10)+iso.slice(5,7)+iso.slice(0,4):'00000000';
const cnB=n=>' '.repeat(n);
const cents=v=>Math.round(r2(v)*100);
function quintoDiaUtil(comp){const [a,m]=comp.split('-').map(Number);let d=new Date(Date.UTC(m===12?a+1:a,m===12?0:m,1)),n=0;
  while(true){const f=FERIADOS_FIXOS.includes(d.toISOString().slice(5,10));if(d.getUTCDay()!==0&&!f){n++;if(n===5)break;}d=new Date(d.getTime()+864e5);}return d.toISOString().slice(0,10);}
const somaDias=(iso,n)=>new Date(new Date(iso+'T00:00:00Z').getTime()+n*864e5).toISOString().slice(0,10);

/* ---------- plano de contas e parametrização ---------- */
function ctbPlanoPadrao(){return[
 {cod:'1.1.1.01',nome:'Caixa',nat:'D'},{cod:'1.1.1.02',nome:'Bancos conta movimento',nat:'D'},
 {cod:'2.1.2.01',nome:'Salários e ordenados a pagar',nat:'C'},{cod:'2.1.2.02',nome:'INSS a recolher',nat:'C'},{cod:'2.1.2.03',nome:'IRRF a recolher',nat:'C'},
 {cod:'2.1.2.04',nome:'FGTS a recolher',nat:'C'},{cod:'2.1.2.05',nome:'Contribuições a terceiros a recolher',nat:'C'},{cod:'2.1.2.06',nome:'Descontos de empregados a repassar',nat:'C'},
 {cod:'2.1.2.07',nome:'Provisão de férias e encargos',nat:'C'},{cod:'2.1.2.08',nome:'Provisão de 13º salário e encargos',nat:'C'},{cod:'2.1.2.10',nome:'Fornecedores e outras contas a pagar',nat:'C'},
 {cod:'3.1.1.01',nome:'Salários e ordenados',nat:'D'},{cod:'3.1.1.02',nome:'Férias e adicional de 1/3',nat:'D'},{cod:'3.1.1.03',nome:'13º salário',nat:'D'},{cod:'3.1.1.04',nome:'Rescisões e indenizações',nat:'D'},
 {cod:'3.1.2.01',nome:'INSS patronal',nat:'D'},{cod:'3.1.2.02',nome:'RAT/FAP',nat:'D'},{cod:'3.1.2.03',nome:'Contribuições a terceiros',nat:'D'},{cod:'3.1.2.04',nome:'FGTS',nat:'D'},
 {cod:'3.1.3.01',nome:'Provisão de férias e encargos (despesa)',nat:'D'},{cod:'3.1.3.02',nome:'Provisão de 13º salário e encargos (despesa)',nat:'D'}];}
const CTB_REGRAS=[['despSal','Despesa — salários e ordenados','3.1.1.01'],['despFer','Despesa — férias e 1/3','3.1.1.02'],['despD13','Despesa — 13º salário','3.1.1.03'],['despResc','Despesa — rescisões','3.1.1.04'],
 ['despPat','Despesa — INSS patronal','3.1.2.01'],['despRat','Despesa — RAT/FAP','3.1.2.02'],['despTerc','Despesa — terceiros','3.1.2.03'],['despFgts','Despesa — FGTS','3.1.2.04'],['despProvFer','Despesa — provisão de férias','3.1.3.01'],['despProvD13','Despesa — provisão de 13º','3.1.3.02'],
 ['pasSal','Passivo — salários a pagar','2.1.2.01'],['pasInss','Passivo — INSS a recolher','2.1.2.02'],['pasIrrf','Passivo — IRRF a recolher','2.1.2.03'],['pasFgts','Passivo — FGTS a recolher','2.1.2.04'],['pasTerc','Passivo — terceiros a recolher','2.1.2.05'],
 ['pasOutros','Passivo — descontos a repassar','2.1.2.06'],['pasProvFer','Passivo — provisão de férias','2.1.2.07'],['pasProvD13','Passivo — provisão de 13º','2.1.2.08'],['pasForn','Passivo — fornecedores/outros','2.1.2.10'],['banco','Ativo — bancos conta movimento','1.1.1.02']];
const ctbRegra=k=>{const c=ctbDB();return c.regra[k]||(CTB_REGRAS.find(x=>x[0]===k)||[])[2];};
const ctbNome=cod=>{const x=ctbDB().plano.find(p=>p.cod===cod);return x?x.nome:'(conta inexistente)';};
const FER_SYS=['FERIAS','FERTERCO','ABONO','ABONOTERCO','FERVENC','FERPROP','FERPTERCO'],D13_SYS=['D13','D13PROP'],RESC_SYS=['AVISO'];

/* ---------- geração automática dos lançamentos da folha ---------- */
function ctbGerar(comp){
  const c=ctbDB(),C=DB.comps[comp];
  if(!C||!Object.keys(C.res||{}).length)return{erro:'Calcule a folha da competência antes de contabilizar.'};
  if(c.fech[comp])return{erro:'Competência contábil encerrada. Reabra para regenerar.'};
  const T=totaisComp(comp);let sal=0,fer=0,d13=0,resc=0,liq=0,inss=0,irrf=0,plr=0,outros=0,bruto=0,baseProv=0;
  for(const id in C.res){const r=C.res[id];liq+=r.liquido;inss+=r.inss;irrf+=r.irrf;plr+=r.irrfPlr||0;bruto+=r.totProv;
    for(const x of r.itens){if(x.tp!==1)continue;if(FER_SYS.includes(x.sys))fer+=x.valor;else if(D13_SYS.includes(x.sys))d13+=x.valor;else if(RESC_SYS.includes(x.sys))resc+=x.valor;else sal+=x.valor;}}
  sal=r2(sal);fer=r2(fer);d13=r2(d13);resc=r2(resc);liq=r2(liq);inss=r2(inss);irrf=r2(irrf);plr=r2(plr);bruto=r2(bruto);
  outros=r2(bruto-liq-inss-irrf-plr);baseProv=sal;
  c.lanc=c.lanc.filter(l=>!(l.auto&&l.comp===comp&&l.tipo!=='baixa'));
  const dt=ctbUlt(comp),mk=(tipo,hist,ps)=>{const pp=ps.filter(p=>Math.abs(p.d||0)>=0.005||Math.abs(p.c||0)>=0.005);const D=r2(pp.reduce((a,p)=>a+(p.d||0),0)),K=r2(pp.reduce((a,p)=>a+(p.c||0),0));
    if(!pp.length)return null;if(D!==K)throw new Error('Lançamento desbalanceado ('+tipo+'): D '+D+' ≠ C '+K);c.seq++;const l={id:'L'+String(c.seq).padStart(6,'0'),comp,data:dt,tipo,auto:true,hist,partidas:pp};c.lanc.push(l);return l;};
  const gen=[];
  /* 1) apropriação da folha */
  const ps=[];
  [['despSal',sal],['despFer',fer],['despD13',d13],['despResc',resc]].forEach(([k,v])=>{if(v>0)ps.push({conta:ctbRegra(k),d:v,c:0});});
  ps.push({conta:ctbRegra('pasSal'),d:0,c:liq});
  if(inss>0)ps.push({conta:ctbRegra('pasInss'),d:0,c:inss});
  if(irrf+plr>0)ps.push({conta:ctbRegra('pasIrrf'),d:0,c:r2(irrf+plr)});
  if(outros>0.004)ps.push({conta:ctbRegra('pasOutros'),d:0,c:outros});else if(outros<-0.004)ps.push({conta:ctbRegra('pasOutros'),d:-outros,c:0});
  gen.push(mk('folha','Apropriação da folha de pagamento '+compLabel(comp)+' — proventos, descontos legais e líquido a pagar',ps));
  /* 2) encargos patronais (não há patronal no Simples Nacional do Anexo I a III — o cálculo do app devolve zero) */
  const pe=[];
  if(T.pat>0)pe.push({conta:ctbRegra('despPat'),d:T.pat,c:0});if(T.rat>0)pe.push({conta:ctbRegra('despRat'),d:T.rat,c:0});if(T.terc>0)pe.push({conta:ctbRegra('despTerc'),d:T.terc,c:0});
  if(T.pat+T.rat>0)pe.push({conta:ctbRegra('pasInss'),d:0,c:r2(T.pat+T.rat)});if(T.terc>0)pe.push({conta:ctbRegra('pasTerc'),d:0,c:T.terc});
  gen.push(mk('enc','Encargos patronais sobre a folha '+compLabel(comp)+' (INSS patronal, RAT/FAP e terceiros)',pe));
  /* 3) FGTS */
  if(T.fgts>0)gen.push(mk('fgts','FGTS da competência '+compLabel(comp),[{conta:ctbRegra('despFgts'),d:T.fgts,c:0},{conta:ctbRegra('pasFgts'),d:0,c:T.fgts}]));
  /* 4) provisões (opcional) */
  if(c.prov){const pe2=num(c.encProv)/100,pf=r2(baseProv/12*4/3*(1+pe2)),p13=r2(baseProv/12*(1+pe2));
    if(pf>0)gen.push(mk('prov','Provisão mensal de férias e 1/3 '+compLabel(comp)+(pe2?' (com encargos de '+brl(num(c.encProv))+'%)':''),[{conta:ctbRegra('despProvFer'),d:pf,c:0},{conta:ctbRegra('pasProvFer'),d:0,c:pf}]));
    if(p13>0)gen.push(mk('prov','Provisão mensal de 13º salário '+compLabel(comp)+(pe2?' (com encargos de '+brl(num(c.encProv))+'%)':''),[{conta:ctbRegra('despProvD13'),d:p13,c:0},{conta:ctbRegra('pasProvD13'),d:0,c:p13}]));}
  saveDB();audit('Contabilização',comp+' · '+gen.filter(Boolean).length+' lançamentos');
  return{n:gen.filter(Boolean).length};
}
function ctbSaldos(ate){const m={};ctbDB().lanc.forEach(l=>{if(ate&&l.data>ate)return;l.partidas.forEach(p=>{const o=m[p.conta]=m[p.conta]||{d:0,c:0};o.d=r2(o.d+(p.d||0));o.c=r2(o.c+(p.c||0));});});return m;}

/* ---------- financeiro: títulos a pagar ---------- */
function finEmpBanco(e){return{forma:e.formaPgto||'cc',banco:onlyD(e.banco).slice(0,3),ag:onlyD(e.agencia),agDv:String(e.agDv||'').trim(),conta:onlyD(e.conta),contaDv:String(e.contaDv||'').trim(),tipoConta:e.tipoConta||'cc'};}
function finGerar(comp){
  const f=finDB(),C=DB.comps[comp];if(!C||!Object.keys(C.res||{}).length)return{erro:'Calcule a folha da competência antes de gerar os títulos.'};
  const P=DB.params,T=totaisComp(comp),E=DB.empresa||{},sn=E.regime==='sn'&&E.anexo==='std';
  const alvo=[];
  for(const id in C.res){const r=C.res[id],e=byId(DB.empregados,id);if(!e||!(r.liquido>0))continue;
    const resc=e.desligamento&&e.desligamento.slice(0,7)===comp;
    alvo.push({orig:comp+'|'+(resc?'resc':'sal')+'|'+id,comp,tipo:resc?'resc':'sal',emp:id,desc:(resc?'Verbas rescisórias — ':'Salário líquido — ')+e.nome,favorecido:e.nome,doc:onlyD(e.cpf),valor:r.liquido,
      venc:resc?somaDias(e.desligamento,10):quintoDiaUtil(comp),pas:'pasSal',...finEmpBanco(e)});}
  const dI=vencGuia(comp,P.venc.inss),dF=vencGuia(comp,P.venc.fgts),plr=r2(Object.values(C.res).reduce((a,r)=>a+(r.irrfPlr||0),0)),irT=r2(T.irrf-plr);
  const ins=r2(T.inss+(sn?0:T.pat+T.rat));
  if(ins>0)alvo.push({orig:comp+'|inss',comp,tipo:'inss',desc:'INSS (DCTFWeb/DARF) '+compLabel(comp),favorecido:'Receita Federal do Brasil',valor:r2(ins+(sn?0:T.terc)),venc:dI,pas:'pasInss',partes:[{pas:'pasInss',valor:ins}].concat(!sn&&T.terc>0?[{pas:'pasTerc',valor:T.terc}]:[]),guia:true});
  if(irT+plr>0)alvo.push({orig:comp+'|irrf',comp,tipo:'irrf',desc:'IRRF (DCTFWeb/DARF) '+compLabel(comp),favorecido:'Receita Federal do Brasil',valor:r2(irT+plr),venc:dI,pas:'pasIrrf',guia:true});
  if(T.fgts>0)alvo.push({orig:comp+'|fgts',comp,tipo:'fgts',desc:'FGTS Digital '+compLabel(comp),favorecido:'Caixa Econômica Federal — FGTS',valor:T.fgts,venc:dF,pas:'pasFgts',guia:true});
  const chaves=new Set(alvo.map(a=>a.orig));
  f.tit=f.tit.filter(t=>!(t.comp===comp&&t.origem==='folha'&&t.status==='aberto'&&!chaves.has(t.orig)));
  let novos=0,atual=0,mant=0;
  alvo.forEach(a=>{const ex=f.tit.find(t=>t.orig===a.orig&&t.origem==='folha');
    if(ex){if(ex.status==='aberto'){Object.assign(ex,a);atual++;}else mant++;}
    else{f.seq++;f.tit.push(Object.assign({id:'T'+String(f.seq).padStart(6,'0'),origem:'folha',status:'aberto'},a));novos++;}});
  saveDB();audit('Títulos da folha',comp+' · '+novos+' novos');return{novos,atual,mant};
}
const FIN_ST={aberto:['Em aberto','warn'],remessa:['Em remessa','gray'],pago:['Pago','ok'],cancelado:['Cancelado','err']};
const FIN_PAS={sal:'pasSal',resc:'pasSal',inss:'pasInss',irrf:'pasIrrf',fgts:'pasFgts'};
function finBaixar(t,data,contaBancoCtb,origem){
  const c=ctbDB(),partes=t.partes||[{pas:t.pas||'pasForn',valor:t.valor}];
  const ps=partes.map(p=>({conta:ctbRegra(p.pas)||p.pas,d:p.valor,c:0}));ps.push({conta:contaBancoCtb||ctbRegra('banco'),d:0,c:t.valor});
  c.seq++;c.lanc.push({id:'L'+String(c.seq).padStart(6,'0'),comp:t.comp||data.slice(0,7),data,tipo:'baixa',auto:true,hist:'Pagamento — '+t.desc+(origem?' ('+origem+')':''),doc:t.id,partidas:ps});
  t.status='pago';t.pagoEm=data;
}

/* ---------- CNAB 240 (remessa de pagamentos) ---------- */
const CNAB_FORMAS={'01':'Crédito em conta corrente (mesmo banco)','41':'TED — outra titularidade (outros bancos)'};
function cnabValida(t){const m=[];if(t.forma!=='cc')m.push('forma de pagamento "'+(t.forma==='pix'?'PIX':'dinheiro')+'" não é gerada por este arquivo');
  if(t.forma==='cc'){if(!/^\d{3}$/.test(t.banco||''))m.push('código do banco (3 dígitos) ausente');if(!t.ag)m.push('agência ausente');if(!t.conta)m.push('conta ausente');if(!(t.valor>0))m.push('valor inválido');
    if(t.doc&&t.doc.length===11&&!cpfValido(t.doc))m.push('CPF inválido');if(!t.doc)m.push('CPF/CNPJ do favorecido ausente');}return m;}
function cnabGerar(o){
  /* o: {conta,tits,dtPag,servico:'30'|'20',segB:bool,nsa,msg} -> {texto,nLinhas,total,inclusos,pend} */
  const E=DB.empresa;if(!E)throw new Error('Cadastre a empresa.');const cb=o.conta,inclusos=[],pend=[];
  o.tits.forEach(t=>{const m=cnabValida(t);if(m.length)pend.push({t,m});else inclusos.push(t);});
  if(!inclusos.length)return{texto:'',nLinhas:0,total:0,inclusos,pend};
  const cnpj=cnN(onlyD(E.cnpj),14),banco=cnN(cb.banco,3),ins='2';
  const hdrConta=cnN(cb.ag,5)+cnA(cb.agDv,1)+cnN(cb.conta,12)+cnA(cb.contaDv,1)+' ';
  const L=[];
  const add=s=>{if(s.length!==240)throw new Error('Registro CNAB com '+s.length+' posições (esperado 240): '+s.slice(0,20));L.push(s);};
  const agora=new Date(),hh=String(agora.getHours()).padStart(2,'0')+String(agora.getMinutes()).padStart(2,'0')+String(agora.getSeconds()).padStart(2,'0');
  add(banco+'0000'+'0'+cnB(9)+ins+cnpj+cnA(cb.convenio,20)+hdrConta+cnA(E.razao,30)+cnA(cb.bancoNome,30)+cnB(10)+'1'+cnD(hoje())+hh+cnN(o.nsa||1,6)+'103'+'01600'+cnB(20)+cnB(20)+cnB(29));
  const grp={};inclusos.forEach(t=>{const fm=t.banco===cnN(cb.banco,3)?'01':'41';(grp[fm]=grp[fm]||[]).push(t);});
  let lote=0,regs=0;
  Object.keys(grp).sort().forEach(fm=>{lote++;const ts=grp[fm];let seq=0,soma=0;
    add(banco+cnN(lote,4)+'1'+'C'+cnN(o.servico||'30',2)+fm+'045'+' '+ins+cnpj+cnA(cb.convenio,20)+hdrConta+cnA(E.razao,30)+cnA(o.msg||'',40)+cnA(E.logr||'',30)+cnA(E.nr||'',5)+cnA(E.compl||'',15)+cnA(E.municipio||'',20)+cnN(onlyD(E.cep)||0,8)+cnA(E.uf||'',2)+cnB(8)+cnB(10));
    ts.forEach(t=>{seq++;soma+=cents(t.valor);
      add(banco+cnN(lote,4)+'3'+cnN(seq,5)+'A'+'0'+'00'+(fm==='41'?'018':'000')+cnN(t.banco,3)+cnN(t.ag,5)+cnA(t.agDv,1)+cnN(t.conta,12)+cnA(t.contaDv,1)+' '+cnA(t.favorecido,30)+cnA(t.id,20)+cnD(o.dtPag)+'BRL'+cnN(0,15)+cnV(t.valor,15)+cnB(20)+cnN(0,8)+cnN(0,15)+cnB(40)+'  '+cnB(5)+'  '+cnB(3)+'0'+cnB(10));
      if(o.segB){seq++;const d=onlyD(t.doc);add(banco+cnN(lote,4)+'3'+cnN(seq,5)+'B'+cnB(3)+(d.length===11?'1':'2')+cnN(d,14)+cnB(30)+cnB(5)+cnB(15)+cnB(15)+cnB(20)+cnB(8)+cnB(2)+cnN(0,8)+cnN(0,15)+cnN(0,15)+cnN(0,15)+cnN(0,15)+cnN(0,15)+cnB(15)+' '+cnB(6)+cnN(0,8));}});
    add(banco+cnN(lote,4)+'5'+cnB(9)+cnN(seq+2,6)+cnN(soma,18)+cnN(0,18)+cnN(0,6)+cnB(165)+cnB(10));regs+=seq+2;});
  add(banco+'9999'+'9'+cnB(9)+cnN(lote,6)+cnN(L.length+1,6)+cnN(0,6)+cnB(205));
  const total=r2(inclusos.reduce((a,t)=>a+t.valor,0));
  return{texto:L.join('\r\n')+'\r\n',nLinhas:L.length,total,inclusos,pend};
}
/* retorno: lê segmentos A e interpreta as ocorrências (posições 231–240, pares de 2 caracteres) */
function cnabRetorno(txt){
  const out=[];String(txt).split(/\r?\n/).forEach(l=>{if(l.length<240)return;if(l[7]!=='3'||l[13]!=='A')return;
    const doc=l.slice(73,93).trim(),oc=l.slice(230,240).trim().match(/.{1,2}/g)||[],val=Number(l.slice(119,134))/100;
    let st='rejeitado';if(oc.includes('00'))st='pago';else if(oc.includes('BD')||oc.includes('02'))st='agendado';out.push({doc,oc,val,st,favorecido:l.slice(43,73).trim()});});
  return out;
}
const CNAB_OC={'00':'Crédito ou débito efetivado','01':'Insuficiência de fundos','02':'Crédito ou débito cancelado pelo pagador','03':'Débito autorizado pela agência — efetuado','AA':'Controle inválido','AB':'Tipo de operação inválido','AC':'Tipo de serviço inválido','AD':'Forma de lançamento inválida','AE':'Tipo/número de inscrição inválido','AF':'Código de convênio inválido','AG':'Agência/conta corrente/DV inválido','AH':'Número sequencial do registro no lote inválido','AI':'Código de segmento de detalhe inválido','AJ':'Tipo de movimento inválido','AL':'Código do banco do favorecido inválido','AM':'Agência do favorecido inválida','AN':'Conta corrente do favorecido inválida','AO':'Nome do favorecido não informado','AP':'Data de lançamento inválida','AQ':'Tipo/quantidade de moeda inválido','AR':'Valor do lançamento inválido','BD':'Inclusão efetuada com sucesso (agendado)'};

/* ===================== TELAS ===================== */
const ctbOpts=(sel,so)=>ctbDB().plano.filter(p=>!so||p.nat===so).map(p=>[p.cod,p.cod+' — '+p.nome]);
const ctbHead=(t,s)=>`<h1>${t}</h1><p class="sub">${s}</p>${exigeEmpresa()}`;
const avisoHomolog='<div class="note warn"><b>**</b> Conferir antes do uso em produção: o leiaute CNAB 240 é padronizado pela FEBRABAN, mas cada banco define convênio, câmara centralizadora, finalidade, uso do Segmento B e códigos de ocorrência. Gere um arquivo de teste e homologue-o com o seu gerente ou com a mesa de integração do banco antes de transmitir pagamentos reais.</div>';

SC.ctbLanc={view(p){const c=ctbDB(),comp=p.comp||DB.cfg.comp,L=c.lanc.filter(l=>l.comp===comp).sort((a,b)=>a.id<b.id?-1:1);
  const T=r2(L.reduce((a,l)=>a+l.partidas.reduce((x,q)=>x+(q.d||0),0),0)),enc=!!c.fech[comp];
  return ctbHead('Lançamentos contábeis','Contabilização automática da folha por partidas dobradas, na competência selecionada. Gere os lançamentos após calcular a folha; é possível regenerar enquanto a competência não estiver encerrada.')+
  `<div class="card"><div class="row"><div class="f"><label>Competência</label><input type="month" id="ctbComp" value="${comp}"></div>
   <button class="btn pri" data-act="ctbGerar">⚙ Gerar lançamentos da folha</button><button class="btn" data-act="ctbManual">＋ Lançamento manual</button><button class="btn" data-act="ctbCsv">Exportar CSV</button>
   <button class="btn ${enc?'':'danger'}" data-act="ctbFechar">${enc?'Reabrir competência contábil':'Encerrar competência contábil'}</button></div>
   <p class="sub">${enc?badge('Competência encerrada','err'):badge('Aberta','ok')} · ${L.length} lançamentos · movimento a débito R$ ${brl(T)}${c.prov?' · provisões mensais ativadas':' · provisões mensais desativadas (Parametrização)'}</p></div>
  <div class="card"><div class="tw"><table class="t"><thead><tr><th>Nº</th><th>Data</th><th>Histórico</th><th>Conta</th><th class="r">Débito</th><th class="r">Crédito</th><th></th></tr></thead><tbody>
  ${L.map(l=>l.partidas.map((q,i)=>`<tr>${i===0?`<td rowspan="${l.partidas.length}">${esc(l.id)}<br>${l.auto?badge('auto','gray'):badge('manual','warn')}</td><td rowspan="${l.partidas.length}">${fmtData(l.data)}</td><td rowspan="${l.partidas.length}">${esc(l.hist)}</td>`:''}<td>${esc(q.conta)} — ${esc(ctbNome(q.conta))}</td><td class="r">${q.d?brl(q.d):''}</td><td class="r">${q.c?brl(q.c):''}</td>${i===0?`<td rowspan="${l.partidas.length}">${l.auto?'':`<button class="btn sm danger" data-act="ctbDel" data-id="${l.id}">Excluir</button>`}</td>`:''}</tr>`).join('')).join('')||'<tr><td colspan="7" class="c" style="padding:16px;color:var(--mut)">Nenhum lançamento na competência. Calcule a folha e clique em “Gerar lançamentos da folha”.</td></tr>'}
  </tbody></table></div></div>
  <div class="note info">Lançamentos automáticos: apropriação da folha (despesas × líquido a pagar, INSS, IRRF e outros descontos), encargos patronais e FGTS${c.prov?', provisões de férias e 13º':''}. As baixas de pagamento são lançadas pelo Financeiro (D passivo / C bancos). <b>Não</b> há, nesta versão, lançamento de multa rescisória do FGTS, reversão de provisões no pagamento de férias/13º, nem centro de custo; lance manualmente quando necessário. O CSV é um leiaute simples para importação em sistema contábil; <b>não</b> substitui a ECD (SPED Contábil) **.</div>`;},
  actions:()=>[],mount(){const i=$('#ctbComp');if(i)i.addEventListener('change',()=>refresh({comp:i.value}));}};
ACT.ctbGerar=()=>{const comp=($('#ctbComp')||{}).value||DB.cfg.comp;try{const r=ctbGerar(comp);if(r.erro){toast(r.erro,'err');return;}toast(r.n+' lançamentos gerados.','ok');refresh({comp});}catch(e){toast(e.message,'err');}};
ACT.ctbFechar=()=>{const c=ctbDB(),comp=($('#ctbComp')||{}).value||DB.cfg.comp;if(c.fech[comp]){delete c.fech[comp];audit('Competência contábil reaberta',comp);}else{if(!c.lanc.some(l=>l.comp===comp)){toast('Não há lançamentos para encerrar.','err');return;}c.fech[comp]=hoje();audit('Competência contábil encerrada',comp);}saveDB();refresh({comp});};
ACT.ctbDel=el=>{const c=ctbDB();modalConfirm('Excluir este lançamento manual? Esta ação é irreversível.',()=>{c.lanc=c.lanc.filter(l=>l.id!==el.dataset.id);saveDB();refresh();},{title:'Excluir lançamento',yes:'Excluir'});};
ACT.ctbManual=()=>{const comp=($('#ctbComp')||{}).value||DB.cfg.comp,c=ctbDB();if(c.fech[comp]){toast('Competência encerrada.','err');return;}
  modal(`<div id="mf" class="grid">${F('Data','data',ctbUlt(comp),{t:'date',req:1,w:3})+F('Valor','valor','',{t:'money',req:1,w:3})+F('Conta a débito','d','',{t:'select',opts:[['','Selecione']].concat(ctbOpts()),req:1,w:6})+F('Conta a crédito','c','',{t:'select',opts:[['','Selecione']].concat(ctbOpts()),req:1,w:6})+F('Histórico','hist','',{req:1,w:12})}</div>
  <div class="row"><button class="btn pri" data-act="ctbManualOk">Lançar</button><button class="btn" data-act="closeModal">Cancelar</button></div>`,{title:'Lançamento manual'});};
ACT.ctbManualOk=()=>{const o=readForm($('#mf')),c=ctbDB();if(!o.data||!o.d||!o.c||!(o.valor>0)||!o.hist){toast('Preencha todos os campos.','err');return;}if(o.d===o.c){toast('Débito e crédito não podem ser a mesma conta.','err');return;}
  const comp=o.data.slice(0,7);if(c.fech[comp]){toast('Competência encerrada.','err');return;}c.seq++;c.lanc.push({id:'L'+String(c.seq).padStart(6,'0'),comp,data:o.data,tipo:'manual',auto:false,hist:o.hist,partidas:[{conta:o.d,d:o.valor,c:0},{conta:o.c,d:0,c:o.valor}]});saveDB();closeModal();refresh({comp});};
ACT.ctbCsv=()=>{const c=ctbDB(),comp=($('#ctbComp')||{}).value||DB.cfg.comp;const rows=['data;lancamento;conta_debito;conta_credito;valor;historico'];
  c.lanc.filter(l=>l.comp===comp).forEach(l=>{l.partidas.forEach(q=>{const v=(q.d||q.c).toFixed(2).replace('.',',');rows.push([fmtData(l.data),l.id,q.d?q.conta:'',q.c?q.conta:'',v,String(l.hist).replace(/;/g,',')].join(';'));});});
  baixar('lancamentos_'+comp+'.csv',rows.join('\r\n'),'text/csv');};

crud('ctbPlano',{title:'Plano de contas',sub:'Plano resumido para a contabilização da folha. Ajuste os códigos ao plano de contas da empresa ou da contabilidade externa; a parametrização define quais contas recebem cada lançamento.',key:'cod',list:()=>ctbDB().plano,
  cols:[['cod','Código'],['nome','Conta'],['nat','Natureza',r=>r.nat==='D'?'Devedora':'Credora']],
  fields:r=>F('Código','cod',r.cod,{req:1,w:3})+F('Nome da conta','nome',r.nome,{req:1,w:6})+F('Natureza','nat',r.nat||'D',{t:'select',opts:[['D','Devedora'],['C','Credora']],w:3}),
  validate:o=>{const p=NAV.cur.params;if(p.edit==null&&ctbDB().plano.some(x=>x.cod===o.cod))return 'Já existe conta com este código.';},
  delCheck:r=>{const c=ctbDB();if(c.lanc.some(l=>l.partidas.some(q=>q.conta===r.cod)))return 'A conta possui lançamentos e não pode ser excluída.';if(CTB_REGRAS.some(x=>ctbRegra(x[0])===r.cod))return 'A conta está na parametrização contábil. Altere a parametrização antes de excluir.';return '';},
  delMsg:'Excluir esta conta do plano? Esta ação é irreversível.'});
SC.ctbParam={view(){const c=ctbDB();
  return ctbHead('Parametrização contábil','Define a conta contábil de cada partida gerada automaticamente. Valores pré-preenchidos seguem o plano resumido; ajuste ao plano da empresa.')+
  `<div class="card" id="f"><div class="grid">${CTB_REGRAS.map(x=>F(x[1],'r_'+x[0],ctbRegra(x[0]),{t:'select',opts:ctbOpts(),w:4})).join('')}</div></div>
  <div class="card"><h2>Provisões mensais</h2><div class="grid">${F('Apropriar provisão mensal de férias (1/12 + 1/3) e 13º (1/12)','prov',!!c.prov,{t:'check',w:6,cl:'Ativar provisões na geração'})+F('Encargos sobre as provisões (%)','encProv',c.encProv||0,{t:'text',w:3,hint:'Percentual informado pela contabilidade (INSS patronal, RAT, terceiros e FGTS); 0 = sem encargos.'})}</div>
  <p class="sub">A provisão decorre do regime de competência (CPC 25/NBC TG 25 e Lei 6.404/1976, art. 177) **. A política contábil — base, encargos e reversão — deve ser definida e documentada pela contabilidade da empresa.</p></div>`;},
  actions:()=>[{label:'💾 Salvar parametrização',act:'ctbParamSave',cls:'pri',key:'save'}]};
ACT.ctbParamSave=()=>{const c=ctbDB(),o=readForm($('#f').parentElement);CTB_REGRAS.forEach(x=>{c.regra[x[0]]=o['r_'+x[0]]||x[2];});c.prov=!!o.prov;c.encProv=num(o.encProv);saveDB();DIRTY=false;toast('Parametrização salva.','ok');};

SC.ctbBal={view(p){const c=ctbDB(),ate=p.ate||ctbUlt(DB.cfg.comp),S=ctbSaldos(ate),cont=p.conta||'';
  const rows=c.plano.filter(x=>S[x.cod]).sort((a,b)=>a.cod<b.cod?-1:1);let TD=0,TC=0;
  const razao=cont?c.lanc.filter(l=>l.data<=ate&&l.partidas.some(q=>q.conta===cont)).sort((a,b)=>a.data<b.data?-1:a.data>b.data?1:a.id<b.id?-1:1):[];let sd=0;
  return ctbHead('Balancete e razão','Saldo acumulado por conta até a data selecionada, a partir dos lançamentos registrados.')+
  `<div class="card"><div class="row"><div class="f"><label>Até a data</label><input type="date" id="balAte" value="${ate}"></div><div class="f"><label>Razão da conta</label><select id="balConta"><option value="">— nenhuma —</option>${ctbOpts().map(o=>`<option value="${esc(o[0])}" ${o[0]===cont?'selected':''}>${esc(o[1])}</option>`).join('')}</select></div></div>
  <div class="tw"><table class="t"><thead><tr><th>Conta</th><th class="r">Débitos</th><th class="r">Créditos</th><th class="r">Saldo</th></tr></thead><tbody>${rows.map(x=>{const s=S[x.cod];TD+=s.d;TC+=s.c;const sl=r2(s.d-s.c);return `<tr><td>${esc(x.cod)} — ${esc(x.nome)}</td><td class="r">${brl(s.d)}</td><td class="r">${brl(s.c)}</td><td class="r">${brl(Math.abs(sl))} ${sl>=0?'D':'C'}</td></tr>`;}).join('')||'<tr><td colspan="4" class="c" style="padding:16px;color:var(--mut)">Sem lançamentos.</td></tr>'}
  <tr><td><b>Totais</b></td><td class="r"><b>${brl(TD)}</b></td><td class="r"><b>${brl(TC)}</b></td><td class="r">${r2(TD)===r2(TC)?badge('Balanceado','ok'):badge('Divergente','err')}</td></tr></tbody></table></div></div>
  ${cont?`<div class="card"><h2>Razão — ${esc(cont)} ${esc(ctbNome(cont))}</h2><div class="tw"><table class="t"><thead><tr><th>Data</th><th>Lançamento</th><th>Histórico</th><th class="r">Débito</th><th class="r">Crédito</th><th class="r">Saldo</th></tr></thead><tbody>${razao.map(l=>l.partidas.filter(q=>q.conta===cont).map(q=>{sd=r2(sd+(q.d||0)-(q.c||0));return `<tr><td>${fmtData(l.data)}</td><td>${esc(l.id)}</td><td>${esc(l.hist)}</td><td class="r">${q.d?brl(q.d):''}</td><td class="r">${q.c?brl(q.c):''}</td><td class="r">${brl(Math.abs(sd))} ${sd>=0?'D':'C'}</td></tr>`;}).join('')).join('')}</tbody></table></div></div>`:''}`;},
  actions:()=>[],mount(){const a=$('#balAte'),b=$('#balConta');if(a)a.addEventListener('change',()=>refresh({ate:a.value}));if(b)b.addEventListener('change',()=>refresh({conta:b.value}));}};

crud('finContas',{title:'Contas bancárias da empresa',sub:'Contas de débito dos pagamentos. O convênio/código de empresa é fornecido pelo banco ao contratar o serviço de pagamentos por arquivo.',key:'id',list:()=>finDB().contas,
  cols:[['apelido','Apelido'],['banco','Banco'],['ag','Agência'],['conta','Conta',r=>esc(r.conta+(r.contaDv?'-'+r.contaDv:''))],['convenio','Convênio']],
  fields:r=>F('Apelido','apelido',r.apelido,{req:1,w:3})+F('Código do banco (3 dígitos)','banco',r.banco,{req:1,w:3,max:3,hint:'Ex.: 001 BB, 033 Santander, 104 Caixa, 237 Bradesco, 341 Itaú **'})+F('Nome do banco','bancoNome',r.bancoNome,{req:1,w:6})+F('Agência','ag',r.ag,{req:1,w:2})+F('Dígito da agência','agDv',r.agDv,{w:2,max:1})+F('Conta','conta',r.conta,{req:1,w:3})+F('Dígito da conta','contaDv',r.contaDv,{w:2,max:1})+F('Convênio / código da empresa no banco','convenio',r.convenio,{w:4})+F('Conta contábil (bancos)','contaCtb',r.contaCtb||ctbRegra('banco'),{t:'select',opts:ctbOpts('D'),w:5}),
  validate:o=>{if(!/^\d{3}$/.test(o.banco))return 'Código do banco deve ter 3 dígitos.';if(!/^\d+$/.test(o.ag)||!/^\d+$/.test(o.conta))return 'Agência e conta devem conter apenas dígitos.';},
  delCheck:r=>finDB().rem.some(x=>x.contaId===r.id)?'A conta possui remessas geradas.':'',delMsg:'Excluir esta conta bancária? Esta ação é irreversível.'});

SC.finTit={view(p){const f=finDB(),comp=p.comp||DB.cfg.comp,fl=p.st||'todos';let L=f.tit.filter(t=>(t.comp===comp||!t.comp)&&(fl==='todos'||t.status===fl));L=L.sort((a,b)=>a.venc<b.venc?-1:a.venc>b.venc?1:0);
  const tot=r2(L.reduce((a,t)=>a+(t.status!=='cancelado'?t.valor:0),0)),ab=r2(L.filter(t=>t.status==='aberto'||t.status==='remessa').reduce((a,t)=>a+t.valor,0));
  return ctbHead('Contas a pagar','Títulos gerados da folha (salários, rescisões, INSS, IRRF e FGTS) e títulos avulsos. A baixa gera o lançamento contábil de pagamento.')+
  `<div class="card"><div class="row"><div class="f"><label>Competência</label><input type="month" id="finComp" value="${comp}"></div><div class="f"><label>Situação</label><select id="finSt">${['todos','aberto','remessa','pago','cancelado'].map(s=>`<option value="${s}" ${s===fl?'selected':''}>${s==='todos'?'Todas':FIN_ST[s][0]}</option>`).join('')}</select></div>
  <button class="btn pri" data-act="finGerar">⚙ Gerar títulos da folha</button><button class="btn" data-act="finNovo">＋ Título avulso</button></div>
  <p class="sub">${L.length} títulos · total R$ ${brl(tot)} · pendente de pagamento R$ ${brl(ab)}</p>
  <div class="tw"><table class="t"><thead><tr><th>Título</th><th>Descrição</th><th>Vencimento</th><th class="r">Valor</th><th>Situação</th><th></th></tr></thead><tbody>
  ${L.map(t=>`<tr><td>${esc(t.id)}</td><td>${esc(t.desc)}${t.forma&&t.forma!=='cc'&&t.tipo!=='inss'?' '+badge(t.forma==='pix'?'PIX':'Dinheiro','gray'):''}${t.motivo?`<br><small>${esc(t.motivo)}</small>`:''}</td><td>${fmtData(t.venc)}</td><td class="r">${brl(t.valor)}</td><td>${badge(FIN_ST[t.status][0],FIN_ST[t.status][1])}</td>
  <td class="r">${t.status==='aberto'||t.status==='remessa'?`<button class="btn sm" data-act="finBaixa" data-id="${t.id}">Baixar</button> `:''}${t.status==='aberto'?`<button class="btn sm danger" data-act="finCancela" data-id="${t.id}">Cancelar</button>`:''}${t.status==='pago'?`<small>pago em ${fmtData(t.pagoEm)}</small>`:''}</td></tr>`).join('')||'<tr><td colspan="6" class="c" style="padding:16px;color:var(--mut)">Nenhum título. Calcule a folha e clique em “Gerar títulos da folha”.</td></tr>'}</tbody></table></div></div>
  <div class="note info"><b>Prazos aplicados:</b> salário no 5º dia útil do mês seguinte (CLT, art. 459, §1º; sábado computado como dia útil, conforme a Súmula 381 do TST **); verbas rescisórias em até 10 dias contados do término do contrato (CLT, art. 477, §6º); INSS, IRRF e FGTS conforme os vencimentos de Parâmetros legais, antecipados para o dia útil anterior. Guias (INSS/IRRF/FGTS) são emitidas na DCTFWeb e no FGTS Digital e <b>não</b> entram na remessa de salários; use “Baixar” após o pagamento. Férias gozadas devem ser pagas até 2 dias antes do início do período (CLT, art. 145) — confira o título do mês de gozo.</div>`;},
  actions:()=>[],mount(){const a=$('#finComp'),b=$('#finSt');if(a)a.addEventListener('change',()=>refresh({comp:a.value}));if(b)b.addEventListener('change',()=>refresh({st:b.value}));}};
ACT.finGerar=()=>{const comp=($('#finComp')||{}).value||DB.cfg.comp;const r=finGerar(comp);if(r.erro){toast(r.erro,'err');return;}toast(r.novos+' títulos novos, '+r.atual+' atualizados, '+r.mant+' mantidos (já pagos/em remessa).','ok');refresh({comp});};
ACT.finCancela=el=>modalConfirm('Cancelar este título? Ele deixará de compor remessas.',()=>{const t=finDB().tit.find(x=>x.id===el.dataset.id);if(t){t.status='cancelado';saveDB();}refresh();},{title:'Cancelar título',yes:'Cancelar título'});
ACT.finBaixa=el=>{const t=finDB().tit.find(x=>x.id===el.dataset.id);if(!t)return;
  modal(`<p>${esc(t.desc)} — <b>R$ ${brl(t.valor)}</b></p><div id="mf" class="grid">${F('Data do pagamento','data',hoje(),{t:'date',req:1,w:5})+F('Conta bancária','cb',(finDB().contas[0]||{}).id||'',{t:'select',opts:[['','Conta padrão da parametrização']].concat(finDB().contas.map(c=>[c.id,c.apelido])),w:7})}</div>
  <div class="row"><button class="btn pri" data-act="finBaixaOk" data-id="${t.id}">Confirmar baixa</button><button class="btn" data-act="closeModal">Cancelar</button></div>`,{title:'Baixar título'});};
ACT.finBaixaOk=el=>{const t=finDB().tit.find(x=>x.id===el.dataset.id),o=readForm($('#mf'));if(!t||!o.data){toast('Informe a data.','err');return;}const cb=finDB().contas.find(c=>c.id===o.cb);
  if(ctbDB().fech[o.data.slice(0,7)]){toast('A competência contábil da data de pagamento está encerrada.','err');return;}
  finBaixar(t,o.data,cb&&cb.contaCtb,'baixa manual');saveDB();audit('Título baixado',t.id);closeModal();refresh();};
ACT.finNovo=()=>{modal(`<div id="mf" class="grid">${F('Descrição','desc','',{req:1,w:8})+F('Valor','valor','',{t:'money',req:1,w:4})+F('Vencimento','venc',hoje(),{t:'date',req:1,w:4})+F('Favorecido','favorecido','',{req:1,w:8})+F('CPF/CNPJ do favorecido','doc','',{req:1,w:4})+F('Banco (3 dígitos)','banco','',{w:3,max:3})+F('Agência','ag','',{w:3})+F('Conta','conta','',{w:3})+F('Dígito da conta','contaDv','',{w:3,max:1})+F('Conta contábil de contrapartida (passivo)','pas',ctbRegra('pasForn'),{t:'select',opts:ctbOpts('C'),w:12})}</div>
  <div class="row"><button class="btn pri" data-act="finNovoOk">Incluir</button><button class="btn" data-act="closeModal">Cancelar</button></div>`,{title:'Título avulso'});};
ACT.finNovoOk=()=>{const o=readForm($('#mf')),f=finDB();if(!o.desc||!(o.valor>0)||!o.venc||!o.favorecido||!o.doc){toast('Preencha descrição, valor, vencimento, favorecido e CPF/CNPJ.','err');return;}
  f.seq++;f.tit.push({id:'T'+String(f.seq).padStart(6,'0'),origem:'manual',status:'aberto',tipo:'outros',comp:o.venc.slice(0,7),desc:o.desc,favorecido:o.favorecido,doc:onlyD(o.doc),valor:o.valor,venc:o.venc,forma:'cc',banco:onlyD(o.banco),ag:onlyD(o.ag),agDv:'',conta:onlyD(o.conta),contaDv:o.contaDv,tipoConta:'cc',pas:o.pas,partes:[{pas:o.pas||ctbRegra('pasForn'),valor:o.valor}]});
  const t=f.tit[f.tit.length-1];saveDB();closeModal();refresh({comp:t.comp});};

SC.bcoRem={view(p){const f=finDB(),cb=f.contas.find(c=>c.id===p.conta)||f.contas[0],comp=p.comp||DB.cfg.comp,tp=p.tipo||'sal';
  const cand=f.tit.filter(t=>t.status==='aberto'&&!t.guia&&(tp==='sal'?(t.tipo==='sal'||t.tipo==='resc')&&t.comp===comp:t.tipo==='outros'));
  const pre=cb?cnabGerar({conta:cb,tits:cand,dtPag:p.dt||quintoDiaUtil(comp),servico:tp==='sal'?'30':'20',segB:p.segB!=='0'}):{inclusos:[],pend:[],total:0};
  return ctbHead('Arquivos bancários (CNAB 240)','Remessa de pagamento de salários, rescisões e demais pagamentos por arquivo, e leitura do arquivo de retorno do banco.')+avisoHomolog+
  (!f.contas.length?`<div class="note err">Cadastre uma <a style="cursor:pointer;text-decoration:underline" data-act="nav" data-to="finContas">conta bancária da empresa</a> para gerar remessas.</div>`:'')+
  `<div class="card"><h2>Nova remessa</h2><div class="row"><div class="f"><label>Conta de débito</label><select id="rmConta">${f.contas.map(c=>`<option value="${c.id}" ${cb&&c.id===cb.id?'selected':''}>${esc(c.apelido)}</option>`).join('')}</select></div>
  <div class="f"><label>Tipo</label><select id="rmTipo"><option value="sal" ${tp==='sal'?'selected':''}>Folha: salários e rescisões</option><option value="out" ${tp==='out'?'selected':''}>Outros pagamentos (títulos avulsos)</option></select></div>
  <div class="f"><label>Competência</label><input type="month" id="rmComp" value="${comp}"></div><div class="f"><label>Data do pagamento</label><input type="date" id="rmDt" value="${p.dt||quintoDiaUtil(comp)}"></div>
  <label class="chk"><input type="checkbox" id="rmSegB" ${p.segB!=='0'?'checked':''}> Incluir Segmento B (CPF/CNPJ do favorecido)</label></div>
  <p class="sub">${pre.inclusos.length} pagamentos aptos · total R$ ${brl(pre.total)} · ${pre.pend.length} com pendência</p>
  ${pre.pend.length?`<div class="note warn"><b>Pendências (não entram no arquivo):</b><br>${pre.pend.map(x=>esc(x.t.favorecido)+' — '+esc(x.m.join('; '))).join('<br>')}</div>`:''}
  <div class="row"><button class="btn pri" data-act="rmGerar" ${pre.inclusos.length?'':'disabled'}>⬇ Gerar e baixar remessa</button></div></div>
  <div class="card"><h2>Retorno do banco</h2><div class="row"><div class="f"><label>Arquivo de retorno (.RET / .TXT)</label><input type="file" id="rtFile" accept=".ret,.txt,.rem,.cnab"></div><button class="btn pri" data-act="rtImp">Processar retorno</button></div>
  <p class="sub">O retorno é conciliado pelo número do título gravado no campo “nº do documento” (posições 74–93 do Segmento A). Ocorrência “00” baixa o título como pago e lança o pagamento na contabilidade; “BD” mantém o título em remessa (agendado); demais códigos devolvem o título para “em aberto” com o motivo informado pelo banco. Os códigos seguem a nota G059 do padrão FEBRABAN e podem variar por banco **.</p></div>
  <div class="card"><h2>Remessas geradas (${f.rem.length})</h2><div class="tw"><table class="t"><thead><tr><th>Nº</th><th>Gerada em</th><th>Pagamento</th><th>Arquivo</th><th class="r">Qtd.</th><th class="r">Total</th><th></th></tr></thead><tbody>${f.rem.slice().reverse().map(r=>`<tr><td>${r.n}</td><td>${esc(r.em)}</td><td>${fmtData(r.dt)}</td><td>${esc(r.nome)}</td><td class="r">${r.qtd}</td><td class="r">${brl(r.total)}</td><td class="r"><button class="btn sm" data-act="rmBaixar" data-id="${r.id}">Baixar de novo</button></td></tr>`).join('')||'<tr><td colspan="7" class="c" style="padding:16px;color:var(--mut)">Nenhuma remessa gerada.</td></tr>'}</tbody></table></div></div>`;},
  actions:()=>[],mount(){const ch=()=>refresh({conta:$('#rmConta')&&$('#rmConta').value,tipo:$('#rmTipo').value,comp:$('#rmComp').value,dt:$('#rmDt').value,segB:$('#rmSegB').checked?'1':'0'});['rmConta','rmTipo','rmComp','rmDt','rmSegB'].forEach(i=>{const e=$('#'+i);if(e)e.addEventListener('change',ch);});}};
ACT.rmGerar=()=>{const f=finDB(),p=NAV.cur.params,cb=f.contas.find(c=>c.id===($('#rmConta')||{}).value)||f.contas[0];if(!cb){toast('Cadastre a conta bancária.','err');return;}
  const comp=$('#rmComp').value,tp=$('#rmTipo').value,dt=$('#rmDt').value,segB=$('#rmSegB').checked;if(!dt){toast('Informe a data do pagamento.','err');return;}
  const cand=f.tit.filter(t=>t.status==='aberto'&&!t.guia&&(tp==='sal'?(t.tipo==='sal'||t.tipo==='resc')&&t.comp===comp:t.tipo==='outros'));
  try{const n=f.rem.length+1,r=cnabGerar({conta:cb,tits:cand,dtPag:dt,servico:tp==='sal'?'30':'20',segB,nsa:n});
    if(!r.texto){toast('Nenhum pagamento apto para a remessa.','err');return;}
    const nome='PAG_'+onlyD(DB.empresa.cnpj)+'_'+dt.replace(/-/g,'')+'_'+String(n).padStart(3,'0')+'.REM',id=uid('rm');
    r.inclusos.forEach(t=>{t.status='remessa';t.remId=id;});
    f.rem.push({id,n,em:new Date().toISOString().slice(0,16).replace('T',' '),dt,contaId:cb.id,nome,qtd:r.inclusos.length,total:r.total,tits:r.inclusos.map(t=>t.id),texto:r.texto});
    if(f.rem.length>60)f.rem.forEach((x,i)=>{if(i<f.rem.length-60)x.texto='';});
    saveDB();audit('Remessa CNAB 240',nome+' · '+r.inclusos.length+' pagamentos · R$ '+brl(r.total));baixar(nome,r.texto,'text/plain');toast('Remessa gerada com '+r.inclusos.length+' pagamentos. Homologue com o banco antes de transmitir.','ok');refresh();
  }catch(e){toast('Erro ao gerar a remessa: '+e.message,'err');}};
ACT.rmBaixar=el=>{const r=finDB().rem.find(x=>x.id===el.dataset.id);if(!r||!r.texto){toast('Conteúdo não mais armazenado; gere nova remessa.','err');return;}baixar(r.nome,r.texto,'text/plain');};
ACT.rtImp=async()=>{const fl=($('#rtFile')||{}).files&&$('#rtFile').files[0];if(!fl){toast('Selecione o arquivo de retorno.','err');return;}
  const reg=cnabRetorno(await fl.text()),f=finDB();if(!reg.length){toast('Nenhum registro de pagamento (Segmento A) encontrado no arquivo.','err');return;}
  let pg=0,ag=0,rj=0,nf=0;const cbs=f.contas;
  reg.forEach(x=>{const t=f.tit.find(y=>y.id===x.doc);if(!t){nf++;return;}
    if(x.st==='pago'){if(t.status!=='pago'){const rem=f.rem.find(r=>r.id===t.remId),cb=rem&&cbs.find(c=>c.id===rem.contaId);finBaixar(t,rem?rem.dt:hoje(),cb&&cb.contaCtb,'retorno bancário');pg++;}}
    else if(x.st==='agendado'){ag++;}
    else{t.status='aberto';t.remId=null;t.motivo='Retorno bancário: '+x.oc.map(c=>c+' '+(CNAB_OC[c]||'ocorrência não mapeada')).join('; ');rj++;}});
  saveDB();audit('Retorno CNAB',pg+' pagos, '+rj+' rejeitados');toast(pg+' pagos, '+ag+' agendados, '+rj+' rejeitados'+(nf?', '+nf+' não localizados':'')+'.',rj||nf?'err':'ok');refresh();};
