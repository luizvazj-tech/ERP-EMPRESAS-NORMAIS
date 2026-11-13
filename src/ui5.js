/* ===================== Estrutura (estabelecimentos x lotações x regime) ===================== */
function checarEstrutura(){const E=DB.empresa,o=[];const add=(n,t)=>o.push({n,t});
  if(!E){add('err','Empresa não cadastrada.');return o;}
  if(!E.regime)add('err','Regime tributário não informado na empresa.');else add('ok','Regime: '+regimeTxt(E)+' (classTrib '+classTribDe(E)+').');
  const ms=DB.estabs.filter(x=>x.tipoEstab==='matriz');
  if(ms.length===1)add('ok','Uma matriz cadastrada.');else add('err',ms.length?'Há mais de uma matriz.':'Nenhuma matriz cadastrada.');
  DB.estabs.forEach(s=>{if(s.tpInsc==='1'&&onlyD(s.nrInsc).slice(0,8)!==onlyD(E.cnpj).slice(0,8))add('err','Estabelecimento '+s.nome+': raiz do CNPJ diferente da do empregador.');
    if(ratIncide(E)&&![1,2,3].includes(Number(s.rat)))add('err','Estabelecimento '+s.nome+': grau de risco (RAT) deve ser 1, 2 ou 3.');
    if(!DB.empregados.some(e=>e.estab===s.id))add('warn','Estabelecimento '+s.nome+' sem empregados vinculados.');});
  DB.lotacoes.forEach(l=>{if(E.regime==='sn'&&String(l.codTercs)!=='0000')add('err','Lotação '+l.cod+': Simples Nacional exige terceiros 0000.');
    if(E.regime&&E.regime!=='sn'&&String(l.codTercs)==='0000')add('warn','Lotação '+l.cod+': terceiros 0000 em empresa de Presumido/Real — confira o FPAS.');
    if(E.regime==='sn'&&E.anexo==='misto'&&!l.atvSimples)add('err','Lotação '+l.cod+': indique se a atividade é de CPP substituída ou não (Simples misto).');
    if(!DB.empregados.some(e=>e.lotacao===l.id))add('warn','Lotação '+l.cod+' sem empregados vinculados.');});
  if(!DB.lotacoes.length)add('err','Nenhuma lotação cadastrada: o S-1200 exige lotação.');
  const sem=DB.empregados.filter(e=>!byId(DB.estabs,e.estab)||!byId(DB.lotacoes,e.lotacao));
  if(sem.length)add('err',sem.length+' empregado(s) sem estabelecimento ou lotação válidos: '+sem.map(e=>e.nome).join(', ')+'.');
  if(E.regime==='sn'&&E.cprb)add('err','CPRB é incompatível com o Simples Nacional.');
  if(E.regime&&E.regime!=='sn'&&E.cprb&&DB.lotacoes.every(l=>l.cprb==='nao'))add('warn','CPRB marcada na empresa, mas nenhuma lotação é desonerada.');
  if(!o.some(x=>x.n==='err'))add('ok','Nenhuma inconsistência impeditiva encontrada.');
  return o;}
