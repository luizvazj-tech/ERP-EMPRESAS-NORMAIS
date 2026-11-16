/* ui23 — Sair do sistema com confirmação e gravação das últimas ações */
let SAINDO=false;
async function sairExec(){
  if(SAINDO)return;SAINDO=true;
  try{
    if(window.__SVON){await svSairExec();return;}
    try{audit('sessao.sair','encerrada pelo usuário');}catch(e){}
    saveDB();
    if(typeof VAULT!=='undefined'&&VAULT.on){await vaultFlush();vaultLock('Você saiu do sistema. Suas últimas ações foram salvas.');}
    else{toast('Dados salvos. Sessão encerrada.','ok');try{location.reload();}catch(e){}}
  }catch(e){SAINDO=false;toast('Não foi possível concluir a saída: '+(e&&e.message||e)+'. Seus dados continuam abertos; gere um backup antes de tentar de novo.','err');return;}
  SAINDO=false;
}
ACT.sair=()=>{
  if(!DB){return;}
  const sujo=typeof DIRTY!=='undefined'&&DIRTY,btnSalvar=document.querySelector('[data-primary="save"]');
  const ped=(window.__SVON&&typeof SV!=='undefined'&&(SV.busy||SV.t))?'<br><br>Há sincronização com o servidor em andamento; ela será concluída antes de sair.':'';
  const corpo='<b>Deseja realmente sair do sistema?</b><br><br>As últimas ações executadas serão <b>salvas</b> antes de encerrar a sessão. Para voltar, será necessário informar a senha novamente.'+ped
    +(sujo?'<div class="note warn" role="alert"><b>Esta tela tem alterações ainda não gravadas.</b> Escolha “Salvar e sair” para gravá-las, ou “Sair sem salvar a tela” para descartá-las.</div>':'');
  modal(`<h2>Sair do sistema</h2><p>${corpo}</p><div class="row" style="justify-content:flex-end;flex-wrap:wrap"><button class="btn" data-act="closeModal" id="sairNao">Cancelar</button>${sujo?'<button class="btn" id="sairDescarta">Sair sem salvar a tela</button>':''}<button class="btn pri" id="sairSim">${sujo&&btnSalvar?'Salvar e sair':'Sim, sair'}</button></div>`,{title:'Sair do sistema'});
  const nao=document.getElementById('sairNao');nao&&nao.focus();
  document.getElementById('sairSim').onclick=async()=>{
    if(sujo&&btnSalvar){closeModal();btnSalvar.click();await new Promise(r=>setTimeout(r,60));
      if(typeof DIRTY!=='undefined'&&DIRTY){toast('A tela não pôde ser salva (verifique os campos destacados). A saída foi cancelada.','err');return;}}
    closeModal();await sairExec();};
  const d=document.getElementById('sairDescarta');if(d)d.onclick=async()=>{DIRTY=false;closeModal();await sairExec();};
};
ACT.svSair=ACT.sair;
(function(){const b=document.getElementById('btnSair');if(b&&window.__SVON)b.hidden=true;})();
