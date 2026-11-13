
/* ===================== UI: infraestrutura ===================== */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const SC={},ACT={},CR={};
let NAV={stack:[],cur:{name:'home',params:{}}},DIRTY=false;
function toast(m,t){const d=document.createElement('div');d.className='tst '+(t||'');d.textContent=m;$('#toast').appendChild(d);setTimeout(()=>d.remove(),t==='err'?7000:3500);}
function modal(html,o){o=o||{};$('#modal').innerHTML=`<div class="mbox ${o.wide?'wide':''}">${o.title?`<div class="row sp"><h2>${esc(o.title)}</h2><button class="btn sm" data-act="closeModal">Fechar ✕</button></div>`:''}${html}</div>`;$('#modal').classList.add('on');}
function closeModal(){$('#modal').classList.remove('on');$('#modal').innerHTML='';}
function modalConfirm(msg,yes,o){o=o||{};modal(`<h2>${esc(o.title||'Confirmar')}</h2><p>${msg}</p><div class="row" style="justify-content:flex-end"><button class="btn" data-act="closeModal">${o.no||'Cancelar'}</button><button class="btn pri" id="mcy">${o.yes||'Confirmar'}</button></div>`);$('#mcy').onclick=()=>{closeModal();yes();};}
function guard(fn){if(!DIRTY)return fn();modalConfirm('Há alterações não salvas nesta tela. Deseja descartá-las?',()=>{DIRTY=false;fn();},{title:'Alterações não salvas',yes:'Descartar e continuar',no:'Ficar na tela'});}
function go(n,p){guard(()=>{NAV.stack.push(NAV.cur);NAV.cur={name:n,params:p||{}};render();});}
function back(){guard(()=>{const p=NAV.stack.pop();NAV.cur=p||{name:'home',params:{}};render();});}
function home(){guard(()=>{NAV.stack=[];NAV.cur={name:'home',params:{}};render();});}
function refresh(p){if(p)NAV.cur.params=Object.assign({},NAV.cur.params,p);const y=window.scrollY;render();window.scrollTo(0,y);}
const MENU=[['','home','⌂ Início'],['Cadastros','empresa','Empresa e regime (S-1000)'],['','estabs','Estabelecimentos (S-1005)'],['','lotacoes','Lotações tributárias (S-1020)'],['','estrutura','Mapa da estrutura e regras'],['','cargos','Cargos e CBO'],['','rubricas','Rubricas (S-1010)'],
 ['Departamento Pessoal','empregados','Empregados (S-2200)'],['','movs','Movimentações (S-2206/2230/2299)'],
 ['Folha de pagamento','lanc','Lançamentos do mês'],['','folha','Cálculo da folha'],['','ferias','Férias'],['','d13','13º salário'],['','resc','Rescisão (S-2299)'],['','holerite','Contracheques'],['','relat','Relatórios e guias'],
 ['eSocial','envio','Enviar competência'],['','biblioteca','Biblioteca de eventos'],['','integr','Webservice / Integração'],
 ['Planejamento tributário','painel','Painel gerencial (dashboards)'],['','cmp','Comparativo de regimes'],['Sistema','params','Parâmetros legais'],['','backup','Backup e dados']];
function renderSide(){const cur=NAV.cur.name==='empForm'?'empregados':NAV.cur.name;let h='';MENU.forEach(([g,k,l])=>{if(g)h+=`<h6>${g}</h6>`;h+=`<a data-act="nav" data-to="${k}" class="${k===cur?'on':''}">${l}</a>`;});$('#side').innerHTML=h;
  $('#topemp').innerHTML=DB.empresa?`<b>${esc(DB.empresa.razao)}</b><br>CNPJ ${fmtCNPJ(DB.empresa.cnpj)} · eSocial: ${DB.cfg.ambiente==1?'Produção':'Produção restrita'} · ${DB.cfg.modo==='sim'?'modo simulação':'webservice'}`:'Empresa não cadastrada';}
function renderBar(sc){const acts=(sc.actions?sc.actions(NAV.cur.params):[])||[];
  $('#bar').innerHTML=`<button class="btn" data-act="back" title="Alt+V">◀ Voltar</button><button class="btn" data-act="home" title="Alt+I">⌂ Tela inicial</button><span class="sp"></span><span class="hint">Alt+V voltar · Alt+I início · Alt+S salvar · Alt+E enviar</span>`+
  acts.map(a=>`<button class="btn ${a.cls||''}" data-act="${a.act}" ${a.arg!=null?`data-arg="${esc(a.arg)}"`:''} ${a.key?`data-primary="${a.key}"`:''}>${a.label}</button>`).join('');}