SC.estrutura={view(){const E=DB.empresa,comp=compAtual();const ck=checarEstrutura();const C={ok:['OK','ok'],warn:['Atenção','warn'],err:['Corrigir','err']};
  return `<h1>Mapa da estrutura e regras de tributação</h1><p class="sub">Como o regime da empresa, cada estabelecimento e cada lotação se combinam no cálculo e no eSocial.</p>${exigeEmpresa()}
  <div class="card"><h2>Quem define o quê</h2><div class="tw"><table class="t"><thead><tr><th>Nível</th><th>Define</th><th>Eventos</th></tr></thead><tbody>
  <tr><td><b>Empresa</b></td><td>Regime (Simples, Presumido, Real), enquadramento da CPP, CPRB, classTrib e indDesFolha.</td><td>S-1000</td></tr>
  <tr><td><b>Estabelecimento</b></td><td>CNAE preponderante, grau de risco (RAT) e FAP; local de trabalho do empregado.</td><td>S-1005, S-2200</td></tr>
  <tr><td><b>Lotação tributária</b></td><td>FPAS, código de terceiros, atividade substituída (Simples misto) e atividade desonerada (CPRB).</td><td>S-1020, S-1200</td></tr>
  <tr><td><b>Empregado</b></td><td>Vincula-se a um estabelecimento e a uma lotação; cada folha usa as regras da combinação.</td><td>S-2200, S-1200</td></tr></tbody></table></div></div>
  <div class="card"><h2>Regime da empresa</h2><p style="margin:0 0 8px"><b>${esc(regimeTxt(E))}</b></p>${E?regraPanel(E):''}</div>
  <div class="card"><h2>Conferência de consistência</h2>${ck.map(x=>`<p style="margin:4px 0">${badge(C[x.n][0],C[x.n][1])} ${esc(x.t)}</p>`).join('')}</div>
  <div class="card"><div class="row sp"><h2>Estabelecimentos</h2><button class="btn sm" data-act="nav" data-to="estabs">Cadastrar / editar</button></div><div class="tw"><table class="t"><thead><tr><th>Nome</th><th>Natureza</th><th>Inscrição</th><th>CNAE</th><th>RAT×FAP</th><th class="c">Empregados</th><th>S-1005</th></tr></thead><tbody>
  ${DB.estabs.map(s=>`<tr><td>${esc(s.nome)}</td><td>${TPEST[s.tipoEstab]||'—'}</td><td>${s.tpInsc==1?fmtCNPJ(s.nrInsc):esc(s.nrInsc)}</td><td>${esc(s.cnae)}</td><td>${ratIncide(E)?esc(s.rat)+' × '+esc(s.fap):'no DAS'}</td><td class="c">${DB.empregados.filter(e=>e.estab===s.id).length}</td><td>${stBadge(ultEv('S-1005',x=>x.gen.args.id===s.id))}</td></tr>`).join('')||'<tr><td colspan="7" class="c" style="color:var(--mut)">Nenhum estabelecimento.</td></tr>'}</tbody></table></div></div>
  <div class="card"><div class="row sp"><h2>Lotações tributárias</h2><button class="btn sm" data-act="nav" data-to="lotacoes">Cadastrar / editar</button></div><div class="tw"><table class="t"><thead><tr><th>Lotação</th><th>FPAS / terceiros</th><th>Regra aplicada nesta lotação</th><th class="c">Empregados</th><th>S-1020</th></tr></thead><tbody>
  ${DB.lotacoes.map(l=>{const R=regraLot(E,l,comp,DB.params);return `<tr><td><b>${esc(l.cod)}</b> ${esc(l.desc)}</td><td>${esc(l.fpas)} / ${esc(l.codTercs)}</td><td style="font-size:12.5px">${esc(R.nota)}</td><td class="c">${DB.empregados.filter(e=>e.lotacao===l.id).length}</td><td>${stBadge(ultEv('S-1020',x=>x.gen.args.id===l.id))}</td></tr>`;}).join('')||'<tr><td colspan="5" class="c" style="color:var(--mut)">Nenhuma lotação.</td></tr>'}</tbody></table></div></div>`;},
  actions:()=>[{label:'Estabelecimentos',act:'nav',cls:'',arg:''}]};
SC.estrutura.actions=()=>[];

