/* ===================== Regras de negócio, SST, retornos e guias (turno 14) ===================== */
const empSel=()=>[['','Selecione o empregado…']].concat(DB.empregados.map(e=>[e.id,e.mat+' – '+e.nome]));
const empNome=id=>{const e=byId(DB.empregados,id);return e?e.nome:'—';};
const SN=[['N','Não'],['S','Sim']];

/* ---------- Convenção coletiva e pisos ---------- */
function pisosDe(c){return String(c&&c.pisos||'').split(/\n/).map(l=>l.split(';')).filter(a=>a.length>=2).map(a=>({chave:a[0].trim().toLowerCase(),valor:num(a[1])}));}
function pisoDoEmpregado(e){const c=byId(DB.cct,e.cct);if(!c)return 0;const car=byId(DB.cargos,e.cargo)||{};
  const ks=[e.cbo,car.cbo,car.cod,car.nome].filter(Boolean).map(x=>String(x).trim().toLowerCase());
  const p=pisosDe(c).find(x=>ks.includes(x.chave));return p?p.valor:0;}
crud('cct',{title:'Convenções coletivas e pisos',sub:'Pisos salariais, data-base e reajuste por convenção ou acordo coletivo. O vínculo do empregado à convenção é feito na aba “Regras de trabalho” do cadastro.',key:'id',list:()=>(DB.cct=DB.cct||[]),
  cols:[['nome','Convenção / acordo'],['sindicato','Sindicato'],['dataBase','Data-base',r=>r.dataBase?MESES[+r.dataBase-1]:''],['vig','Vigência',r=>fmtData(r.vigIni)+' a '+fmtData(r.vigFim)],['reaj','Reajuste',r=>r.reaj?r.reaj+'%':'—'],['n','Empregados',r=>DB.empregados.filter(e=>e.cct===r.id).length]],
  fields:r=>F('Nome da convenção / acordo','nome',r.nome,{req:1,w:4})+F('Sindicato','sindicato',r.sindicato,{w:4})+F('Data-base (mês)','dataBase',r.dataBase||'',{t:'select',opts:[['','—']].concat(MESES.map((m,i)=>[String(i+1),m])),w:2})
   +F('Vigência — início','vigIni',r.vigIni,{t:'date',w:2})+F('Vigência — fim','vigFim',r.vigFim,{t:'date',w:2})+F('Reajuste da data-base (%)','reaj',r.reaj||'',{w:2})+F('Jornada semanal (h)','jornSem',r.jornSem||'44',{w:2})
   +F('Adicional de hora extra (%)','he',r.he||'50',{w:2})
   +`<div class="f" style="grid-column:span 12"><label>Pisos (uma linha por função: CBO, código ou nome do cargo ; valor)</label><textarea name="pisos" rows="5" placeholder="414105;1850,00">${esc(r.pisos||'')}</textarea><small>Piso por categoria: CF, art. 7º, V. A convenção prevalece sobre a lei nos temas do CLT, art. 611-A, e não pode suprimir os do art. 611-B.</small></div>`});
SC.cct.actions=p=>(p.novo||p.edit!=null)?[{label:'Cancelar edição',act:'crudCancel'},{label:'💾 Salvar',act:'crudSave',cls:'pri',key:'save'}]:[{label:'Aplicar reajuste da data-base…',act:'cctReaj',cls:'pri'}];
ACT.cctReaj=()=>{const L=DB.cct||[];if(!L.length){toast('Cadastre uma convenção primeiro.','err');return;}
  modal(`<h3>Aplicar reajuste da data-base</h3><p class="sub">Atualiza o salário dos empregados vinculados, respeita o piso da função e gera o S-2206 de cada um.</p><div class="grid" id="mr">${F('Convenção','cctId',L[0].id,{t:'select',opts:L.map(c=>[c.id,c.nome]),w:6})+F('Reajuste (%)','pct',L[0].reaj||'',{w:3})+F('Vigência do reajuste','data',hojeISO(),{t:'date',w:3})}</div><div class="row" style="justify-content:flex-end"><button class="btn" data-act="closeModal">Cancelar</button> <button class="btn pri" data-act="cctReajOk">Aplicar e gerar S-2206</button></div>`);};
