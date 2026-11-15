
/* ===================== FICHA FINANCEIRA (consolidada, individualizada, rascunho) ===================== */
const FICH_MES=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const FICH_SEL=new Set();
let FICH_BUSCA='';
const fichAno=p=>String(p.ano||(DB.cfg.comp||'').slice(0,4)||new Date().getFullYear());
const fichMeses=(ano,rasc)=>FICH_MES.map((_,i)=>{const k=ano+'-'+String(i+1).padStart(2,'0'),c=DB.comps[k];const ok=c&&c.res&&Object.keys(c.res).length&&(rasc||c.status==='fechada');return ok?{k,c}:null;});
/* Monta as linhas (rubricas x 12 meses) para um conjunto de resultados por mês: getRes(mes)->res|null */
function fichLinhas(meses,getRes){const rub=new Map(),tot={prov:Array(12).fill(0),desc:Array(12).fill(0),liq:Array(12).fill(0),cp:Array(12).fill(0),fgtsB:Array(12).fill(0),fgts:Array(12).fill(0),irB:Array(12).fill(0),inss:Array(12).fill(0),irrf:Array(12).fill(0)};
  meses.forEach((m,i)=>{if(!m)return;const rs=getRes(m);rs.forEach(r=>{if(!r)return;(r.itens||[]).filter(x=>x.tp!==3).forEach(x=>{const key=x.cod+'|'+x.desc;let o=rub.get(key);if(!o){o={cod:x.cod,desc:x.desc,tp:x.tp,v:Array(12).fill(0)};rub.set(key,o);}o.v[i]=r2(o.v[i]+x.valor);});
    tot.prov[i]+=r.totProv;tot.desc[i]+=r.totDesc;tot.liq[i]+=r.liquido;tot.cp[i]+=r.baseCP||0;tot.fgtsB[i]+=r.baseFGTS||0;tot.fgts[i]+=r.fgts||0;tot.irB[i]+=(r.irrfInfo&&r.irrfInfo.base)||0;tot.inss[i]+=r.inss||0;tot.irrf[i]+=r.irrf||0;});});
  for(const k in tot)tot[k]=tot[k].map(r2);
  const lista=[...rub.values()].sort((a,b)=>a.tp-b.tp||String(a.cod).localeCompare(String(b.cod),'pt',{numeric:true}));return{lista,tot};}
const fichSoma=a=>r2(a.reduce((s,x)=>s+x,0));
function fichTabela(meses,L,rasc){const cel=v=>`<td style="text-align:right;white-space:nowrap">${v?brl(v):'<span style="color:#9aa5b1">–</span>'}</td>`;
  const lin=(o,neg)=>`<tr><td>${esc(o.cod||'')}</td><td>${esc(o.desc)}</td>${o.v.map(cel).join('')}<td style="text-align:right;font-weight:700">${brl(fichSoma(o.v))}</td></tr>`;
  const sec=(t,tp)=>{const ls=L.lista.filter(o=>o.tp===tp);return ls.length?`<tr><th colspan="15" style="text-align:left;background:#eef2f6">${t}</th></tr>${ls.map(lin).join('')}`:'';};
  const tl=(t,a,cls)=>`<tr style="font-weight:700;${cls||''}"><td colspan="2">${t}</td>${a.map(cel).join('')}<td style="text-align:right">${brl(fichSoma(a))}</td></tr>`;
  const st=m=>m?(m.c.status==='fechada'?'F':'<b title="Competência não fechada">R</b>'):'–';
  return `<table class="fich"><thead><tr><th style="width:46px">Cód.</th><th>Rubrica</th>${FICH_MES.map(x=>`<th>${x}</th>`).join('')}<th>Total</th></tr><tr><td colspan="2"><small>Situação (F = fechada${rasc?'; R = rascunho':''})</small></td>${meses.map(m=>`<td style="text-align:center"><small>${st(m)}</small></td>`).join('')}<td></td></tr></thead>
  <tbody>${sec('PROVENTOS',1)}${tl('Total de proventos',L.tot.prov)}${sec('DESCONTOS',2)}${tl('Total de descontos',L.tot.desc)}${tl('LÍQUIDO',L.tot.liq,'background:#e8f3ec')}
  <tr><th colspan="15" style="text-align:left;background:#eef2f6">BASES E ENCARGOS (informativo)</th></tr>${tl('Base INSS',L.tot.cp)}${tl('INSS retido',L.tot.inss)}${tl('Base FGTS',L.tot.fgtsB)}${tl('FGTS do mês',L.tot.fgts)}${tl('Base IRRF',L.tot.irB)}${tl('IRRF retido',L.tot.irrf)}</tbody></table>`;}