/* ===================== Férias ===================== */
const empOpts=(only)=>[['','Selecione o empregado…']].concat(DB.empregados.filter(e=>e.situacao!=='desligado').map(e=>[e.id,e.mat+' – '+e.nome]));
const addDias=(iso,n)=>{const d=new Date(iso+'T12:00:00');d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);};
SC.ferias={view(p){const L=(DB.ferias||[]).slice().reverse();
  return `<h1>Férias</h1><p class="sub">Programação, cálculo (CLT, arts. 129 a 145) e eSocial S-2230 (motivo 15). O valor é pago na folha da competência de pagamento; os dias gozados saem do salário do mês do gozo.</p>${exigeEmpresa()}
  <div class="card" data-form id="f"><h2>Nova programação de férias</h2><div class="grid">${F('Empregado','empId','',{t:'select',opts:empOpts(),req:1,w:4})+F('Período aquisitivo — início','perAqIni','',{t:'date',req:1,w:2})+F('Período aquisitivo — fim','perAqFim','',{t:'date',req:1,w:2})+F('Faltas injustificadas no período','faltas',0,{w:2,hint:'Define os dias de direito (art. 130)'})+F('Média de variáveis (R$)','media','',{t:'money',w:2,hint:'Horas extras, comissões etc.'})
  +F('Início do gozo','ini','',{t:'date',req:1,w:2})+F('Dias de gozo','diasGozo',30,{req:1,w:2})+F('Dias de abono pecuniário','diasAbono',0,{w:2,hint:'Até 1/3 (art. 143)'})+F('Competência do pagamento','compPgto','',{t:'month',req:1,w:3,hint:'Até 2 dias antes do gozo (art. 145)'})}</div>
  <p class="sub" style="margin:8px 0 0">O período aquisitivo é preenchido automaticamente ao escolher o empregado (ano da admissão). Fracionamento: até 3 períodos, um com no mínimo 14 dias e os demais com no mínimo 5 (art. 134, §1º).</p></div>
  <div class="card"><h2>Férias programadas (${L.length})</h2><div class="tw"><table class="t"><thead><tr><th>Empregado</th><th>Gozo</th><th class="r">Férias + 1/3</th><th class="r">Abono + 1/3</th><th>Pagamento</th><th>S-2230 início</th><th>S-2230 término</th><th></th></tr></thead><tbody>
  ${L.map(f=>{const e=byId(DB.empregados,f.empId)||{};const c=f.calc;return `<tr><td>${esc(e.nome||'—')}</td><td>${fmtData(f.ini)} a ${fmtData(f.fim)} (${f.diasGozo} d)</td><td class="r">${brl(c.ferias+c.terco)}</td><td class="r">${c.abono?brl(c.abono+c.abonoTerco):'—'}</td><td>${compLabel(f.compPgto)}</td><td>${stBadge(DB.eventos.find(x=>x.id===f.evId))}</td><td>${stBadge(DB.eventos.find(x=>x.id===f.evFimId))}</td><td class="r"><button class="btn sm send" data-act="ferSend" data-id="${f.id}">Enviar início</button> <button class="btn sm send" data-act="ferFim" data-id="${f.id}">Enviar término</button> <button class="btn sm danger" data-act="ferDel" data-id="${f.id}">Excluir</button></td></tr>`;}).join('')||'<tr><td colspan="8" class="c" style="padding:16px;color:var(--mut)">Nenhuma férias programada.</td></tr>'}</tbody></table></div></div>`;},
  mount(){const f=$('#f');if(!f)return;f.querySelector('[name=empId]').addEventListener('change',e=>{const emp=byId(DB.empregados,e.target.value);if(!emp||!emp.admissao)return;const hoje_=hoje();let ini=emp.admissao;while(addDias(ini,365)<=hoje_&&addDias(ini,365)<hoje_)ini=addDias(ini,365);
    f.querySelector('[name=perAqIni]').value=ini;f.querySelector('[name=perAqFim]').value=addDias(ini,364);DIRTY=true;});
    f.querySelector('[name=ini]').addEventListener('change',e=>{const c=f.querySelector('[name=compPgto]');if(!c.value&&e.target.value)c.value=e.target.value.slice(0,7);});},
  actions:()=>[{label:'💾 Calcular e salvar férias',act:'ferSave',cls:'pri',key:'save'},{label:'Salvar e enviar S-2230',act:'ferSave',cls:'send',key:'send',arg:'1'}]};
ACT.ferSave=async el=>{const f=$('#f'),mis=faltando(f);if(mis.length){toast('Preencha: '+mis.join(', '),'err');return;}const o=readForm(f),e=byId(DB.empregados,o.empId);
  o.diasGozo=Number(o.diasGozo)||0;o.diasAbono=Number(o.diasAbono)||0;o.faltas=Number(o.faltas)||0;o.fim=addDias(o.ini,o.diasGozo-1);
  const m=validarFerias(e,o,DB.params),erros=m.filter(x=>!x.startsWith('AVISO')),avs=m.filter(x=>x.startsWith('AVISO'));
  if(erros.length){modal('<div class="note err">Corrija antes de salvar:</div>'+erros.map(x=>'<p>• '+esc(x)+'</p>').join('')+'<div class="row" style="justify-content:flex-end"><button class="btn" data-act="closeModal">Fechar</button></div>',{title:'Férias — validação'});return;}
  const rec=Object.assign({id:uid('f')},o);rec.calc=calcFerias(e,rec,DB.params);(DB.ferias=DB.ferias||[]).push(rec);
  const c=DB.comps[o.compPgto];if(c&&c.status==='fechada')toast('Atenção: a competência de pagamento está fechada. Reabra e recalcule para incluir as férias.','err');else if(c&&c.status==='calculada')toast('Recalcule a folha de '+compLabel(o.compPgto)+' para incluir as férias.');
  saveDB();DIRTY=false;if(avs.length)toast(avs[0].replace('AVISO: ',''),'err');toast('Férias calculadas: '+brl(rec.calc.bruto)+' (bruto).','ok');
  if(el.dataset.arg==='1')await ACT.ferSend({dataset:{id:rec.id}});refresh();};
