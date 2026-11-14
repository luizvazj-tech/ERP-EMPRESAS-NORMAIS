'use strict';
let CSRF='';const $=i=>document.getElementById(i);
const EX={aviso:'Aviso: informe só título, versão e notas. Aparece para o cliente ao clicar em “Atualizar”.',
parametros:'Exemplo de conteúdo:\n{"salMin":1621.00,"consig":{"emp":35,"cartao":5}}\nChaves permitidas: salMin, tetoInss, inss, irrf, depIr, simpl, plrTab, consig, redutor, salFam, fgts, fgtsAprendiz, vtPerc, patronal, rat, fap, terceiros, adNoturno, peric, he50, he100, divisor, cprbFrac, venc.',
rubricas:'Exemplo:\n[{"sys":"PLANO","nat":"9912","incCP":"00","incIRRF":"00","incFGTS":"00"}]\nAtualiza natureza e códigos de incidência de rubricas existentes (pelo identificador “sys”).',
arquivo:'Anexe os arquivos (por exemplo, pacote de XSD, manual, modelo de documento). O cliente confere o SHA-256 antes de salvar.'};
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function api(m,u,b){const r=await fetch(u,{method:m,credentials:'same-origin',headers:Object.assign({'Content-Type':'application/json'},CSRF?{'X-CSRF':CSRF}:{}),body:b?JSON.stringify(b):undefined});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.erro||('Erro '+r.status));return j;}
function tipo(){const t=$('tp').value;$('ex').textContent=EX[t];$('lc').hidden=(t==='aviso'||t==='arquivo');}
async function listar(){const j=await api('GET','/admin/api/pacotes');$('lista').innerHTML=j.pacotes.map(p=>`<tr class="${p.revogado?'rev':''}"><td>${p.seq}</td><td>${esc(new Date(p.em).toLocaleString('pt-BR'))}</td><td>${esc(p.titulo)}</td><td>${esc(p.versao)}</td><td>${esc(p.tipo)}</td><td>${esc(p.arquivos.join(', '))}</td><td>${p.revogado?'revogado':`<button data-r="${p.id}">Revogar</button>`}</td></tr>`).join('')||'<tr><td colspan="7">Nenhum pacote publicado.</td></tr>';
  const a=await api('GET','/admin/api/auditoria');$('aud').innerHTML=a.linhas.map(l=>`<tr><td>${esc(new Date(l.ts).toLocaleString('pt-BR'))}</td><td>${esc(l.u)}</td><td>${esc(l.a)}</td><td>${esc(l.d)}</td></tr>`).join('');}
function entrar(){$('login').hidden=true;$('painel').hidden=false;$('sair').hidden=false;tipo();listar();}
$('fl').onsubmit=async e=>{e.preventDefault();$('le').textContent='';try{const j=await api('POST','/admin/api/login',{usuario:$('u').value,senha:$('s').value});CSRF=j.csrf;$('s').value='';entrar();}catch(x){$('le').textContent=x.message;}};
$('tp').onchange=tipo;
$('sair').onclick=async()=>{try{await api('POST','/admin/api/logout');}catch(e){}location.reload();};
const lerB64=f=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(',')[1]||'');r.onerror=no;r.readAsDataURL(f);});
$('fp').onsubmit=async e=>{e.preventDefault();$('pe').textContent='';$('po').textContent='';
  try{const arqs=[];for(const f of $('a').files)arqs.push({nome:f.name,base64:await lerB64(f)});
    const j=await api('POST','/admin/api/pacotes',{titulo:$('t').value,versao:$('v').value,tipo:$('tp').value,notas:$('n').value,conteudo:$('c').value,arquivos:arqs});
    $('po').textContent='Publicado (pacote nº '+j.seq+').';$('fp').reset();tipo();listar();}catch(x){$('pe').textContent=x.message;}};
$('lista').onclick=async e=>{const id=e.target.dataset.r;if(!id)return;if(!confirm('Revogar este pacote? Clientes que ainda não o aplicaram deixarão de recebê-lo; quem já aplicou não é revertido automaticamente.'))return;try{await api('POST','/admin/api/pacotes/'+id+'/revogar',{});listar();}catch(x){alert(x.message);}};