function fichCab(titulo,ano,rasc,extra){const E=DB.empresa;return `<div class="fch-hd"><div><h4 style="text-align:left;margin:0">${esc(E.razao||'')}</h4>CNPJ ${fmtCNPJ(E.cnpj||'')}</div><div style="text-align:right"><h4 style="margin:0">${titulo}</h4>Exercício: <b>${ano}</b>${rasc?'<br><b style="color:#b42318">RASCUNHO — sem valor oficial</b>':''}</div></div>${extra||''}`;}
function fichaConsolHTML(ano,rasc){const meses=fichMeses(ano,rasc);const L=fichLinhas(meses,m=>Object.values(m.c.res));const n=Math.max(0,...meses.map(m=>m?Object.keys(m.c.res).length:0));
  return `<div class="fch ${rasc?'fch-r':''}">${fichCab('FICHA FINANCEIRA CONSOLIDADA',ano,rasc,`<div style="margin:6px 0"><small>Todos os empregados da competência (até ${n} no mês de maior movimento). Valores somados por rubrica.</small></div>`)}${meses.some(Boolean)?fichTabela(meses,L,rasc):'<div class="note">Nenhuma competência '+(rasc?'calculada':'fechada')+' em '+ano+'.</div>'}</div>`;}
function fichaEmpHTML(e,ano,rasc){const meses=fichMeses(ano,rasc).map(m=>m&&m.c.res[e.id]?m:null);const L=fichLinhas(meses,m=>[m.c.res[e.id]]);const cg=byId(DB.cargos,e.cargo)||{},lo=byId(DB.lotacoes,e.lotacao)||{};
  const id=`<table style="margin:6px 0"><tr><td><small>Matrícula</small><br><b>${esc(e.mat)}</b></td><td><small>Nome</small><br><b>${esc(e.nome)}</b></td><td><small>CPF</small><br>${fmtCPF(e.cpf)}</td><td><small>Cargo / CBO</small><br>${esc(cg.nome||'')} ${esc(cg.cbo||'')}</td><td><small>Lotação</small><br>${esc(lo.desc||'')}</td><td><small>Admissão</small><br>${fmtData(e.admissao)}</td></tr></table>`;
  return `<div class="fch ${rasc?'fch-r':''}" style="page-break-after:always">${fichCab('FICHA FINANCEIRA INDIVIDUAL',ano,rasc,id)}${meses.some(Boolean)?fichTabela(meses,L,rasc):'<div class="note">Sem competências '+(rasc?'calculadas':'fechadas')+' para este empregado em '+ano+'.</div>'}</div>`;}
const fichEmpsAno=(ano,rasc)=>{const ids=new Set();fichMeses(ano,rasc).forEach(m=>m&&Object.keys(m.c.res).forEach(i=>ids.add(i)));return DB.empregados.filter(e=>ids.has(e.id));};
const fichNorm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
function fichFiltrados(ano,rasc){const q=fichNorm(FICH_BUSCA).trim(),qd=q.replace(/\D/g,'');return fichEmpsAno(ano,rasc).filter(e=>!q||fichNorm(e.nome).includes(q)||fichNorm(e.mat).includes(q)||(qd&&String(e.cpf||'').replace(/\D/g,'').includes(qd)));}
function fichLista(ano,rasc){const ls=fichFiltrados(ano,rasc);if(!ls.length)return '<div class="note">Nenhum empregado encontrado com movimento '+(rasc?'calculado':'fechado')+' em '+ano+'.</div>';
  return `<table><thead><tr><th style="width:34px"><input type="checkbox" id="fichAll" title="Selecionar todos os listados"></th><th>Matrícula</th><th>Nome</th><th>CPF</th><th>Situação</th></tr></thead><tbody>${ls.map(e=>`<tr><td><input type="checkbox" class="fichChk" value="${e.id}" ${FICH_SEL.has(e.id)?'checked':''}></td><td>${esc(e.mat)}</td><td>${esc(e.nome)}</td><td>${fmtCPF(e.cpf)}</td><td>${esc(e.situacao||'')}</td></tr>`).join('')}</tbody></table>`;}
