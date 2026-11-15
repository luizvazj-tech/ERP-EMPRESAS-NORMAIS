/* Painel do fornecedor (jsdom) contra a API real: login, nova conta, edição de licença e de planos. */
const fs=require('fs'),os=require('os'),path=require('path');process.env.DATA_DIR=fs.mkdtempSync(path.join(os.tmpdir(),'fppn-'));
const api=require('./server.js');const {JSDOM}=require('jsdom');const S='Plataforma#Segura2026';process.env.PLATFORM_PASSWORD_HASH=api.hashSenha(S);process.env.PLATFORM_USER='forn';
let fail=0;const ok=(n,c)=>{console.log((c?'PASS ':'FAIL ')+n);if(!c)fail++;};const sl=ms=>new Promise(r=>setTimeout(r,ms));
api.srv.listen(0,async()=>{const U='http://127.0.0.1:'+api.srv.address().port;try{
 const d=await JSDOM.fromURL(U+'/plataforma',{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,beforeParse(w){w.fetch=(u,o)=>fetch(new URL(u,U),o);}});const w=d.window,q=s=>w.document.querySelector(s);await sl(600);
 ok('tela de login do fornecedor',!!q('#u'));q('#u').value='forn';q('#s').value='x';q('#ok').click();await sl(500);ok('senha errada recusada',/inválidas|Credenciais/.test(w.document.body.textContent));
 q('#u').value='forn';q('#s').value=S;q('#ok').click();await sl(700);ok('painel carregado com 3 faixas',/Planos e faixas/.test(w.document.body.textContent)&&w.document.querySelectorAll('#pl tr').length===3);
 q('#nn').value='Contabilidade Alfa';q('#np').value='profissional';q('#nv').value='2027-06-30';q('#na').value='Rita';q('#ne').value='rita@alfa.com';q('#nc').click();await sl(1500);
 ok('conta criada com senha temporária exibida',/Contabilidade Alfa/.test(w.document.body.textContent)&&/senha temporária/.test(w.document.body.textContent)&&!!q('code'));
 q('[data-ed]').click();await sl(100);q('#le').value='77';q('#es').value='suspensa';q('#sl').click();await sl(900);ok('licença editada: 77 empresas, suspensa',/77/.test(w.document.body.textContent)&&/suspensa/.test(w.document.body.textContent));
 const row=w.document.querySelector('#pl tr');row.querySelector('[data-k=preco]').value='199,90';row.querySelector('[data-k=maxEmpresas]').value='12';q('#svp').click();await sl(900);
 ok('planos salvos (faixa 1: 12 empresas, R$ 199,90)',/Planos salvos/.test(w.document.body.textContent)&&w.document.querySelector('#pl [data-k=maxEmpresas]').value==='12'&&w.document.querySelector('#pl [data-k=preco]').value==='199.9');
 }catch(e){console.log('EXCEÇÃO',e);fail++;}console.log(fail?'FALHAS '+fail:'TODOS OK');api.srv.close();fs.rmSync(process.env.DATA_DIR,{recursive:true,force:true});process.exit(fail?1:0);});