ACT.ferSend=async el=>{const f=DB.ferias.find(x=>x.id===el.dataset.id);if(!f)return;const ev=criarEvento('S-2230',{id:f.empId,mov:{data:f.ini,motivo:'15',perAqIni:f.perAqIni,perAqFim:f.perAqFim}});f.evId=ev.id;saveDB();const r=await enviarEventos([ev]);resumoEnvio(r,[ev]);refresh();};
ACT.ferFim=async el=>{const f=DB.ferias.find(x=>x.id===el.dataset.id);if(!f)return;const ev=criarEvento('S-2230',{id:f.empId,mov:{data:f.fim,fim:f.fim,motivo:'15'}});f.evFimId=ev.id;saveDB();const r=await enviarEventos([ev]);resumoEnvio(r,[ev]);refresh();};
ACT.ferDel=el=>modalConfirm('Excluir esta programação de férias? Eventos já enviados ao eSocial não são desfeitos.',()=>{DB.ferias=DB.ferias.filter(x=>x.id!==el.dataset.id);saveDB();refresh();},{yes:'Excluir'});

/* ===================== 13º salário ===================== */
SC.d13={view(p){const ano=p.ano||String(new Date().getFullYear()),p1=p.p1||ano+'-11',p2=p.p2||ano+'-12';
  const elig=DB.empregados.filter(e=>e.admissao&&e.admissao.slice(0,4)<=ano&&(!e.desligamento||e.desligamento.slice(0,4)>=ano)&&e.situacao!=='desligado');
  return `<h1>13º salário</h1><p class="sub">Lei 4.090/62 e Lei 4.749/65. A 1ª parcela (50%) não sofre INSS nem IRRF; na 2ª parcela incidem INSS e IRRF sobre o valor total, separados do salário do mês, descontada a 1ª parcela.</p>${exigeEmpresa()}
  <div class="card" data-form id="f"><div class="grid">${F('Ano-base','ano',ano,{w:2})+F('Competência da 1ª parcela','p1',p1,{t:'month',w:3,hint:'Entre fevereiro e novembro (Lei 4.749/65, art. 2º)'})+F('Competência da 2ª parcela','p2',p2,{t:'month',w:3,hint:'Até 20 de dezembro (art. 1º)'})}</div></div>
  <div class="card"><h2>Empregados (${elig.length})</h2><div class="tw"><table class="t"><thead><tr><th>Empregado</th><th class="c">Avos</th><th class="r">Média variáveis R$</th><th class="r">13º bruto</th><th class="r">1ª parcela</th><th class="r">INSS</th><th class="r">IRRF</th><th class="r">Líquido 2ª</th><th>Competências</th></tr></thead><tbody>
  ${elig.map(e=>{const d=(DB.decimo||{})[ano+'|'+e.id];return `<tr><td>${esc(e.nome)}</td><td class="c">${d?d.avos:'—'}</td><td class="r"><input data-m="${e.id}" value="${d?brIn(num(d.media)):''}" style="width:90px;text-align:right;padding:4px;border:1px solid #c7d0d9;border-radius:5px"></td><td class="r">${d?brl(d.bruto):'—'}</td><td class="r">${d?brl(d.p1.valor):'—'}</td><td class="r">${d?brl(d.inss13):'—'}</td><td class="r">${d?brl(d.irrf13):'—'}</td><td class="r">${d?brl(d.liq2):'—'}</td><td>${d?compLabel(d.p1.comp)+' / '+compLabel(d.p2.comp):'—'}</td></tr>`;}).join('')||'<tr><td colspan="9" class="c" style="padding:16px;color:var(--mut)">Nenhum empregado elegível no ano.</td></tr>'}</tbody></table></div>
  <div class="note info" style="margin-top:10px">O IRRF do 13º é calculado sobre o valor total, com dedução do INSS do 13º e dependentes (ou desconto simplificado, se mais vantajoso), <b>com o redutor da Lei 15.270/2025</b>, que também se aplica ao 13º (Lei 9.250/1995, art. 3º-A, §3º, e IN RFB 2.299/2025) **. A competência de pagamento deve ser recalculada na aba Cálculo da folha.</div></div>`;},
  mount(){const f=$('#f');['ano','p1','p2'].forEach(n=>f.querySelector('[name='+n+']').addEventListener('change',e=>{const o=readForm(f);const np={ano:o.ano,p1:o.p1,p2:o.p2};if(n==='ano'){np.p1=o.ano+'-11';np.p2=o.ano+'-12';}DIRTY=false;refresh(np);}));},
  actions:()=>[{label:'💾 Calcular 13º do ano',act:'d13Calc',cls:'pri',key:'save'},{label:'Ir para o cálculo da folha',act:'nav',cls:'',arg:'',key:''}]};
