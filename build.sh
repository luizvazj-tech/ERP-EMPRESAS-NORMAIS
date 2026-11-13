#!/bin/sh
# Monta o index.html a partir dos módulos em src/, calcula o hash da CSP e valida a sintaxe.
cd "$(dirname "$0")" || exit 1
cat src/core.js src/core2.js src/ui1.js src/ui2.js src/ui3.js src/ui5.js src/ui6.js src/ui7.js src/ui8.js src/ui4.js > _t.js
node --check _t.js || exit 1
cat src/head.html _t.js > index.html && printf '\n</script></body></html>\n' >> index.html && rm -f _t.js
node -e "
const c=require('crypto'),f=require('fs');let h=f.readFileSync('index.html','utf8');
const i=h.lastIndexOf('<script>')+8,j=h.lastIndexOf('</script>');
const d=c.createHash('sha256').update(h.slice(i,j)).digest('base64');
f.writeFileSync('index.html',h.replace('%%CSPHASH%%',d));console.log('CSP sha256-'+d);"
echo BUILD_OK
