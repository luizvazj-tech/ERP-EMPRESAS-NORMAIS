
/* ===================== MODO SERVIDOR: contas, usuários, permissões por módulo, MFA e licença ===================== */
/* Ativo quando o build define a URL da API (<meta name="fp-api">). Os dados passam a ficar no servidor (nada fica no navegador),
   cada usuário entra com e-mail, senha e código MFA, e o servidor — não o navegador — decide o que cada um pode ler e gravar. */
const FPAPI=(()=>{const m=document.querySelector('meta[name="fp-api"]');const v=m&&m.content||'';return v&&v.indexOf('%%')<0?v.replace(/\/+$/,''):'';})();
window.__SVON=!!FPAPI;
const SV={on:!!FPAPI,snap:{},tok:null,user:null,conta:null,emp:null,ver:0,perms:{},lic:'ativa',t:null,busy:false,again:false,cache:{}};
const SV_NIV=['Sem acesso','Visualizar','Editar','Aprovar / transmitir','Administrar'];
const SV_MODN={cadastros:'Cadastros e DP',folha:'Folha de pagamento',ferias:'Férias, 13º e rescisão',esocial:'eSocial',sst:'Saúde e segurança (SST)',historico:'Histórico e controle interno',relatorios:'Relatórios e painéis',config:'Parâmetros e configurações',usuarios:'Usuários e permissões',auditoria:'Registro de ações',contabil:'Contabilidade',financeiro:'Financeiro e arquivos bancários'};
const SV_PERFN={admin:'Administrador',dp:'Departamento pessoal',aprovador:'Aprovador',consulta:'Consulta',auditor:'Auditor',custom:'Personalizado'};
const SV_PAG={ctbLanc:'contabil',ctbPlano:'contabil',ctbParam:'contabil',ctbBal:'contabil',finTit:'financeiro',finContas:'financeiro',bcoRem:'financeiro',empresa:'cadastros',estabs:'cadastros',lotacoes:'cadastros',estrutura:'cadastros',cargos:'cadastros',rubricas:'cadastros',empregados:'cadastros',empForm:'cadastros',movs:'cadastros',cct:'cadastros',bh:'cadastros',regras:'cadastros',
 sstCat:'sst',sstAso:'sst',sstRisco:'sst',saude:'sst',hist:'historico',hAdv:'historico',hCurso:'historico',atest:'historico',lanc:'folha',folha:'folha',d13:'folha',holerite:'folha',ficha:'folha',ferias:'ferias',resc:'ferias',
 relEmp:'relatorios',relat:'relatorios',painel:'relatorios',cmp:'relatorios',envio:'esocial',biblioteca:'esocial',retornos:'esocial',guias:'esocial',integr:'esocial',params:'config',backup:'config',marca:'config',usuarios:'usuarios',auditSrv:'auditoria'};
const svNivel=m=>!SV.on?4:(m?(+SV.perms[m]||0):4);
const svPagNivel=p=>svNivel(SV_PAG[p]);
async function svApi(m,p,b,opt){const h={'Content-Type':'application/json'};if(SV.tok)h.Authorization='Bearer '+SV.tok;let r;
  try{r=await fetch(FPAPI+p,{method:m,headers:h,body:b===undefined?undefined:JSON.stringify(b)});}catch(e){return{s:0,j:{erro:'Sem conexão com o servidor.'}};}
  let j={};try{j=await r.json();}catch(e){}if(r.status===401&&SV.tok&&!(opt&&opt.semLogout)){SV.tok=null;svTelaLogin('Sessão expirada. Entre novamente.');}return{s:r.status,j};}
