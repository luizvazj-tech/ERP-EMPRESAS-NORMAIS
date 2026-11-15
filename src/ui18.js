/* ===================== EXPORTAÇÃO DE QUALQUER TELA PARA PDF E EXCEL =====================
   Sem bibliotecas: lê o conteúdo exibido (títulos, textos, campos e tabelas) e gera .xlsx (OOXML em ZIP sem compressão)
   e .pdf (PDF 1.4 com fonte Helvetica) direto no navegador. Nada é enviado a servidor. */
const XB_SKIP=new Set(['SCRIPT','STYLE','BUTTON','NAV','DATALIST','SVG','CANVAS','NOSCRIPT']);
const XB_BLK='DIV,P,TABLE,H1,H2,H3,H4,UL,OL,LI,FORM,SECTION,DETAILS,FIELDSET';
function xbTxt(n){let s='';(function w(x){for(const c of x.childNodes){if(c.nodeType===3)s+=c.textContent;else if(c.nodeType===1){const t=c.tagName;if(XB_SKIP.has(t))continue;if(c.hidden&&!c.hasAttribute('data-tab'))continue;
  if(t==='BR'){s+=' ';continue;}
  if(t==='INPUT'){if(c.type==='checkbox'||c.type==='radio')s+=c.checked?'Sim':'Não';else if(c.type!=='hidden'&&c.type!=='file'&&c.type!=='button')s+=c.value;continue;}
  if(t==='SELECT'){s+=Array.from(c.selectedOptions||[]).map(o=>o.textContent).join(', ');continue;}
  if(t==='TEXTAREA'){s+=c.value;continue;}
  s+=' ';w(c);s+=' ';}}})(n);return s.replace(/\s+/g,' ').trim();}
function xbTabela(t){
  const rows=[];const span=[];
  Array.from(t.rows).forEach((tr,ri)=>{const r=[],isH=!!tr.closest('thead')||Array.from(tr.cells).every(c=>c.tagName==='TH');let ci=0;
    const put=(v,c,h)=>{while(span[ci]&&span[ci].n>0){r.push({v:'',r:false});span[ci].n--;ci++;}r.push({v,r:c,h});ci++;};
    Array.from(tr.cells).forEach(c=>{while(span[ci]&&span[ci].n>0){r.push({v:'',r:false});span[ci].n--;ci++;}
      const cs=+c.getAttribute('colspan')||1,rs=+c.getAttribute('rowspan')||1,v=xbTxt(c),rt=c.classList.contains('r')||c.style.textAlign==='right';
      r.push({v,r:rt,h:isH});if(rs>1)span[ci]={n:rs-1};ci++;for(let k=1;k<cs;k++){r.push({v:'',r:false,h:isH});if(rs>1)span[ci]={n:rs-1};ci++;}});
    while(span[ci]&&span[ci].n>0){r.push({v:'',r:false});span[ci].n--;ci++;}
    rows.push({c:r,h:isH});});
  const nc=Math.max(0,...rows.map(r=>r.c.length));rows.forEach(r=>{while(r.c.length<nc)r.c.push({v:'',r:false});});
  /* descarta colunas totalmente vazias (ex.: coluna de botões) */
  const keep=[];for(let j=0;j<nc;j++)if(rows.some(r=>r.c[j].v!==''))keep.push(j);
  const R=rows.filter(r=>r.c.some(c=>c.v!=='')).map(r=>({h:r.h,c:keep.map(j=>r.c[j])}));
  return R.length?{t:'tbl',rows:R,nc:keep.length}:null;}
function xbBlocos(root){
  const out=[];const push=b=>{if(b)out.push(b);};
  const kv=(k,v)=>{const l=out[out.length-1];if(l&&l.t==='kv')l.rows.push([k,v]);else out.push({t:'kv',rows:[[k,v]]});};
  (function walk(el){for(const n of el.childNodes){
    if(n.nodeType===3){const t=n.textContent.replace(/\s+/g,' ').trim();if(t)push({t:'p',v:t});continue;}
    if(n.nodeType!==1)continue;const tag=n.tagName;
    if(XB_SKIP.has(tag))continue;if(n.hidden&&!n.hasAttribute('data-tab'))continue;if(n.classList.contains('hid')||n.style.display==='none')continue;
    if(tag==='TABLE'){push(xbTabela(n));continue;}
    if(/^H[1-4]$/.test(tag)){const v=xbTxt(n);if(v)push({t:'h',v,l:+tag[1]});continue;}
    if(n.classList.contains('f')){const lb=n.querySelector('label'),v=xbTxt(n),k=lb?xbTxt(lb):'';let val=v;if(k&&v.startsWith(k))val=v.slice(k.length).trim();const sm=n.querySelector('small');if(sm){const h=xbTxt(sm);if(val.endsWith(h))val=val.slice(0,val.length-h.length).trim();}
      if(k||val)kv(k.replace(/\s*\*$/,''),val);continue;}
    if(n.classList.contains('kpi')){const k=n.firstElementChild;if(k){const kt=xbTxt(k),all=xbTxt(n);kv(kt,all.slice(kt.length).trim());continue;}}
    if(tag==='INPUT'||tag==='SELECT'||tag==='TEXTAREA')continue;
    if(n.matches(XB_BLK)&&!n.querySelector(XB_BLK.toLowerCase())&&!n.querySelector('.f')){const v=xbTxt(n);if(v)push({t:'p',v});continue;}
    walk(n);}})(root);
  return out;}
