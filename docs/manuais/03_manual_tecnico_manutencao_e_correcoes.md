---
title: "MANUAL TÉCNICO, DE MANUTENÇÃO E DE CORREÇÕES — FOLHAPRO"
subtitle: "Arquitetura, convenções, testes, procedimentos de atualização e registro de correções. Versão 2026.11."
---

# 1. Visão geral da arquitetura

O FolhaPro é uma aplicação de página única (HTML, CSS e JavaScript), **sem bibliotecas externas**, gerada por concatenação de arquivos de `src/` em um único `index.html` (aproximadamente 550 KB). A política de segurança de conteúdo (CSP) proíbe scripts de terceiros e manipuladores em linha (`onclick`); os eventos usam o atributo `data-act`. O estado fica em um objeto `DB`, persistido em armazenamento local criptografado (cofre) ou, no modo servidor, em API própria.

| Arquivo | Conteúdo |
|---|---|
| `src/head.html` | Estilos, tokens de cor (claro e escuro) e estrutura da página |
| `src/core.js`, `core2.js` | Parâmetros legais, rubricas padrão, cálculo (`calcEmpregado`, `totaisComp`, `encargosEmpresa`), `loadDB`, `saveDB`, validações-base |
| `src/ui1.js` | Menu (`MENU`), navegação (`go`, `render`), modal, `crud()` genérico |
| `src/ui2.js`, `ui3.js`, `ui5.js`, `ui6.js` | Cadastros, empregados, folha, férias, 13º, rescisão, gráficos |
| `src/ui7.js` | Cofre criptografado, consentimento, privacidade, segurança |
| `src/ui8.js` | Feriados e Páscoa, calendário |
| `src/ui9.js` a `ui11.js` | Atualizações assinadas, eSocial (geradores `GEN`), biblioteca |
| `src/ui4.js` | Início, backup e `boot()` |
| `src/ui12.js` a `ui17.js` | Controle interno, contabilidade, financeiro, CNAB, modo servidor, DCTFWeb |
| `src/ui18.js` | Exportação em PDF e Excel sem bibliotecas |
| `src/ui19.js`, `ui20.js` | DARF (espelho), contribuintes individuais, CPRB, Reinf, adicionais |
| `src/ui21.js` | Tema, paleta de comandos, acessibilidade de diálogos |
| `api/` | API do modo servidor (contas, usuários, MFA, auditoria, licenças) e painel `/plataforma` |
| `server/` | Servidor de atualizações assinadas e painel `/admin` |
| `tools/` | Testes e utilitários (jsdom, Playwright, validação XSD) |
| `docs/` | Documentação, minutas e planilhas de auditoria |

**Ordem de concatenação** (`build.sh`): `core, core2, ui1, ui2, ui3, ui5, ui6, ui7, ui8, ui9, ui10, ui11, ui4, ui12 … ui21`. O `ui4.js` termina com `boot()`. Funções declaradas são içadas (hoisting); constantes `const` não. Funções podem ser reatribuídas, o que se usa para estender comportamento (`renderBar`, `modal`, `closeModal` e `render` são embrulhadas em `ui18` e `ui21`).

# 2. Padrões de código

**Telas.** `SC.<tela> = { view(params), mount?(params) }` retorna HTML; ações ficam em `ACT.<nome> = (elemento) => …` e são ligadas por `data-act="nome"`. O menu está em `MENU` (`ui1.js`); toda tela nova entra no menu ou é alcançada por `go()`.

**CRUD.** `crud(nome, { cols, fields, validate, rowBtns, note })` gera listagem, formulário, validação e exclusão. Campos usam `F(rótulo, nome, valor, { t, opts, w, req, hint, max, mask })`.

**Modo servidor.** Cada chave de `DB` precisa de dono em `SV_PAG` (front, `ui14.js`) e em `CHAVE_MOD` (`api/server.js`) para checar permissão por módulo. Esquecer uma chave faz a gravação ser negada.

**Eventos do eSocial.** Geradores em `GEN['S-xxxx']` produzem XML; `criarEvento` registra; `validarBase`/`validarEvento` fazem as dependências e regras; `enviarEventos` transmite; a ordem está em `ORDEM`. Todo gerador novo deve ser validado contra o XSD.

**Segurança.** Sem `innerHTML` com dado do usuário sem `esc()`. Sem `eval`. Sem manipuladores em linha. Preferências só se gravam com consentimento (`CONSENT.pref`).

**Marcação de dúvida normativa.** Itens sem fonte oficial confirmada recebem `**` na interface e na documentação. Não inventar artigo, código ou percentual.

# 3. Ambiente de desenvolvimento e build