SC.d13.actions=()=>[{label:'💾 Calcular 13º do ano',act:'d13Calc',cls:'pri',key:'save'}];
ACT.d13Calc=()=>{const f=$('#f'),o=readForm(f),ano=o.ano;if(!/^\d{4}$/.test(ano)||!o.p1||!o.p2){toast('Informe ano e competências.','err');return;}
  if(o.p1>o.p2){toast('A 1ª parcela não pode ser posterior à 2ª.','err');return;}
  if(o.p2>ano+'-12'||o.p2.slice(0,4)!==ano){toast('A 2ª parcela deve ser paga até dezembro do ano-base.','err');return;}
  const av=[];if(o.p1<ano+'-02'||o.p1>ano+'-11')av.push('A 1ª parcela deve ser paga entre fevereiro e novembro (Lei 4.749/65, art. 2º).');
  let n=0;const med={};$$('[data-m]').forEach(i=>med[i.dataset.m]=num(i.value));
  DB.empregados.filter(e=>e.admissao&&e.admissao.slice(0,4)<=ano&&(!e.desligamento||e.desligamento.slice(0,4)>=ano)&&e.situacao!=='desligado').forEach(e=>{const mm=med[e.id]===undefined||isNaN(med[e.id])||$('[data-m="'+e.id+'"]').value.trim()===''?mediaVariaveis(e,o.p2,DB.params):med[e.id];med[e.id]=mm;const c=calc13(e,Number(ano),DB.params,mm);if(c.avos<=0)return;
    (DB.decimo=DB.decimo||{})[ano+'|'+e.id]=Object.assign(c,{ano,empId:e.id,media:med[e.id]||0,p1:{comp:o.p1,valor:c.p1},p2:{comp:o.p2}});n++;});
  saveDB();DIRTY=false;toast(n+' empregado(s) calculado(s). Recalcule a folha de '+compLabel(o.p1)+' e '+compLabel(o.p2)+'.','ok');if(av.length)toast(av[0],'err');refresh({ano,p1:o.p1,p2:o.p2});};

