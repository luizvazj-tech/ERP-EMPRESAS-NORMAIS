/* ===================== SEGURANÇA: criptografia local com senha =====================
   Protege os dados em repouso no navegador (LGPD, Lei 13.709/2018, art. 46): o banco é cifrado com
   AES-256-GCM, com chave derivada da senha por PBKDF2-SHA256 (600.000 iterações) e gravado apenas cifrado.
   Limites: é proteção local de um único usuário; não oferece perfis, trilha de auditoria nem recuperação
   de senha. Perdida a senha, os dados só podem ser restaurados de um backup cifrado. */
const SEG=(()=>{
  const KEY_ENC='folhaPro.v2.enc',KEY_LEGADO=LS_KEY,ITER=600000,INATIV_MS=15*60*1000,MIN_SENHA=10;
  let chave=null,salt=null,ativo=false,pendente=null,escrevendo=false,fila=Promise.resolve(),timer=null,falhas=0,bloqAte=0;
  const te=new TextEncoder(),td=new TextDecoder();
  const b64=b=>{const u=new Uint8Array(b);let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s);};
  const unb64=t=>Uint8Array.from(atob(t),c=>c.charCodeAt(0));
  const suporta=()=>!!(window.crypto&&crypto.subtle&&window.isSecureContext!==false);
  const rnd=n=>crypto.getRandomValues(new Uint8Array(n));
  async function derivar(senha,sal,iter){const base=await crypto.subtle.importKey('raw',te.encode(senha),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt:sal,iterations:iter,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
  async function cifrar(texto,k,sal,iter){const iv=rnd(12);const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},k,te.encode(texto));return JSON.stringify({v:2,alg:'AES-256-GCM',kdf:'PBKDF2-SHA256',iter,salt:b64(sal),iv:b64(iv),ct:b64(ct)});}
  async function decifrar(blob,senha){const o=JSON.parse(blob);if(o.v!==2||!o.ct)throw new Error('Formato de arquivo desconhecido.');const sal=unb64(o.salt),k=await derivar(senha,sal,o.iter||ITER);let pt;try{pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(o.iv)},k,unb64(o.ct));}catch(e){throw new Error('Senha incorreta ou dados corrompidos.');}return{texto:td.decode(pt),k,sal,iter:o.iter||ITER};}
  function senhaFraca(s){if(!s||s.length<MIN_SENHA)return'A senha deve ter ao menos '+MIN_SENHA+' caracteres.';if(/^\d+$/.test(s))return'A senha não pode ser composta apenas de números.';if(new Set(s).size<4)return'A senha é muito repetitiva.';return'';}
  /* gravação cifrada, coalescida e serializada */
  function persistir(s){if(!ativo||!chave)return;pendente=s;if(escrevendo)return;escrevendo=true;fila=(async()=>{try{while(pendente!==null){const t=pendente;pendente=null;localStorage.setItem(KEY_ENC,await cifrar(t,chave,salt,ITER));}}catch(e){toast('Falha ao gravar os dados cifrados: '+e.message,'err');}finally{escrevendo=false;}})();}
  function limparTela(){['main','side','modal','printarea','tip','bar','topemp'].forEach(id=>{const el=document.getElementById(id);if(el){el.innerHTML='';if(id==='modal')el.classList.remove('on');}});}
  function reiniciarInatividade(){clearTimeout(timer);if(ativo)timer=setTimeout(bloquear,INATIV_MS);}
  function iniciarMonitor(){['mousemove','keydown','click','touchstart','scroll'].forEach(ev=>window.addEventListener(ev,reiniciarInatividade,{passive:true}));}
  let monitorIniciado=false;
  function estilo(){if(document.getElementById('segcss'))return;const st=document.createElement('style');st.id='segcss';st.textContent='#seglock{position:fixed;inset:0;background:#0f1a22;z-index:200;display:flex;align-items:center;justify-content:center;padding:20px}#seglock .box{background:#fff;border-radius:12px;max-width:440px;width:100%;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.5)}#seglock h2{margin:0 0 6px}#seglock p{margin:6px 0;color:#445}#seglock label{display:block;font-weight:600;margin-top:12px}#seglock input{width:100%;padding:9px;border:1px solid #bcc7d1;border-radius:7px;font:inherit}#seglock .msg{color:#b3261e;min-height:20px;margin-top:8px;font-weight:600}#seglock .lnk{background:none;border:0;color:#7a1f1f;text-decoration:underline;cursor:pointer;margin-top:14px;padding:0;font:inherit}';document.head.appendChild(st);}
  function mostrar(modo){estilo();let el=document.getElementById('seglock');if(!el){el=document.createElement('div');el.id='seglock';document.body.appendChild(el);}
    const novo=modo!=='entrar';
    el.innerHTML=`<div class="box"><h2>Folha<span style="color:#1b6e8f">Pro</span> — acesso protegido</h2>
      <p>${modo==='entrar'?'Informe a senha para abrir os dados desta máquina.':modo==='migrar'?'Foram encontrados dados <b>sem proteção</b> neste navegador. Defina uma senha para cifrá-los agora.':'Defina uma senha para proteger os dados (CPF, dependentes e remunerações) neste navegador.'}</p>
      <form id="segf" autocomplete="off"><label>Senha</label><input type="password" id="segs" autocomplete="${novo?'new-password':'current-password'}" required>
      ${novo?'<label>Confirme a senha</label><input type="password" id="segc" autocomplete="new-password" required><p style="font-size:.85em">Mínimo de '+MIN_SENHA+' caracteres. <b>Não há recuperação de senha</b>: se a perder, só um backup cifrado restaura os dados.</p>':''}
      <div class="msg" id="segm"></div><button class="btn pri" style="margin-top:10px;width:100%" id="segb">${modo==='entrar'?'Desbloquear':'Proteger e entrar'}</button></form>
      ${modo==='entrar'?'<button class="lnk" id="segr">Esqueci a senha (apagar dados e começar de novo)</button>':''}</div>`;
    const msg=t=>{document.getElementById('segm').textContent=t;};
    const f=document.getElementById('segf');setTimeout(()=>document.getElementById('segs').focus(),50);
    f.onsubmit=async ev=>{ev.preventDefault();const s=document.getElementById('segs').value,b=document.getElementById('segb');
      try{b.disabled=true;
        if(modo==='entrar'){const esp=bloqAte-Date.now();if(esp>0){msg('Aguarde '+Math.ceil(esp/1000)+' s para tentar novamente.');return;}
          try{const r=await decifrar(localStorage.getItem(KEY_ENC),s);abrir(hidratar(JSON.parse(r.texto)),r.texto,r.k,r.sal);falhas=0;}catch(e){falhas++;bloqAte=Date.now()+Math.min(60000,500*Math.pow(2,falhas));msg(e.message);}}
        else{const fr=senhaFraca(s);if(fr){msg(fr);return;}if(s!==document.getElementById('segc').value){msg('As senhas não conferem.');return;}
          let base;if(modo==='migrar'){try{base=hidratar(JSON.parse(localStorage.getItem(KEY_LEGADO)));}catch(e){msg('Os dados antigos não puderam ser lidos; nada foi alterado.');return;}}else base=emptyDB();
          const sal=rnd(16),k=await derivar(s,sal,ITER),txt=JSON.stringify(base);localStorage.setItem(KEY_ENC,await cifrar(txt,k,sal,ITER));
          if(modo==='migrar')localStorage.removeItem(KEY_LEGADO);abrir(base,txt,k,sal);}
      }finally{b.disabled=false;}};
    const r=document.getElementById('segr');if(r)r.onclick=()=>{if(confirm('Isto apaga TODOS os dados deste navegador e a senha atual. Só prossiga se houver backup. Continuar?')){localStorage.removeItem(KEY_ENC);localStorage.removeItem(KEY_LEGADO);mostrar('criar');}};}
  function abrir(db,txt,k,sal){DB=db;_mem=txt;chave=k;salt=sal;ativo=true;const el=document.getElementById('seglock');if(el)el.remove();if(!monitorIniciado){iniciarMonitor();monitorIniciado=true;}reiniciarInatividade();NAV.stack=[];NAV.cur={name:'home',params:{}};render();}
  async function bloquear(){if(!ativo)return;await fila;ativo=false;clearTimeout(timer);DB=null;_mem=null;chave=null;salt=null;pendente=null;limparTela();mostrar('entrar');}
  async function boot(){
    if(!suporta()){estilo();const el=document.createElement('div');el.id='seglock';el.innerHTML='<div class="box"><h2>Navegador sem criptografia</h2><p>Este navegador, ou esta forma de acesso, não oferece a API de criptografia necessária. Abra o sistema por HTTPS em um navegador atual. Por segurança, os dados não são abertos sem proteção.</p></div>';document.body.appendChild(el);return;}
    let enc=null,leg=null;try{enc=localStorage.getItem(KEY_ENC);leg=localStorage.getItem(KEY_LEGADO);}catch(e){}
    mostrar(enc?'entrar':leg?'migrar':'criar');}
  /* troca de senha: exige a atual */
  async function trocarSenha(atual,nova){const fr=senhaFraca(nova);if(fr)throw new Error(fr);await fila;await decifrar(localStorage.getItem(KEY_ENC),atual);const sal=rnd(16),k=await derivar(nova,sal,ITER);localStorage.setItem(KEY_ENC,await cifrar(JSON.stringify(DB),k,sal,ITER));chave=k;salt=sal;}
  /* backup cifrado, com senha própria (pode ser distinta da senha de acesso) */
  async function exportarCifrado(senhaBackup){const fr=senhaFraca(senhaBackup);if(fr)throw new Error(fr);const sal=rnd(16),k=await derivar(senhaBackup,sal,ITER);return cifrar(JSON.stringify(DB),k,sal,ITER);}
  async function lerBackup(texto,senhaBackup){const t=String(texto).trim();if(t.startsWith('{')&&/"v"\s*:\s*2/.test(t)&&/"ct"/.test(t)){if(!senhaBackup)throw new Error('Informe a senha do backup.');const r=await decifrar(t,senhaBackup);return JSON.parse(r.texto);}return JSON.parse(t);/* JSON em claro (backups antigos) */}
  async function apagarTudo(){await fila;DB=emptyDB();saveDB();await fila;}
  return{boot,persistir,bloquear,trocarSenha,exportarCifrado,lerBackup,apagarTudo,senhaFraca,get ativo(){return ativo;},MIN_SENHA};
})();