Requisitos: Node 18 ou superior; Python 3 com Playwright e Chromium (testes de navegador); jsdom em `NODE_PATH`; `xmllint`/lxml para XSD. Comandos:

```
./build.sh                      # gera index.html e version.json; imprime BUILD_OK
FP_API_URL=https://api ./build.sh   # build para modo servidor
node tools/<teste>.js           # suítes jsdom
python3 tools/vault_test.py     # Chromium (servir com: python3 -m http.server 8765)
node api/test.js                # API
```

O `build.sh` calcula o hash SHA-256 da CSP do bloco de estilo e do script, injeta a versão e confere a sintaxe. **Se o build não imprimir `BUILD_OK`, não publique.**

# 4. Suítes de teste

| Teste | O que cobre |
|---|---|
| `tools/auditoria_final.js` | Totais, líquido, INSS progressivo, FGTS recalculados de forma independente em 3 empresas (33 verificações) |
| `tools/export_test.js` | Exportação PDF e Excel de todas as telas principais |
| `tools/darf_fer_test.js` | Feriados móveis, DARF espelho |
| `tools/encargos2_test.js` | GILRAT adicional, CPRB com transição, SENAI adicional, terceiros por entidade |
| `tools/ci_esocial_test.js` | Contribuintes individuais; S-2300, S-1200, S-1210 e S-1010 validados no XSD |
| `tools/contab_fin_test.js`, `dctf_test.js` | Contabilidade, financeiro, CNAB, DCTFWeb |
| `tools/rubricas_test.js`, `rubxml_test.js`, `nat_test.js` | Rubricas, XML de rubrica e naturezas |
| `tools/regras_test.js`, `hist_test.js`, `ficha_test.js`, `relemp_test.js` | Regras de negócio, histórico, ficha, relatórios |
| `tools/multiemp_test.js`, `exemplo_test.js`, `side_test.js`, `ui8_test.js` | Multiempresa, ambiente de exemplo, menu (57 telas), calendário |
| `tools/servidor_test.js`, `api/test.js`, `api/test_painel.js` | Modo servidor, API e painel |
| `tools/upd_test.js` | Servidor de atualizações (precisa do arquivo local de chaves) |
| `tools/a11y_test.js`, `olho_test.js`, `ux_test.js` | Nomes acessíveis, campo de senha, tema, paleta, diálogos |
| `tools/vault_test.py` | Cofre, consentimento e menu móvel no Chromium |
| `tools/xsdval.py` | Valida os XML em `/xsd/out` contra os XSD do leiaute S-1.3 |

**Regra de ouro:** nenhuma correção entra sem teste que a reproduza antes e passe depois, e sem rodar a regressão completa.

# 5. Procedimento de correção de defeito

1. **Registrar** o defeito: tela, competência, dados mínimos, resultado esperado e fonte normativa do esperado.
2. **Reproduzir** em teste (jsdom) com dados de exemplo (`seedDemo('lp')`).
3. **Localizar**: cálculo em `core*.js`; apresentação na tela `ui*.js`; evento em `GEN['S-xxxx']`.
4. **Corrigir** o mínimo necessário, sem alterar comportamento fora do escopo.
5. **Validar** XML contra o XSD, se o evento mudou.
6. **Regressão**: rodar todas as suítes da seção 4; a suíte do defeito deve passar e nenhuma outra pode falhar.
7. **Build** e conferência de `BUILD_OK`.
8. **Registrar** na planilha de auditoria (abas “Erros corrigidos” e “Melhorias”) e neste manual (seção 9).
9. **Commit** com mensagem descritiva, **push** e conferência do deploy.
10. Se o defeito afeta números já enviados, **comunicar** os clientes e orientar a retificação (S-1200/S-1210 e DCTFWeb).

# 6. Atualização de parâmetros e normas

**Tabelas anuais.** Em janeiro (ou quando a norma mudar): conferir INSS (faixas, teto), IRRF (faixas, dedução por dependente, redutor), salário mínimo, salário-família, valor limite do FGTS e feriados. Atualizar em `defaultParams()` (novas instalações) **e** publicar um pacote “parâmetros” no servidor de atualizações (instalações existentes). Rodar `auditoria_final.js` e conferir três casos manuais.

**Leiaute do eSocial.** A cada nota técnica ou pacote de XSD: colocar os XSD em `/home/claude/xsd/a`, gerar XML dos cenários (`tools/dump.js`, `tools/ci_esocial_test.js`) e rodar `python3 tools/xsdval.py <dir>`. Corrigir geradores até zerar os erros. Ler a nota técnica e o MOS para regras que o XSD não cobre (obrigatoriedade condicional, tabelas 3, 4 e 21).

