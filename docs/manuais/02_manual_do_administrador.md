---
title: "MANUAL DO ADMINISTRADOR E DE IMPLANTAÇÃO — FOLHAPRO"
subtitle: "Instalação, publicação, modo servidor, licenças, atualizações, backup e segurança. Versão 2026.11."
---

# 1. Modelos de implantação

**Modo local.** Um arquivo `index.html` único, publicado como site estático, executa no navegador. Os dados ficam criptografados no próprio dispositivo. Não há servidor de dados. Indicado para uma máquina ou um pequeno escritório.

**Modo servidor.** O mesmo `index.html`, gerado com a variável `FP_API_URL`, conversa com a API (`api/server.js`), que oferece contas, usuários, permissões por módulo, MFA, auditoria encadeada e controle de licença. Indicado para vários usuários e para o revendedor.

**Servidor de atualizações.** Serviço separado (`server/server.js`) que guarda pacotes **assinados** e os entrega ao botão “Atualizar”. Serve aos dois modos.

# 2. Publicação do front-end no Render (modo local)

1. Código no GitHub, ramo `main`. O arquivo `render.yaml` define um **site estático** com `staticPublishPath: .`.
2. No Render, crie o serviço a partir do repositório e confirme que o deploy termina com sucesso. O Render publica a cada push no ramo.
3. Teste a URL pública: carregue a demonstração, calcule uma folha e gere um evento.
4. Gere o build local com `./build.sh`: ele concatena os arquivos de `src/`, calcula o hash da política de segurança de conteúdo (CSP), grava `index.html` e `version.json` e imprime `BUILD_OK`. **Nunca edite `index.html` à mão.**

# 3. Servidor de atualizações

1. `node server/gerar_chaves.js "<senha-forte>"` imprime a chave pública (JWK), a privada (PEM) e o hash da senha do painel.
2. Cole a chave **pública** em `UPD.pub` (`src/ui9.js`), rode `./build.sh` e publique o front-end.
3. Crie um **Web Service** (runtime Node, raiz `server`, comando `node server.js`) com **disco persistente** em `/var/data`, pois o disco padrão se apaga a cada deploy.
4. Variáveis: `DATA_DIR=/var/data`, `UPDATE_PRIVATE_KEY` (PEM com `\n` literais), `ADMIN_USER`, `ADMIN_PASSWORD_HASH`, `ALLOWED_ORIGIN=https://<seu-front>`.
5. Ajuste `UPD.url` em `src/ui9.js` para o endereço do serviço e refaça o build.
6. Acesse `/admin` para publicar pacotes: **aviso**, **parâmetros** (somente chaves permitidas), **rubricas** (natureza e incidências de rubricas existentes) e **arquivo**.

**A chave privada nunca vai ao Git nem ao chat.** Quem a possuir pode alterar parâmetros de cálculo de todos os clientes. Guarde-a só no Render e em cópia off-line. Se houver suspeita de vazamento, gere novo par, atualize `UPD.pub`, refaça o build e revogue os pacotes anteriores.

**Plano gratuito:** o disco efêmero apaga os pacotes e o número sequencial a cada reinício. Em produção use plano com disco persistente. Item pendente na auditoria.

# 4. Modo servidor (API)

## 4.1. Variáveis de ambiente

| Variável | Função |
|---|---|
| `DATA_DIR` | Pasta de dados. Precisa de disco persistente. |
| `PLATFORM_USER`, `PLATFORM_PASSWORD_HASH` | Acesso do fornecedor ao painel `/plataforma`. Gere o hash com `node -e "console.log(require('./server.js').hashSenha('SUA_SENHA'))"`. |
| `PLATFORM_TOTP_SECRET` | Segredo base32 para MFA do fornecedor (recomendado). |
| `WEBHOOK_SECRET` | Segredo HMAC-SHA256 do webhook de pagamento. |
| `ALLOWED_ORIGIN` | Origem do front-end. Evite `*` em produção. |
| `SESSION_MIN` | Minutos de inatividade para encerrar a sessão (padrão 30). |

