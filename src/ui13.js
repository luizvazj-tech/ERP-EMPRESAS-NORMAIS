
/* ===================== RUBRICAS: INCLUIR, PAUSAR E EXCLUIR ===================== */
/* Rubricas do sistema (salário, INSS, IRRF, FGTS, férias, 13º etc.) são estruturais: o cálculo depende delas e não podem ser pausadas nem excluídas.
   Rubricas incluídas pelo usuário (custom) entram no cálculo conforme vigência, público e pausas. Pausa vale a partir da competência indicada
   (inclusive); competências anteriores permanecem como foram calculadas. Excluir apaga a rubrica; se já foi usada em folha calculada, a exclusão
   é barrada (o histórico e os XML dependem dela) e a pausa é o caminho. */
const rubMesAnt=c=>compAdd(c,-1);
const rubUsadaEv=r=>rubricaUsada(r.sys)||(DB.eventos||[]).some(e=>e.tipo==='S-1010'&&e.gen&&e.gen.args&&e.gen.args.id===r.sys);
const rubSit=r=>{if(!r.custom)return badge('Sistema','gray');const hoje0=compAtual();const pz=(r.pausas||[]).find(p=>!p.ate);
  if(pz)return badge('Pausada desde '+pz.de.split('-').reverse().join('/'),'warn');
  if(r.fim&&r.fim<hoje0)return badge('Encerrada','gray');return badge('Ativa','ok');};
(function(){const cfg=CR.rubricas;if(!cfg)return;
  const campos0=cfg.fields;
  cfg.newLabel='＋ Incluir rubrica';
  cfg.novo=()=>{const mx=DB.rubricas.filter(r=>r.custom).map(r=>Number(r.cod)).filter(n=>n>=201&&n<=899);return{custom:true,cod:String((mx.length?Math.max(...mx):200)+1),tp:1,calc:'fixo',aplica:'todos',incCP:'11',incIRRF:'11',incFGTS:'11',ini:compAtual()};};
  cfg.fields=(r,ed)=>{let h=campos0(r,ed);if(!(r.custom||!ed))return h;
    const emps=(DB.empregados||[]).filter(e=>!e.desligamento).map(e=>`<label class="chk"><input type="checkbox" name="emp_${esc(e.id)}" ${(r.emps||[]).includes(e.id)?'checked':''}> ${esc(e.nome)}</label>`).join('');
    h+=F('Tipo da rubrica','tp',r.tp||1,{t:'select',opts:[['1','Provento (soma ao bruto)'],['2','Desconto (subtrai do líquido)']],w:3})
      +F('Forma de cálculo','calc',r.calc||'fixo',{t:'select',opts:[['fixo','Valor fixo mensal (R$)'],['pct','Percentual do salário contratual (%)']],w:3})
      +F('Valor (R$ ou %)','valor',r.valor,{t:'money',w:2,req:1})
      +F('Proporcionalidade no mês','prop',r.prop||'int',{t:'select',opts:[['int','Integral (todo mês de vigência)'],['adm','Proporcional à admissão e ao desligamento (dias/30)'],['dias','Proporcional aos dias trabalhados (admissão, desligamento e férias gozadas)']],w:6,hint:'Base de 30 dias, como no salário. Valor fixo e percentual são proporcionalizados do mesmo modo.'})
      +F('Início (AAAA-MM)','ini',r.ini,{t:'month',req:1,w:2})
      +F('Fim (AAAA-MM), opcional','fim',r.fim,{t:'month',w:2,hint:'Vazio = sem data de fim'})
      +F('Quem recebe','aplica',r.aplica||'todos',{t:'select',opts:[['todos','Todos os empregados'],['sel','Somente os selecionados abaixo']],w:3})
      +F('Desconto reduz as bases','reduz',r.reduz,{t:'check',cl:'Reduz as bases de INSS, IRRF e FGTS (só para desconto)',w:5})
      +`<div class="f" style="grid-column:1/-1"><label>Empregados (quando “somente os selecionados”)</label><div class="row" style="flex-wrap:wrap;gap:6px 16px">${emps||'<small>Nenhum empregado ativo cadastrado.</small>'}</div></div>`
      +`<div class="note info" style="grid-column:1/-1">Rubrica incluída por você: informe a <b>natureza (Tabela 3)</b> e as incidências (CP, IRRF, FGTS) conforme o Anexo I do leiaute **. O envio do S-1010 e do S-1200 fica bloqueado enquanto a natureza estiver em branco.</div>`;
    return h;};
  cfg.validate=o=>{const ed=NAV.cur.params.edit;const cur=ed!=null?DB.rubricas.find(x=>x.sys===ed):null;
    if(cur&&!cur.custom)return null;
    if(DB.rubricas.some(x=>x.cod===o.cod&&x!==cur))return 'Já existe rubrica com este código.';
    if(!(num(o.valor)>0))return 'Informe um valor maior que zero.';
    if(o.calc==='pct'&&num(o.valor)>100)return 'Percentual não pode ser maior que 100.';
    if(o.fim&&o.ini&&o.fim<o.ini)return 'O fim não pode ser anterior ao início.';
    if(cur&&cur.tp!==Number(o.tp)&&rubUsadaEv(cur))return 'Rubrica já usada em folha ou S-1010: não é possível mudar o tipo. Pause e inclua outra.';
    o.emps=[];Object.keys(o).forEach(k=>{if(k.startsWith('emp_')){if(o[k])o.emps.push(k.slice(4));delete o[k];}});
    if(o.aplica==='sel'&&!o.emps.length)return 'Selecione ao menos um empregado.';
    o.tp=Number(o.tp);o.custom=true;if(!['int','adm','dias'].includes(o.prop))o.prop='int';o.opt=1;if(o.tp!==2)o.reduz=false;
    if(!cur){o.pausas=[];audit('rubrica incluída',o.cod+' '+o.desc);}else audit('rubrica alterada',o.cod+' '+o.desc);
    return null;};
  cfg.noDel=r=>!r.custom;
  cfg.delCheck=r=>{if(!r||!r.custom)return 'Rubrica do sistema não pode ser excluída.';if(rubUsadaEv(r))return 'Esta rubrica já foi usada em folha calculada ou em evento S-1010 e não pode ser apagada (o histórico depende dela). Use “Pausar”: ela deixa de ser calculada a partir da competência escolhida.';return null;};
  cfg.delMsg='Excluir a rubrica? Ela será apagada definitivamente. Se apenas quiser que deixe de ser calculada, use “Pausar”.';
  cfg.rowBtns=r=>{if(!r.custom)return '';const pz=(r.pausas||[]).some(p=>!p.ate);return pz?`<button class="btn sm" data-act="rubRetomar" data-id="${esc(r.sys)}">Retomar</button> `:`<button class="btn sm" data-act="rubPausar" data-id="${esc(r.sys)}">Pausar</button> `;};
  cfg.cols=cfg.cols.slice();
  cfg.cols.splice(3,0,['calc','Cálculo',r=>r.custom?(r.calc==='pct'?esc(String(num(r.valor)).replace('.',','))+'% do salário':'R$ '+brIn(num(r.valor)))+(r.prop==='dias'?' · prop. dias trab.':r.prop==='adm'?' · prop. adm./deslig.':'')+(r.aplica==='sel'?' · '+(r.emps||[]).length+' empr.':''):'—']);
  cfg.cols.push(['sit','Situação',rubSit]);
})();
function rubModalMes(titulo,txt,def,btn,fn){modal(`<p>${txt}</p><div class="grid"><div class="f" style="grid-column:span 4"><label for="rubMes">Competência (AAAA-MM)</label><input type="month" id="rubMes" value="${esc(def)}"></div></div><div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn" data-act="closeModal">Cancelar</button><button class="btn pri" id="rubOk">${btn}</button></div>`,{title:titulo});
  $('#rubOk').onclick=()=>{const v=$('#rubMes').value;if(!/^\d{4}-\d{2}$/.test(v)){toast('Informe a competência.','err');return;}closeModal();fn(v);};}