function render(){const sc=SC[NAV.cur.name];DIRTY=false;$('#main').innerHTML=sc.view(NAV.cur.params);renderBar(sc);renderSide();sc.mount&&sc.mount(NAV.cur.params);}
window.addEventListener('unhandledrejection',ev=>{const m=ev.reason&&ev.reason.message;if(m){toast(m,'err');ev.preventDefault();}});window.addEventListener('error',ev=>{if(ev.error&&/^Cadastro incompleto/.test(ev.error.message))toast(ev.error.message,'err');});
document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;if(ACT[a]){e.preventDefault();ACT[a](el,e);}});
document.addEventListener('input',e=>{if(e.target.closest('[data-form]'))DIRTY=true;});
document.addEventListener('focusout',e=>{const el=e.target;if(!el.dataset)return;const m=el.dataset.mask;if(m==='cpf')el.value=fmtCPF(el.value);else if(m==='cnpj')el.value=fmtCNPJ(el.value);else if(m==='cep')el.value=fmtCEP(el.value);if(el.dataset.t==='money'&&el.value!=='')el.value=brIn(num(el.value));});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();if(!e.altKey)return;const k=e.key.toLowerCase();
  if(k==='v'||e.key==='ArrowLeft'){back();e.preventDefault();}else if(k==='i'||e.key==='Home'){home();e.preventDefault();}
  else if(k==='s'){const b=$('[data-primary="save"]');b&&b.click();e.preventDefault();}else if(k==='e'){const b=$('[data-primary="send"]');b&&b.click();e.preventDefault();}});
ACT.back=()=>back();ACT.home=()=>home();ACT.closeModal=()=>closeModal();ACT.nav=el=>go(el.dataset.to);
ACT.go=el=>go(el.dataset.to,el.dataset.p?JSON.parse(el.dataset.p):{});

/* ---------- helpers de formulário ---------- */
function F(label,name,val,o){o=o||{};const t=o.t||'text',span=o.w?` style="grid-column:span ${o.w}"`:'';const v=val==null?'':val;
  const c=`name="${name}" ${o.req?'required':''} ${o.ro?'readonly':''} ${o.ph?`placeholder="${esc(o.ph)}"`:''} ${o.mask?`data-mask="${o.mask}"`:''} ${o.max?`maxlength="${o.max}"`:''}`;
  let inp;
  if(t==='select')inp=`<select ${c}>${(o.opts||[]).map(x=>{const [k,l]=Array.isArray(x)?x:[x,x];return `<option value="${esc(k)}" ${String(k)===String(v)?'selected':''}>${esc(l)}</option>`;}).join('')}</select>`;
  else if(t==='money')inp=`<input type="text" inputmode="decimal" data-t="money" ${c} value="${v===''?'':brIn(num(v))}">`;
  else if(t==='check')inp=`<label class="chk"><input type="checkbox" name="${name}" ${v?'checked':''}> ${esc(o.cl||'Sim')}</label>`;
  else if(t==='textarea')inp=`<textarea ${c} rows="${o.rows||3}">${esc(v)}</textarea>`;
  else inp=`<input type="${t}" ${c} ${o.list?`list="${o.list}"`:''} value="${esc(v)}">`;
  return `<div class="f"${span}><label>${esc(label)}${o.req?' <b class="rq">*</b>':''}</label>${inp}${o.hint?`<small>${o.hint}</small>`:''}</div>`;}
function readForm(root){const o={};$$('[name]',root).forEach(el=>{const n=el.name;if(el.type==='checkbox')o[n]=el.checked;else if(el.dataset.t==='money')o[n]=num(el.value);else o[n]=el.value.trim();});return o;}
function faltando(root){const m=[];$$('[required]',root).forEach(el=>{if(!el.value.trim()){const l=el.closest('.f');m.push(l?l.querySelector('label').textContent.replace('*','').trim():el.name);}});return m;}
const badge=(t,c)=>`<span class="badge b-${c||'gray'}">${esc(t)}</span>`;
const ST={gerado:['Gerado','gray'],enviado:['Enviado','blue'],processado:['Processado','ok'],rejeitado:['Rejeitado','err']};
const stBadge=ev=>ev?badge(ST[ev.status][0],ST[ev.status][1]):badge('Não enviado','warn');
const ultEv=(tipo,pred)=>DB.eventos.find(e=>e.tipo===tipo&&(!pred||pred(e)));
const compInput=(val)=>`<input type="month" id="compSel" value="${val}" style="padding:7px 9px;border:1px solid #c7d0d9;border-radius:6px;font:inherit">`;
const exigeEmpresa=()=>DB.empresa?'':`<div class="note err">Cadastre primeiro a <a style="cursor:pointer;text-decoration:underline" data-act="nav" data-to="empresa">empresa</a> (S-1000) — ela é a base de todo o sistema.</div>`;