## 4.2. Publicar

1. Crie o Web Service (raiz `api`, `node server.js`) com disco persistente.
2. Gere o front-end com `FP_API_URL=https://<url-da-api> ./build.sh` e publique o `index.html`.
3. Em `/plataforma`, crie a **conta** do cliente, com plano, validade e limites (empresas, vínculos ativos, usuários).
4. O cliente cria os **usuários** e define o nível por módulo: 0 sem acesso, 1 visualizar, 2 editar, 3 aprovar/fechar/transmitir, 4 administrar. Fechamento de competência e transmissão exigem nível 3.

## 4.3. Licenças

Estados: **ativa**, **carência** (7 dias após o vencimento, com aviso), **vencida** (somente leitura) e **suspensa** (bloqueia o acesso). O webhook `POST /api/pagamentos/webhook`, com o cabeçalho `X-Signature` (HMAC-SHA256 hexadecimal do corpo bruto), estende a validade e pode mudar o plano: `{"conta":"t…","evento":"pago","meses":12,"plano":"profissional"}`. Limites são verificados no servidor.

## 4.4. Limites conhecidos

Armazenamento em arquivos JSON (adequado a dezenas de contas; migrar para PostgreSQL acima disso, decisão pendente de hospedagem). Sessões ficam em memória: reiniciar o servidor exige novo login. A API não exclui empresas.

# 5. Backup e recuperação

**Modo local:** o cliente exporta backup criptografado em “Backup e dados”, com senha própria, e restaura na mesma tela. Recomende cópia semanal e antes de cada atualização. **Modo servidor:** faça cópia do `DATA_DIR` (ou do banco, quando migrado) diariamente, guarde em local distinto e **teste a restauração** ao menos uma vez por trimestre. Documente o tempo de recuperação.

# 6. Segurança e conformidade

Aplique: senhas fortes e MFA para toda conta com nível 3 ou 4; revisão trimestral dos usuários e permissões; troca imediata de credenciais ao desligar alguém; atualizações em até [●] dias; HTTPS obrigatório (o Render fornece); monitoramento dos registros; e o plano de resposta a incidentes (documento 04). Verifique a trilha de auditoria encadeada periodicamente. Mantenha o relatório de impacto (documento 03) atualizado quando mudar o tratamento.

# 7. Certificado digital e transmissão

O envio ao eSocial exige certificado ICP-Brasil (A1 ou A3) e comunicação TLS mútua. O navegador não guarda a chave privada do certificado. A integração é por **gateway** do cliente; o fornecedor **não deve custodiar** certificado nem senha do cliente, salvo contrato específico que trate esse risco. Valide sempre em **produção restrita** antes de passar à produção.

# 8. Homologação e entrada em produção (lista de verificação)

| Etapa | Verificação | Responsável |
|---|---|---|
| 1 | Folha de uma empresa real calculada em paralelo com o sistema atual; diferença explicada até R$ 0,01 | DP |
| 2 | Eventos S-1000, S-1005, S-1010, S-1020 e S-2200 processados em produção restrita | DP e TI |
| 3 | S-1200, S-1210 e S-1299 processados; S-5001/5002/5011 conciliados com a folha | DP |
| 4 | DCTFWeb conferida com o espelho do sistema e o resultado do e-CAC | Contabilidade |
| 5 | Layout CNAB homologado com o banco | Financeiro |
| 6 | Backup restaurado em outra máquina | TI |
| 7 | Usuários, permissões e MFA revisados | Administrador |
| 8 | Termos, política de privacidade e contrato assinados | Jurídico |

# 9. Rotina periódica

**Mensal:** aplicar atualizações, conferir calendário de prazos e fechar competências. **Janeiro:** novas tabelas (INSS, IRRF, salário mínimo, salário-família, teto), alíquotas de FAP e RAT, CPRB e feriados do ano. **A cada nota técnica do eSocial:** atualizar o leiaute (ver Manual Técnico). **Trimestral:** testar restauração e revisar acessos. **Anual:** revisar contratos, relatório de impacto e termos.