/* ===================== Rescisão ===================== */
SC.resc={view(p){const sel=p.empId||'';const e=byId(DB.empregados,sel);const rs=e&&DB.rescisoes[e.id];
  const ativos=DB.empregados.filter(x=>x.situacao!=='desligado'||(DB.rescisoes||{})[x.id]);
  const dat=p.data||hoje();let prev='';
  if(e&&p.prev){const tmp=Object.assign({},e,{desligamento:dat});const r={motivo:p.motivo,aviso:p.aviso,ferVencPer:p.ferVencPer,ferDobraPer:p.ferDobraPer,saldoFgts:p.saldoFgts,media:(p.media===''||p.media==null)?mediaVariaveis(e,dat.slice(0,7),DB.params):p.media};const v=calcRescisaoVerbas(tmp,r,DB.params);
    const sd=Number(dat.slice(8,10));const saldo=r2(num(e.salario)/30*Math.min(30,sd));
    prev=`<div class="card"><h2>Prévia das verbas — ${esc(e.nome)}</h2><div class="tw"><table class="t"><thead><tr><th>Verba</th><th>Referência</th><th class="r">Valor</th></tr></thead><tbody>
    <tr><td>Saldo de salário (estimado)</td><td>${Math.min(30,sd)} d</td><td class="r">${brl(saldo)}</td></tr>
    ${v.aviso?`<tr><td>Aviso prévio indenizado</td><td>${v.avisoDias} d</td><td class="r">${brl(v.aviso)}</td></tr>`:''}${v.d13?`<tr><td>13º salário proporcional</td><td>${v.avos13}/12</td><td class="r">${brl(v.d13)}</td></tr>`:''}
    ${v.ferVenc?`<tr><td>Férias vencidas + 1/3</td><td>${p.ferVencPer} per</td><td class="r">${brl(v.ferVenc+v.ferVencTerco)}</td></tr>`:''}${v.ferProp?`<tr><td>Férias proporcionais + 1/3</td><td>${v.avosFer}/12</td><td class="r">${brl(v.ferProp+v.ferPropTerco)}</td></tr>`:''}
    ${v.avisoDesc?`<tr><td>(−) Aviso prévio não cumprido</td><td></td><td class="r">${brl(v.avisoDesc)}</td></tr>`:''}${v.d13?`<tr><td>(−) INSS e IRRF sobre o 13º</td><td></td><td class="r">${brl(v.inss13+v.irrf13)}</td></tr>`:''}
    ${v.multaPct?`<tr><td>Multa do FGTS ${v.multaPct}% (informativa — paga via FGTS Digital)</td><td></td><td class="r">${brl(v.multaFgts)}</td></tr>`:''}</tbody></table></div>${v.notas.map(n=>`<p class="sub" style="margin:6px 0 0">• ${esc(n)}</p>`).join('')}<p class="sub">INSS e IRRF do saldo de salário são calculados na folha ao registrar a rescisão.</p></div>`;}
  return `<h1>Rescisão do contrato (S-2299)</h1><p class="sub">Calcula as verbas rescisórias, registra o desligamento, inclui os valores na folha do mês e gera o S-2299 com as verbas. Motivos suportados no cálculo automático: ${Object.keys(MOTIVOS_RESC).join(', ')}.</p>${exigeEmpresa()}
  <div class="card" data-form id="f"><div class="grid">${F('Empregado','empId',sel,{t:'select',opts:[['','Selecione…']].concat(ativos.map(x=>[x.id,x.mat+' – '+x.nome])),req:1,w:4})+F('Data do desligamento (último dia trabalhado)','data',dat,{t:'date',req:1,w:3})+F('Motivo (Tabela 19)','motivo',p.motivo||'02',{t:'select',opts:Object.entries(MOTIVOS_RESC).map(([k,v])=>[k,k+' – '+v]),w:5})
  +F('Aviso prévio','aviso',p.aviso||'indenizado',{t:'select',opts:Object.entries(AVISOS),w:4})+F('Períodos de férias vencidas','ferVencPer',p.ferVencPer||0,{w:2,hint:'Completos e não gozados'})+F('Dos quais em dobro','ferDobraPer',p.ferDobraPer||0,{w:2,hint:'Fora do prazo concessivo (CLT, art. 137) **'})+F('Média de variáveis (R$)','media',p.media||'',{t:'money',w:2,hint:'Em branco = média automática dos 12 meses lançados (CLT, art. 142) **'})+F('Saldo do FGTS (R$) p/ multa','saldoFgts',p.saldoFgts||'',{t:'money',w:4,hint:'Extrato do FGTS'})}</div>
  ${rs?`<div class="note ok" style="margin-top:10px">Rescisão registrada em ${fmtData(e.desligamento)} — motivo ${esc(rs.motivo)}. Veja o demonstrativo na folha da competência.</div>`:''}</div>${prev}`;},
  mount(p){const f=$('#f');if(!f)return;f.querySelector('[name=empId]').addEventListener('change',e=>{DIRTY=false;refresh({empId:e.target.value,prev:false});});},
  actions:(p)=>{const a=[{label:'Calcular prévia',act:'rescPrev',cls:''},{label:'Registrar rescisão',act:'rescSave',cls:'pri',key:'save',arg:'0'},{label:'Registrar e enviar S-2299',act:'rescSave',cls:'send',key:'send',arg:'1'}];if(p.empId&&DB.rescisoes[p.empId])a.unshift({label:'Imprimir demonstrativo',act:'rescPrint'},{label:'Desfazer rescisão',act:'rescUndo',cls:'danger'});return a;}};