/* ---------- telas de acesso ---------- */
const svBrand=()=>`<h1 id="gt">${esc(BRAND.nome)} ${esc(BRAND.produto)}</h1>`;
function svTelaLogin(msg,pedeCodigo,email){SV.t&&clearTimeout(SV.t);DB=null;$('#main').innerHTML='';$('#side').innerHTML='';$('#bar').innerHTML='';$('#topemp').textContent='Acesso restrito';
  gate(`${svBrand()}<p>${msg?'<b>'+esc(msg)+'</b><br>':''}Entre com seu usuário e senha.</p><div class="f"><label for="sve">E-mail</label><input id="sve" type="email" autocomplete="username" value="${esc(email||'')}"></div><div class="f"><label for="svs">Senha</label><input id="svs" type="password" autocomplete="current-password"></div>${pedeCodigo?'<div class="f"><label for="svc">Código do aplicativo autenticador (6 dígitos)</label><input id="svc" inputmode="numeric" autocomplete="one-time-code" maxlength="7"></div>':''}<div class="row" style="margin-top:10px"><button class="btn pri" id="svok">Entrar</button></div><p id="sver" class="note err" style="display:none"></p>`);
  const go2=async()=>{const e=$('#sve').value.trim(),s=$('#svs').value,c=$('#svc')?$('#svc').value:'';$('#svok').disabled=true;const r=await svApi('POST','/api/auth/login',{email:e,senha:s,codigo:c||undefined},{semLogout:1});$('#svok').disabled=false;
    if(r.s!==200){const x=$('#sver');x.textContent=r.j.erro||'Falha no acesso.';x.style.display='block';return;}
    if(r.j.exigeCodigo){svTelaLogin('',true,e);$('#svs').value=s;const c2=$('#svc');c2&&c2.focus();return;}
    SV.tok=r.j.token;SV.user=r.j.usuario;
    if(r.j.escopo==='trocar-senha')return svTelaSenha(s,true);
    if(r.j.escopo==='mfa')return svTelaMfa();
    svEntrar();};
  $('#svok').onclick=go2;gate_enter(go2);}