ACT.rubPausar=el=>{const r=DB.rubricas.find(x=>x.sys===el.dataset.id);if(!r||!r.custom)return;
  rubModalMes('Pausar rubrica '+r.cod+' — '+r.desc,'A rubrica deixa de ser calculada <b>a partir</b> da competência escolhida (inclusive). Competências anteriores permanecem como estão. Você pode retomá-la depois.',compAtual(),'Pausar',v=>{
    const calc=Object.keys(DB.comps||{}).filter(k=>k>=v&&DB.comps[k].res&&Object.keys(DB.comps[k].res).length);
    const go=()=>{r.pausas=(r.pausas||[]).filter(p=>!(p.de>=v&&!p.ate));r.pausas.push({de:v});audit('rubrica pausada',r.cod+' desde '+v);saveDB();refresh();toast('Rubrica pausada a partir de '+v.split('-').reverse().join('/')+'.','ok');};
    if(calc.length)modalConfirm('Já existem competências calculadas a partir de '+v+' ('+calc.join(', ')+'). Elas só mudarão se você recalcular a folha; as fechadas devem ser reabertas antes. Pausar mesmo assim?',go,{yes:'Pausar'});else go();});};
ACT.rubRetomar=el=>{const r=DB.rubricas.find(x=>x.sys===el.dataset.id);if(!r||!r.custom)return;const pz=(r.pausas||[]).find(p=>!p.ate);if(!pz)return;
  rubModalMes('Retomar rubrica '+r.cod+' — '+r.desc,'A rubrica volta a ser calculada <b>a partir</b> da competência escolhida (inclusive). Pausada desde '+pz.de.split('-').reverse().join('/')+'.',compAtual()>pz.de?compAtual():pz.de,'Retomar',v=>{
    if(v<=pz.de)r.pausas=r.pausas.filter(p=>p!==pz);else pz.ate=rubMesAnt(v);
    audit('rubrica retomada',r.cod+' desde '+v);saveDB();refresh();toast('Rubrica retomada a partir de '+v.split('-').reverse().join('/')+'.','ok');});};