**Rubricas e naturezas.** A Tabela 3 define naturezas e incidências. Para criar rubrica padrão: `R(sys, cod, desc, tp, nat, incCP, incIRRF, incFGTS)` em `defaultRubricas()`; `loadDB` acrescenta as faltantes em cadastros antigos. Escolher código que não colida com rubricas criadas por usuários (rubricas de contribuintes individuais usam 301 a 304).

**Códigos de receita da DCTFWeb.** Conferir no Manual da DCTFWeb e no MOS; alterar em `dctfExtras` e `darfLinhas`.

**Feriados.** Fixos e móveis em `ui8.js`; Carnaval, Sexta-feira Santa e Corpus Christi são configuráveis (`DB.cfg.ferMov`), e feriados locais em `DB.cfg.feriadosExtra`.

# 7. Publicação de nova versão

1. Regressão completa verde.
2. `./build.sh` com `BUILD_OK`; versão em `VERSION` e `version.json` atualizada.
3. `git add -A`, commit com atribuição, `git push origin main`.
4. Conferir no Render que o deploy ficou **live** (não afirme publicação sem conferir).
5. Teste de fumaça na URL pública.
6. Se houver mudança de cálculo, publicar aviso no servidor de atualizações.
7. Atualizar a planilha de auditoria e este manual.

# 8. Riscos técnicos conhecidos

Arquivo único grande (carga inicial e manutenção); armazenamento local limitado pelo navegador; API com armazenamento em arquivos JSON e sessões em memória; ausência de integração com certificado digital no navegador; cálculo de folha depende de tabelas e normas que mudam (risco de desatualização); testes de navegador cobrem o cofre e o menu, mas não toda a interface; acessibilidade verificada por script (nomes de controles, contraste em telas amostradas) e **sem teste com leitor de tela**; documentação normativa com pontos `**` pendentes.

# 9. Registro de correções relevantes

Resumo das correções de maior impacto (a lista completa está na planilha “Erros corrigidos”).

| Área | Defeito | Correção |
|---|---|---|
| eSocial S-1000 | Grupo `contato` inexistente em `infoCadastro` no S-1.3; `indPorte` com valor inválido | Estrutura ajustada ao XSD |
| eSocial S-1010 | `natRubr` vazio em 130 de 165 rubricas | Naturezas preenchidas pela Tabela 3; PLANO e COPART passam a 9219 |
| eSocial S-1200 | Estrutura anterior (`detVerbas`) | `remunPerApur` com `itensRemun`, `matricula` e `indSimples` |
| eSocial S-1210 | Campos de estrutura antiga | `infoPgto` conforme S-1.3 |
| IRRF do 13º | Redutor não aplicado | Redutor conforme Lei 9.250/1995, art. 3º-A, §3º ** |
| Auditoria final | Limite de meses e datas inválidas | Validações corrigidas; nomes acessíveis em todos os controles |
| Exportação | Indicadores concatenados (“Competência:2026-11Calculada”) | Espaçamento de filhos e tratamento de `.kpi` como par chave/valor |
| Encargos | Adicional de cooperado tratado sempre a cargo do tomador | Distinção produção/trabalho (Lei 10.666/2003, arts. 1º e 4º **) |
| Contribuintes individuais | Categoria 741 usada como cooperado (no MOS é MEI) | Categorias 731, 734 e 738; obrigatoriedade do S-2300 conforme o MOS |
| Contribuintes individuais | CI lançado em códigos de empregados e IRRF provisório | Códigos 1099-01, 1138-04/06 e 0588-06 |
| DCTFWeb | Terceiros sob código único | Um código por entidade (1170, 1176, 1181, 1184, 1191, 1196, 1200) |
| Rubricas | Códigos 201 a 204 colidiam com a sugestão de código de usuário | Renumeradas para 301 a 304 |
| Interface | Cor da marca preta ilegível no tema escuro | Cor derivada por tema; contraste verificado |

# 10. Histórico de versões (gerado do repositório)

Ordem cronológica, do primeiro commit até 89ef8c9 (a data de gravação dos commits não é informativa, por isso se omite).