ACT.cctReajOk=()=>{const o=readForm($('#mr')),c=byId(DB.cct,o.cctId),pct=num(o.pct);if(!c||!o.data){toast('Informe a convenção e a data.','err');return;}
  let n=0;DB.empregados.filter(e=>e.cct===c.id&&e.situacao!=='desligado').forEach(e=>{const ant=num(e.salario);let nv=r2(ant*(1+pct/100));const pi=pisoDoEmpregado(e);if(pi>nv)nv=pi;if(nv===ant)return;
    e.salario=nv;const mov={id:uid('m'),tipo:'S-2206',empId:e.id,data:o.data,det:'Reajuste '+c.nome+': '+brl(ant)+' → '+brl(nv),novoSalario:nv,motivo:'CCT'};DB.movs.push(mov);const ev=criarEvento('S-2206',{id:e.id,mov});mov.evId=ev.id;n++;});
  saveDB();closeModal();toast(n+' empregado(s) reajustado(s); S-2206 gerados na biblioteca.','ok');refresh();};

/* ---------- Banco de horas ---------- */
crud('bh',{title:'Banco de horas',sub:'Créditos (positivo) e compensações (negativo) em horas. O saldo positivo é pago como hora extra de 50% na rescisão. A compensação por acordo individual escrito é limitada a seis meses (CLT, art. 59, §5º); por acordo ou convenção coletiva, a doze meses (art. 59, §2º) [VERIFICAR FONTE OFICIAL].',key:'id',list:()=>(DB.bh=DB.bh||[]),
  cols:[['data','Data',r=>fmtData(r.data)],['emp','Empregado',r=>esc(empNome(r.empId))],['h','Horas',r=>(num(r.h)>0?'+':'')+r.h],['obs','Observação'],['saldo','Saldo do empregado',r=>saldoBH(r.empId)+' h']],
  fields:r=>F('Empregado','empId',r.empId,{t:'select',opts:empSel(),req:1,w:4})+F('Data','data',r.data||hojeISO(),{t:'date',req:1,w:2})+F('Horas (+ crédito / − compensação)','h',r.h,{req:1,w:2})+F('Observação','obs',r.obs,{w:4}),
  validate:o=>{if(!num(o.h))return 'Informe as horas (positivo ou negativo).';return '';}});