const xbNum=s=>{const m=String(s).replace(/^R\$\s*/,'').trim();if(/^-?\d{1,3}(\.\d{3})*,\d{1,4}$/.test(m)||/^-?\d+,\d{1,4}$/.test(m))return parseFloat(m.replace(/\./g,'').replace(',','.'));return null;};
const xbSlug=s=>String(s||'relatorio').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,60)||'relatorio';
function xbCtx(scope){const root=scope||document.getElementById('main');const h=root.querySelector('h1,h2');const titulo=h?xbTxt(h):'Relatório';const E=(typeof DB!=='undefined'&&DB&&DB.empresa)||{};
  return{root,titulo,empresa:E.razao?E.razao+(E.cnpj?' — CNPJ '+fmtCNPJ(E.cnpj):''):'',gerado:new Date()};}
const xbEsc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');

/* ---------- XLSX ---------- */
const XB_CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
const xbCrc=d=>{let c=0xFFFFFFFF;for(let i=0;i<d.length;i++)c=XB_CRC[(c^d[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0;};
function xbZip(files){const enc=new TextEncoder(),parts=[],cen=[];let off=0;
  files.forEach(f=>{const nb=enc.encode(f.n),d=typeof f.d==='string'?enc.encode(f.d):f.d,crc=xbCrc(d),sz=d.length;
    const lh=new DataView(new ArrayBuffer(30));lh.setUint32(0,0x04034b50,true);lh.setUint16(4,20,true);lh.setUint16(6,0x0800,true);lh.setUint16(8,0,true);lh.setUint16(10,0,true);lh.setUint16(12,0x21,true);lh.setUint32(14,crc,true);lh.setUint32(18,sz,true);lh.setUint32(22,sz,true);lh.setUint16(26,nb.length,true);lh.setUint16(28,0,true);
    parts.push(new Uint8Array(lh.buffer),nb,d);
    const ch=new DataView(new ArrayBuffer(46));ch.setUint32(0,0x02014b50,true);ch.setUint16(4,20,true);ch.setUint16(6,20,true);ch.setUint16(8,0x0800,true);ch.setUint16(10,0,true);ch.setUint16(12,0,true);ch.setUint16(14,0x21,true);ch.setUint32(16,crc,true);ch.setUint32(20,sz,true);ch.setUint32(24,sz,true);ch.setUint16(28,nb.length,true);ch.setUint32(42,off,true);
    cen.push(new Uint8Array(ch.buffer),nb);off+=30+nb.length+sz;});
  const cdSize=cen.reduce((a,b)=>a+b.length,0);const e=new DataView(new ArrayBuffer(22));e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,cdSize,true);e.setUint32(16,off,true);
  const all=parts.concat(cen,[new Uint8Array(e.buffer)]);const tot=all.reduce((a,b)=>a+b.length,0),out=new Uint8Array(tot);let p=0;all.forEach(b=>{out.set(b,p);p+=b.length;});return out;}
const xbCol=n=>{let s='';n++;while(n>0){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=Math.floor((n-1)/26);}return s;};
function xlsxBuild(ctx,blocos){
  const rows=[];let maxc=1;const W=[];
  const cell=(c,r,v,st,num)=>num!=null?`<c r="${xbCol(c)}${r}" s="${st}"><v>${num}</v></c>`:`<c r="${xbCol(c)}${r}" s="${st}" t="inlineStr"><is><t xml:space="preserve">${xbEsc(v)}</t></is></c>`;
  const addW=(c,l)=>{W[c]=Math.max(W[c]||8,Math.min(60,l+2));};
  let r=1;const add=(cells)=>{rows.push(`<row r="${r}">${cells.join('')}</row>`);r++;};
  add([cell(0,r,ctx.titulo,2)]);
  if(ctx.empresa)add([cell(0,r,ctx.empresa,0)]);
  add([cell(0,r,'Gerado em '+ctx.gerado.toLocaleDateString('pt-BR')+' às '+ctx.gerado.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),6)]);add([]);
  blocos.forEach((b,bi)=>{
    if(b.t==='h'){if(bi===0&&b.v===ctx.titulo)return;add([cell(0,r,b.v,1)]);}
    else if(b.t==='p'){add([cell(0,r,b.v,0)]);}
    else if(b.t==='kv'){b.rows.forEach(([k,v])=>{const n=xbNum(v);add([cell(0,r,k,1),n!=null?cell(1,r,v,5,n):cell(1,r,v,4)]);addW(0,k.length);addW(1,String(v).length);maxc=Math.max(maxc,2);});add([]);}
    else if(b.t==='tbl'){maxc=Math.max(maxc,b.nc);b.rows.forEach(row=>{add(row.c.map((c,j)=>{addW(j,c.v.length);if(row.h)return cell(j,r,c.v,3);const n=xbNum(c.v);return n!=null?cell(j,r,c.v,5,n):cell(j,r,c.v,c.r?7:4);}));});add([]);}
  });
  const cols=Array.from({length:maxc},(_,j)=>`<col min="${j+1}" max="${j+1}" width="${W[j]||12}" customWidth="1"/>`).join('');
  const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews><cols>${cols}</cols><sheetData>${rows.join('')}</sheetData><pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="landscape" fitToHeight="0"/></worksheet>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts><fonts count="4"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><name val="Arial"/></font><font><b/><sz val="14"/><name val="Arial"/></font><font><i/><sz val="9"/><color rgb="FF555555"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9E1F2"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFBBBBBB"/></left><right style="thin"><color rgb="FFBBBBBB"/></right><top style="thin"><color rgb="FFBBBBBB"/></top><bottom style="thin"><color rgb="FFBBBBBB"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="8"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/><xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="top"/></xf></cellXfs></styleSheet>`;
  const files=[
   {n:'[Content_Types].xml',d:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'},
   {n:'_rels/.rels',d:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'},
   {n:'xl/workbook.xml',d:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="'+xbEsc(ctx.titulo.replace(/[\\\/\?\*\[\]:]/g,' ').slice(0,31)||'Relatório')+'" sheetId="1" r:id="rId1"/></sheets></workbook>'},
   {n:'xl/_rels/workbook.xml.rels',d:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'},
   {n:'xl/styles.xml',d:styles},{n:'xl/worksheets/sheet1.xml',d:sheet}];
  return xbZip(files);}

/* ---------- PDF ---------- */
const HW=[278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const PDF_MAP={'–':0x96,'—':0x97,'‘':0x91,'’':0x92,'“':0x93,'”':0x94,'•':0x95,'…':0x85,'€':0x80,'™':0x99,'×':0xD7,'÷':0xF7,'≤':0x3C,'≥':0x3E,'→':0x2D,'·':0xB7,'º':0xBA,'ª':0xAA,'°':0xB0};
function pdfChars(s){const o=[];for(const ch of String(s)){const c=ch.codePointAt(0);if(c>=32&&c<127)o.push(c);else if(c>=160&&c<=255)o.push(c);else if(PDF_MAP[ch])o.push(PDF_MAP[ch]);else if(c===9||c===10||c===13)o.push(32);else if(c>255&&c!==0xFE0F&&c!==0x200D&&!(c>=0x1F000)&&!(c>=0x2190&&c<=0x2BFF))o.push(63);}return o;}
const pdfW=(cs,size,bold)=>{let w=0;for(const c of cs)w+=(c>=32&&c<127?HW[c-32]:556);return w*size/1000*(bold?1.06:1);};
function pdfWrap(texto,size,bold,max){const words=pdfChars(texto).reduce((a,c)=>{if(c===32){a.push([]);}else{if(!a.length)a.push([]);a[a.length-1].push(c);}return a;},[]).filter(w=>w.length);
  const lines=[];let cur=[],cw=0;const sp=pdfW([32],size,bold);
  const flush=()=>{if(cur.length)lines.push(cur);cur=[];cw=0;};
  words.forEach(w=>{let ww=pdfW(w,size,bold);
    if(ww>max){/* palavra maior que a coluna: quebra por caractere */flush();let part=[],pw=0;w.forEach(c=>{const x=pdfW([c],size,bold);if(pw+x>max&&part.length){lines.push(part);part=[];pw=0;}part.push(c);pw+=x;});cur=part;cw=pw;return;}
    if(cur.length&&cw+sp+ww>max)flush();if(cur.length){cur=cur.concat([32],w);cw+=sp+ww;}else{cur=w.slice();cw=ww;}});
  flush();return lines.length?lines:[[]];}
const pdfS=cs=>String.fromCharCode.apply(null,cs).replace(/[\\()]/g,m=>'\\'+m);
function pdfBuild(ctx,blocos){
  let maxcol=0;blocos.forEach(b=>{if(b.t==='tbl')maxcol=Math.max(maxcol,b.nc);});
  const land=maxcol>=6;const PW=land?841.89:595.28,PH=land?595.28:841.89,M=34,CW=PW-2*M,TOP=PH-M-26,BOT=M+16;
  const pages=[];let cur=null,y=0;
  const nova=()=>{cur=[];pages.push(cur);y=TOP;};
  const T=(x,yy,cs,size,bold)=>cur.push(`BT /F${bold?2:1} ${size} Tf ${x.toFixed(2)} ${yy.toFixed(2)} Td (${pdfS(cs)}) Tj ET`);
  const rect=(x,yy,w,h,g)=>cur.push(`${g} g ${x.toFixed(2)} ${yy.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f 0 g`);
  const box=(x,yy,w,h)=>cur.push(`0.75 G 0.5 w ${x.toFixed(2)} ${yy.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S 0 G`);
  const garante=h=>{if(y-h<BOT)nova();};
  nova();
  const tl=pdfWrap(ctx.titulo,15,true,CW);tl.forEach(l=>{T(M,y,l,15,true);y-=19;});y-=2;
  const sub=ctx.empresa+(ctx.empresa?'  ·  ':'')+'gerado em '+ctx.gerado.toLocaleDateString('pt-BR')+' '+ctx.gerado.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  pdfWrap(sub,8,false,CW).forEach(l=>{T(M,y,l,8,false);y-=11;});y-=6;
  const tabela=(cols,rows,opts)=>{/* cols: nº; rows:[{h,c:[{v,r}]}] */
    const fs=opts.fs;let ws=[];const nc=cols;
    const maxLen=Array(nc).fill(4),minW=Array(nc).fill(0);
    rows.forEach(r=>r.c.forEach((c,j)=>{const cs=pdfChars(c.v);maxLen[j]=Math.max(maxLen[j],Math.min(cs.length,opts.cap||38));
      c.v.split(/\s+/).forEach(w=>{minW[j]=Math.max(minW[j],pdfW(pdfChars(w),fs,r.h)+8);});}));
    const sum=maxLen.reduce((a,b)=>a+b,0);ws=maxLen.map(l=>l/sum*CW);
    /* garante largura mínima (palavra inteira) quando possível */
    for(let it=0;it<4;it++){let deficit=0,flex=0;ws.forEach((w,j)=>{const m=Math.min(minW[j],CW/nc*1.6);if(w<m){deficit+=m-w;ws[j]=m;}else flex+=w-m;});if(deficit>0&&flex>0)ws=ws.map((w,j)=>{const m=Math.min(minW[j],CW/nc*1.6);return w>m?w-(w-m)/flex*deficit:w;});}
    const tot=ws.reduce((a,b)=>a+b,0);ws=ws.map(w=>w*CW/tot);
    const lh=fs+3,pad=3;
    const desenha=(r,rep)=>{const ls=r.c.map((c,j)=>pdfWrap(c.v,fs,r.h,ws[j]-2*pad));const n=Math.max(...ls.map(l=>l.length)),h=n*lh+2*pad-1;
      if(!rep)garante(h);else if(y-h<BOT)nova();
      let x=M;ws.forEach((w,j)=>{if(r.h)rect(x,y-h,w,h,0.88);box(x,y-h,w,h);const c=r.c[j];ls[j].forEach((l,k)=>{const lw=pdfW(l,fs,r.h);const tx=(c.r||(!r.h&&xbNum(c.v)!=null))?x+w-pad-lw:x+pad;T(tx,y-pad-fs+1-k*lh,l,fs,r.h);});x+=w;});y-=h;return h;};
    const cab=rows.filter(r=>r.h);
    rows.forEach((r,i)=>{if(!r.h&&y-(fs+3*2+2)<BOT){nova();cab.forEach(h=>desenha(h,true));}desenha(r,false);});
    y-=8;};
  blocos.forEach((b,bi)=>{
    if(b.t==='h'){if(bi===0&&b.v===ctx.titulo)return;const sz=b.l<=2?12:10.5;const ls=pdfWrap(b.v,sz,true,CW);garante(ls.length*(sz+4)+14);y-=4;ls.forEach(l=>{T(M,y-sz,l,sz,true);y-=sz+4;});y-=2;}
    else if(b.t==='p'){const ls=pdfWrap(b.v,9,false,CW);ls.forEach(l=>{garante(12);T(M,y-9,l,9,false);y-=12;});y-=3;}
    else if(b.t==='kv'){tabela(2,b.rows.map(([k,v])=>({h:false,c:[{v:k,r:false},{v,r:false}]})),{fs:8.5,cap:60});}
    else if(b.t==='tbl'){const fs=b.nc>=12?6.5:b.nc>=9?7:b.nc>=6?7.5:8.5;tabela(b.nc,b.rows,{fs});}
  });
  /* montagem do arquivo */
  const objs=[];const add=s=>{objs.push(s);return objs.length;};
  add('<< /Type /Catalog /Pages 2 0 R >>');add('PAGES');add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const kids=[];const np=pages.length;
  pages.forEach((ops,i)=>{const rod=pdfChars((ctx.empresa||'FolhaPro')+'   ·   página '+(i+1)+' de '+np);
    ops.push(`0.6 G 0.5 w ${M} ${M+10} m ${PW-M} ${M+10} l S 0 G`);ops.push(`BT /F1 7.5 Tf ${M} ${M} Td (${pdfS(rod)}) Tj ET`);
    const body=ops.join('\n');const ci=add('<< /Length '+body.length+' >>\nstream\n'+body+'\nendstream');
    const pi=add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${ci} 0 R >>`);kids.push(pi+' 0 R');});
  objs[1]=`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${np} >>`;
  const info=add('<< /Title ('+pdfS(pdfChars(ctx.titulo))+') /Producer (FolhaPro) >>');
  let out='%PDF-1.4\n';const offs=[];objs.forEach((o,i)=>{offs.push(out.length);out+=(i+1)+' 0 obj\n'+o+'\nendobj\n';});
  const xr=out.length;out+='xref\n0 '+(objs.length+1)+'\n0000000000 65535 f \n'+offs.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+(objs.length+1)+' /Root 1 0 R /Info '+info+' 0 R >>\nstartxref\n'+xr+'\n%%EOF';
  const u=new Uint8Array(out.length);for(let i=0;i<out.length;i++)u[i]=out.charCodeAt(i)&255;return u;}