function gate_enter(fn){const g=document.getElementById('gate');if(g)g.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT'){e.preventDefault();fn();}});}
function svTelaSenha(atual,obrig){gate(`${svBrand()}<p>${obrig?'Primeiro acesso: defina uma nova senha.':'Alterar senha.'} Mínimo de 12 caracteres, com ao menos três entre minúscula, maiúscula, número e símbolo.</p>${atual===undefined?'<div class="f"><label for="sva">Senha atual</label><input id="sva" type="password" autocomplete="current-password"></div>':''}<div class="f"><label for="svn">Nova senha</label><input id="svn" type="password" autocomplete="new-password"></div><div class="f"><label for="svn2">Repita a nova senha</label><input id="svn2" type="password" autocomplete="new-password"></div><div class="row" style="margin-top:10px"><button class="btn pri" id="svok">Salvar senha</button>${obrig?'':'<button class="btn" id="svcx">Cancelar</button>'}</div><p id="sver" class="note err" style="display:none"></p>`);
  const x=m=>{const e=$('#sver');e.textContent=m;e.style.display='block';};
  const f=async()=>{const n=$('#svn').value;if(n!==$('#svn2').value)return x('As senhas não coincidem.');const a=atual!==undefined?atual:$('#sva').value;const r=await svApi('POST','/api/auth/senha',{atual:a,nova:n});if(r.s!==200)return x(r.j.erro||'Falha.');
    if(r.j.escopo==='mfa')return svTelaMfa();if(obrig)return svEntrar();gateClose();toast('Senha alterada.','ok');};
  $('#svok').onclick=f;gate_enter(f);const c=$('#svcx');if(c)c.onclick=()=>gateClose();}
async function svTelaMfa(){const r=await svApi('POST','/api/auth/mfa/iniciar',{});if(r.s!==200){svTelaLogin(r.j.erro||'Falha ao iniciar o MFA.');return;}
  gate(`${svBrand()}<p>O acesso exige verificação em duas etapas. No aplicativo autenticador (Google Authenticator, Microsoft Authenticator, Authy etc.), adicione uma conta <b>manualmente</b> com a chave abaixo (tipo: baseada em tempo) e informe o código de 6 dígitos.</p><p><b>Chave:</b> <code id="svk" style="font-size:1.1em;letter-spacing:2px;user-select:all">${esc(r.j.segredo)}</code></p><p class="sub">Guarde a chave em local seguro: sem ela e sem o aplicativo, só o administrador pode reiniciar seu acesso.</p><div class="f"><label for="svc">Código de 6 dígitos</label><input id="svc" inputmode="numeric" maxlength="7"></div><div class="row" style="margin-top:10px"><button class="btn pri" id="svok">Ativar e entrar</button></div><p id="sver" class="note err" style="display:none"></p>`);
  const f=async()=>{const q=await svApi('POST','/api/auth/mfa/confirmar',{codigo:$('#svc').value});if(q.s!==200){const e=$('#sver');e.textContent=q.j.erro||'Código inválido.';e.style.display='block';return;}svEntrar();};$('#svok').onclick=f;gate_enter(f);}
/* ---------- escolha da empresa e carga dos dados ---------- */
async function svEntrar(){const r=await svApi('GET','/api/auth/eu');if(r.s!==200){svTelaLogin(r.j.erro||'Falha no acesso.');return;}SV.user=r.j.usuario;SV.conta=r.j.conta;SV.lic=r.j.conta.estado;
  const ls=await svApi('GET','/api/empresas');const es=ls.j.empresas||[];
  const pode=SV.user.perfil==='admin'||(+(SV.user.perms||{}).cadastros||0)>=3;
  const lista=es.map(e=>`<button class="btn" data-act="svAbrir" data-id="${esc(e.id)}" style="display:block;width:100%;text-align:left;margin:4px 0"><b>${esc(e.nome||'(sem nome)')}</b>${e.cnpj?' · '+esc(fmtCNPJ(e.cnpj)):''} · ${e.vinculos} vínculo(s)</button>`).join('');
  gate(`${svBrand()}<p>Olá, <b>${esc(SV.user.nome)}</b>. ${es.length?'Escolha a empresa:':'Nenhuma empresa disponível para o seu usuário.'}</p>${lista}${pode?'<div class="row" style="margin-top:10px"><button class="btn pri" data-act="svNovaEmp">＋ Nova empresa</button></div>':''}<div class="row" style="margin-top:8px"><button class="btn" data-act="svSair">Sair</button></div><p class="sub">Plano ${esc(SV.conta.plano)} · ${SV.conta.uso.empresas}/${SV.conta.limites.empresas} empresas · ${SV.conta.uso.vinculos}/${SV.conta.limites.vinculos} vínculos · ${SV.conta.uso.usuarios}/${SV.conta.limites.usuarios} usuários${SV.lic!=='ativa'?' · <b>licença '+esc(SV.lic)+'</b>':''}</p>`);}
ACT.svNovaEmp=()=>{modal(`<div class="f"><label for="svnn">Nome da empresa</label><input id="svnn"></div><div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn" data-act="closeModal">Cancelar</button><button class="btn pri" id="svnok">Criar</button></div>`,{title:'Nova empresa'});
  $('#svnok').onclick=async()=>{const n=$('#svnn').value.trim();if(!n){toast('Informe o nome.','err');return;}const r=await svApi('POST','/api/empresas',{nome:n});closeModal();if(r.s!==200){toast(r.j.erro||'Falha ao criar.','err');return;}svAbrir(r.j.empresa.id);};};
ACT.svAbrir=el=>svAbrir(el.dataset.id);
async function svAbrir(id){const r=await svApi('GET','/api/empresas/'+encodeURIComponent(id)+'/dados');if(r.s!==200){toast(r.j.erro||'Não foi possível abrir a empresa.','err');return;}
  SV.emp=id;SV.ver=r.j.versao;SV.perms=r.j.permissoes||{};SV.lic=r.j.licenca||SV.lic;DB=r.j.dados?loadDB(JSON.stringify(r.j.dados)):emptyDB();SV.snap=svSnapDe();
  gateClose();wrapAudit();NAV={stack:[],cur:{name:'home',params:{}}};
  if(!$('#svsair')){const b=document.createElement('button');b.id='svsair';b.dataset.act='svSair';b.textContent='⎋ Sair';b.title='Encerrar a sessão';$('#top').appendChild(b);const t=document.createElement('button');t.id='svtroca';t.dataset.act='svTroca';t.textContent='⇄ Empresa';t.title='Trocar de empresa';$('#top').appendChild(t);}
  render();}
ACT.svSair=async()=>{await svFlush();await svApi('POST','/api/auth/logout',{},{semLogout:1});SV.tok=null;SV.emp=null;svTelaLogin('Sessão encerrada.');};
ACT.svTroca=async()=>{await svFlush();DB=null;svEntrar();};
/* ---------- sincronização ---------- */
const SV_IGN=new Set(['audit','_emps','_id','_exemplo','ver']);
const svSnapDe=()=>{const o={};Object.keys(DB).forEach(k=>{if(!SV_IGN.has(k))o[k]=JSON.stringify(DB[k]);});return o;};
function svAgendar(){clearTimeout(SV.t);SV.t=setTimeout(svPush,700);}
/* envia só as chaves alteradas desde a última sincronização (o ruído de migração/normalização do carregamento não conta) */
async function svPush(){if(!SV.on||!SV.tok||!SV.emp||!DB)return;if(SV.busy){SV.again=true;return;}SV.busy=true;SV.t=null;
  try{do{SV.again=false;const atual=svSnapDe(),mud={},env={};Object.keys(atual).forEach(k=>{if(atual[k]!==SV.snap[k]&&DB[k]!==undefined){mud[k]=JSON.parse(atual[k]);env[k]=atual[k];}});if(!Object.keys(mud).length)break;
    const r=await svApi('PUT','/api/empresas/'+encodeURIComponent(SV.emp)+'/dados',{versao:SV.ver,mudancas:mud});
    if(r.s===200){SV.ver=r.j.versao;Object.assign(SV.snap,env);DIRTY=false;
      const o=r.j.outras||{};const ks=Object.keys(o);if(ks.length){ks.forEach(k=>{DB[k]=o[k];SV.snap[k]=JSON.stringify(o[k]);});toast('Dados atualizados com alterações de outro usuário ('+ks.join(', ')+').','ok');if(NAV&&NAV.cur&&!DIRTY&&!document.querySelector('#modal.on'))render();}}
    else if(r.s===409){modal(`<p>Outro usuário alterou os mesmos dados desta empresa (${esc((r.j.chaves||[]).join(', '))}). Recarregue para continuar; as suas alterações ainda não gravadas nessas partes serão descartadas.</p><div class="row" style="justify-content:flex-end"><button class="btn pri" data-act="svRecarregar">Recarregar</button></div>`,{title:'Dados alterados por outro usuário'});SV.again=false;}
    else if(r.s===403||r.s===402){toast(r.j.erro||'Gravação não permitida.','err');SV.again=false;svRecarregar();}
    else if(r.s!==401){toast(r.j.erro||'Falha ao gravar no servidor.','err');}
  }while(SV.again);}finally{SV.busy=false;}}
async function svFlush(){clearTimeout(SV.t);if(SV.on&&SV.tok&&SV.emp&&DB){await svPush();while(SV.busy)await new Promise(r=>setTimeout(r,20));}}
function svRecarregar(){closeModal();if(SV.emp)svAbrir(SV.emp);}
ACT.svRecarregar=()=>svRecarregar();
/* ---------- permissões na interface (o servidor é quem decide; aqui só se evita frustração) ---------- */
(function(){const _sg=sideGrupos;sideGrupos=function(){const gs=_sg();if(!SV.on)return gs;
    return gs.map(g=>({n:g.n,it:g.it.filter(([k])=>{if(['seguranca','auditoria','privacidade'].includes(k))return k==='privacidade';return svPagNivel(k)>=1;})})).filter(g=>g.it.length);};
  const _go=go;go=function(n,p){if(SV.on&&svPagNivel(n)<1){toast('Seu perfil não tem acesso a este módulo.','err');return;}return _go(n,p);};
  const _r=render;render=function(){_r.apply(this,arguments);if(!SV.on||!DB)return;
    const m=SV_PAG[NAV.cur.name],n=svNivel(m),main=$('#main');
    $$('[data-act="empNovo"],[data-act="empTrocar"],[data-act="empExcluir"]',main).forEach(x=>x.remove());
    if(SV.lic!=='ativa'){const c=SV.lic==='carencia'?'a licença venceu; regularize para evitar o bloqueio de edição':SV.lic==='vencida'?'licença vencida: o sistema está somente para leitura':'conta suspensa';main.insertAdjacentHTML('afterbegin',`<div class="note warn" role="alert"><b>Licença:</b> ${esc(c)}.</div>`);}
    if(m&&n===1){main.insertAdjacentHTML('afterbegin','<div class="note info"><b>Somente visualização.</b> Seu perfil pode consultar este módulo, mas não alterá-lo.</div>');
      $$('input,select,textarea',main).forEach(x=>{if(x.id!=='sideQ'&&!x.closest('[data-keep]'))x.disabled=true;});
      $$('button[data-act]',main).forEach(b=>{if(/(Save|Del|Send|Env|Novo|Calc|Fechar|Reabr|Excl|Import|Add|Pausar|Retomar|Reset|Demo|Carregar|Remover|Apagar|Lanc|Gerar)/.test(b.dataset.act)&&!/(Print|Csv|Prev|Next)/.test(b.dataset.act))b.disabled=true;});}};})();
ACT.bkReset=()=>{if(SV.on){toast('No modo servidor a exclusão de dados é feita pelo fornecedor, mediante solicitação do administrador.','err');return;}modalConfirm('<b>Apagar todos os dados?</b> Esta ação não pode ser desfeita.',()=>{DB=emptyDB();saveDB();toast('Dados apagados.');home();render();},{yes:'Apagar tudo'});};
/* ---------- telas: usuários, licença, registro de ações, minha conta ---------- */
if(SV.on){MENU.push(['','licenca','Licença e plano'],['','usuarios','Usuários e permissões'],['','auditSrv','Registro de ações (servidor)'],['','minhaConta','Minha conta e senha']);}
const svCarrega=(id,fn)=>fn().then(h=>{const b=document.getElementById(id);if(b)b.innerHTML=h;});
SC.licenca={view(){return `<h1>Licença e plano</h1><p class="sub">Limites contratados e uso atual da sua conta.</p><div id="svlic"><p>Carregando…</p></div>`;},
  mount(){svCarrega('svlic',async()=>{const r=await svApi('GET','/api/auth/eu');if(r.s!==200)return '<div class="note err">'+esc(r.j.erro||'Falha.')+'</div>';const c=r.j.conta;SV.conta=c;SV.lic=c.estado;
    const lin=(n,u,l)=>`<tr><td>${n}</td><td class="r">${u}</td><td class="r">${l}</td><td style="width:35%"><div style="background:var(--line,#ddd);height:10px;border-radius:5px"><div style="width:${Math.min(100,Math.round(u/l*100))}%;height:10px;border-radius:5px;background:${u/l>=1?'#b42318':u/l>=.8?'#b54708':'#067647'}"></div></div></td></tr>`;
    return `<div class="card"><h2>${esc(c.nome)}</h2><p>Plano: <b>${esc(c.plano)}</b> · Situação: <b>${esc(c.estado)}</b> · Validade: <b>${c.validade?esc(c.validade.split('-').reverse().join('/')):'sem vencimento'}</b></p><table class="t"><thead><tr><th>Item</th><th>Em uso</th><th>Limite</th><th>Ocupação</th></tr></thead><tbody>${lin('Empresas',c.uso.empresas,c.limites.empresas)}${lin('Vínculos ativos (empregados)',c.uso.vinculos,c.limites.vinculos)}${lin('Usuários ativos',c.uso.usuarios,c.limites.usuarios)}</tbody></table><p class="sub">Ao exceder um limite, o sistema impede novos cadastros daquele item. Com a licença vencida há carência de 7 dias; depois disso o acesso passa a somente leitura. Para ampliar o plano, contate o fornecedor.</p></div>`;});}};
function svEmpChecks(sel){return (SV.cache.emps||[]).map(e=>`<label class="chk"><input type="checkbox" name="emp_${esc(e.id)}" ${sel==='todas'||(sel||[]).includes(e.id)?'checked':''}> ${esc(e.nome||e.id)}</label>`).join('')||'<small>Nenhuma empresa cadastrada.</small>';}
SC.usuarios={view(){return `<h1>Usuários e permissões</h1><p class="sub">O administrador cadastra os usuários e define, para cada módulo, o nível de acesso. O servidor aplica as regras mesmo que a tela seja adulterada.</p><div id="svusr"><p>Carregando…</p></div>`;},
  actions(){return svNivel('usuarios')>=4?[{label:'＋ Novo usuário',act:'svUsrNovo',cls:'pri'}]:[];},
  mount(){svUsrRender();}};
function svUsrRender(){svCarrega('svusr',async()=>{const[r,e]=await Promise.all([svApi('GET','/api/usuarios'),svApi('GET','/api/empresas')]);if(r.s!==200)return '<div class="note err">'+esc(r.j.erro||'Falha.')+'</div>';SV.cache.us=r.j;SV.cache.emps=e.j.empresas||[];
  const adm=svNivel('usuarios')>=4;
  return `<div class="card"><div class="tw"><table class="t"><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>MFA</th><th>Empresas</th><th>Situação</th><th></th></tr></thead><tbody>${r.j.usuarios.map(u=>`<tr><td>${esc(u.nome)}</td><td>${esc(u.email)}</td><td>${esc(SV_PERFN[u.perfil]||u.perfil)}</td><td>${u.mfa?badge('Ativo','ok'):badge('Pendente','warn')}</td><td>${u.empresas==='todas'?'Todas':esc(String((u.empresas||[]).length))+' selecionada(s)'}</td><td>${u.ativo?badge('Ativo','ok'):badge('Inativo','gray')}</td><td class="r">${adm?`<button class="btn sm" data-act="svUsrEdit" data-id="${esc(u.id)}">Permissões</button> <button class="btn sm" data-act="svUsrReset" data-id="${esc(u.id)}">Reiniciar senha</button> <button class="btn sm ${u.ativo?'danger':''}" data-act="svUsrAtivo" data-id="${esc(u.id)}">${u.ativo?'Desativar':'Ativar'}</button>`:''}</td></tr>`).join('')}</tbody></table></div><p class="sub">${r.j.usuarios.filter(u=>u.ativo).length} de ${r.j.limite} usuários do plano. Níveis: 1 visualizar · 2 editar · 3 aprovar/fechar/transmitir · 4 administrar.</p></div>`;});}
function svUsrForm(u){const novo=!u;u=u||{perfil:'dp',perms:SV.cache.us.perfis.dp,empresas:'todas',nome:'',email:''};const P=SV.cache.us.perfis;
  const matriz=SV.cache.us.modulos.map(m=>`<tr><td>${esc(SV_MODN[m]||m)}</td><td><select name="perm_${m}" aria-label="Nível em ${esc(SV_MODN[m]||m)}">${SV_NIV.map((n,i)=>`<option value="${i}" ${(+(u.perms||{})[m]||0)===i?'selected':''}>${i} — ${n}</option>`).join('')}</select></td></tr>`).join('');
  modal(`<div class="grid">${F('Nome','nome',u.nome,{req:1,w:6})+F('E-mail','email',u.email,{req:1,w:6,t:'email'})}${F('Perfil','perfil',u.perfil,{t:'select',opts:Object.entries(SV_PERFN),w:6,hint:'Escolher um perfil preenche os níveis abaixo; alterá-los manualmente cria um perfil personalizado.'})}</div><div class="tw"><table class="t"><thead><tr><th>Módulo</th><th>Nível de acesso</th></tr></thead><tbody>${matriz}</tbody></table></div><h3>Empresas</h3><label class="chk"><input type="checkbox" id="svtodas" ${u.empresas==='todas'?'checked':''}> Todas as empresas (inclusive as futuras)</label><div class="row" style="flex-wrap:wrap;gap:6px 16px;margin-top:6px" id="svemps">${svEmpChecks(u.empresas)}</div><div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-act="closeModal">Cancelar</button><button class="btn pri" id="svusok">${novo?'Criar usuário':'Salvar'}</button></div><div id="svus" data-form></div>`,{title:novo?'Novo usuário':'Permissões de '+u.nome,wide:true});
  const sel=$('[name=perfil]'),mods=SV.cache.us.modulos;if(!novo)$('[name=email]').readOnly=true;
  sel.onchange=()=>{const pf=P[sel.value];if(pf)mods.forEach(m=>$('[name=perm_'+m+']').value=pf[m]);};
  mods.forEach(m=>$('[name=perm_'+m+']').onchange=()=>{const pf=P[sel.value];if(!pf||mods.some(x=>+$('[name=perm_'+x+']').value!==pf[x]))sel.value='custom';});
  $('#svusok').onclick=async()=>{const nome=$('[name=nome]').value.trim(),email=$('[name=email]').value.trim();if(!nome||!email){toast('Preencha nome e e-mail.','err');return;}
    const perms={};mods.forEach(m=>perms[m]=+$('[name=perm_'+m+']').value);const todas=$('#svtodas').checked;const emps=todas?'todas':SV.cache.emps.filter(e=>$('[name=emp_'+e.id+']').checked).map(e=>e.id);
    if(!todas&&!emps.length){toast('Selecione ao menos uma empresa.','err');return;}
    const body={nome,email,perfil:sel.value,perms,empresas:emps};const r=novo?await svApi('POST','/api/usuarios',body):await svApi('PATCH','/api/usuarios/'+u.id,body);
    if(r.s!==200){toast(r.j.erro||'Falha.','err');return;}closeModal();svUsrRender();
    if(r.j.senhaTemporaria)svMostraTemp(email,r.j.senhaTemporaria);else toast('Usuário salvo.','ok');};}
function svMostraTemp(email,s){modal(`<p>Entregue a senha temporária ao usuário por um canal seguro. Ela é exibida <b>uma única vez</b> e deverá ser trocada no primeiro acesso, junto com o cadastro do MFA.</p><p><b>${esc(email)}</b><br><code style="font-size:1.2em;user-select:all">${esc(s)}</code></p><div class="row" style="justify-content:flex-end"><button class="btn pri" data-act="closeModal">Fechar</button></div>`,{title:'Senha temporária'});}
ACT.svUsrNovo=()=>svUsrForm(null);
ACT.svUsrEdit=el=>svUsrForm(SV.cache.us.usuarios.find(u=>u.id===el.dataset.id));
ACT.svUsrReset=el=>{const u=SV.cache.us.usuarios.find(x=>x.id===el.dataset.id);modalConfirm('Reiniciar a senha de <b>'+esc(u.nome)+'</b>? A sessão atual dele será encerrada. Deseja também remover o MFA (perda do aparelho)?',async()=>{const r=await svApi('POST','/api/usuarios/'+u.id+'/reiniciar',{mfa:false});if(r.s!==200){toast(r.j.erro||'Falha.','err');return;}svMostraTemp(u.email,r.j.senhaTemporaria);svUsrRender();},{yes:'Reiniciar senha'});};
ACT.svUsrAtivo=async el=>{const u=SV.cache.us.usuarios.find(x=>x.id===el.dataset.id);const r=await svApi('PATCH','/api/usuarios/'+u.id,{ativo:!u.ativo});if(r.s!==200){toast(r.j.erro||'Falha.','err');return;}svUsrRender();};
SC.auditSrv={view(){return `<h1>Registro de ações (servidor)</h1><p class="sub">Acessos, alterações de usuários e permissões, gravações de dados e mudanças de licença. Cada registro é encadeado ao anterior por hash; qualquer adulteração é detectada.</p><div id="svau"><p>Carregando…</p></div>`;},
  actions(){return[{label:'Verificar integridade da cadeia',act:'svAudVer'}];},
  mount(){svCarrega('svau',async()=>{const r=await svApi('GET','/api/auditoria');if(r.s!==200)return '<div class="note err">'+esc(r.j.erro||'Falha.')+'</div>';return `<div class="card"><p class="sub">${r.j.total} registro(s); exibindo os ${r.j.registros.length} mais recentes.</p><div class="tw"><table class="t"><thead><tr><th>Nº</th><th>Data/hora</th><th>Usuário</th><th>Ação</th><th>Detalhe</th></tr></thead><tbody>${r.j.registros.map(x=>`<tr><td>${x.n}</td><td>${esc(x.ts.replace('T',' ').slice(0,19))}</td><td>${esc(x.u)}</td><td>${esc(x.a)}</td><td>${esc(typeof x.d==='string'?x.d:JSON.stringify(x.d))}</td></tr>`).join('')}</tbody></table></div></div>`;});}};
ACT.svAudVer=async()=>{const r=await svApi('GET','/api/auditoria/verificar');if(r.s!==200){toast(r.j.erro||'Falha.','err');return;}r.j.ok?toast('Cadeia íntegra: nenhuma adulteração detectada.','ok'):toast('ATENÇÃO: ruptura da cadeia no registro nº '+r.j.ruptura+'.','err');};
SC.minhaConta={view(){const u=SV.user||{};return `<h1>Minha conta</h1><div class="card"><p><b>${esc(u.nome||'')}</b> · ${esc(u.email||'')}<br>Perfil: ${esc(SV_PERFN[u.perfil]||u.perfil||'')} · MFA: ${u.mfa?'ativo':'pendente'}</p><button class="btn" data-act="svSenha">Alterar senha</button></div><div class="card"><h2>Meus níveis de acesso</h2><table class="t"><tbody>${Object.keys(SV_MODN).map(m=>`<tr><td>${esc(SV_MODN[m])}</td><td>${svNivel(m)} — ${SV_NIV[svNivel(m)]}</td></tr>`).join('')}</tbody></table></div>`;}};
ACT.svSenha=()=>svTelaSenha(undefined,false);
function svStart(){if(!SV.on)return;if(!(window.crypto&&crypto.subtle)){document.body.innerHTML='<div style="padding:30px;font:16px system-ui"><h1>Navegador sem suporte</h1><p>Acesse por https:// com navegador atual.</p></div>';return;}
  window.addEventListener('beforeunload',e=>{if(SV.busy||SV.t){e.preventDefault();e.returnValue='';}});svTelaLogin();}