SC.ficha={view(p){const ano=fichAno(p),modo=p.modo||'consol',alvo=p.alvo||'consol',rasc=modo==='rasc';
  const tab=(k,l)=>`<a class="btn sm ${modo===k?'pri':''}" data-act="fichModo" data-arg="${k}">${l}</a>`;
  const anoI=`<b>Exercício:</b> <input type="number" id="fichAno" value="${ano}" min="2000" max="2100" style="width:84px;padding:7px 9px;border:1px solid #c7d0d9;border-radius:6px;font:inherit">`;
  let corpo='';
  if(modo==='consol')corpo=fichaConsolHTML(ano,false);
  else if(modo==='rasc'&&alvo==='consol')corpo=`<div class="note">Rascunho: inclui competências calculadas e ainda não fechadas, assinaladas com “R”. Documento de conferência, sem valor oficial.</div>`+fichaConsolHTML(ano,true);
  else{const rs=modo==='rasc';const sel=[...FICH_SEL].filter(id=>byId(DB.empregados,id));
    corpo=`${rs?`<div class="note">Rascunho: inclui competências calculadas e ainda não fechadas. Documento de conferência, sem valor oficial.</div>`:''}<div class="row" style="margin-bottom:10px"><b>Localizar empregado:</b><input id="fichBusca" placeholder="Nome, matrícula ou CPF" value="${esc(FICH_BUSCA)}" style="padding:7px 9px;border:1px solid #c7d0d9;border-radius:6px;font:inherit;min-width:260px"><span id="fichCnt">${badge(sel.length+' selecionado(s)',sel.length?'ok':'gray')}</span><button class="btn sm" data-act="fichLimpa">Limpar seleção</button></div><div id="fichLista" style="max-height:300px;overflow:auto;margin-bottom:12px">${fichLista(ano,rs)}</div>
    ${sel.length?`<h3 style="margin:10px 0">Pré-visualização (${sel.length} ficha(s))</h3>${sel.map(id=>fichaEmpHTML(byId(DB.empregados,id),ano,rs)).join('')}`:'<div class="note">Selecione um ou mais empregados na lista para visualizar e imprimir as fichas individuais.</div>'}`;}
  return `<h1>Ficha Financeira</h1><p class="sub">Evolução anual das rubricas por competência, com bases e encargos. Fichas oficiais usam apenas competências fechadas.</p>
  <div class="row" style="margin-bottom:12px">${anoI}${tab('consol','Ficha consolidada')}${tab('indiv','Ficha individualizada por empregado')}${tab('rasc','Rascunho')}${modo==='rasc'?`<span>Rascunho de:</span>${`<a class="btn sm ${alvo==='consol'?'pri':''}" data-act="fichAlvo" data-arg="consol">consolidada</a><a class="btn sm ${alvo==='indiv'?'pri':''}" data-act="fichAlvo" data-arg="indiv">individual</a>`}`:''}</div>${corpo}`;},
  mount(p){const a=$('#fichAno');a&&a.addEventListener('change',()=>refresh({ano:a.value}));
    const rs=(p.modo||'consol')==='rasc',ano=fichAno(p);
    const bind=()=>{const all=$('#fichAll');all&&all.addEventListener('change',()=>{document.querySelectorAll('.fichChk').forEach(c=>{c.checked=all.checked;all.checked?FICH_SEL.add(c.value):FICH_SEL.delete(c.value);});});};
    const b=$('#fichBusca');if(b){b.addEventListener('input',()=>{FICH_BUSCA=b.value;$('#fichLista').innerHTML=fichLista(ano,rs);bind();});bind();}},
  actions:p=>[{label:'👁 Visualizar / atualizar',act:'fichVer'},{label:'🖨 Imprimir',act:'fichPrint',cls:'pri',key:'save'}]};
