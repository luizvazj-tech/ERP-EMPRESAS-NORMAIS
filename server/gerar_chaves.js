'use strict';
/* Uso: node gerar_chaves.js [senha-admin]
   Gera o par ECDSA P-256 de assinatura (chave pública JWK para o front; privada PEM para UPDATE_PRIVATE_KEY)
   e, se informada uma senha, o ADMIN_PASSWORD_HASH (scrypt). Nada é gravado em disco; copie a saída. */
const c=require('crypto');
const {publicKey,privateKey}=c.generateKeyPairSync('ec',{namedCurve:'P-256'});
console.log('--- CHAVE PÚBLICA (JWK) — colar em UPD_PUB no src/ui9.js ---');console.log(JSON.stringify(publicKey.export({format:'jwk'})));
console.log('\n--- UPDATE_PRIVATE_KEY (segredo; guardar só no Render, nunca no Git) ---');console.log(privateKey.export({type:'pkcs8',format:'pem'}).trim().replace(/\n/g,'\\n'));
if(process.argv[2]){const s=c.randomBytes(16);console.log('\n--- ADMIN_PASSWORD_HASH ---');console.log(s.toString('hex')+':'+c.scryptSync(process.argv[2],s,64).toString('hex'));}
