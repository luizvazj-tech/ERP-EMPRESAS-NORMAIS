
/* ===================== LANÇAMENTOS ===================== */
const proxMes=(c,d)=>{const [a,m]=c.split('-').map(Number);const n=new Date(a,m,1);return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');};
const compCtx=c=>DB.comps[c]=DB.comps[c]||{status:'aberta',lanc:{},res:{}};
const statusComp={aberta:['Aberta','gray'],calculada:['Calculada','blue'],fechada:['Fechada','ok']};
const compBar=(comp)=>`<div class="row" style="margin-bottom:12px"><b>Competência:</b>${compInput(comp)}${badge(statusComp[(DB.comps[comp]||{status:'aberta'}).status][0],statusComp[(DB.comps[comp]||{status:'aberta'}).status][1])}</div>`;
function bindComp(){const s=$('#compSel');s&&s.addEventListener('change',()=>{if(!s.value)return;DB.cfg.comp=s.value;saveDB();DIRTY=false;refresh({comp:s.value});});}
const compSel=p=>p.comp||DB.cfg.comp;
SC.lanc={view(p){const comp=compSel(p),c=DB.comps[comp]||{},fech=c.status==='fechada';const emps=DB.empregados.filter(e=>empAtivoNaComp(e,comp));
  return `<h1>Lançamentos do mês</h1><p class="sub">Eventos variáveis (horas extras, faltas, comissões, descontos) e parâmetros da competência.</p>${exigeEmpresa()}${compBar(comp)}
  ${fech?'<div class="note">Competência fechada: reabra a folha para alterar os lançamentos.</div>':''}
  <div data-form id="f"><div class="card"><h2>Parâmetros da competência</h2><div class="grid">${F('Dias úteis (seg–sáb, sem feriados)','diasUteis',c.diasUteis!=null?c.diasUteis:'',{t:'number',w:3,hint:'Para o DSR sobre horas extras'})+F('Domingos e feriados','domFer',c.domFer!=null?c.domFer:'',{t:'number',w:3})+F('Data de pagamento','dtPgto',c.dtPgto||proxMes(comp,5),{t:'date',w:3,req:1,hint:'Usada no S-1210'})}</div></div>
  <div class="card"><h2>Lançamentos por empregado</h2><div class="tw"><table class="t mat"><thead><tr><th>Mat.</th><th>Empregado</th>${LANC_CAMPOS.map(x=>`<th class="r">${x[1]}</th>`).join('')}</tr></thead><tbody>
  ${emps.map(e=>{const l=(c.lanc||{})[e.id]||{};return `<tr><td>${esc(e.mat)}</td><td>${esc(e.nome)}</td>${LANC_CAMPOS.map(([k])=>`<td class="r"><input data-e="${e.id}" data-k="${k}" value="${esc(l[k]||'')}" ${fech?'disabled':''}></td>`).join('')}</tr>`;}).join('')||'<tr><td colspan="12" class="c" style="padding:18px;color:var(--mut)">Nenhum empregado ativo nesta competência.</td></tr>'}
  </tbody></table></div><p class="sub" style="margin:8px 0 0">Horas e dias em decimal (ex.: 10 ou 7,5). Salário, adicionais, salário-família, INSS, IRRF, FGTS e vale-transporte são calculados automaticamente a partir do cadastro.</p></div></div>`;},
  mount(){bindComp();},
  actions:p=>[{label:'💾 Salvar lançamentos',act:'lancSave',cls:'pri',key:'save'},{label:'Calcular folha →',act:'lancCalc',cls:'send',key:'send'}]};
function lancSalvar(){const comp=compSel(NAV.cur.params),c=compCtx(comp);if(c.status==='fechada'){toast('Competência fechada.','err');return false;}
  const f=readForm($('#f'));if(!f.dtPgto){toast('Informe a data de pagamento.','err');return false;}
  c.diasUteis=f.diasUteis;c.domFer=f.domFer;c.dtPgto=f.dtPgto;c.lanc={};
  $$('#f input[data-e]').forEach(i=>{if(i.value.trim()){(c.lanc[i.dataset.e]=c.lanc[i.dataset.e]||{})[i.dataset.k]=i.value.trim();}});
  c.status='aberta';saveDB();DIRTY=false;return true;}
ACT.lancSave=()=>{if(lancSalvar()){toast('Lançamentos salvos. Recalcule a folha.','ok');refresh();}};
ACT.lancCalc=()=>{if(lancSalvar())go('folha',{comp:compSel(NAV.cur.params),calc:true});};

/* ===================== FOLHA ===================== */
function detalheCalc(empId,comp){const e=byId(DB.empregados,empId),r=DB.comps[comp].res[empId],I=r.irrfInfo;
  modal(`<table class="t"><thead><tr><th>Cód.</th><th>Descrição</th><th>Ref.</th><th class="r">Vencimentos</th><th class="r">Descontos</th></tr></thead><tbody>${r.itens.map(i=>`<tr><td>${i.cod}</td><td>${esc(i.desc)}</td><td>${esc(i.ref)}</td><td class="r">${i.tp===1?brl(i.valor):''}</td><td class="r">${i.tp===2?brl(i.valor):''}</td></tr>`).join('')}</tbody><tfoot><tr><th colspan="3">Totais</th><th class="r">${brl(r.totProv)}</th><th class="r">${brl(r.totDesc)}</th></tr></tfoot></table>
  <p><b>Líquido: R$ ${brl(r.liquido)}</b></p><div class="note info"><b>Memória de cálculo</b><br>Base INSS: R$ ${brl(r.baseCP)} · INSS: R$ ${brl(r.inss)}<br>Base IRRF (${I.simplificado?'desconto simplificado':'deduções legais'}): R$ ${brl(I.base)} · imposto pela tabela: R$ ${brl(I.imposto)} · redução Lei 15.270/2025: R$ ${brl(I.reducao)} · <b>IRRF: R$ ${brl(r.irrf)}</b><br>Base FGTS: R$ ${brl(r.baseFGTS)} · FGTS (${r.aliqFgts}%): R$ ${brl(r.fgts)} (encargo do empregador, não descontado)</div>`,{title:'Cálculo — '+e.nome+' — '+compLabel(comp),wide:true});}
SC.folha={view(p){const comp=compSel(p),c=DB.comps[comp],t=totaisComp(comp);const has=c&&Object.keys(c.res||{}).length;
  return `<h1>Cálculo da folha de pagamento</h1><p class="sub">Apuração mensal: proventos, INSS, IRRF, FGTS, salário-família, vale-transporte e encargos do empregador.</p>${exigeEmpresa()}${compBar(comp)}
  ${!has?`<div class="note">Folha ainda não calculada para ${compLabel(comp)}. Lance os eventos variáveis (se houver) e clique em <b>Calcular folha</b>.</div>`:''}
  ${has?`<div class="kpis"><div class="kpi"><span>Empregados</span><b>${t.n}</b></div><div class="kpi"><span>Proventos</span><b>R$ ${brl(t.prov)}</b></div><div class="kpi"><span>Descontos</span><b>R$ ${brl(t.desc)}</b></div><div class="kpi"><span>Líquido a pagar</span><b>R$ ${brl(t.liq)}</b></div><div class="kpi"><span>INSS segurados</span><b>R$ ${brl(t.inss)}</b></div><div class="kpi"><span>IRRF</span><b>R$ ${brl(t.irrf)}</b></div><div class="kpi"><span>FGTS do mês</span><b>R$ ${brl(t.fgts)}</b></div></div>
  <div class="card"><div class="tw"><table class="t"><thead><tr><th>Mat.</th><th>Empregado</th><th class="r">Proventos</th><th class="r">Descontos</th><th class="r">Líquido</th><th class="r">INSS</th><th class="r">IRRF</th><th class="r">FGTS</th><th></th></tr></thead><tbody>
  ${Object.keys(c.res).map(id=>{const e=byId(DB.empregados,id),r=c.res[id];return `<tr><td>${esc(e.mat)}</td><td>${esc(e.nome)}</td><td class="r">${brl(r.totProv)}</td><td class="r">${brl(r.totDesc)}</td><td class="r"><b>${brl(r.liquido)}</b></td><td class="r">${brl(r.inss)}</td><td class="r">${brl(r.irrf)}</td><td class="r">${brl(r.fgts)}</td><td class="r"><button class="btn sm" data-act="folhaDet" data-id="${id}">Ver cálculo</button> <button class="btn sm" data-act="folhaHol" data-id="${id}">Contracheque</button></td></tr>`;}).join('')}
  </tbody><tfoot><tr><th colspan="2">Totais</th><th class="r">${brl(t.prov)}</th><th class="r">${brl(t.desc)}</th><th class="r">${brl(t.liq)}</th><th class="r">${brl(t.inss)}</th><th class="r">${brl(t.irrf)}</th><th class="r">${brl(t.fgts)}</th><th></th></tr></tfoot></table></div></div>
  <div class="card"><h2>Encargos patronais estimados (sobre a base previdenciária)</h2><div class="kpis" style="margin:0"><div class="kpi"><span>CPP patronal</span><b>R$ ${brl(t.pat)}</b></div><div class="kpi"><span>RAT/FAP</span><b>R$ ${brl(t.rat)}</b></div><div class="kpi"><span>Terceiros</span><b>R$ ${brl(t.terc)}</b></div><div class="kpi"><span>FGTS</span><b>R$ ${brl(t.fgts)}</b></div></div>${DB.empresa&&DB.empresa.classTrib==='01'?'<p class="sub" style="margin:8px 0 0">Tributação previdenciária substituída (Simples Nacional): CPP, RAT e terceiros não são apurados na folha.</p>':''}<p class="sub" style="margin:8px 0 0">Valores estimativos; a apuração oficial é retornada pelo eSocial (S-5011) e recolhida via DCTFWeb/DAE.</p></div>`:''}`;},
  mount(p){bindComp();if(p.calc){NAV.cur.params.calc=false;ACT.folhaCalc();}},
  actions:p=>{const c=DB.comps[compSel(p)]||{};const a=[];
    if(c.status==='fechada')a.push({label:'Reabrir competência',act:'folhaReabrir'});else a.push({label:'Fechar competência',act:'folhaFechar'});
    a.push({label:'Contracheques →',act:'folhaHolGo'},{label:'⚙ Calcular folha',act:'folhaCalc',cls:'pri',key:'save'},{label:'Enviar ao eSocial →',act:'folhaEnvioGo',cls:'send',key:'send'});return a;}};
ACT.folhaCalc=()=>{const comp=compSel(NAV.cur.params);if(!DB.empresa){toast('Cadastre a empresa.','err');return;}const c=compCtx(comp);if(c.status==='fechada'){toast('Competência fechada: reabra para recalcular.','err');return;}
  if(!DB.empregados.length){toast('Cadastre empregados.','err');return;}if(!c.dtPgto)c.dtPgto=proxMes(comp,5);calcFolha(comp);toast('Folha de '+compLabel(comp)+' calculada.','ok');refresh({comp});};
ACT.folhaDet=el=>detalheCalc(el.dataset.id,compSel(NAV.cur.params));
ACT.folhaHol=el=>go('holerite',{comp:compSel(NAV.cur.params),empId:el.dataset.id});
ACT.folhaHolGo=()=>go('holerite',{comp:compSel(NAV.cur.params)});
ACT.folhaEnvioGo=()=>go('envio',{comp:compSel(NAV.cur.params)});
ACT.folhaFechar=()=>{const comp=compSel(NAV.cur.params),c=DB.comps[comp];if(!c||c.status!=='calculada'){toast('Calcule a folha antes de fechar.','err');return;}
  modalConfirm('Fechar a competência '+compLabel(comp)+'? Os valores ficam travados para o envio ao eSocial (S-1200/S-1210/S-1299).',()=>{c.status='fechada';c.fechadaEm=agoraISO();saveDB();refresh();toast('Competência fechada.','ok');},{yes:'Fechar competência'});};
ACT.folhaReabrir=()=>{const comp=compSel(NAV.cur.params),c=DB.comps[comp];const env=DB.eventos.some(e=>e.comp===comp&&e.status==='processado');
  modalConfirm('Reabrir a competência '+compLabel(comp)+'?'+(env?' <b>Há eventos desta competência já processados no eSocial</b>: alterações exigirão retificação e, após o S-1299, a reabertura (S-1298).':''),()=>{c.status='calculada';saveDB();refresh();},{yes:'Reabrir'});};

/* ===================== CONTRACHEQUE ===================== */
function holeriteHTML(e,comp){const r=DB.comps[comp].res[e.id],E=DB.empresa,c=DB.comps[comp],cg=byId(DB.cargos,e.cargo)||{},lo=byId(DB.lotacoes,e.lotacao)||{};const I=r.irrfInfo;
  const itens=r.itens.filter(i=>i.tp!==3);
  return `<div class="hol"><div class="hd"><div><h4 style="text-align:left">${esc(E.razao)}</h4>CNPJ ${fmtCNPJ(E.cnpj)}<br>${esc(E.logr||'')}, ${esc(E.nr||'')} ${esc(E.bairro||'')} — ${esc(E.municipio||'')}/${esc(E.uf||'')}</div><div style="text-align:right"><h4>RECIBO DE PAGAMENTO DE SALÁRIO</h4>Competência: <b>${compLabel(comp)}</b><br>Pagamento: ${fmtData(c.dtPgto)}</div></div>
  <table style="margin-bottom:8px"><tr><td><small>Matrícula</small><br><b>${esc(e.mat)}</b></td><td colspan="2"><small>Nome</small><br><b>${esc(e.nome)}</b></td><td><small>CPF</small><br>${fmtCPF(e.cpf)}</td></tr><tr><td><small>Cargo</small><br>${esc(cg.nome||'')}</td><td><small>CBO</small><br>${esc(cg.cbo||'')}</td><td><small>Departamento</small><br>${esc(lo.desc||'')}</td><td><small>Admissão</small><br>${fmtData(e.admissao)}</td></tr></table>
  <table><thead><tr><th style="width:52px">Cód.</th><th>Descrição</th><th style="width:70px">Ref.</th><th style="width:100px">Vencimentos</th><th style="width:100px">Descontos</th></tr></thead><tbody>${itens.map(i=>`<tr><td>${i.cod}</td><td>${esc(i.desc)}</td><td>${esc(i.ref)}</td><td style="text-align:right">${i.tp===1?brl(i.valor):''}</td><td style="text-align:right">${i.tp===2?brl(i.valor):''}</td></tr>`).join('')}</tbody>
  <tfoot><tr><th colspan="3" style="text-align:right">Totais</th><th style="text-align:right">${brl(r.totProv)}</th><th style="text-align:right">${brl(r.totDesc)}</th></tr><tr><th colspan="4" style="text-align:right;font-size:13px">LÍQUIDO A RECEBER</th><th style="text-align:right;font-size:13px">R$ ${brl(r.liquido)}</th></tr></tfoot></table>
  <div class="bx"><div><small>Salário contratual</small>${brl(num(e.salario))}</div><div><small>Base INSS</small>${brl(r.baseCP)}</div><div><small>Base FGTS</small>${brl(r.baseFGTS)}</div><div><small>FGTS do mês (${r.aliqFgts}%)</small>${brl(r.fgts)}</div><div><small>Base IRRF</small>${brl(I.base)}</div><div><small>IRRF (tabela − redução)</small>${brl(I.imposto)} − ${brl(I.reducao)}</div><div><small>Dependentes IRRF</small>${(e.deps||[]).filter(d=>d.irrf).length}</div><div><small>Crédito em</small>${esc(e.banco||'')} ${e.agencia?'ag. '+esc(e.agencia):''} ${e.conta?'c/c '+esc(e.conta):''}</div></div>
  <div class="ass"><div>Declaro ter recebido a importância líquida acima discriminada.<br>Assinatura do empregado — Data: ____/____/______</div><div>${esc(E.razao)}</div></div></div>`;}
SC.holerite={view(p){const comp=compSel(p),c=DB.comps[comp],ids=c?Object.keys(c.res||{}):[];const empId=p.empId&&ids.includes(p.empId)?p.empId:ids[0];
  if(!ids.length)return `<h1>Contracheques</h1><p class="sub">Recibos de pagamento da competência.</p>${compBar(comp)}<div class="note">A folha de ${compLabel(comp)} ainda não foi calculada. <a style="cursor:pointer;text-decoration:underline" data-act="go" data-to="folha" data-p='{"comp":"${comp}"}'>Ir para o cálculo da folha</a>.</div>`;
  const e=byId(DB.empregados,empId),ent=DB.entregues[comp+'|'+empId];
  return `<h1>Contracheques</h1><p class="sub">Visualize, imprima e registre a entrega do recibo de pagamento.</p>${compBar(comp)}
  <div class="row" style="margin-bottom:12px"><b>Empregado:</b><select id="empSel" style="padding:7px 9px;border:1px solid #c7d0d9;border-radius:6px;font:inherit">${ids.map(id=>`<option value="${id}" ${id===empId?'selected':''}>${esc(byId(DB.empregados,id).mat+' – '+byId(DB.empregados,id).nome)}</option>`).join('')}</select><button class="btn sm" data-act="holPrev">◀ Anterior</button><button class="btn sm" data-act="holNext">Próximo ▶</button>${ent?badge('Entregue em '+fmtData(ent.data.slice(0,10)),'ok'):badge('Entrega não registrada','warn')}</div>
  ${holeriteHTML(e,comp)}`;},
  mount(p){bindComp();const s=$('#empSel');s&&s.addEventListener('change',()=>refresh({empId:s.value}));},
  actions:p=>[{label:'🖨 Imprimir este',act:'holPrint',arg:'1'},{label:'🖨 Imprimir todos',act:'holPrint',arg:'all'},{label:'✔ Registrar entrega',act:'holEntrega',cls:'pri',key:'save'},{label:'Enviar competência ao eSocial →',act:'folhaEnvioGo',cls:'send',key:'send'}]};
const holIds=()=>{const comp=compSel(NAV.cur.params),c=DB.comps[comp];return c?Object.keys(c.res):[];};
const holCur=()=>{const ids=holIds();const p=NAV.cur.params;return ids.includes(p.empId)?p.empId:ids[0];};
ACT.holPrev=()=>{const ids=holIds(),i=ids.indexOf(holCur());refresh({empId:ids[(i-1+ids.length)%ids.length]});};
ACT.holNext=()=>{const ids=holIds(),i=ids.indexOf(holCur());refresh({empId:ids[(i+1)%ids.length]});};
ACT.holPrint=el=>{const comp=compSel(NAV.cur.params),ids=el.dataset.arg==='all'?holIds():[holCur()];if(!ids.length)return;
  $('#printarea').innerHTML=ids.map(id=>holeriteHTML(byId(DB.empregados,id),comp)).join('');document.body.classList.add('printing');
  try{window.print();}catch(e){toast('Impressão indisponível neste ambiente. Abra o arquivo HTML no navegador para imprimir ou salvar em PDF.','err');}
  setTimeout(()=>{document.body.classList.remove('printing');$('#printarea').innerHTML='';},800);};
ACT.holEntrega=()=>{const comp=compSel(NAV.cur.params),id=holCur();if(!id)return;DB.entregues[comp+'|'+id]={data:agoraISO(),forma:'registro manual'};saveDB();toast('Entrega registrada.','ok');refresh();};

/* ===================== ENVIO eSocial ===================== */
const GRUPO={'S-1000':1,'S-1005':1,'S-1010':1,'S-1020':1,'S-2200':2,'S-2206':2,'S-2230':2,'S-2299':2,'S-1200':3,'S-1210':3,'S-1299':3};
const hist=(ev,m)=>{(ev.historico=ev.historico||[]).push({t:agoraISO(),m});};
function refazerXml(ev){const g=GEN[ev.tipo](ev.gen.args,ev.opts||undefined);const old=ev.id;ev.id=g.id;ev.xml=fmtXml(g.xml);ev.titulo=g.titulo;DB.movs.forEach(m=>{if(m.evId===old)m.evId=ev.id;});}
async function enviarEventos(evs,log){const res={ok:0,rej:0,err:0};log=log||(()=>{});
  const prontos=[];
  for(const ev of evs){if(ev.status==='processado')continue;
    if(ev.status==='gerado'||ev.status==='rejeitado'){try{refazerXml(ev);}catch(e){}}
    const oc=validarEvento(ev);
    if(oc.length){ev.status='rejeitado';ev.ocorr=oc;hist(ev,'Rejeitado na validação local ('+oc.length+' ocorrência(s))');res.rej++;log(`✖ ${ev.tipo} ${ev.titulo}: ${oc[0]}`);saveDB();continue;}
    ev.ocorr=[];prontos.push(ev);}
  if(DB.cfg.modo==='gw'){
    for(let i=0;i<prontos.length;i+=50){const lote=prontos.slice(i,i+50);const grupos=[...new Set(lote.map(e=>GRUPO[e.tipo]))];
      for(const g of grupos){const L=lote.filter(e=>GRUPO[e.tipo]===g);
        try{const r=await fetch(DB.cfg.gateway.replace(/\/$/,'')+'/lotes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ambiente:DB.cfg.ambiente,grupo:g,empregador:{tpInsc:1,nrInsc:onlyD(DB.empresa.cnpj)},eventos:L.map(e=>({id:e.id,tipo:e.tipo,xml:e.xml}))})});
          if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json();L.forEach(e=>{e.status='enviado';e.protocolo=j.protocolo;e.enviadoEm=agoraISO();hist(e,'Lote enviado — protocolo '+j.protocolo);});saveDB();
          let ok=false;for(let t=0;t<5&&!ok;t++){await sleep(1500);const q=await fetch(DB.cfg.gateway.replace(/\/$/,'')+'/lotes/'+encodeURIComponent(j.protocolo));const qj=await q.json();if(qj.status==='processado'){ok=true;(qj.eventos||[]).forEach(x=>{const e=L.find(y=>y.id===x.id);if(!e)return;if(x.situacao==='sucesso'){e.status='processado';e.recibo=x.recibo;e.processadoEm=agoraISO();hist(e,'Processado — recibo '+x.recibo);res.ok++;log('✔ '+e.tipo+' '+e.titulo);}else{e.status='rejeitado';e.ocorr=(x.ocorrencias||[]).map(o=>(o.codigo?o.codigo+' – ':'')+o.descricao);hist(e,'Rejeitado pelo eSocial');res.rej++;log('✖ '+e.tipo+' '+e.titulo);}});}}
          if(!ok)log('… lote '+j.protocolo+' ainda em processamento; use “Consultar” na biblioteca.');
        }catch(err){L.forEach(e=>{if(e.status!=='enviado'){e.status='gerado';hist(e,'Falha de comunicação com o gateway: '+err.message);}});res.err+=L.length;log('✖ Falha de comunicação: '+err.message+' (em páginas publicadas como artefato o navegador bloqueia chamadas externas; use o arquivo HTML local)');}
        saveDB();}}
  }else{
    for(const ev of prontos){ev.status='enviado';ev.protocolo='SIM-'+ts14()+String(Math.floor(Math.random()*9000)+1000);ev.enviadoEm=agoraISO();hist(ev,'Enviado (SIMULAÇÃO) — protocolo '+ev.protocolo);saveDB();await sleep(60);
      ev.status='processado';ev.recibo='SIM-1.2.'+ts14()+String(Math.floor(Math.random()*90000)+10000);ev.processadoEm=agoraISO();hist(ev,'Processado (SIMULAÇÃO) — recibo '+ev.recibo);res.ok++;log('✔ '+ev.tipo+' '+ev.titulo);saveDB();}
  }
  return res;}
function plano(comp){const c=DB.comps[comp],ids=c?Object.keys(c.res||{}):[],P=[];
  const add=(tipo,args,label,match)=>P.push({tipo,args,label,ev:ultEv(tipo,e=>!e.retif&&match(e))});
  add('S-1000',{},'Informações do empregador',()=>true);
  DB.estabs.forEach(s=>add('S-1005',{id:s.id},'Estabelecimento '+s.nome,e=>e.gen.args.id===s.id));
  DB.lotacoes.forEach(l=>add('S-1020',{id:l.id},'Lotação '+l.cod+' '+l.desc,e=>e.gen.args.id===l.id));
  DB.rubricas.filter(r=>r.tp!==3).forEach(r=>add('S-1010',{id:r.sys},'Rubrica '+r.cod+' '+r.desc,e=>e.gen.args.id===r.sys));
  DB.empregados.forEach(e=>add('S-2200',{id:e.id},'Admissão '+e.nome,x=>x.gen.args.id===e.id));
  ids.filter(id=>!rescNoMes(id,comp)).forEach(id=>add('S-1200',{id,comp},'Remuneração '+byId(DB.empregados,id).nome,x=>x.gen.args.id===id&&x.comp===comp));
  ids.forEach(id=>add('S-1210',{id,comp},'Pagamento '+byId(DB.empregados,id).nome,x=>x.gen.args.id===id&&x.comp===comp));
  ids.filter(id=>rescNoMes(id,comp)).forEach(id=>{const mv=DB.movs.find(m=>m.tipo==='S-2299'&&m.empId===id);if(mv)add('S-2299',{id,mov:mv},'Desligamento '+byId(DB.empregados,id).nome,x=>x.gen.args.id===id);});
  if(ids.length)add('S-1299',{comp},'Fechamento da competência',x=>x.comp===comp);
  return P;}
SC.envio={view(p){const comp=compSel(p),c=DB.comps[comp]||{status:'aberta'},P=plano(comp);const grp={};P.forEach(x=>{(grp[x.tipo]=grp[x.tipo]||[]).push(x);});
  return `<h1>Envio ao eSocial — ${compLabel(comp)}</h1><p class="sub">Ordem de transmissão: tabelas → admissões → remuneração (S-1200) → pagamentos (S-1210) → fechamento (S-1299). O envio cria os eventos que ainda faltam e respeita as dependências.</p>${exigeEmpresa()}${compBar(comp)}
  <div class="note ${DB.cfg.modo==='sim'?'':'info'}">${DB.cfg.modo==='sim'?'<b>Modo simulação:</b> os eventos são validados e “processados” localmente, com protocolos e recibos prefixados SIM-. Nada é transmitido à Receita. Configure o webservice na aba Integração.':'<b>Modo webservice:</b> envio via gateway configurado ('+esc(DB.cfg.gateway||'sem URL')+') — ambiente '+(DB.cfg.ambiente==1?'<b>PRODUÇÃO</b>':'produção restrita')+'.'}</div>
  ${c.status==='aberta'?'<div class="note">A folha desta competência não está calculada; S-1200, S-1210 e S-1299 serão gerados após o cálculo e o fechamento.</div>':c.status==='calculada'?'<div class="note">Folha calculada, mas não fechada: o S-1299 só será enviado após <b>fechar a competência</b>.</div>':''}
  <div class="card"><div class="tw"><table class="t"><thead><tr><th>Evento</th><th>Descrição</th><th class="c">Total</th><th class="c">Processados</th><th class="c">Pendentes</th><th class="c">Rejeitados</th><th></th></tr></thead><tbody>
  ${ORDEM.filter(t=>grp[t]).map(t=>{const g=grp[t];const ok=g.filter(x=>x.ev&&x.ev.status==='processado').length,rj=g.filter(x=>x.ev&&x.ev.status==='rejeitado').length;return `<tr><td><b>${t}</b></td><td>${TIPOS[t]}</td><td class="c">${g.length}</td><td class="c">${ok?badge(ok,'ok'):'0'}</td><td class="c">${g.length-ok-rj}</td><td class="c">${rj?badge(rj,'err'):'0'}</td><td class="r"><button class="btn sm send" data-act="envioTipo" data-t="${t}" ${ok===g.length?'disabled':''}>Enviar ${t}</button></td></tr>`;}).join('')}
  </tbody></table></div></div>
  <div class="card"><h2>Andamento</h2><pre class="xml" id="log" style="max-height:220px;min-height:60px">Aguardando envio…</pre></div>`;},
  mount(){bindComp();},
  actions:()=>[{label:'Biblioteca de eventos',act:'go',arg:'',cls:''},{label:'🚀 Enviar tudo em ordem',act:'envioTudo',cls:'send',key:'send'}]};
ACT.go=el=>{if(el.dataset.to)go(el.dataset.to,el.dataset.p?JSON.parse(el.dataset.p):{});else go('biblioteca',{});};
let ENVIANDO=false;
async function executarPlano(comp,tipos){if(ENVIANDO)return;if(!DB.empresa){toast('Cadastre a empresa.','err');return;}ENVIANDO=true;const lg=$('#log');lg.textContent='';const L=m=>{lg.textContent+=m+'\n';lg.scrollTop=lg.scrollHeight;};const tot={ok:0,rej:0,err:0};
  try{const c=DB.comps[comp]||{status:'aberta'};
    for(const t of ORDEM){if(tipos&&!tipos.includes(t))continue;const itens=plano(comp).filter(x=>x.tipo===t);if(!itens.length)continue;
      if(['S-1200','S-1210'].includes(t)&&c.status==='aberta'){L('— '+t+' ignorado: folha não calculada.');continue;}
      if(t==='S-1299'&&c.status!=='fechada'){L('— S-1299 ignorado: feche a competência antes.');continue;}
      const evs=[];for(const it of itens){const u=it.ev;if(u&&u.status==='processado')continue;if(u&&(u.status==='gerado'||u.status==='enviado')){if(u.status==='gerado')evs.push(u);continue;}evs.push(criarEvento(t,it.args));}
      if(!evs.length)continue;L(`▸ ${t} — ${TIPOS[t]} (${evs.length})`);const r=await enviarEventos(evs,L);tot.ok+=r.ok;tot.rej+=r.rej;tot.err+=r.err;
      if(r.rej||r.err){L('■ Interrompido: corrija as ocorrências deste grupo antes de seguir (há dependências entre eventos).');break;}}
    L(`\nConcluído — ${tot.ok} processado(s), ${tot.rej} rejeitado(s), ${tot.err} falha(s).`);
  }finally{ENVIANDO=false;}
  toast(tot.rej||tot.err?'Envio com ocorrências — veja o andamento.':'Envio concluído.',tot.rej||tot.err?'err':'ok');renderSide();}
ACT.envioTudo=()=>executarPlano(compSel(NAV.cur.params));
ACT.envioTipo=el=>executarPlano(compSel(NAV.cur.params),[el.dataset.t]);

/* ===================== BIBLIOTECA ===================== */
SC.biblioteca={view(p){const q=(p.q||'').toLowerCase();let L=DB.eventos.filter(e=>(!p.tipo||e.tipo===p.tipo)&&(!p.status||e.status===p.status)&&(!p.comp||e.comp===p.comp)&&(!q||(e.titulo+e.id+(e.recibo||'')+(e.protocolo||'')).toLowerCase().includes(q)));
  const cnt=s=>DB.eventos.filter(e=>e.status===s).length;
  return `<h1>Biblioteca de dados enviados ao eSocial</h1><p class="sub">Todos os eventos gerados: XML, protocolo, recibo, ocorrências e histórico. Permite reenviar, consultar e retificar.</p>
  <div class="kpis"><div class="kpi"><span>Total</span><b>${DB.eventos.length}</b></div><div class="kpi"><span>Processados</span><b style="color:var(--ok)">${cnt('processado')}</b></div><div class="kpi"><span>Enviados (aguardando)</span><b style="color:var(--blue)">${cnt('enviado')}</b></div><div class="kpi"><span>Gerados (não enviados)</span><b>${cnt('gerado')}</b></div><div class="kpi"><span>Rejeitados</span><b style="color:var(--err)">${cnt('rejeitado')}</b></div></div>
  <div class="card"><div class="row" id="flt"><select id="fTipo" style="padding:7px;border:1px solid #c7d0d9;border-radius:6px"><option value="">Todos os tipos</option>${optSel(Object.keys(TIPOS).map(k=>[k,k+' – '+TIPOS[k]]),p.tipo||'')}</select>
  <select id="fSt" style="padding:7px;border:1px solid #c7d0d9;border-radius:6px"><option value="">Todos os status</option>${optSel(Object.keys(ST).map(k=>[k,ST[k][0]]),p.status||'')}</select><input id="fComp" type="month" value="${p.comp||''}" style="padding:6px;border:1px solid #c7d0d9;border-radius:6px"><input id="fQ" placeholder="Buscar (título, ID, recibo…)" value="${esc(p.q||'')}" style="padding:8px;border:1px solid #c7d0d9;border-radius:6px;min-width:220px"><button class="btn sm" data-act="bibLimpar">Limpar</button></div>
  <div class="tw" style="margin-top:12px"><table class="t"><thead><tr><th><input type="checkbox" id="selAll"></th><th>Evento</th><th>Descrição</th><th>Comp.</th><th>Status</th><th>Recibo / protocolo</th><th>Data</th><th></th></tr></thead><tbody>
  ${L.map(e=>`<tr><td><input type="checkbox" class="sel" value="${e.id}"></td><td><b>${e.tipo}</b>${e.retif?' <span class="badge b-warn">retif.</span>':''}</td><td>${esc(e.titulo)}</td><td>${e.comp?compLabel(e.comp):''}</td><td>${stBadge(e)}</td><td class="mono">${esc(e.recibo||e.protocolo||'')}</td><td>${dtHora(e.processadoEm||e.enviadoEm||e.criado)}</td>
  <td class="r"><button class="btn sm" data-act="bibVer" data-id="${e.id}">XML / detalhes</button> ${e.status==='processado'?`<button class="btn sm" data-act="bibRetif" data-id="${e.id}" ${['S-1299'].includes(e.tipo)?'disabled':''}>Retificar</button>`:e.status==='enviado'?`<button class="btn sm" data-act="bibCons" data-id="${e.id}">Consultar</button>`:`<button class="btn sm send" data-act="bibEnv" data-id="${e.id}">${e.status==='rejeitado'?'Reenviar':'Enviar'}</button>`} ${e.status==='processado'?'':`<button class="btn sm danger" data-act="bibDel" data-id="${e.id}">✕</button>`}</td></tr>`).join('')||'<tr><td colspan="8" class="c" style="padding:20px;color:var(--mut)">Nenhum evento encontrado.</td></tr>'}
  </tbody></table></div></div>`;},
  mount(){const f=()=>{NAV.cur.params=Object.assign({},NAV.cur.params,{tipo:$('#fTipo').value,status:$('#fSt').value,comp:$('#fComp').value,q:$('#fQ').value});};
    ['fTipo','fSt','fComp'].forEach(i=>$('#'+i).addEventListener('change',()=>{f();render();}));let tm;$('#fQ').addEventListener('input',()=>{clearTimeout(tm);tm=setTimeout(()=>{f();render();$('#fQ').focus();$('#fQ').setSelectionRange(99,99);},350);});
    $('#selAll').addEventListener('change',e=>$$('.sel').forEach(c=>c.checked=e.target.checked));},
  actions:()=>[{label:'Exportar biblioteca (JSON)',act:'bibExport'},{label:'Enviar selecionados',act:'bibEnvSel'},{label:'🚀 Enviar todos os pendentes',act:'bibEnvPend',cls:'send',key:'send'}]};
ACT.bibLimpar=()=>{NAV.cur.params={};render();};
ACT.bibVer=el=>{const e=byId(DB.eventos,el.dataset.id);
  modal(`<div class="grid" style="margin-bottom:10px"><div class="f" style="grid-column:span 6"><label>ID do evento</label><div class="mono" style="word-break:break-all">${e.id}</div></div><div class="f" style="grid-column:span 3"><label>Status</label>${stBadge(e)}</div><div class="f" style="grid-column:span 3"><label>Ambiente</label>${e.ambiente==1?'Produção':'Produção restrita'}</div><div class="f" style="grid-column:span 6"><label>Protocolo</label><span class="mono">${esc(e.protocolo||'—')}</span></div><div class="f" style="grid-column:span 6"><label>Recibo</label><span class="mono">${esc(e.recibo||'—')}</span></div></div>
  ${(e.ocorr||[]).length?`<div class="note err"><b>Ocorrências</b><br>${e.ocorr.map(o=>'• '+esc(o)).join('<br>')}</div>`:''}
  <h3>Histórico</h3><div class="tw" style="margin-bottom:10px"><table class="t"><tbody>${(e.historico||[]).map(h=>`<tr><td style="width:140px">${dtHora(h.t)}</td><td>${esc(h.m)}</td></tr>`).join('')}</tbody></table></div>
  <div class="row sp"><h3>XML do evento</h3><span><button class="btn sm" data-act="bibCopy" data-id="${e.id}">Copiar XML</button> <button class="btn sm" data-act="bibDown" data-id="${e.id}">Baixar .xml</button></span></div><pre class="xml">${esc(e.xml)}</pre><p class="sub" style="margin:8px 0 0">Minuta gerada pelo sistema, sem assinatura digital. A assinatura (XMLDSig) e a validação contra os XSD oficiais do leiaute ocorrem no gateway de integração.</p>`,{title:e.tipo+' — '+e.titulo,wide:true});};
ACT.bibCopy=async el=>{const e=byId(DB.eventos,el.dataset.id);try{await navigator.clipboard.writeText(e.xml);toast('XML copiado.','ok');}catch(x){toast('Não foi possível copiar; selecione o texto manualmente.','err');}};
function baixar(nome,txt,mime){try{const b=new Blob([txt],{type:mime||'text/plain'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=nome;document.body.appendChild(a);a.click();a.remove();toast('Download iniciado (se o navegador permitir).');}catch(x){toast('Download indisponível aqui; use “Copiar”.','err');}}
ACT.bibDown=el=>{const e=byId(DB.eventos,el.dataset.id);baixar(e.tipo+'_'+e.id+'.xml',e.xml,'application/xml');};
ACT.bibEnv=async el=>{const e=byId(DB.eventos,el.dataset.id);const r=await enviarEventos([e]);resumoEnvio(r,[e]);refresh();};
ACT.bibCons=async el=>{const e=byId(DB.eventos,el.dataset.id);
  if(DB.cfg.modo==='sim'){e.status='processado';e.recibo='SIM-1.2.'+ts14()+'00001';e.processadoEm=agoraISO();hist(e,'Consulta (SIMULAÇÃO): processado');saveDB();refresh();toast('Evento processado (simulação).','ok');return;}
  try{const q=await fetch(DB.cfg.gateway.replace(/\/$/,'')+'/lotes/'+encodeURIComponent(e.protocolo));const j=await q.json();if(j.status!=='processado'){toast('Lote ainda em processamento.');return;}const x=(j.eventos||[]).find(y=>y.id===e.id);if(x&&x.situacao==='sucesso'){e.status='processado';e.recibo=x.recibo;e.processadoEm=agoraISO();hist(e,'Processado — recibo '+x.recibo);}else if(x){e.status='rejeitado';e.ocorr=(x.ocorrencias||[]).map(o=>(o.codigo?o.codigo+' – ':'')+o.descricao);hist(e,'Rejeitado pelo eSocial');}saveDB();refresh();}catch(err){toast('Falha na consulta: '+err.message,'err');}};
ACT.bibRetif=el=>{const e=byId(DB.eventos,el.dataset.id);modalConfirm('Gerar a retificação (indRetif=2) do evento <b>'+esc(e.tipo+' — '+e.titulo)+'</b> com os dados atuais, referenciando o recibo '+esc(e.recibo)+'?',()=>{try{criarEvento(e.tipo,e.gen.args,{retif:{n:2,rec:e.recibo}});toast('Retificação gerada: envie-a pela biblioteca.','ok');refresh();}catch(x){toast('Não foi possível gerar a retificação: '+x.message,'err');}},{yes:'Gerar retificação'});};
ACT.bibDel=el=>modalConfirm('Excluir este evento da biblioteca (somente eventos não processados)?',()=>{DB.eventos=DB.eventos.filter(x=>x.id!==el.dataset.id);saveDB();refresh();},{yes:'Excluir'});
ACT.bibEnvSel=async()=>{const ids=$$('.sel:checked').map(c=>c.value);if(!ids.length){toast('Selecione eventos.');return;}const evs=ids.map(i=>byId(DB.eventos,i)).sort((a,b)=>ORDEM.indexOf(a.tipo)-ORDEM.indexOf(b.tipo));const r=await enviarEventos(evs);resumoEnvio(r,evs);refresh();};
ACT.bibEnvPend=async()=>{const evs=DB.eventos.filter(e=>e.status==='gerado'||e.status==='rejeitado').sort((a,b)=>ORDEM.indexOf(a.tipo)-ORDEM.indexOf(b.tipo));if(!evs.length){toast('Nenhum evento pendente.');return;}const r=await enviarEventos(evs);resumoEnvio(r,evs);refresh();};
ACT.bibExport=()=>modal(`<p class="sub">Biblioteca completa (metadados e XML) em JSON.</p><textarea style="width:100%;height:300px" class="mono" readonly>${esc(JSON.stringify(DB.eventos,null,1))}</textarea><div class="row" style="margin-top:8px"><button class="btn pri" id="cpx">Copiar</button><button class="btn" id="dlx">Baixar .json</button></div>`,{title:'Exportar biblioteca',wide:true})||(setTimeout(()=>{$('#cpx').onclick=async()=>{try{await navigator.clipboard.writeText(JSON.stringify(DB.eventos,null,1));toast('Copiado.','ok');}catch(e){toast('Falha ao copiar.','err');}};$('#dlx').onclick=()=>baixar('biblioteca_esocial.json',JSON.stringify(DB.eventos,null,1),'application/json');},0));