/* ---------- SST: S-2210, S-2220, S-2240 ---------- */
const OCS=[['1','1 – CRM'],['2','2 – CREA'],['3','3 – Outro']];
crud('sstCat',{title:'CAT — Comunicação de acidente (S-2210)',sub:'Comunicação de acidente de trabalho. Prazo: até o primeiro dia útil seguinte ao da ocorrência; em caso de morte, de imediato (Lei 8.213/1991, art. 22) [VERIFICAR FONTE OFICIAL]. Os códigos das Tabelas 14, 15, 16 e 17 do leiaute devem ser conferidos no manual.',key:'id',tipo:'S-2210',list:()=>(DB.sstCat=DB.sstCat||[]),
  cols:[['dtAcid','Acidente',r=>fmtData(r.dtAcid)],['emp','Empregado',r=>esc(empNome(r.empId))],['tpCat','Tipo',r=>({1:'Inicial',2:'Reabertura',3:'Óbito'})[r.tpCat]||''],['cid','CID']],
  fields:r=>F('Empregado','empId',r.empId,{t:'select',opts:empSel(),req:1,w:4})+F('Data do acidente','dtAcid',r.dtAcid,{t:'date',req:1,w:2})+F('Hora (HHMM)','hrAcid',r.hrAcid,{w:2})+F('Tipo de acidente','tpAcid',r.tpAcid||'1',{t:'select',opts:[['1','1 – Típico'],['2','2 – Doença'],['3','3 – Trajeto']],w:2})+F('Tipo de CAT','tpCat',r.tpCat||'1',{t:'select',opts:[['1','1 – Inicial'],['2','2 – Reabertura'],['3','3 – Comunicação de óbito']],w:2})
   +F('Houve óbito?','obito',r.obito||'N',{t:'select',opts:SN,w:2})+F('Data do óbito','dtObito',r.dtObito,{t:'date',w:2})+F('Comunicado à polícia?','policia',r.policia||'N',{t:'select',opts:SN,w:2})+F('Iniciativa','iniciat',r.iniciat||'1',{t:'select',opts:[['1','1 – Empregador'],['2','2 – Ordem judicial'],['3','3 – Órgão fiscalizador']],w:3})+F('Houve afastamento?','houveAfast',r.houveAfast||'N',{t:'select',opts:SN,w:2})
   +F('Situação geradora (9 dígitos, Tabela 16)','sitGeradora',r.sitGeradora,{req:1,w:3})+F('Parte atingida (9 dígitos, Tabela 14)','parte',r.parte,{req:1,w:3})+F('Lateralidade','lateral',r.lateral||'0',{t:'select',opts:[['0','0 – Não aplicável'],['1','1 – Esquerda'],['2','2 – Direita'],['3','3 – Ambas']],w:2})+F('Agente causador (9 dígitos, Tabela 14/15)','agente',r.agente,{req:1,w:4})
   +F('Local — tipo','tpLocal',r.tpLocal||'1',{t:'select',opts:[['1','1 – Estabelecimento do empregador'],['2','2 – Estabelecimento de terceiro'],['3','3 – Via pública'],['4','4 – Área rural'],['5','5 – Embarcação'],['6','6 – Outros'],['9','9 – Outros']],w:4})+F('Tipo de logradouro (ex.: R)','tpLograd',r.tpLograd||'R',{w:2})+F('Logradouro','dscLograd',r.dscLograd,{req:1,w:4})+F('Número','nrLograd',r.nrLograd||'S/N',{w:2})+F('UF','uf',r.uf,{t:'select',opts:[''].concat(O.uf),w:2})
   +F('Data do atendimento','dtAtend',r.dtAtend,{t:'date',req:1,w:3})+F('Hora do atendimento (HHMM)','hrAtend',r.hrAtend,{req:1,w:3})+F('Internação?','intern',r.intern||'N',{t:'select',opts:SN,w:2})+F('Duração do tratamento (dias)','durTrat',r.durTrat||'0',{w:2})+F('Afastamento?','afast',r.afast||'N',{t:'select',opts:SN,w:2})
   +F('Lesão (9 dígitos, Tabela 17)','lesao',r.lesao,{req:1,w:3})+F('CID-10 (3 a 4 caracteres)','cid',r.cid,{req:1,w:2})+F('Diagnóstico provável','diag',r.diag,{w:4})+F('Emitente do atestado','nmEmit',r.nmEmit,{req:1,w:4})+F('Conselho','ideOC',r.ideOC||'1',{t:'select',opts:OCS,w:2})+F('Nº no conselho','nrOC',r.nrOC,{req:1,w:3})+F('UF do conselho','ufOC',r.ufOC,{t:'select',opts:[''].concat(O.uf),w:2})
   +F('Recibo da CAT original (reabertura/óbito)','recOrig',r.recOrig,{w:4})+F('Observações','obs',r.obs,{w:8}),
  validate:o=>{if(o.obito==='S'&&!o.dtObito)return 'Informe a data do óbito.';if(o.tpCat!=='1'&&!o.recOrig)return 'Reabertura e comunicação de óbito exigem o recibo da CAT original.';return '';}});
crud('sstAso',{title:'ASO — Monitoramento da saúde (S-2220)',sub:'Atestado de saúde ocupacional e exames (NR-7). O código do procedimento segue a Tabela 27 do eSocial (quatro dígitos) [VERIFICAR FONTE OFICIAL]. Dados de saúde: acesso restrito (LGPD, art. 11).',key:'id',tipo:'S-2220',list:()=>(DB.sstAso=DB.sstAso||[]),
  cols:[['dtAso','Data do ASO',r=>fmtData(r.dtAso)],['emp','Empregado',r=>esc(empNome(r.empId))],['tpExame','Tipo',r=>({0:'Admissional',1:'Periódico',2:'Retorno ao trabalho',3:'Mudança de risco',4:'Monitoração pontual',9:'Demissional'})[r.tpExame]||'']],
  fields:r=>F('Empregado','empId',r.empId,{t:'select',opts:empSel(),req:1,w:4})+F('Tipo do exame','tpExame',r.tpExame||'0',{t:'select',opts:[['0','0 – Admissional'],['1','1 – Periódico'],['2','2 – Retorno ao trabalho'],['3','3 – Mudança de risco ocupacional'],['4','4 – Monitoração pontual'],['9','9 – Demissional']],w:4})+F('Data do ASO','dtAso',r.dtAso,{t:'date',req:1,w:2})+F('Resultado','resAso',r.resAso||'1',{t:'select',opts:[['1','1 – Apto'],['2','2 – Inapto']],w:2})
   +F('Procedimento (Tabela 27, 4 dígitos)','proc',(r.exames&&r.exames[0]||{}).proc,{req:1,w:3})+F('Data do exame','dtExm',(r.exames&&r.exames[0]||{}).dt||r.dtAso,{t:'date',w:2})+F('Médico','medNome',r.medNome,{req:1,w:4})+F('CRM','medCRM',r.medCRM,{w:2})+F('UF do CRM','medUF',r.medUF,{t:'select',opts:[''].concat(O.uf),w:2})
   +F('Responsável pelo PCMSO — nome','respNome',r.respNome,{w:4})+F('CPF','respCpf',r.respCpf,{w:2})+F('CRM','respCRM',r.respCRM,{w:2})+F('UF','respUF',r.respUF,{t:'select',opts:[''].concat(O.uf),w:2}),
  validate:o=>{if(!/^\d{4}$/.test(String(o.proc||'').replace(/\D/g,'')))return 'Procedimento deve ter quatro dígitos (Tabela 27).';return '';}});