| Commit | Alteração |
|---|---|
| 3cf3649 | FolhaPro: folha de pagamento e eSocial com regimes Simples, Presumido e Real |
| fefa814 | Painel gerencial e comparativo de regimes tributarios (Simples, Presumido, Real) |
| fb64ec3 | Auditoria: IRRF do 13o com redutor (Lei 9.250/1995, art. 3o-A, par. 3o); relatorio AUDITORIA.md; script audit1 |
| 4db125c | White-label: identidade visual configuravel (marca, cores, fonte, logotipo); padrao Mallora |
| d3bc4dd | Validacao contra XSD S-1.3: corrige S-1000/1010/1200/1210/1299/2200/2206, natureza das rubricas (Tabela 3) e codigos de incidencia INSS/IRRF (Tabelas 4 e 21); relatorio e ferramentas |
| ea1f508 | 3a rodada: CNPJ alfanumerico, cofre criptografado, LGPD/cookies, CSP, acessibilidade, S-2205/S-1298/S-3000, planilha de pendencias |
| 9cbc91f | 4a rodada: regras de negocio (CCT/pisos, 12x36, banco de horas, estabilidade, laudo, pensao variavel, consignado, plano, PLR), SST S-2210/2220/2240, retornos S-5001/5002/5011, guias com vencimentos, backup cifrado, pecas juridicas, planilha de pendencias |
| d015c52 | Roteiro de conferencia dos calculos em duvida; corrige texto de ferias na auditoria |
| a258517 | Botao Atualizar e servidor de atualizacoes assinadas (painel admin, ECDSA P-256), version.json, politica de privacidade secao 9 |
| 3e556d1 | Nova chave publica de assinatura; seq dos pacotes baseado no relogio (resiste a perda de dados do servidor) |
| 2b5d5f0 | Ficha Financeira: consolidada, individualizada por empregado (busca e seleção múltipla) e rascunho |
| 4946b49 | Multiempresa: Novo cadastro, abrir/trocar e excluir cadastro de empresa com confirmação |
| 3e6ab05 | Relatórios por empresa: seleção de empresas, informações e período; impressão e CSV |
| c270f60 | Menu lateral: grupos recolhíveis, busca, ícones, contadores e destaque da página atual |
| abc63d9 | Controle interno: histórico do empregado, advertências, cursos, saúde ocupacional (prazos NR-7) e soma de atestados (Decreto 3.048/1999, art. 75) |
| cffd234 | Ambiente de exemplo (3 empresas x 10 empregados) e marcação ** no lugar de [VERIFICAR FONTE OFICIAL] |
| 159a877 | Auditoria final: correção de limite de meses/datas inválidas, nomes acessíveis em todos os controles, xmlcheck por período, bateria auditoria_final |
| 93e8fc2 | Rubricas: incluir, pausar (por competência) e excluir; teste rubricas_test |
| 2679229 | Rubricas: proporcionalidade (admissão/desligamento e dias trabalhados), validação XSD de S-1010/S-1200 com rubricas novas (rubxml_test) |
| 52c86dc | Modo servidor: API com contas, usuários, permissões por módulo, MFA, auditoria encadeada e licenças por faixa; painel do fornecedor; login e telas no app |
| 2a34d1a | Planilha de auditoria e notas atualizada (modo servidor) |
| 464e37d | Empresa: abrir clicando no nome (com confirmação) e confirmação clara de exclusão irreversível |
| 39d5893 | Campos de senha com olho para mostrar/ocultar (acesso, modais, backup, modo servidor) |
| 83e5ef8 | Contabilidade (lançamentos automáticos da folha), Financeiro (contas a pagar) e Arquivos bancários (remessa/retorno CNAB 240) |
| 30b6d46 | DCTFWeb (apuração, créditos, prazos, MAED e mora) e correções do eSocial S-1.3 |
| f708fe4 | Planilha de auditoria e notas atualizada (contabilidade, financeiro/CNAB, DCTFWeb e correções do eSocial) |
| 032e1ae | Exportação de qualquer tela, relatório ou ficha para PDF e Excel (sem bibliotecas) |
| 51177c7 | Feriados móveis (Páscoa, Carnaval, Sexta-feira Santa, Corpus Christi, locais) e espelho de DARF com acréscimos |
| 2f07bde | Adicional GILRAT (aposentadoria especial), contribuintes individuais, CPRB com transição, SENAI adicional, terceiros por entidade e espelho do Reinf |
| 388a111 | S-2300/S-1200/S-1210 de contribuintes individuais (validados no XSD), adicional de cooperados e planilha de auditoria atualizada |
| aa091d0 | Códigos de receita conferidos na tabela oficial da DCTFWeb e do MOS (CI, adicionais, CPRB, terceiros por entidade) |
| 3ea6104 | Tabela 3 do eSocial: rubricas de contribuintes individuais (3501/3506/3508/3520) e natureza 9219 para plano de saúde e coparticipação |
| 89ef8c9 | Interface: tema claro/escuro, paleta de comandos, diálogos acessíveis e contraste |
