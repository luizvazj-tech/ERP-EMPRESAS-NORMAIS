#!/bin/sh
# Monta o index.html a partir dos módulos em src/
cd "$(dirname "$0")" && cat src/head.html src/core.js src/ui1.js src/ui2.js src/ui3.js src/ui5.js src/ui4.js > index.html && echo '</script></body></html>' >> index.html && echo OK