CR.sstAso.pos=o=>{o.exames=[{dt:o.dtExm||o.dtAso,proc:onlyD(o.proc)}];delete o.proc;delete o.dtExm;};
crud('sstRisco',{title:'Condições ambientais (S-2240)',sub:'Exposição a agentes nocivos por empregado (PGR, NR-1; LTCAT). O código do agente segue a Tabela 24 (NN.NN.NNN); “09.01.001” indica ausência de agente nocivo [VERIFICAR FONTE OFICIAL]. Informa a aposentadoria especial (Lei 8.213/1991, arts. 57 e 58).',key:'id',tipo:'S-2240',list:()=>(DB.sstRisco=DB.sstRisco||[]),
  cols:[['ini','Início',r=>fmtData(r.ini)],['emp','Empregado',r=>esc(empNome(r.empId))],['setor','Setor'],['codAg','Agente']],
  fields:r=>F('Empregado','empId',r.empId,{t:'select',opts:empSel(),req:1,w:4})+F('Início da condição','ini',r.ini,{t:'date',req:1,w:2})+F('Fim da condição','fim',r.fim,{t:'date',w:2})+F('Local do ambiente','localAmb',r.localAmb||'1',{t:'select',opts:[['1','1 – Estabelecimento do empregador'],['2','2 – Estabelecimento de terceiros']],w:4})
   +F('Setor / descrição do ambiente','setor',r.setor,{req:1,w:4})+F('Tipo de inscrição do local','tpInsc',r.tpInsc||'1',{t:'select',opts:[['1','1 – CNPJ'],['3','3 – CAEPF'],['4','4 – CNO']],w:2})+F('Inscrição do local','nrInsc',r.nrInsc||(DB.empresa?DB.empresa.cnpj:''),{req:1,w:3,mask:'cnpj'})+F('Descrição da atividade','ativ',r.ativ,{req:1,w:3})
   +F('Código do agente nocivo (NN.NN.NNN)','codAg',r.codAg||'09.01.001',{req:1,w:3})+F('Descrição do agente','dscAg',r.dscAg,{w:3})+F('Avaliação','tpAval',r.tpAval||'',{t:'select',opts:[['','—'],['1','1 – Critério quantitativo'],['2','2 – Critério qualitativo']],w:2})+F('Intensidade','intConc',r.intConc,{w:2})+F('Limite de tolerância','limTol',r.limTol,{w:2})+F('Unidade de medida (1–14)','unMed',r.unMed,{w:2})+F('Técnica de medição','tec',r.tec,{w:3})
   +F('EPC','epc',r.epc||'0',{t:'select',opts:[['0','0 – Não se aplica'],['1','1 – Não implementa'],['2','2 – Implementa']],w:2})+F('EPI','epi',r.epi||'0',{t:'select',opts:[['0','0 – Não se aplica'],['1','1 – Não utilizado'],['2','2 – Utilizado']],w:2})+F('CA do EPI / documento','docAval',r.docAval,{w:3})
   +F('Responsável pelos registros — CPF','respCpf',r.respCpf,{req:1,w:3})+F('Conselho','ideOC',r.ideOC||'1',{t:'select',opts:OCS,w:2})+F('Nº no conselho','nrOC',r.nrOC,{w:2})+F('UF','ufOC',r.ufOC,{t:'select',opts:[''].concat(O.uf),w:2})+F('Observações','obs',r.obs,{w:5}),
  validate:o=>{if(!/^\d{2}\.\d{2}\.\d{3}$/.test(o.codAg||''))return 'Código do agente deve seguir o formato NN.NN.NNN.';if(o.codAg!=='09.01.001'&&!o.tpAval)return 'Informe o critério de avaliação do agente.';return '';}});
