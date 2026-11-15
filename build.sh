#!/bin/sh
# Monta o index.html a partir dos módulos em src/, calcula o hash da CSP e valida a sintaxe.
cd "$(dirname "$0")" || exit 1
cat src/core.js src/core2.js src/ui1.js src/ui2.js src/ui3.js src/ui5.js src/ui6.js src/ui7.js src/ui8.js src/ui9.js src/ui10.js src/ui11.js src/ui4.js src/ui12.js src/ui13.js src/ui14.js src/ui15.js src/ui16.js > _t.js
node -e "
const c=require('crypto'),f=require('fs');let t=f.readFileSync('_t.js','utf8');const v=(f.existsSync('VERSION')?f.readFileSync('VERSION','utf8').trim():'0')+'+'+c.createHash('sha256').update(t).digest('hex').slice(0,8);
f.writeFileSync('_t.js',t.replace('%%APPVER%%',v));f.writeFileSync('version.json',JSON.stringify({versao:v,gerado:new Date().toISOString().slice(0,10)})+'\\n');console.log('VERSAO '+v);"
node --check _t.js || exit 1
cat src/head.html _t.js > index.html && printf '\n</script></body></html>\n' >> index.html && rm -f _t.js
node -e "
const c=require('crypto'),f=require('fs');let h=f.readFileSync('index.html','utf8');
const i=h.lastIndexOf('<script>')+8,j=h.lastIndexOf('</script>');
const d=c.createHash('sha256').update(h.slice(i,j)).digest('base64');
f.writeFileSync('index.html',h.replace('%%CSPHASH%%',d).replace('%%FPAPI%%',process.env.FP_API_URL||''));console.log('CSP sha256-'+d);"
echo BUILD_OK
