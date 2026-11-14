# Servidor de atualizações do FolhaPro

Serviço Node sem dependências externas (Node 18 ou superior) que guarda pacotes assinados e os entrega ao botão “Atualizar” do sistema. O painel administrativo fica em `/admin`.

## Como funciona

O administrador publica um pacote no painel; o servidor o assina com a chave privada (ECDSA P-256, SHA-256). O sistema, no navegador do cliente, consulta `GET /api/atualizacoes?desde=N`, confere cada assinatura com a chave pública embutida em `src/ui9.js` e só então mostra e aplica o pacote. Pacote com assinatura inválida é ignorado.

Tipos aceitos: **aviso** (nota de versão), **parametros** (tabelas e alíquotas legais, só chaves da lista permitida), **rubricas** (natureza e códigos de incidência de rubricas existentes) e **arquivo** (download com SHA-256 conferido). O sistema **não executa código recebido**: correção de código segue pelo GitHub e pelo deploy do site (o botão detecta a nova versão pelo `version.json` e recarrega a página; os dados continuam no navegador).

## Publicação no Render

1. Gere as chaves e o hash da senha: `node gerar_chaves.js "<senha-forte>"`. A saída traz a chave pública (JWK), a privada (PEM) e o hash.
2. Cole a chave pública em `UPD.pub` no `src/ui9.js`, rode `./build.sh` e publique o site.
3. Crie um **Web Service** (runtime Node, raiz `server`, comando `node server.js`) com **disco persistente** montado em `/var/data`, pois o disco padrão é apagado a cada deploy.
4. Variáveis de ambiente: `DATA_DIR=/var/data`, `UPDATE_PRIVATE_KEY` (PEM com `\n` literais), `ADMIN_USER`, `ADMIN_PASSWORD_HASH`, `ALLOWED_ORIGIN=https://folhapro.onrender.com`.
5. Ajuste `UPD.url` em `src/ui9.js` para o endereço do serviço e refaça o build.

## Cuidados de segurança

A chave privada nunca vai ao Git. Quem a possuir pode alterar parâmetros de cálculo de todos os clientes; por isso o painel exige senha com limite de tentativas, sessão de duas horas, cookie HttpOnly/SameSite=Strict e token anti-CSRF, e registra cada operação em `auditoria.log`. Use senha longa e exclusiva e ative a autenticação em dois fatores na conta do Render e do GitHub. Para rotacionar a chave, gere novo par, atualize `UPD.pub`, publique nova versão do site e reassine os pacotes vigentes.

O que o servidor recebe do cliente é o número da última atualização aplicada, mais o IP e o navegador próprios de qualquer conexão. Não recebe dados de empregados, empresas ou folhas. Esse tratamento consta da seção 9 da política de privacidade do sistema.

## Teste

`NODE_PATH=<jsdom> node tools/upd_test.js` sobe um servidor temporário e verifica login, CSRF, limites, publicação, detecção de pacote adulterado, aplicação, desfazer, download com hash e revogação.