/* o crudSalvar genérico não conhece o pós-processamento do ASO: ligamos aqui */
{const _cs=crudSalvar;crudSalvar=function(){const cfg=crudCfg();if(cfg&&cfg.pos){const f=$('#f');if(!f)return null;const o=readForm(f);const arr=cfg.list();const p=NAV.cur.params;const mis=faltando(f);if(mis.length){toast('Preencha: '+mis.join(', '),'err');return null;}
    if(cfg.validate){const m=cfg.validate(o);if(m){toast(m,'err');return null;}}cfg.pos(o);let rec;if(p.edit!=null){rec=arr.find(x=>String(x[cfg.key])===String(p.edit));Object.assign(rec,o);}else{rec=Object.assign({[cfg.key]:uid('r')},o);arr.push(rec);}
    saveDB();DIRTY=false;toast('Registro salvo.','ok');return rec;}return _cs();};}

/* ---------- Conferência de regras ---------- */
function conferirRegras(){const out=[],P=DB.params,comp=DB.cfg.comp,c=DB.comps[comp]||{res:{}};
  const add=(sev,e,msg,base)=>out.push({sev,emp:e?e.nome:'',msg,base});
  DB.empregados.filter(e=>e.situacao!=='desligado').forEach(e=>{
    const sal=num(e.salario),pi=pisoDoEmpregado(e);
    if(pi&&sal<pi)add('erro',e,'Salário '+brl(sal)+' abaixo do piso da convenção ('+brl(pi)+').','CF, art. 7º, V; convenção coletiva vinculada');
    if(sal>0&&sal<P.salMin&&(e.tpSal||'mensal')==='mensal'&&num(e.horasSem||44)>=44)add('alerta',e,'Salário mensal inferior ao mínimo nacional ('+brl(P.salMin)+').','CF, art. 7º, IV [VERIFICAR FONTE OFICIAL]');
    if((num(e.insal)>0||e.peric)&&(!e.laudoNum||!e.laudoData))add('erro',e,'Adicional de insalubridade/periculosidade sem laudo registrado.','CLT, art. 195');
    if(e.j1236&&!e.cct)add('alerta',e,'Jornada 12x36 sem convenção coletiva vinculada; exige acordo individual escrito ou norma coletiva.','CLT, art. 59-A');
    if(e.estabTipo&&e.estabFim&&e.estabFim>=hojeISO())add('info',e,'Estabilidade provisória ('+e.estabTipo+') vigente até '+fmtData(e.estabFim)+'; a dispensa sem justa causa é bloqueada na rescisão.','ADCT, art. 10, II; Lei 8.213/1991, art. 118; CLT, art. 543, §3º');
    if(e.pensaoModo&&e.pensaoModo!=='fixo'&&!num(e.pensaoPct))add('erro',e,'Pensão alimentícia por percentual sem o percentual informado.','Decisão judicial ou acordo homologado');
    const r=c.res&&c.res[e.id];
    if(r&&r.margem){const m=r.margem;if(m.usoEmp>m.limEmp+0.005)add('erro',e,'Consignado de empréstimo ('+brl(m.usoEmp)+') excede a margem de '+P.consig.emp+'% ('+brl(m.limEmp)+').','Lei 10.820/2003, art. 2º, §2º [VERIFICAR FONTE OFICIAL]');
      if(m.usoCar>m.limCar+0.005)add('erro',e,'Consignado de cartão ('+brl(m.usoCar)+') excede a margem de '+P.consig.cartao+'% ('+brl(m.limCar)+').','Lei 10.820/2003, art. 2º, §2º [VERIFICAR FONTE OFICIAL]');}
    const sb=saldoBH(e.id);if(sb>0){const velho=(DB.bh||[]).filter(x=>x.empId===e.id&&num(x.h)>0).map(x=>x.data).sort()[0];if(velho&&(Date.now()-new Date(velho).getTime())/864e5>180)add('alerta',e,'Banco de horas com saldo de '+sb+' h e crédito há mais de seis meses.','CLT, art. 59, §5º (acordo individual) [VERIFICAR FONTE OFICIAL]');}
    if(sb<0)add('alerta',e,'Banco de horas com saldo negativo de '+Math.abs(sb)+' h; descontar na rescisão só nos limites da CLT, art. 477, §5º.','CLT, art. 477, §5º');
    if((num(e.insal)>0||e.peric)&&!(DB.sstRisco||[]).some(x=>x.empId===e.id))add('alerta',e,'Empregado com adicional de risco sem S-2240 cadastrado.','Layout eSocial S-1.3, evento S-2240');
    if(!(DB.sstAso||[]).some(x=>x.empId===e.id&&String(x.tpExame)==='0'))add('info',e,'Sem ASO admissional (S-2220) cadastrado.','NR-7, item 7.5.x [VERIFICAR FONTE OFICIAL]');});
  return out;}