/* ---------- ações e botões ---------- */
function baixarBin(nome,bytes,mime){try{const b=new Blob([bytes],{type:mime});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=nome;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},800);}catch(e){toast('Não foi possível baixar o arquivo neste ambiente.','err');}}
function exportar(fmt,scope){const ctx=xbCtx(scope),bl=xbBlocos(ctx.root);if(!bl.length){toast('Não há conteúdo para exportar nesta tela.','err');return null;}
  const d=ctx.gerado,ds=d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');
  const bytes=fmt==='pdf'?pdfBuild(ctx,bl):xlsxBuild(ctx,bl),nome=xbSlug(ctx.titulo)+'_'+ds+(fmt==='pdf'?'.pdf':'.xlsx');
  baixarBin(nome,bytes,fmt==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  audit('Exportação '+fmt.toUpperCase(),nome);toast(nome+' gerado.','ok');return{nome,bytes};}
ACT.expPdf=el=>{const m=el&&el.closest&&el.closest('#modal');exportar('pdf',m||null);};
ACT.expXls=el=>{const m=el&&el.closest&&el.closest('#modal');exportar('xlsx',m||null);};
const expBtns=()=>'<button class="btn" data-act="expPdf" title="Exportar a tela atual em PDF">⬇ PDF</button><button class="btn" data-act="expXls" title="Exportar a tela atual em Excel (.xlsx)">⬇ Excel</button>';
(function(){const _rb=renderBar;renderBar=function(sc){_rb(sc);const bar=document.getElementById('bar');if(!bar||bar.querySelector('[data-act=expPdf]'))return;const sp=bar.querySelector('.sp');const w=document.createElement('span');w.className='expb';w.innerHTML=expBtns();if(sp)bar.insertBefore(w,sp);else bar.appendChild(w);};
  const _md=modal;modal=function(html,o){_md(html,o);const mb=document.querySelector('#modal .mbox');if(mb&&mb.querySelector('table')&&!mb.querySelector('[data-act=expPdf]')){const d=document.createElement('div');d.className='row expm';d.style.marginTop='10px';d.innerHTML=expBtns();mb.appendChild(d);}};})();