ACT.rescPrev=()=>{const f=$('#f'),mis=faltando(f);if(mis.length){toast('Preencha: '+mis.join(', '),'err');return;}const o=readForm(f);o.prev=true;DIRTY=false;refresh(o);};
ACT.rescSave=async el=>{const f=$('#f'),mis=faltando(f);if(mis.length){toast('Preencha: '+mis.join(', '),'err');return;}const o=readForm(f),e=byId(DB.empregados,o.empId);
  if(!MOTIVOS_RESC[o.motivo]){toast('Motivo não suportado no cálculo automático.','err');return;}
  if(e.admissao&&o.data<e.admissao){toast('Data do desligamento anterior à admissão.','err');return;}
  const comp=o.data.slice(0,7),c=DB.comps[comp];if(c&&c.status==='fechada'){toast('A competência '+compLabel(comp)+' está fechada. Reabra-a para registrar a rescisão.','err');return;}
  if(DB.rescisoes[e.id]){toast('Já existe rescisão registrada para este empregado. Desfaça-a antes.','err');return;}
  e.desligamento=o.data;e.situacao='desligado';DB.rescisoes[e.id]={empId:e.id,motivo:o.motivo,aviso:o.aviso,ferVencPer:o.ferVencPer,ferDobraPer:o.ferDobraPer,saldoFgts:o.saldoFgts,media:(o.media===''||o.media==null)?mediaVariaveis(e,o.data.slice(0,7),DB.params):o.media,data:o.data};
  const mov={id:uid('m'),tipo:'S-2299',empId:e.id,data:o.data,det:'Motivo '+o.motivo+' · '+MOTIVOS_RESC[o.motivo],motivo:o.motivo};DB.movs.push(mov);
  const cc=DB.comps[comp]=DB.comps[comp]||{status:'aberta',lanc:{},res:{}};calcFolha(comp);
  const ev=criarEvento('S-2299',{id:e.id,mov});mov.evId=ev.id;saveDB();DIRTY=false;toast('Rescisão registrada e folha de '+compLabel(comp)+' recalculada.','ok');
  if(el.dataset.arg==='1'){const r=await enviarEventos([ev]);resumoEnvio(r,[ev]);}refresh({empId:e.id,prev:false});};
ACT.rescUndo=()=>{const id=NAV.cur.params.empId,e=byId(DB.empregados,id);if(!e)return;const mv=DB.movs.find(m=>m.tipo==='S-2299'&&m.empId===id),ev=mv&&DB.eventos.find(x=>x.id===mv.evId);
  if(ev&&ev.status==='processado'){toast('O S-2299 já foi processado no eSocial: use a retificação/exclusão (S-3000) na biblioteca.','err');return;}
  modalConfirm('Desfazer a rescisão de '+esc(e.nome)+'? O empregado volta a ativo e o evento ainda não processado é removido.',()=>{const comp=e.desligamento.slice(0,7);if(ev)DB.eventos=DB.eventos.filter(x=>x.id!==ev.id);DB.movs=DB.movs.filter(m=>m!==mv);delete DB.rescisoes[id];e.desligamento='';e.situacao='ativo';if(DB.comps[comp]&&DB.comps[comp].status!=='fechada')calcFolha(comp);saveDB();toast('Rescisão desfeita.','ok');refresh();},{yes:'Desfazer'});};
ACT.rescPrint=()=>{const id=NAV.cur.params.empId,e=byId(DB.empregados,id);if(!e)return;const comp=e.desligamento.slice(0,7);if(!DB.comps[comp]||!DB.comps[comp].res[id]){toast('Calcule a folha da competência.','err');return;}
  $('#printarea').innerHTML=holeriteHTML(e,comp);document.body.classList.add('printing');try{window.print();}catch(x){toast('Impressão indisponível neste ambiente.','err');}setTimeout(()=>{document.body.classList.remove('printing');$('#printarea').innerHTML='';},800);};