SC.regras={view(){const L=conferirRegras();const badge2=s=>s==='erro'?badge('Erro','err'):s==='alerta'?badge('Alerta','warn'):badge('Informação','blue');
  return `<h1>Conferência de regras de negócio</h1><p class="sub">Verifica pisos, laudos, estabilidade, consignado, banco de horas e jornada dos empregados ativos, na competência ${compLabel(DB.cfg.comp)}.</p>${exigeEmpresa()}
  <div class="card"><div class="tw"><table class="t"><thead><tr><th>Gravidade</th><th>Empregado</th><th>Ocorrência</th><th>Base</th></tr></thead><tbody>${L.map(x=>`<tr><td>${badge2(x.sev)}</td><td>${esc(x.emp)}</td><td>${esc(x.msg)}</td><td>${esc(x.base)}</td></tr>`).join('')||'<tr><td colspan="4" class="c" style="padding:16px;color:var(--mut)">Nenhuma ocorrência.</td></tr>'}</tbody></table></div></div>`;},actions:()=>[]};

/* ---------- Retornos S-5001, S-5002 e S-5011 ---------- */
function lerRetorno(xml){const d=new DOMParser().parseFromString(xml,'application/xml');if(d.querySelector('parsererror'))return null;
  const raiz=d.documentElement&&d.documentElement.firstElementChild;if(!raiz)return null;const nome=raiz.localName;
  const q=(el,n)=>el?Array.from(el.getElementsByTagName('*')).filter(x=>x.localName===n):[];
  const v1=(el,n)=>{const a=q(el,n)[0];return a?a.textContent.trim():'';};
  const somaN=(el,n)=>q(el,n).reduce((a,x)=>a+num(x.textContent),0);
  const per=v1(raiz,'perApur');
  if(nome==='evtBasesTrab')return{tipo:'S-5001',per,cpf:v1(raiz,'cpfTrab'),vrCpSeg:r2(somaN(q(raiz,'infoCpCalc')[0],'vrCpSeg')),vrDescSeg:r2(somaN(q(raiz,'infoCpCalc')[0],'vrDescSeg'))};
  if(nome==='evtIrrfBenef'){const cm=q(raiz,'consolidApurMen')[0]||q(raiz,'totApurMen')[0];return{tipo:'S-5002',per,cpf:v1(raiz,'cpfBenef'),vlrRendTrib:r2(somaN(cm,'vlrRendTrib')),vlrPrev:r2(somaN(cm,'vlrPrevOficial')),vlrCRMen:r2(somaN(cm,'vlrCRMen'))};}
  if(nome==='evtCS'){const cp=q(raiz,'infoCPSeg')[0];return{tipo:'S-5011',per,vrCpSeg:r2(somaN(cp,'vrCpSeg')),vrDescCP:r2(somaN(cp,'vrDescCP')),bases:r2(['vrBcCp00','vrBcCp15','vrBcCp20','vrBcCp25'].reduce((a,n)=>a+somaN(raiz,n),0)),fpas:q(raiz,'fpas').map(x=>x.textContent.trim()).filter((x,i,a)=>a.indexOf(x)===i).join(', ')};}
  return{tipo:'?',nome,per};}