document.addEventListener('change',fichChk);
function fichChk(ev){const c=ev.target;if(!c||!c.classList||!c.classList.contains('fichChk'))return;c.checked?FICH_SEL.add(c.value):FICH_SEL.delete(c.value);}
ACT.fichModo=el=>refresh({modo:el.dataset.arg});
ACT.fichAlvo=el=>refresh({alvo:el.dataset.arg});
ACT.fichLimpa=()=>{FICH_SEL.clear();refresh();};
ACT.fichVer=()=>refresh();
ACT.fichPrint=()=>{const p=NAV.cur.params,ano=fichAno(p),modo=p.modo||'consol',alvo=p.alvo||'consol',rasc=modo==='rasc';let h='';
  if(modo==='consol'||(rasc&&alvo==='consol'))h=fichaConsolHTML(ano,rasc);
  else{const ids=[...FICH_SEL].filter(id=>byId(DB.empregados,id));if(!ids.length){toast('Selecione ao menos um empregado.','err');return;}h=ids.map(id=>fichaEmpHTML(byId(DB.empregados,id),ano,rasc)).join('');}
  $('#printarea').innerHTML=h;document.body.classList.add('printing');
  try{window.print();}catch(e){toast('Impressão indisponível neste ambiente. Abra o arquivo HTML no navegador para imprimir ou salvar em PDF.','err');}
  setTimeout(()=>{document.body.classList.remove('printing');$('#printarea').innerHTML='';},800);};

/* ===================== MULTIEMPRESA: Novo cadastro, trocar e excluir ===================== */
/* A empresa ativa é o próprio DB; as demais ficam em DB._emps como instantâneos (todos dentro do mesmo cofre cifrado). */
function empSnap(){const c=Object.assign({},DB);delete c._emps;delete c.audit;return JSON.stringify(c);}
function empArquivar(){if(!DB.empresa)return;DB._id=DB._id||uid('c');const l=(DB._emps=DB._emps||[]).filter(x=>x.id!==DB._id);l.push({id:DB._id,cnpj:DB.empresa.cnpj||'',razao:DB.empresa.razao||'',snap:empSnap(),em:agoraISO(),ex:!!DB._exemplo});DB._emps=l;}
function empTroca(novo,resto){novo._emps=resto;novo.audit=DB.audit;VAULT.audit=DB.audit;DB=novo;NAV.stack=[];}
ACT.empNovo=()=>modalConfirm('Será aberto um cadastro em branco para uma nova empresa. O cadastro atual'+(DB.empresa?' (<b>'+esc(DB.empresa.razao||'')+'</b>)':'')+' é preservado integralmente e poderá ser reaberto na lista “Empresas cadastradas”. Os parâmetros legais e a configuração de ambiente do eSocial são mantidos.',()=>{
  empArquivar();const n=emptyDB();n.params=DB.params;n.cfg=Object.assign({},DB.cfg,{comp:compAtual()});n._id=uid('c');empTroca(n,DB._emps);audit('empresa.novo','novo cadastro iniciado');saveDB();go('empresa');toast('Novo cadastro iniciado. Preencha os dados da empresa.','ok');},{title:'Novo cadastro de empresa',yes:'Abrir cadastro em branco'});
