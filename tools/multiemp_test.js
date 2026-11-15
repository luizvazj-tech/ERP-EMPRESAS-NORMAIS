const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');const errs=[];
const d=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',beforeParse(w){w.addEventListener('error',e=>errs.push('ERR '+e.message));w.print=()=>{};w.__FP_NOGATE=true;}});
const w=d.window,ev=s=>w.eval(s),q=s=>w.document.querySelector(s);
(async()=>{
ev(`seedDemo('lp')`);const n0=ev('DB.empregados.length'),cn=ev('DB.empresa.cnpj');
ev(`go('empresa')`);console.log('botoes',/Novo cadastro/.test(q('#bar').innerHTML),/Excluir cadastro/.test(q('#bar').innerHTML),/Empresas cadastradas/.test(q('#main').innerHTML));
ev(`ACT.empNovo()`);q('#mcy').click();
console.log('novo vazio',ev('DB.empresa===null&&DB.empregados.length===0'),'arquivadas',ev('DB._emps.length'),'audit',ev('DB.audit.length>0'));
// cadastrar empresa 2 (CNPJ duplicado deve bloquear)
ev(`DB.empresa={cnpj:'${cn}',razao:'DUPLICADA'}`);
ev(`go('empresa')`);const f=q('#f');console.log('tela empresa nova ok',!!f);
ev(`DB.empresa={cnpj:'11444777000161',razao:'SEGUNDA LTDA',regime:'sn',anexo:'std'};DB.estabs=[];saveDB()`);
ev(`go('empresa')`);console.log('lista mostra arquivada',/DEMONSTRAÇÃO/.test(q('#main').innerHTML));
const idArq=ev('DB._emps[0].id');
const nm=q('[data-act=empAbrirConf]');console.log('nome é clicável',!!nm);nm.click();console.log('pergunta antes de abrir',/Deseja abrir a empresa cadastrada\?/.test(q('#modal').textContent));const razao0=ev('DB.empresa.razao');q('#modal [data-act=closeModal]').click();console.log('cancelar não troca',ev('DB.empresa.razao')===razao0&&!q('#modal.on'));q('[data-act=empAbrirConf]').click();q('#mcy').click();
console.log('trocou p/ 1a',ev('DB.empresa.cnpj')===cn,'empregados',ev('DB.empregados.length')===n0,'arquivadas',ev('DB._emps.map(x=>x.razao)'));
// excluir arquivada
ev(`empExcluirModal('${ev('DB._emps[0].id')}')`);console.log('aviso irreversivel',/realmente excluir este cadastro/.test(q('#modal').textContent)&&/irrevers/.test(q('#modal').textContent));q('#exNao').click();console.log('Nao, cancelar mantem',ev('DB._emps.length'));
ev(`empExcluirModal('${ev('DB._emps[0].id')}')`);q('#exOk').click();console.log('apos excluir arquivada',ev('DB._emps.length'));
// excluir ativa (unica)
ev(`ACT.empExcluir()`);q('#exOk').click();console.log('ativa excluida -> vazio',ev('DB.empresa===null&&DB.empregados.length===0'));
console.log('ERROS',errs.length?errs:'nenhum');process.exit(0);})().catch(e=>{console.log('FALHA',e.stack);process.exit(1)});