function conciliar(comp){const c=DB.comps[comp],ret=(DB.ret||[]).filter(r=>r.per===comp),out=[];
  if(!c)return out;const tol=0.01;
  const linha=(esc2,item,calc,gov)=>out.push({esc2,item,calc:r2(calc),gov:r2(gov),dif:r2(gov-calc),ok:Math.abs(gov-calc)<=tol});
  const porCpf={};DB.empregados.forEach(e=>{if(c.res&&c.res[e.id])porCpf[onlyD(e.cpf)]=c.res[e.id];});
  ret.filter(r=>r.tipo==='S-5001').forEach(r=>{const x=porCpf[onlyD(r.cpf)];if(x)linha(r.cpf,'S-5001 — contribuição do segurado',x.inss,r.vrCpSeg);else out.push({esc2:r.cpf,item:'S-5001 — CPF sem cálculo na competência',calc:0,gov:r.vrCpSeg,dif:r.vrCpSeg,ok:false});});
  ret.filter(r=>r.tipo==='S-5002').forEach(r=>{const x=porCpf[onlyD(r.cpf)];if(x){linha(r.cpf,'S-5002 — IRRF retido',x.irrf+(x.irrfPlr||0),r.vlrCRMen);linha(r.cpf,'S-5002 — previdência oficial dedutível',x.inss,r.vlrPrev);}else out.push({esc2:r.cpf,item:'S-5002 — CPF sem cálculo na competência',calc:0,gov:r.vlrCRMen,dif:r.vlrCRMen,ok:false});});
  ret.filter(r=>r.tipo==='S-5011').forEach(r=>{const t=totaisComp(comp);linha('Empresa','S-5011 — contribuição dos segurados (total)',t.inss,r.vrCpSeg);});
  return out;}
SC.retornos={view(p){const comp=p.comp||DB.cfg.comp;const R=(DB.ret||[]).filter(r=>r.per===comp),C=conciliar(comp);
  return `<h1>Retornos do governo e conciliação</h1><p class="sub">Importe os totalizadores S-5001 (bases e contribuição por trabalhador), S-5002 (IRRF por beneficiário) e S-5011 (contribuições consolidadas) baixados do ambiente do eSocial. O sistema compara o valor apurado pelo governo com o calculado pela folha (tolerância de R$ 0,01).</p>${exigeEmpresa()}
  <div class="card"><div class="row"><div class="f"><label>Competência</label><input type="month" id="retComp" value="${comp}"></div><div class="f"><label>Arquivos XML de retorno</label><input type="file" id="retFile" accept=".xml" multiple></div><button class="btn pri" data-act="retImp">Importar</button></div>
  <p class="sub">A conexão direta com o webservice de consulta depende de certificado digital ICP-Brasil e de back-end próprio; por isso a importação é manual.</p></div>
  <div class="card"><h2>Retornos importados (${R.length})</h2><div class="tw"><table class="t"><thead><tr><th>Evento</th><th>CPF</th><th>Valores</th></tr></thead><tbody>${R.map(r=>`<tr><td>${r.tipo}</td><td>${esc(r.cpf||'—')}</td><td class="mono">${esc(Object.keys(r).filter(k=>!['tipo','per','cpf'].includes(k)).map(k=>k+': '+r[k]).join(' · '))}</td></tr>`).join('')||'<tr><td colspan="3" class="c" style="padding:16px;color:var(--mut)">Nenhum retorno importado.</td></tr>'}</tbody></table></div></div>
  <div class="card"><h2>Conciliação (governo × folha)</h2><div class="tw"><table class="t"><thead><tr><th>Referência</th><th>Item</th><th class="r">Folha</th><th class="r">Governo</th><th class="r">Diferença</th><th>Situação</th></tr></thead><tbody>${C.map(x=>`<tr><td>${esc(x.esc2)}</td><td>${esc(x.item)}</td><td class="r">${brl(x.calc)}</td><td class="r">${brl(x.gov)}</td><td class="r">${brl(x.dif)}</td><td>${x.ok?badge('Conciliado','ok'):badge('Divergente','err')}</td></tr>`).join('')||'<tr><td colspan="6" class="c" style="padding:16px;color:var(--mut)">Sem itens para conciliar.</td></tr>'}</tbody></table></div></div>`;},actions:()=>[]};