ACT.empTrocar=el=>{const id=el.dataset.arg;const alvo=(DB._emps||[]).find(x=>x.id===id);if(!alvo)return;empArquivar();const resto=DB._emps.filter(x=>x.id!==id);const n=loadDB(alvo.snap);n._id=id;empTroca(n,resto);audit('empresa.trocar',alvo.cnpj);saveDB();go('home');toast('Empresa aberta: '+alvo.razao,'ok');};
function empExcluirModal(id){const ativa=!id;const alvo=ativa?{razao:(DB.empresa||{}).razao||'(cadastro em branco)',cnpj:(DB.empresa||{}).cnpj||''}:(DB._emps||[]).find(x=>x.id===id);if(!alvo)return;
  const env=ativa?DB.eventos.filter(e=>e.status==='processado').length:0;
  modal(`<p>Será excluído, de forma <b>irreversível</b>, todo o cadastro de <b>${esc(alvo.razao)}</b>${alvo.cnpj?' (CNPJ '+fmtCNPJ(alvo.cnpj)+')':''}: empregados, folhas, eventos, férias, rescisões e demais registros locais.</p>
  ${env?`<div class="note err">Há ${env} evento(s) já processado(s) pelo eSocial. A exclusão remove apenas os registros deste sistema; <b>não</b> cancela nem exclui nada no ambiente nacional do eSocial. Guarde os recibos e a biblioteca de eventos antes de prosseguir.</div>`:''}
  <p class="sub">Recomenda-se gerar o backup cifrado antes (menu Sistema › Backup e dados). Para confirmar, digite <b>EXCLUIR</b>:</p><div class="row"><input id="exTx" autocomplete="off" style="padding:7px 9px;border:1px solid #c7d0d9;border-radius:6px;font:inherit"><button class="btn" data-act="closeModal">Cancelar</button><button class="btn pri" id="exOk" style="background:#b42318;border-color:#b42318">Excluir cadastro</button></div>`,{title:'Excluir cadastro de empresa'});
  $('#exOk').onclick=()=>{if($('#exTx').value.trim().toUpperCase()!=='EXCLUIR'){toast('Digite EXCLUIR para confirmar.','err');return;}
    closeModal();audit('empresa.excluir',(alvo.cnpj||'')+' '+(ativa?'(ativa)':'(arquivada)'));
    if(!ativa){DB._emps=DB._emps.filter(x=>x.id!==id);saveDB();refresh();toast('Cadastro excluído.','ok');return;}
    const resto=(DB._emps||[]).slice();let n;if(resto.length){const p=resto.shift();n=loadDB(p.snap);n._id=p.id;}else{n=emptyDB();n.params=DB.params;n.cfg=Object.assign({},DB.cfg,{comp:compAtual()});n._id=uid('c');}
    empTroca(n,resto);saveDB();go(n.empresa?'home':'empresa');toast('Cadastro excluído.','ok');};}
ACT.empExcluir=el=>empExcluirModal(el&&el.dataset&&el.dataset.arg||'');
/* lista na tela da empresa + botões na barra */
const _empView=SC.empresa.view;
SC.empresa.view=function(p){const l=(DB._emps||[]);const ativa=DB.empresa;
  const card=`<div class="card"><h2>Empresas cadastradas</h2><table><thead><tr><th>Razão social</th><th>CNPJ</th><th>Situação</th><th style="width:230px"></th></tr></thead><tbody>
  <tr><td>${esc(ativa?ativa.razao:'(novo cadastro em branco)')}${DB._exemplo?' '+badge('Exemplo','blue'):''}</td><td>${ativa?fmtCNPJ(ativa.cnpj):''}</td><td>${badge('Em uso','ok')}</td><td></td></tr>
  ${l.map(x=>`<tr><td>${esc(x.razao||'(sem razão social)')}${x.ex?' '+badge('Exemplo','blue'):''}</td><td>${fmtCNPJ(x.cnpj||'')}</td><td>${badge('Arquivada','gray')}</td><td><button class="btn sm" data-act="empTrocar" data-arg="${x.id}">Abrir</button> <button class="btn sm" data-act="empExcluir" data-arg="${x.id}">Excluir</button></td></tr>`).join('')}</tbody></table></div>`;
  return _empView.call(this,p).replace(/(<div data-form id="f">)/,card+'$1');};
const _empAct=SC.empresa.actions;
SC.empresa.actions=function(p){return [{label:'＋ Novo cadastro',act:'empNovo'},{label:'🗑 Excluir cadastro',act:'empExcluir'}].concat(_empAct.call(this,p));};
/* impede dois cadastros com o mesmo CNPJ */
const _empSalvar0=empSalvar;
empSalvar=function(){const f=$('#f');if(f){const c=onlyC(readForm(f).cnpj||'');if(c&&(DB._emps||[]).some(x=>x.cnpj===c)){toast('Já existe outro cadastro com este CNPJ. Abra-o na lista de empresas cadastradas.','err');return false;}}return _empSalvar0();};

