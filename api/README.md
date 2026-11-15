# API do FolhaPro — contas, usuários, permissões, MFA, auditoria e licenças

Servidor Node 18+ **sem dependências externas**. Quando o front-end é gerado com `FP_API_URL`, o FolhaPro passa ao **modo servidor**: login por e-mail, senha e MFA (TOTP), dados das empresas no servidor (nada fica no navegador) e permissões aplicadas pelo servidor.

## Modelo
- **Conta (cliente)** com plano, validade e limites (empresas, vínculos ativos, usuários). Criada pelo fornecedor em `/plataforma`.
- **Usuários** com perfil (administrador, DP, aprovador, consulta, auditor ou personalizado) e **nível por módulo**: 0 sem acesso · 1 visualizar · 2 editar · 3 aprovar/fechar/transmitir · 4 administrar. Módulos: cadastros, folha, ferias, esocial, sst, historico, relatorios, config, usuarios, auditoria. Cada usuário pode ser restrito a empresas específicas.
- **Gravação por chave**: o cliente envia só as chaves alteradas; o servidor exige o nível do módulo dono de cada chave (ver `CHAVE_MOD` em `server.js`), nível 3 para fechar competência e transmitir eventos, recusa conflitos por chave e devolve o que outros usuários alteraram.
- **Auditoria encadeada** (hash do registro anterior) por conta, com verificação de integridade.
- **Licença**: ativa → carência (7 dias) → vencida (somente leitura) · suspensa (bloqueia o acesso). Limites checados no servidor.

## Variáveis de ambiente
| Variável | Função |
|---|---|
| `DATA_DIR` | Pasta de dados. **Precisa ser disco persistente** (no Render, plano pago com disco). |
| `PLATFORM_USER`, `PLATFORM_PASSWORD_HASH` | Acesso do fornecedor ao `/plataforma`. Hash: `node -e "console.log(require('./server.js').hashSenha('SUA_SENHA'))"` |
| `PLATFORM_TOTP_SECRET` | (recomendado) segredo base32 para MFA do fornecedor. |
| `WEBHOOK_SECRET` | Segredo HMAC-SHA256 do webhook de pagamento. |
| `ALLOWED_ORIGIN` | Origem do front-end (ex.: `https://folhapro.onrender.com`). Evite `*` em produção. |
| `SESSION_MIN` | Inatividade para encerrar a sessão (padrão 30). |

## Webhook de pagamento
`POST /api/pagamentos/webhook` com cabeçalho `X-Signature` = HMAC-SHA256 (hex) do corpo bruto. Corpo: `{"conta":"t…","evento":"pago","meses":12,"plano":"profissional"}` estende a validade (e muda o plano, se informado); `{"conta":"t…","evento":"inadimplente"}` suspende. Qualquer provedor que consiga assinar o corpo serve; o conector específico depende das credenciais do provedor escolhido.

## Publicação do front-end em modo servidor
`FP_API_URL=https://URL-DA-API ./build.sh` e publique o `index.html`. Sem `FP_API_URL` o sistema continua no modo local (cofre no navegador).

## Limites conhecidos
Armazenamento em arquivos JSON (adequado a dezenas de contas; trocar por PostgreSQL acima disso). Sessões em memória (reiniciar o servidor exige novo login). Sem exclusão de empresa pela API (feita pelo fornecedor). Sem recuperação de senha por e-mail (o administrador reinicia). Sem teste de intrusão independente.

## Testes
`node test.js` (API, 80+ verificações) · `node test_painel.js` (painel do fornecedor) · `../tools/servidor_test.js` (app + API ponta a ponta).
