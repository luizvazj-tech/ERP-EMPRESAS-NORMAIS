const {JSDOM}=require('jsdom');const fs=require('fs');const zlib=require('zlib');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');const errs=[];
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',beforeParse(w){w.addEventListener('error',e=>errs.push('ERR '+e.message));w.print=()=>{};w.scrollTo=()=>{};w.__FP_NOGATE=true;w.URL.createObjectURL=()=>'blob:x';w.URL.revokeObjectURL=()=>{};}}).window;
const ev=s=>w.eval(s),q=s=>w.document.querySelector(s);let fail=0;const ok=(n,c)=>{console.log((c?'PASS ':'FAIL ')+n);if(!c)fail++;};
ev(`seedDemo('lp')`);
const comp=ev(`(Object.keys(DB.comps).sort().pop()||DB.cfg.comp)`);ev(`calcFolha('${comp}')`);
/* extrai entradas do zip (store) */
function unzip(u8){const b=Buffer.from(u8),r={};let p=0;while(b.readUInt32LE(p)===0x04034b50){const sz=b.readUInt32LE(p+18),nl=b.readUInt16LE(p+26),el=b.readUInt16LE(p+28),n=b.toString('utf8',p+30,p+30+nl);r[n]=b.slice(p+30+nl+el,p+30+nl+el+sz);p+=30+nl+el+sz;}return r;}
const crc=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return b=>{let c=~0;for(const x of b)c=t[(c^x)&255]^(c>>>8);return(~c)>>>0;};})();
let capt=null;ev(`baixarBin=function(n,b,m){window.__cap={n:n,b:b,m:m};}`);
const telas=['painel','empresa','empregados','folha','contra','ctbLanc','ctbBal','finTit','bcoRem','dctfApur','dctfPrazos','dctfMulta'];
let nok=0,tot=0;
for(const s of telas){try{ev(`go('${s}',{comp:'${comp}'})`);}catch(e){continue;}
  if(!q('#main')||q('#main').innerHTML.length<100)continue;tot++;
  for(const f of ['expPdf','expXls']){w.__cap=null;try{ev(`ACT.${f}(document.getElementById('main'))`);}catch(e){console.log('  erro',s,f,e.message);continue;}
    const c=w.__cap;if(!c||!c.b.length){console.log('  sem saída',s,f);continue;}
    if(f==='expPdf'){const t=Buffer.from(c.b).toString('latin1');if(t.startsWith('%PDF-1.4')&&t.trimEnd().endsWith('%%EOF')&&/\/Count \d+/.test(t))nok++;else console.log('  PDF inválido',s);}
    else{const z=unzip(c.b);const names=Object.keys(z);let good=names.includes('xl/worksheets/sheet1.xml')&&names.every(n=>crc(z[n])>=0);
      const sh=z['xl/worksheets/sheet1.xml'].toString('utf8');good=good&&sh.includes('<sheetData>')&&!/<c [^>]*><is><t[^>]*>undefined/.test(sh);if(good)nok++;else console.log('  XLSX inválido',s);}}}
ok('telas exportadas sem erro em PDF e Excel ('+nok+'/'+tot*2+')',tot>=8&&nok===tot*2);
/* botões na barra */
ev(`go('empregados')`);ok('botões PDF/Excel na barra',!!q('#bar [data-act=expPdf]')&&!!q('#bar [data-act=expXls]'));
/* conteúdo: valor numérico no xlsx e acentos no pdf */
ev(`go('folha',{comp:'${comp}'})`);w.__cap=null;ev(`ACT.expXls()`);
const z=unzip(w.__cap.b);const sh=z['xl/worksheets/sheet1.xml'].toString('utf8');
ok('XLSX contém números reais (célula <v>) formato 164',/<c r="[A-Z]+\d+" s="5"><v>-?\d+(\.\d+)?<\/v><\/c>/.test(sh));
ok('XLSX nome do arquivo com slug e data',/^[A-Za-z0-9_]+_\d{8}\.xlsx$/.test(w.__cap.n));
/* crc dos arquivos do zip conferem com o cabeçalho */
const b=Buffer.from(w.__cap.b);let p=0,crcOk=true;while(b.readUInt32LE(p)===0x04034b50){const c=b.readUInt32LE(p+14),sz=b.readUInt32LE(p+18),nl=b.readUInt16LE(p+26);const d=b.slice(p+30+nl,p+30+nl+sz);if(crc(d)!==c)crcOk=false;p+=30+nl+sz;}
ok('CRC32 do ZIP confere',crcOk);
/* estrutura do PDF: xref aponta para os objetos */
w.__cap=null;ev(`ACT.expPdf()`);const t=Buffer.from(w.__cap.b).toString('latin1');
const xr=+t.match(/startxref\n(\d+)/)[1];const offs=[...t.slice(xr).matchAll(/(\d{10}) 00000 n/g)].map(m=>+m[1]);
ok('xref do PDF aponta para os objetos',offs.length>5&&offs.every((o,i)=>t.slice(o).startsWith((i+1)+' 0 obj')));
/* ficha do empregado e modal */
const e0=ev(`DB.empregados[0].id`);try{ev(`go('empregadoForm',{id:'${e0}'})`);}catch(e){}
w.__cap=null;ev(`ACT.expPdf()`);ok('ficha/cadastro exportável',!!w.__cap&&w.__cap.b.length>800);
ev(`modal('<h3>Teste</h3><table><thead><tr><th>A</th><th>Valor</th></tr></thead><tbody><tr><td>x</td><td>1.234,56</td></tr></tbody></table>',{title:'Modal teste'})`);
ok('botões de exportar no modal com tabela',!!q('#modal [data-act=expXls]'));
w.__cap=null;ev(`ACT.expXls(document.querySelector('#modal [data-act=expXls]'))`);const mz=unzip(w.__cap.b)['xl/worksheets/sheet1.xml'].toString('utf8');
ok('modal: 1.234,56 vira número 1234.56',mz.includes('<v>1234.56</v>'));
ok('sem erros de script',errs.length===0);if(errs.length)console.log(errs);
console.log(fail?'FALHAS: '+fail:'TUDO OK');process.exit(fail?1:0);