/* ===================== RELATÓRIOS POR EMPRESA (uma, várias ou todas; seções à escolha) ===================== */
const REL_SECS=[['cad','Cadastro da empresa e enquadramento'],['estr','Estabelecimentos e lotações tributárias'],['quadro','Quadro de empregados e massa salarial'],['folha','Folha por competência (totais)'],['enc','Encargos patronais estimados (CPP, RAT, terceiros, FGTS)'],['evt','Eventos eSocial por situação'],['fer','Férias, rescisões e 13º'],['sst','SST (CAT, ASO, condições ambientais)'],['conf','Conferência de regras (alertas)']];
const REL={emps:null,secs:new Set(REL_SECS.map(s=>s[0])),de:'',ate:'',out:null};
function withDB(d,fn){const o=DB;DB=d;try{return fn();}finally{DB=o;}}
function relEmpresas(){const l=[];if(DB.empresa||DB.empregados.length)l.push({id:DB._id||'atual',nome:(DB.empresa||{}).razao||'(sem razão social)',cnpj:(DB.empresa||{}).cnpj||'',ativa:true});(DB._emps||[]).forEach(x=>l.push({id:x.id,nome:x.razao||'(sem razão social)',cnpj:x.cnpj||'',ativa:false}));return l;}
function relDbDe(id){if(id===(DB._id||'atual'))return DB;const x=(DB._emps||[]).find(y=>y.id===id);if(!x)return null;const d=loadDB(x.snap);d.audit=[];return d;}
function relSecoes(db,secs,de,ate){const E=db.empresa||{},S=[];const has=k=>secs.has(k);
  const comps=Object.keys(db.comps||{}).filter(k=>(!de||k>=de)&&(!ate||k<=ate)&&db.comps[k].res&&Object.keys(db.comps[k].res).length).sort();
  if(has('cad'))S.push({t:'Cadastro da empresa',cab:['Campo','Informação'],l:[['Razão social',E.razao||''],['CNPJ',E.cnpj?fmtCNPJ(E.cnpj):''],['Regime tributário',regimeTxt(E)],['CNAE',E.cnae||''],['Natureza jurídica',E.natJurid||''],['Município/UF',(E.municipio||'')+'/'+(E.uf||'')],['Ambiente eSocial',db.cfg.ambiente==1?'Produção':'Produção restrita (homologação)']]});
  if(has('estr')){S.push({t:'Estabelecimentos',cab:['Nome','Tipo','Inscrição','CNAE'],l:(db.estabs||[]).map(x=>[x.nome||'',x.tipoEstab||'',x.nrInsc||'',x.cnae||''])});S.push({t:'Lotações tributárias',cab:['Código','Descrição','Tipo'],l:(db.lotacoes||[]).map(x=>[x.cod||x.id,x.desc||'',x.tpLotacao||x.tipo||''])});}
  if(has('quadro')){const at=(db.empregados||[]).filter(e=>!e.desligamento),des=(db.empregados||[]).length-at.length;const massa=r2(at.reduce((s,e)=>s+num(e.salario),0));S.push({t:'Quadro de empregados',cab:['Indicador','Qtd','R$ Valor'],l:[['Empregados ativos',at.length,''],['Desligados',des,''],['Massa salarial contratual (ativos)','',massa],['Salário médio (ativos)','',at.length?r2(massa/at.length):0]]});}
  if(has('folha')){const l=comps.map(k=>{const t=withDB(db,()=>totaisComp(k));return [compLabel(k),db.comps[k].status,t.n,t.prov,t.desc,t.liq,t.inss,t.irrf,t.fgts];});if(l.length){const s=i=>r2(l.reduce((a,x)=>a+x[i],0));l.push(['TOTAL DO PERÍODO','','',s(3),s(4),s(5),s(6),s(7),s(8)]);}S.push({t:'Folha por competência',cab:['Competência','Situação','Qtd empregados','R$ Proventos','R$ Descontos','R$ Líquido','R$ INSS retido','R$ IRRF retido','R$ FGTS'],l,vazio:'Nenhuma competência calculada no período.'});}
  if(has('enc')){const l=comps.map(k=>{const t=withDB(db,()=>totaisComp(k));return [compLabel(k),t.pat,t.rat,t.terc,t.fgts,r2(t.pat+t.rat+t.terc+t.fgts)];});if(l.length){const s=i=>r2(l.reduce((a,x)=>a+x[i],0));l.push(['TOTAL DO PERÍODO',s(1),s(2),s(3),s(4),s(5)]);}S.push({t:'Encargos patronais estimados (informativo; não substitui DCTFWeb/FGTS Digital)',cab:['Competência','R$ CPP patronal','R$ RAT×FAP','R$ Terceiros','R$ FGTS','R$ Total'],l,vazio:'Nenhuma competência calculada no período.'});}
  if(has('evt')){const m={};(db.eventos||[]).forEach(e=>{const k=e.tipo+'|'+e.status;m[k]=(m[k]||0)+1;});S.push({t:'Eventos eSocial por tipo e situação',cab:['Evento','Situação','Qtd'],l:Object.keys(m).sort().map(k=>{const [t,s]=k.split('|');return [t,s,m[k]];}),vazio:'Nenhum evento gerado.'});}
  if(has('fer')){const rs=Object.keys(db.rescisoes||{}).length,d13=Object.keys(db.decimo||{}).length;S.push({t:'Férias, rescisões e 13º',cab:['Indicador','Qtd'],l:[['Períodos de férias registrados',(db.ferias||[]).length],['Rescisões registradas',rs],['Registros de 13º salário',d13]]});}
  if(has('sst'))S.push({t:'Saúde e segurança do trabalho',cab:['Indicador','Qtd'],l:[['CAT (S-2210)',(db.sstCat||[]).length],['ASO (S-2220)',(db.sstAso||[]).length],['Condições ambientais (S-2240)',(db.sstRisco||[]).length]]});
  if(has('conf')){const a=withDB(db,()=>{try{return conferirRegras();}catch(e){return[];}});const m={};a.forEach(x=>{m[x.sev]=(m[x.sev]||0)+1;});S.push({t:'Conferência de regras',cab:['Gravidade','Qtd','Exemplo'],l:Object.keys(m).map(k=>[k,m[k],(a.find(x=>x.sev===k)||{}).msg||'']),vazio:'Nenhum alerta.'});}
  return S;}