ACT.retImp=async()=>{const comp=$('#retComp').value,fs=Array.from($('#retFile').files||[]);if(!comp||!fs.length){toast('Informe a competência e selecione os arquivos.','err');return;}
  let n=0,bad=0;DB.ret=DB.ret||[];for(const f of fs){const t=await f.text();const r=lerRetorno(t);if(!r||r.tipo==='?'){bad++;continue;}r.per=comp;DB.ret=DB.ret.filter(x=>!(x.tipo===r.tipo&&x.cpf===r.cpf&&x.per===comp&&r.tipo!=='S-5011'));DB.ret.push(r);n++;}
  saveDB();toast(n+' retorno(s) importado(s)'+(bad?'; '+bad+' arquivo(s) ignorado(s) (não são S-5001/5002/5011).':'.'),bad?'err':'ok');refresh({comp});};

/* ---------- Guias: espelho de conferência com vencimentos ---------- */
const FERIADOS_FIXOS=['01-01','04-21','05-01','09-07','10-12','11-02','11-15','11-20','12-25'];
function diaUtilAnterior(d){const f=x=>FERIADOS_FIXOS.includes(x.toISOString().slice(5,10));while(d.getUTCDay()===0||d.getUTCDay()===6||f(d))d=new Date(d.getTime()-864e5);return d;}
function vencGuia(comp,dia){const [a,m]=comp.split('-').map(Number);return diaUtilAnterior(new Date(Date.UTC(m===12?a+1:a,m===12?0:m,dia))).toISOString().slice(0,10);}
SC.guias={view(p){const comp=p.comp||DB.cfg.comp,E=DB.empresa,T=totaisComp(comp),c=DB.comps[comp];const P=DB.params;
  const dInss=vencGuia(comp,P.venc.inss),dFgts=vencGuia(comp,P.venc.fgts);
  const plr=r2(c?Object.values(c.res||{}).reduce((a,r)=>a+(r.irrfPlr||0),0):0);const irTrab=r2(T.irrf-plr);
  const sn=E&&E.regime==='sn'&&E.anexo==='std';
  const rows=[['Contribuição previdenciária (segurados'+(sn?'':' + patronal, RAT e terceiros')+')',r2(T.inss+(sn?0:T.pat+T.rat+T.terc)),'DCTFWeb → DARF numerado (código de receita da folha)',dInss,'Lei 8.212/1991, art. 30, I, “b”; IN RFB 2.110/2022 [VERIFICAR FONTE OFICIAL]'],
   ['IRRF sobre rendimentos do trabalho',irTrab,'DCTFWeb → DARF numerado (código 0561)',dInss,'Lei 11.196/2005, art. 70 [VERIFICAR FONTE OFICIAL]'],
   ['IRRF sobre PLR',plr,'DCTFWeb → DARF numerado (código 3562)',dInss,'Lei 10.101/2000, art. 3º, §5º [VERIFICAR FONTE OFICIAL]'],
   ['FGTS mensal',T.fgts,'FGTS Digital — guia por empregador',dFgts,'Lei 8.036/1990, art. 15 [VERIFICAR FONTE OFICIAL]']].filter(r=>r[1]>0);
  const tot=r2(rows.reduce((a,r)=>a+r[1],0));
  return `<h1>Guias e vencimentos — ${compLabel(comp)}</h1><p class="sub">Espelho de conferência dos valores a recolher. As guias oficiais são emitidas na DCTFWeb (a partir do S-1299 e dos retornos S-5011/S-5012) e no FGTS Digital; este sistema não substitui a emissão nem transmite a DCTFWeb. Vencimentos antecipados para o dia útil anterior quando recaem em fim de semana ou feriado nacional fixo (feriados móveis, estaduais e municipais não são considerados).</p>${exigeEmpresa()}
  <div class="card"><div class="tw"><table class="t"><thead><tr><th>Obrigação</th><th class="r">Valor apurado</th><th>Onde emitir</th><th>Vencimento</th><th>Base legal</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r[0])}</td><td class="r">${brl(r[1])}</td><td>${esc(r[2])}</td><td>${fmtData(r[3])}</td><td>${esc(r[4])}</td></tr>`).join('')||'<tr><td colspan="5" class="c" style="padding:16px;color:var(--mut)">Calcule a folha da competência.</td></tr>'}<tr><td><b>Total</b></td><td class="r"><b>${brl(tot)}</b></td><td colspan="3"></td></tr></tbody></table></div>
  <p class="sub">O valor do DARF/FGTS Digital pode diferir do espelho por compensações, parcelamentos, deduções (salário-família, salário-maternidade) e retificações; confira com o totalizador S-5011 na tela “Retornos”.</p></div>`;},actions:()=>[]};