/* ===================== Relatórios e guias ===================== */
SC.relat={view(p){const comp=compSel(p),c=DB.comps[comp];const R=c&&c.status!=='aberta'?resumoEstrutura(comp):null;const T=totaisComp(comp);const E=DB.empresa||{};const VG=vencimentosGuias(comp,DB.params),brDate=fmtData;
  const tab=(grp,nome,mapa)=>{const keys=Object.keys(R[grp]);return `<div class="card"><h2>Por ${nome}</h2><div class="tw"><table class="t"><thead><tr><th>${nome[0].toUpperCase()+nome.slice(1)}</th><th class="c">Empregados</th><th class="r">Base prev.</th><th class="r">INSS seg.</th><th class="r">IRRF</th><th class="r">FGTS</th><th class="r">CPP</th><th class="r">RAT</th><th class="r">Terceiros</th></tr></thead><tbody>${keys.map(k=>{const o=R[grp][k];return `<tr><td>${esc(mapa(k))}</td><td class="c">${o.n}</td><td class="r">${brl(o.base)}</td><td class="r">${brl(o.inss)}</td><td class="r">${brl(o.irrf)}</td><td class="r">${brl(o.fgts)}</td><td class="r">${brl(o.pat)}</td><td class="r">${brl(o.rat)}</td><td class="r">${brl(o.terc)}</td></tr>`;}).join('')}</tbody></table></div></div>`;};
  return `<h1>Relatórios e guias — ${compLabel(comp)}</h1><p class="sub">Totais por estabelecimento e por lotação, e o resumo do que deve ser recolhido, conforme o regime (${esc(regimeTxt(DB.empresa))}).</p>${exigeEmpresa()}${compBar(comp)}
  ${R?`<div class="card"><h2>Resumo dos recolhimentos e vencimentos</h2><div class="tw"><table class="t"><thead><tr><th>Recolhimento</th><th class="r">Valor</th><th>Onde / como</th></tr></thead><tbody>
  <tr><td>INSS dos empregados</td><td class="r">${brl(T.inss)}</td><td>DCTFWeb (DARF numerado) — apurado pelo S-1200; vence em ${brDate(VG.inss)} **</td></tr>
  <tr><td>CPP patronal + RAT + terceiros</td><td class="r">${brl(T.pat+T.rat+T.terc)}</td><td>${E.regime==='sn'?(E.anexo==='std'?'Já incluídos no DAS (PGDAS-D); nada na DCTFWeb':'Somente lotações de CPP não substituída, na DCTFWeb'):'DCTFWeb (DARF numerado)'}</td></tr>
  <tr><td>IRRF sobre rendimentos do trabalho</td><td class="r">${brl(T.irrf)}</td><td>DCTFWeb — código de receita 0561 **</td></tr>
  <tr><td>FGTS</td><td class="r">${brl(T.fgts)}</td><td>FGTS Digital, vence em ${brDate(VG.fgts)} (Lei 8.036/90, art. 15; regra de ${VG.regra==='prorroga'?'prorrogação':'antecipação'} para dia útil, feriados móveis e locais não considerados) **</td></tr>
  <tr><td>Salário-família (compensável)</td><td class="r">${brl(T.sf)}</td><td>Abatido das contribuições previdenciárias (Lei 8.213/91, art. 68)</td></tr></tbody></table></div></div>
  ${tab('estab','estabelecimento',k=>(byId(DB.estabs,k)||{nome:k}).nome)}${tab('lot','lotação',k=>{const l=byId(DB.lotacoes,k);return l?l.cod+' – '+l.desc:k;})}`:'<div class="note">Calcule a folha da competência para ver os relatórios.</div>'}`;},
  mount(){bindComp();},
  actions:()=>[{label:'Imprimir',act:'relPrint'}]};
ACT.relPrint=()=>{$('#printarea').innerHTML='<div style="padding:12px">'+$('#main').innerHTML+'</div>';document.body.classList.add('printing');try{window.print();}catch(e){toast('Impressão indisponível neste ambiente.','err');}setTimeout(()=>{document.body.classList.remove('printing');$('#printarea').innerHTML='';},800);};