const relCel=(c,v)=>typeof v==='number'?(String(c).startsWith('R$')?brl(v):String(v)):esc(v==null?'':String(v));
function relHTML(rs,de,ate){const per=(de||ate)?`Período: ${de?compLabel(de):'início'} a ${ate?compLabel(ate):'último'}`:'Período: todas as competências';
  return `<div class="fch" style="page-break-inside:auto"><div class="fch-hd"><div><h4 style="margin:0;text-align:left">RELATÓRIO GERENCIAL POR EMPRESA</h4>${per}</div><div style="text-align:right">Emitido em ${fmtData(agoraISO().slice(0,10))}<br>${rs.length} empresa(s)</div></div>`+rs.map(r=>`<h3 style="margin:14px 0 4px;border-bottom:1px solid #444">${esc(r.nome)} <small>CNPJ ${fmtCNPJ(r.cnpj)}</small></h3>`+r.secoes.map(s=>`<h4 style="margin:8px 0 3px">${esc(s.t)}</h4>${s.l.length?`<table><thead><tr>${s.cab.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${s.l.map(x=>`<tr>${x.map((v,i)=>`<td ${typeof v==='number'?'style="text-align:right"':''}>${relCel(s.cab[i],v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`:`<div class="note">${esc(s.vazio||'Sem registros.')}</div>`}`).join('')).join('')+relConsol(rs)+'</div>';}
function relConsol(rs){if(rs.length<2)return '';const f=rs.map(r=>({n:r.nome,s:r.secoes.find(s=>s.t==='Folha por competência')})).filter(x=>x.s&&x.s.l.length);if(!f.length)return '';
  const l=f.map(x=>{const t=x.s.l[x.s.l.length-1];return [x.n,t[3],t[4],t[5],t[6],t[7],t[8]];});const s=i=>r2(l.reduce((a,x)=>a+x[i],0));l.push(['TOTAL GERAL',s(1),s(2),s(3),s(4),s(5),s(6)]);
  const cab=['Empresa','R$ Proventos','R$ Descontos','R$ Líquido','R$ INSS retido','R$ IRRF retido','R$ FGTS'];
  return `<h3 style="margin:16px 0 4px;border-bottom:1px solid #444">Consolidado das empresas selecionadas (folha no período)</h3><table><thead><tr>${cab.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${l.map(x=>`<tr>${x.map((v,i)=>`<td ${typeof v==='number'?'style="text-align:right"':''}>${relCel(cab[i],v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;}
function relGerar(){const ls=relEmpresas();const sel=REL.emps?ls.filter(x=>REL.emps.has(x.id)):ls;if(!sel.length){toast('Selecione ao menos uma empresa.','err');return null;}if(!REL.secs.size){toast('Selecione ao menos uma informação.','err');return null;}
  REL.out=sel.map(x=>{const d=relDbDe(x.id);return {nome:x.nome,cnpj:x.cnpj,secoes:d?relSecoes(d,REL.secs,REL.de,REL.ate):[]};});audit('relatorio.empresas',sel.length+' empresa(s); '+[...REL.secs].join(','));return REL.out;}
SC.relEmp={view(){const ls=relEmpresas();if(!REL.emps)REL.emps=new Set(ls.map(x=>x.id));
  const chk=(cls,v,on,l)=>`<label style="display:block;margin:3px 0"><input type="checkbox" class="${cls}" value="${esc(v)}" ${on?'checked':''}> ${esc(l)}</label>`;
  return `<h1>Relatórios por empresa</h1><p class="sub">Escolha uma, várias ou todas as empresas cadastradas e as informações que deseja no relatório. Visualize, imprima ou exporte em CSV.</p>
  ${ls.length?'':'<div class="note">Nenhuma empresa cadastrada.</div>'}
  <div class="grid"><div class="card" style="grid-column:span 6"><h2>Empresas</h2><label style="display:block;margin-bottom:6px"><input type="checkbox" id="relTodas" ${REL.emps.size===ls.length?'checked':''}> <b>Todas as empresas</b></label>${ls.map(x=>chk('relE',x.id,REL.emps.has(x.id),x.nome+' — '+(x.cnpj?fmtCNPJ(x.cnpj):'sem CNPJ')+(x.ativa?' (em uso)':''))).join('')}</div>
  <div class="card" style="grid-column:span 6"><h2>Informações do relatório</h2>${REL_SECS.map(s=>chk('relS',s[0],REL.secs.has(s[0]),s[1])).join('')}
  <div class="row" style="margin-top:8px"><b>Período:</b><input type="month" id="relDe" value="${REL.de}" style="padding:6px;border:1px solid #c7d0d9;border-radius:6px"> a <input type="month" id="relAte" value="${REL.ate}" style="padding:6px;border:1px solid #c7d0d9;border-radius:6px"><small>(em branco = todas as competências)</small></div></div></div>
  <div class="row" style="margin:10px 0"><button class="btn pri" data-act="relGerar">Gerar relatório</button><button class="btn" data-act="relPrintE">🖨 Imprimir</button><button class="btn" data-act="relCsvE">⬇ Exportar CSV</button></div>
  <div id="relOutE">${REL.out?relHTML(REL.out,REL.de,REL.ate):''}</div>`;},
  mount(){const ls=relEmpresas();const sync=()=>{REL.emps=new Set([...document.querySelectorAll('.relE:checked')].map(c=>c.value));REL.secs=new Set([...document.querySelectorAll('.relS:checked')].map(c=>c.value));REL.de=($('#relDe')||{}).value||'';REL.ate=($('#relAte')||{}).value||'';const t=$('#relTodas');if(t)t.checked=REL.emps.size===ls.length;};
    document.querySelectorAll('.relE,.relS,#relDe,#relAte').forEach(c=>c.addEventListener('change',sync));
    const t=$('#relTodas');t&&t.addEventListener('change',()=>{document.querySelectorAll('.relE').forEach(c=>c.checked=t.checked);sync();});}};
ACT.relGerar=()=>{const o=relGerar();if(o)$('#relOutE').innerHTML=relHTML(o,REL.de,REL.ate);};
ACT.relPrintE=()=>{const o=REL.out||relGerar();if(!o)return;$('#printarea').innerHTML=relHTML(o,REL.de,REL.ate);document.body.classList.add('printing');try{window.print();}catch(e){toast('Impressão indisponível neste ambiente.','err');}setTimeout(()=>{document.body.classList.remove('printing');$('#printarea').innerHTML='';},800);};
ACT.relCsvE=()=>{const o=relGerar();if(!o)return;const q=v=>'"'+String(v==null?'':typeof v==='number'?String(v).replace('.',','):v).replace(/"/g,'""')+'"';const rows=[['empresa','cnpj','secao','campo/competencia','coluna','valor'].map(q).join(';')];
  o.forEach(r=>r.secoes.forEach(s=>s.l.forEach(x=>x.forEach((v,i)=>{if(i>0||s.cab.length===1)rows.push([r.nome,r.cnpj,s.t,x[0],s.cab[i],v].map(q).join(';'));}))));dl('relatorio_empresas.csv','﻿'+rows.join('\n'),'text/csv');};