/* ---------- opções (enumerações do leiaute) ---------- */
const O={
 sexo:[['M','Masculino'],['F','Feminino']],
 raca:[['1','Branca'],['2','Preta'],['3','Parda'],['4','Amarela'],['5','Indígena'],['6','Não informado']],
 estCiv:[['1','Solteiro(a)'],['2','Casado(a)'],['3','Divorciado(a)'],['4','Separado(a)'],['5','Viúvo(a)']],
 instr:[['01','Analfabeto'],['02','Até o 5º ano incompleto'],['03','5º ano completo'],['04','6º ao 9º ano'],['05','Fundamental completo'],['06','Médio incompleto'],['07','Médio completo'],['08','Superior incompleto'],['09','Superior completo'],['10','Pós-graduação'],['11','Mestrado'],['12','Doutorado']],
 categ:[['101','101 – Empregado geral (CLT)'],['103','103 – Aprendiz'],['105','105 – Contrato a termo (Lei 9.601/98)'],['106','106 – Trabalhador temporário']],
 classTrib:[['99','99 – Pessoas jurídicas em geral'],['01','01 – Simples Nacional, tributação previdenciária substituída'],['02','02 – Simples Nacional, tributação previdenciária substituída e não substituída'],['03','03 – Simples Nacional, tributação previdenciária não substituída'],],
 jornada:[['2','2 – Horário diário fixo, folga fixa (domingo)'],['3','3 – Horário diário fixo, folga fixa (exceto domingo)'],['4','4 – Horário diário fixo, folga variável'],['5','5 – Turno ininterrupto de revezamento'],['9','9 – Demais tipos de jornada']],
 tpDep:[['01','01 – Cônjuge'],['02','02 – Companheiro(a)'],['03','03 – Filho(a) ou enteado(a)'],['04','04 – Filho(a)/enteado(a) até 24 anos (universitário/técnico)']],
 uf:['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
};
const optSel=(arr,v)=>arr.map(x=>{const [k,l]=Array.isArray(x)?x:[x,x];return `<option value="${esc(k)}" ${String(k)===String(v)?'selected':''}>${esc(l)}</option>`;}).join('');

/* ===================== CRUD genérico (cadastros auxiliares) ===================== */
function crud(name,cfg){
  CR[name]=cfg;
  SC[name]={
    view(p){const rows=cfg.list();const ed=p.edit!=null?cfg.list().find(x=>x[cfg.key]===p.edit):null;
      const showForm=p.novo||ed;
      return `<h1>${cfg.title}</h1><p class="sub">${cfg.sub||''}</p>${exigeEmpresa()}${cfg.note?`<div class="note info">${typeof cfg.note==='function'?cfg.note():cfg.note}</div>`:''}
      ${showForm?`<div class="card" data-form id="f"><h2>${ed?'Editar':'Novo'} registro</h2><div class="grid">${cfg.fields(ed||cfg.novo&&cfg.novo()||{},!!ed)}</div></div>`:''}
      <div class="card"><div class="row sp"><h2>Registros (${rows.length})</h2>${cfg.noAdd?'':`<button class="btn pri" data-act="crudNovo">＋ Novo</button>`}</div>
      <div class="tw"><table class="t"><thead><tr>${cfg.cols.map(c=>`<th>${c[1]}</th>`).join('')}${cfg.tipo?'<th>eSocial</th>':''}<th></th></tr></thead><tbody>
      ${rows.map(r=>`<tr>${cfg.cols.map(c=>`<td>${c[2]?c[2](r):esc(r[c[0]])}</td>`).join('')}${cfg.tipo?`<td>${stBadge(ultEv(cfg.tipo,e=>e.gen.args.id===r[cfg.key]))}</td>`:''}
      <td class="r"><button class="btn sm" data-act="crudEdit" data-id="${esc(r[cfg.key])}">Editar</button> ${cfg.tipo?`<button class="btn sm send" data-act="crudSend" data-id="${esc(r[cfg.key])}">Enviar ${cfg.tipo}</button> `:''}${cfg.noDel?'':`<button class="btn sm danger" data-act="crudDel" data-id="${esc(r[cfg.key])}">Excluir</button>`}</td></tr>`).join('')||`<tr><td colspan="${cfg.cols.length+2}" class="c" style="color:var(--mut);padding:18px">Nenhum registro cadastrado.</td></tr>`}
      </tbody></table></div></div>`;},
    actions(p){const a=[];if(p.novo||p.edit!=null){a.push({label:'Cancelar edição',act:'crudCancel'},{label:'💾 Salvar',act:'crudSave',cls:'pri',key:'save'});if(cfg.tipo)a.push({label:'Salvar e enviar '+cfg.tipo+' ao eSocial',act:'crudSaveSend',cls:'send',key:'send'});}
      else if(cfg.tipo)a.push({label:'Enviar todos ('+cfg.tipo+') ao eSocial',act:'crudSendAll',cls:'send',key:'send'});return a;}
  };
}
const crudCfg=()=>CR[NAV.cur.name];
ACT.crudNovo=()=>refresh({novo:true,edit:null});
ACT.crudCancel=()=>guard(()=>refresh({novo:false,edit:null}));
ACT.crudEdit=el=>refresh({edit:el.dataset.id,novo:false});
ACT.crudDel=el=>{const cfg=crudCfg();modalConfirm('Excluir este registro? Eventos já enviados ao eSocial não são desfeitos por esta ação.',()=>{const a=cfg.list();const i=a.findIndex(x=>String(x[cfg.key])===el.dataset.id);if(i>=0)a.splice(i,1);saveDB();refresh();toast('Registro excluído.');},{yes:'Excluir'});};
function crudSalvar(){const cfg=crudCfg(),f=$('#f');if(!f)return null;const mis=faltando(f);if(mis.length){toast('Preencha: '+mis.join(', '),'err');return null;}
  const o=readForm(f),p=NAV.cur.params;if(cfg.validate){const m=cfg.validate(o);if(m){toast(m,'err');return null;}}
  const arr=cfg.list();let rec;if(p.edit!=null){rec=arr.find(x=>String(x[cfg.key])===String(p.edit));Object.assign(rec,o);}else{rec=Object.assign({[cfg.key]:uid('r')},o);arr.push(rec);}
  saveDB();DIRTY=false;toast('Registro salvo.','ok');return rec;}
ACT.crudSave=()=>{if(crudSalvar())refresh({novo:false,edit:null});};
ACT.crudSaveSend=async()=>{const cfg=crudCfg();const r=crudSalvar();if(!r)return;refresh({novo:false,edit:null});await enviarRegistro(cfg.tipo,r[cfg.key]);};
ACT.crudSend=async el=>{await enviarRegistro(crudCfg().tipo,el.dataset.id);};
ACT.crudSendAll=async()=>{const cfg=crudCfg();for(const r of cfg.list())await enviarRegistro(cfg.tipo,r[cfg.key],true);toast('Envio concluído. Veja a Biblioteca de eventos.','ok');refresh();};
async function enviarRegistro(tipo,id,quiet){if(!DB.empresa){toast('Cadastre a empresa primeiro.','err');return;}
  const ev=criarEvento(tipo,{id});const r=await enviarEventos([ev]);if(!quiet)resumoEnvio(r,[ev]);refresh();}
function resumoEnvio(r,evs){if(r.rej||r.err){modal(`<div class="note err">Envio com ocorrências.</div>${evs.filter(e=>e.status==='rejeitado'||e.status==='gerado').map(e=>`<p><b>${esc(e.tipo)} — ${esc(e.titulo)}</b><br>${(e.ocorr||[]).map(o=>'• '+esc(o)).join('<br>')||'Sem detalhes.'}</p>`).join('')}<div class="row" style="justify-content:flex-end"><button class="btn" data-act="closeModal">Fechar</button><button class="btn pri" data-act="nav" data-to="biblioteca">Abrir biblioteca</button></div>`,{title:'Retorno do envio'});}
  else toast(`Enviado: ${r.ok} evento(s) processado(s) com sucesso${DB.cfg.modo==='sim'?' (simulação)':''}.`,'ok');}

/* ---- cadastros auxiliares ---- */
const regimeTxt=E=>E&&E.regime?REGIMES[E.regime]+(E.regime==='sn'?' — '+({std:'Anexos I–III/V',iv:'Anexo IV',misto:'misto'})[E.anexo]:E.cprb?' — com CPRB':''):'regime não informado';
const TPEST={matriz:'Matriz',filial:'Filial',obra:'Obra (CNO)'};
function infoRatEstab(){const E=DB.empresa;if(!E)return '';if(ratIncide(E))return 'RAT e FAP incidem sobre a folha deste estabelecimento: grau de risco do CNAE (1, 2 ou 3) e FAP do ano.';return 'Simples Nacional (Anexos I–III/V): RAT já está no DAS; os campos ficam apenas como referência e não são enviados no S-1005.';}
crud('estabs',{title:'Estabelecimentos (S-1005)',sub:'Matriz, filiais e obras (CNO) onde há trabalhadores. É aqui que ficam o CNAE preponderante, o grau de risco (RAT) e o FAP.',tipo:'S-1005',key:'id',list:()=>DB.estabs,
  note:()=>`<b>Regras de estabelecimento.</b> (1) Deve existir uma única <b>matriz</b>, com o mesmo CNPJ do empregador. (2) <b>Filiais</b> têm o mesmo CNPJ-base (8 primeiros dígitos) e ordem diferente de 0001. (3) <b>Obras</b> usam o CNO (tipo 4). (4) Cada empregado é vinculado a um estabelecimento: é ele que define o <b>RAT×FAP</b> e o local de trabalho do S-2200. (5) ${infoRatEstab()} <br>Regime da empresa: <b>${esc(regimeTxt(DB.empresa))}</b>.`,
  cols:[['nome','Nome'],['tipoEstab','Natureza',r=>TPEST[r.tipoEstab]||'—'],['nrInsc','Inscrição',r=>r.tpInsc==1?fmtCNPJ(r.nrInsc):esc(r.nrInsc)],['cnae','CNAE'],['rat','RAT %',r=>ratIncide(DB.empresa)?esc(r.rat):'—'],['fap','FAP',r=>ratIncide(DB.empresa)?esc(r.fap):'—'],['n','Empregados',r=>String(DB.empregados.filter(e=>e.estab===r.id).length)]],
  novo:()=>({tipoEstab:DB.estabs.some(x=>x.tipoEstab==='matriz')?'filial':'matriz',tpInsc:'1',rat:2,fap:1,iniValid:DB.empresa?DB.empresa.iniValid:compAtual()}),
  fields:r=>F('Nome / identificação','nome',r.nome,{req:1,w:3})+F('Natureza','tipoEstab',r.tipoEstab||'matriz',{t:'select',opts:Object.entries(TPEST),w:2})+F('Tipo de inscrição','tpInsc',r.tpInsc,{t:'select',opts:[['1','1 – CNPJ'],['4','4 – CNO']],w:2})+F('Nº de inscrição','nrInsc',r.nrInsc,{req:1,w:3})+F('CNAE preponderante (7 dígitos)','cnae',r.cnae,{req:1,w:3})+F('Grau de risco / RAT (%)','rat',r.rat,{w:2,hint:'1, 2 ou 3'})+F('FAP','fap',r.fap,{w:2,hint:'0,5 a 2,0'})+F('Início de validade (AAAA-MM)','iniValid',r.iniValid,{t:'month',req:1,w:3})+`<div class="note info" style="grid-column:span 12">${infoRatEstab()}</div>`,
  validate:o=>{const E=DB.empresa;if(!E)return 'Cadastre a empresa antes.';const ed=NAV.cur.params.edit;
    o.nrInsc=onlyD(o.nrInsc);
    if(o.tpInsc==='1'){if(!cnpjValido(o.nrInsc))return 'CNPJ do estabelecimento inválido.';
      if(o.nrInsc.slice(0,8)!==onlyD(E.cnpj).slice(0,8))return 'O CNPJ do estabelecimento deve ter a mesma raiz (8 primeiros dígitos) do CNPJ do empregador.';
      if(o.tipoEstab==='matriz'&&o.nrInsc!==onlyD(E.cnpj))return 'A matriz deve ter o mesmo CNPJ do empregador ('+fmtCNPJ(E.cnpj)+').';
      if(o.tipoEstab==='filial'&&o.nrInsc===onlyD(E.cnpj))return 'Filial não pode ter o CNPJ da matriz.';
      if(o.tipoEstab==='obra')return 'Obra deve ser cadastrada com inscrição tipo 4 (CNO).';}
    else{if(o.tipoEstab!=='obra')return 'Inscrição CNO (tipo 4) só se aplica a obras.';if(o.nrInsc.length!==12)return 'O CNO deve ter 12 dígitos.';}
    if(onlyD(o.cnae).length!==7)return 'O CNAE deve ter 7 dígitos.';
    if(DB.estabs.some(x=>x.id!==ed&&x.tpInsc===o.tpInsc&&onlyD(x.nrInsc)===o.nrInsc))return 'Já existe estabelecimento com esta inscrição.';
    if(o.tipoEstab==='matriz'&&DB.estabs.some(x=>x.id!==ed&&x.tipoEstab==='matriz'))return 'Já existe uma matriz cadastrada.';
    if(ratIncide(E)){if(![1,2,3].includes(Number(o.rat)))return 'Informe o grau de risco (RAT) 1, 2 ou 3.';const f=num(o.fap);if(!(f>=0.5&&f<=2))return 'FAP deve estar entre 0,5 e 2,0.';}
    return null;}});
const TPLOT=[['01','01 – Atividade econômica da empresa (FPAS do enquadramento)'],['02','02 – Obra de construção civil, empreitada total'],['03','03 – Obra de construção civil, empreitada parcial']];
function infoLotacao(){const E=DB.empresa;if(!E||!E.regime)return 'Defina o regime tributário na tela da empresa.';
  if(E.regime==='sn'){const m=E.anexo==='misto';return `<b>Simples Nacional.</b> Terceiros: sempre 0000 (dispensados). ${E.anexo==='iv'?'Anexo IV: CPP 20% e RAT incidem na folha.':m?'Misto: marque em cada lotação se a atividade tem CPP <b>substituída</b> (sem CPP/RAT na folha) ou <b>não substituída</b> (CPP e RAT na folha).':'Anexos I–III/V: CPP e RAT já estão no DAS; nada de patronal é calculado na folha.'}`;}
  return `<b>${REGIMES[E.regime]}.</b> CPP 20%, RAT×FAP e terceiros incidem sobre a base previdenciária. O FPAS e o código de terceiros dependem do enquadramento (ex.: FPAS 515 → terceiros 0115; FPAS 507 → 0079 **).${E.cprb?' Com CPRB, indique em cada lotação se a atividade é desonerada.':''}`;}
crud('lotacoes',{title:'Lotações tributárias e departamentos (S-1020)',sub:'A lotação define como a folha é tributada para o grupo de empregados: FPAS, terceiros, atividade substituída (Simples misto) e CPRB.',tipo:'S-1020',key:'id',list:()=>DB.lotacoes,
  note:()=>`<b>Regras de lotação.</b> (1) Todo empregado precisa estar vinculado a uma lotação — é ela que vai no S-1200. (2) O <b>código</b> é único. (3) O <b>FPAS</b> (3 dígitos) e o <b>código de terceiros</b> (4 dígitos, Tabela 4) devem ser coerentes com o regime. (4) ${infoLotacao()}`,
  cols:[['cod','Código'],['desc','Departamento / descrição'],['tpLotacao','Tipo'],['fpas','FPAS'],['codTercs','Terceiros'],['inc','Incidências na folha',r=>{const R=regraLot(DB.empresa,r,compAtual(),DB.params);return [R.pat?badge('CPP'+(R.fator<100?' '+R.fator+'%':''),'blue'):'',R.rat?badge('RAT','blue'):'',R.terc?badge('Terceiros','blue'):''].join(' ')||badge('Só FGTS/segurado','gray');}],['n','Empregados',r=>String(DB.empregados.filter(e=>e.lotacao===r.id).length)]],
  novo:()=>({tpLotacao:'01',fpas:DB.empresa&&DB.empresa.regime==='sn'?'515':(DB.empresa&&DB.empresa.fpas)||'515',codTercs:DB.empresa&&DB.empresa.regime==='sn'?'0000':(FPAS_REF[(DB.empresa&&DB.empresa.fpas)||'515']||{terc:''}).terc,terceiros:DB.empresa&&DB.empresa.regime==='sn'?0:(DB.empresa&&DB.empresa.terceiros)||5.8,atvSimples:'sub',cprb:'sim'}),
  fields:r=>{const E=DB.empresa||{};return F('Código da lotação','cod',r.cod,{req:1,w:2})+F('Departamento / descrição','desc',r.desc,{req:1,w:4})+F('Tipo de lotação (Tabela 10)','tpLotacao',r.tpLotacao,{req:1,w:2,list:'dlTpLot',hint:'01 = atividade econômica da empresa'})+'<datalist id="dlTpLot">'+TPLOT.map(x=>`<option value="${x[0]}">${x[1]}</option>`).join('')+'</datalist>'
   +F('FPAS (3 dígitos)','fpas',r.fpas,{req:1,w:2,list:'dlFpas',max:3})+'<datalist id="dlFpas">'+Object.entries(FPAS_REF).map(([k,v])=>`<option value="${k}">${k} – ${v.nome}</option>`).join('')+'</datalist>'
   +F('Cód. terceiros (4 dígitos)','codTercs',r.codTercs,{req:1,w:2,max:4,hint:E.regime==='sn'?'Simples: 0000':'Tabela 4 do eSocial'})+F('Terceiros (%) p/ cálculo','terceiros',r.terceiros,{w:2,hint:E.regime==='sn'?'Simples: 0':'Soma das entidades do FPAS'})
   +(E.regime==='sn'&&E.anexo==='misto'?F('Atividade no Simples misto','atvSimples',r.atvSimples||'sub',{t:'select',opts:[['sub','CPP substituída (Anexos I–III/V)'],['nsub','CPP não substituída (Anexo IV)']],w:4,req:1}):'')
   +(E.regime!=='sn'&&E.cprb?F('Atividade desonerada (CPRB)','cprb',r.cprb||'sim',{t:'select',opts:[['sim','Sim — sujeita à CPRB'],['nao','Não — CPP integral']],w:4}):'')
   +`<div class="note info" style="grid-column:span 12">${infoLotacao()}</div>`;},
  validate:o=>{const E=DB.empresa;if(!E)return 'Cadastre a empresa antes.';const ed=NAV.cur.params.edit;
    if(DB.lotacoes.some(x=>x.id!==ed&&String(x.cod)===String(o.cod)))return 'Já existe lotação com este código.';
    if(!/^\d{3}$/.test(o.fpas))return 'FPAS deve ter exatamente 3 dígitos.';if(!/^\d{4}$/.test(o.codTercs))return 'Código de terceiros deve ter 4 dígitos (use 0000 se não houver).';
    if(E.regime==='sn'&&o.codTercs!=='0000')return 'Simples Nacional: terceiros dispensados — o código deve ser 0000 (LC 123/2006, art. 13, §3º).';
    if(E.regime!=='sn'&&o.codTercs==='0000')return 'Lucro Presumido/Real: informe o código de terceiros do FPAS (Tabela 4). 0000 só se a entidade não tiver terceiros.';
    if(E.regime==='sn')o.terceiros=0;
    return null;}});

crud('cargos',{title:'Cargos e CBO',sub:'Cadastro interno de cargos/funções. Para empresas privadas o eSocial recebe o cargo e o CBO dentro do S-2200 (não há tabela S-1030 para o setor privado).',key:'id',list:()=>DB.cargos,
  cols:[['cod','Código'],['nome','Cargo'],['cbo','CBO'],['sumula','Descrição sumária']],
  fields:r=>F('Código','cod',r.cod,{req:1,w:2})+F('Cargo / função','nome',r.nome,{req:1,w:4})+F('CBO (6 dígitos)','cbo',r.cbo,{req:1,w:2})+F('Descrição sumária','sumula',r.sumula,{w:4})});
crud('rubricas',{title:'Rubricas da folha (S-1010)',sub:'Verbas usadas pelo cálculo. Natureza (Tabela 3) e códigos de incidência (CP, IRRF, FGTS) precisam ser conferidos nas tabelas oficiais antes do envio em produção.',tipo:'S-1010',key:'sys',list:()=>DB.rubricas,noAdd:true,noDel:true,
  note:'As naturezas 1000 (salário), 1409 (salário-família), 9200 (desconto de adiantamentos), 9201 (contribuição previdenciária) e 9203 (IRRF) já vêm preenchidas conforme a Tabela 3. <b>As demais foram sugeridas a partir da Tabela 3 do leiaute S-1.3 e devem ser conferidas pelo responsável antes da transmissão</b>. Permanecem em branco, por não terem correspondência segura, as rubricas de outros proventos, outros descontos, terço sobre abono e terço sobre férias na rescisão. No modo webservice, o envio é bloqueado enquanto houver natureza em branco.',
  cols:[['cod','Cód.'],['desc','Descrição'],['tp','Tipo',r=>r.tp===1?'Provento':r.tp===2?'Desconto':'Informativa'],['nat','Natureza',r=>r.nat?esc(r.nat):badge('preencher','warn')],['incCP','CP'],['incIRRF','IRRF'],['incFGTS','FGTS'],['conf','Conferida',r=>r.conf?badge('Sim','ok'):badge('Não','gray')]],
  fields:r=>F('Código','cod',r.cod,{req:1,w:2})+F('Descrição','desc',r.desc,{req:1,w:4})+F('Natureza (Tabela 3)','nat',r.nat,{w:2})+F('Incidência CP','incCP',r.incCP,{req:1,w:1})+F('Incidência IRRF','incIRRF',r.incIRRF,{req:1,w:1})+F('Incidência FGTS','incFGTS',r.incFGTS,{req:1,w:1})+F('Conferida nas tabelas oficiais','conf',r.conf,{t:'check',w:3,cl:'Natureza e incidências conferidas'})});

/* ===================== EMPRESA (S-1000) ===================== */
SC.empresa={view(){const E=DB.empresa||{regime:'lp',anexo:'std',iniValid:compAtual(),classTrib:'99',rat:2,fap:1,terceiros:5.8,patronal:20,fpas:'515',codTercs:'0000',porte:'N',regEletron:'0',ctNome:'',uf:'PR'};
  return `<h1>Cadastro da empresa (evento S-1000)</h1><p class="sub">Informações do empregador. Base do eSocial, do cálculo dos encargos e do cabeçalho do contracheque.</p>
  <div data-form id="f">
  <div class="card"><h2>Identificação</h2><div class="grid">${F('CNPJ','cnpj',fmtCNPJ(E.cnpj),{req:1,w:3,mask:'cnpj'})+F('Razão social','razao',E.razao,{req:1,w:5})+F('Nome fantasia','fantasia',E.fantasia,{w:4})+F('Natureza jurídica (4 dígitos)','natJurid',E.natJurid,{w:3,list:'dlNat',hint:'Ex.: 2062 Sociedade Empresária Limitada'})+F('CNAE principal','cnae',E.cnae,{w:3})+F('Regime tributário','regime',E.regime||'lp',{t:'select',opts:Object.entries(REGIMES),w:3,req:1})+F('Enquadramento da CPP (Simples)','anexo',E.anexo||'std',{t:'select',opts:Object.entries(ANEXOS),w:5})+F('CPRB (desoneração da folha)','cprb',E.cprb,{t:'check',cl:'Atividade sujeita à CPRB (Lucro Presumido/Real)',w:4})+F('classTrib (derivado do regime)','classTribV',classTribDe(E)||'—',{ro:1,w:3,hint:'Tabela 8 do eSocial — calculado automaticamente'})+F('Porte','porte',E.porte,{t:'select',opts:[['N','Demais'],['S','ME/EPP']],w:2})+F('Entrega eletrônica obrigatória','regEletron',E.regEletron,{t:'select',opts:[['0','0 – Não'],['1','1 – Sim']],w:3})+F('Construtora','construtora',E.construtora,{t:'check',cl:'Empresa de construção civil (indConstr)',w:3})+F('Início de validade (AAAA-MM)','iniValid',E.iniValid,{t:'month',req:1,w:3})}</div><datalist id="dlNat"><option value="2062">2062 – Sociedade Empresária Limitada</option><option value="2135">2135 – Empresário (Individual)</option><option value="2305">2305 – Empresa Individual de Responsabilidade Limitada</option><option value="2054">2054 – Sociedade Anônima Fechada</option></datalist></div>
  <div class="card"><h2>Endereço</h2><div class="grid">${F('CEP','cep',fmtCEP(E.cep),{w:2,mask:'cep'})+F('Tipo','tpLograd',E.tpLograd||'R',{w:1})+F('Logradouro','logr',E.logr,{w:4})+F('Número','nr',E.nr,{w:1})+F('Complemento','compl',E.compl,{w:2})+F('Bairro','bairro',E.bairro,{w:3})+F('Município','municipio',E.municipio,{w:3})+F('Cód. IBGE (7 dígitos)','codMunic',E.codMunic,{w:2})+F('UF','uf',E.uf,{t:'select',opts:O.uf,w:1})}</div></div>
  <div class="card"><h2>Contato e responsável pelo envio</h2><div class="grid">${F('Nome do contato','ctNome',E.ctNome,{req:1,w:4})+F('CPF do contato','ctCpf',fmtCPF(E.ctCpf),{req:1,w:3,mask:'cpf'})+F('Telefone','ctFone',E.ctFone,{w:2})+F('E-mail','ctEmail',E.ctEmail,{w:3})}</div></div>
  <div class="card"><div class="row sp"><h2>Regras de incidência para o regime escolhido</h2><button class="btn sm" data-act="nav" data-to="cmp">Comparar com os outros regimes</button></div><div id="regraBox">${regraPanel(E)}</div></div>
  <div class="card"><h2>Valores de referência (usados quando o estabelecimento ou a lotação não informa os seus)</h2><div class="grid">${F('CPP patronal (%)','patronal',E.patronal,{w:2})+F('RAT (%)','rat',E.rat,{w:2})+F('FAP','fap',E.fap,{w:2})+F('Terceiros (%)','terceiros',E.terceiros,{w:2})+F('FPAS padrão','fpas',E.fpas,{w:2})+F('Terceiros padrão','codTercs',E.codTercs,{w:2})}</div><p class="sub" style="margin:8px 0 0">O RAT×FAP efetivo vem do <b>estabelecimento</b> do empregado; FPAS, terceiros, atividade substituída e CPRB vêm da <b>lotação</b>. Estes valores servem só de padrão para novos cadastros.</p></div>
  <div class="card"><h2>Certificado digital (e-CNPJ / e-CPF do procurador)</h2><div class="grid">${F('Tipo','certTipo',E.certTipo||'A1',{t:'select',opts:['A1','A3'],w:2})+F('Titular','certTitular',E.certTitular,{w:5})+F('Validade','certVal',E.certVal,{t:'date',w:2})}</div><div class="note info" style="margin:10px 0 0">O arquivo do certificado e sua senha <b>não são armazenados</b> neste sistema. A assinatura XML e a conexão com certificado ocorrem no serviço de integração (aba Webservice).</div></div></div>`;},
  actions:()=>[{label:'💾 Salvar empresa',act:'empSave',cls:'pri',key:'save'},{label:'Salvar e enviar S-1000 ao eSocial',act:'empSend',cls:'send',key:'send'}]};
function regraPanel(E){E=E||{};const rg=E.regime||'lp',an=E.anexo||'std',cp=!!E.cprb&&rg!=='sn';
  const T=(n,inc,base)=>`<tr><td>${n}</td><td class="c">${inc}</td><td>${base}</td></tr>`;const sim=badge('Sim','ok'),nao=badge('Não','gray'),par=(x)=>badge(x,'warn');
  let rows='',txt='';
  if(rg==='sn'){const iv=an==='iv',mx=an==='misto';
    rows=T('CPP patronal 20%',iv?sim:mx?par('só lotações não substituídas'):nao,'LC 123/2006, art. 13, §3º e art. 18, §5º-C (Anexo IV e atividades vedadas)')+T('RAT × FAP',iv?sim:mx?par('só lotações não substituídas'):nao,'Mesmo tratamento da CPP')+T('Terceiros (Sistema S, salário-educação, INCRA)',nao,'LC 123/2006, art. 13, §3º')+T('FGTS 8%',sim,'Lei 8.036/90, art. 15')+T('INSS do empregado e IRRF',sim,'Lei 8.212/91, art. 20; Lei 7.713/88');
    txt=`classTrib <b>${classTribDe(E)||classTribDe({regime:'sn',anexo:an})}</b>. `+(iv?'Anexo IV: a CPP não está no DAS; a folha apura CPP 20% e RAT.':mx?'Misto: a classificação 02 exige que cada lotação diga se a atividade é de CPP substituída ou não.':'A CPP está no DAS; a folha só apura FGTS, INSS do empregado e IRRF.');}
  else{rows=T('CPP patronal 20%',cp?par('reduzida (reoneração gradual)'):sim,cp?'Lei 14.973/2024 (reoneração progressiva da folha: 25% em 2025, 50% em 2026, 75% em 2027) **':'Lei 8.212/91, art. 22, I')+T('RAT × FAP',sim,'Lei 8.212/91, art. 22, II; Lei 10.666/2003, art. 10')+T('Terceiros (conforme FPAS)',sim,'Tabela 4 do eSocial')+T('FGTS 8%',sim,'Lei 8.036/90, art. 15')+T('INSS do empregado e IRRF',sim,'Lei 8.212/91, art. 20; Lei 7.713/88');
    txt=`classTrib <b>99</b>. ${REGIMES[rg]}: a folha tem a mesma incidência previdenciária; o regime afeta IRPJ/CSLL/PIS/COFINS, que não são tratados aqui. ${cp?'No S-1000, indDesFolha = 1.':'No S-1000, indDesFolha = 0.'}`;}
  return `<div class="tw"><table class="t"><thead><tr><th>Contribuição</th><th class="c">Incide na folha?</th><th>Base legal</th></tr></thead><tbody>${rows}</tbody></table></div><p class="sub" style="margin:8px 0 0">${txt}</p>`;}
SC.empresa.mount=()=>{const f=$('#f');if(!f)return;const upd=()=>{const o=readForm(f);const E={regime:o.regime,anexo:o.anexo,cprb:o.cprb&&o.regime!=='sn'};
  const an=f.querySelector('[name=anexo]').closest('.f'),cb=f.querySelector('[name=cprb]').closest('.f');an.style.display=o.regime==='sn'?'':'none';cb.style.display=o.regime==='sn'?'none':'';
  f.querySelector('[name=classTribV]').value=classTribDe(E);$('#regraBox').innerHTML=regraPanel(E);
  if(o.regime==='sn'){f.querySelector('[name=cprb]').checked=false;}};
  ['regime','anexo','cprb'].forEach(n=>f.querySelector('[name='+n+']').addEventListener('change',upd));upd();DIRTY=false;};
function empSalvar(){const f=$('#f'),mis=faltando(f);if(mis.length){toast('Preencha: '+mis.join(', '),'err');return false;}const o=readForm(f);
  if(!cnpjValido(o.cnpj)){toast('CNPJ inválido.','err');return false;}if(!cpfValido(o.ctCpf)){toast('CPF do contato inválido.','err');return false;}
  o.cnpj=onlyD(o.cnpj);o.ctCpf=onlyD(o.ctCpf);delete o.classTribV;if(o.regime==='sn')o.cprb=false;else o.anexo='std';o.classTrib=classTribDe(o);DB.empresa=Object.assign(DB.empresa||{},o);
  if(!DB.estabs.length)DB.estabs.push({id:uid('e'),nome:'Matriz',tipoEstab:'matriz',tpInsc:'1',nrInsc:o.cnpj,cnae:o.cnae||'',rat:o.rat,fap:o.fap,iniValid:o.iniValid});
  saveDB();DIRTY=false;toast('Empresa salva.','ok');return true;}
ACT.empSave=()=>{if(empSalvar())refresh();};
ACT.empSend=async()=>{if(!empSalvar())return;const alt=DB.eventos.some(e=>e.tipo==='S-1000'&&e.status==='processado');const ev=criarEvento('S-1000',{alt});const r=await enviarEventos([ev]);resumoEnvio(r,[ev]);refresh();};
