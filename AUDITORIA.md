# FolhaPro — Relatório de auditoria (13/11/2026) — 2ª rodada: validação contra os XSD do eSocial S-1.3

Natureza: auditoria interna assistida, **não independente**. Itens sem fonte oficial confirmada permanecem marcados como [VERIFICAR FONTE OFICIAL].

## 1. Escopo e método

Foram fornecidos dois pacotes de esquemas XSD do leiaute S-1.3 (namespace `v_S_01_03_00`, 52 arquivos cada; diferem apenas em `evtAnotJud.xsd`, evento que o sistema não emite). O sistema gerou 243 XML em cinco cenários (Simples padrão, Simples Anexo IV, Lucro Presumido, Lucro Real e Lucro Presumido com CPRB), cobrindo S-1000, S-1005, S-1010, S-1020, S-2200, S-2206, S-2230, S-2299, S-1200, S-1210 e S-1299, e cada arquivo foi validado contra o XSD correspondente (`tools/xsdval.py`). Como a assinatura XMLDSig é aplicada no gateway, uma assinatura fictícia foi inserida apenas para a validação, de modo a não mascarar os demais erros.

**Limite:** a validação de esquema não substitui a homologação. A transmissão ao ambiente de produção restrita exige certificado ICP-Brasil e autenticação TLS mútua, e o ambiente desta sessão não alcança os servidores do eSocial. As regras de negócio do Anexo II do leiaute (rejeições por regra) só são exercidas na recepção real.

## 2. Resultado antes e depois

Antes das correções, **nenhum** dos 239 XML passava no XSD. Depois, **os 243 passam nos dois pacotes**.

## 3. Erros encontrados e corrigidos (esquema)

1. **S-1000:** o grupo `contato` não existe em `infoCadastro` no S-1.3, e `indPorte` só admite o valor `S` (ME/EPP); o sistema enviava `N` para os demais, o que é inválido, pois o campo não deve ser preenchido nesses casos. Corrigido.
2. **S-1010:** `natRubr` é obrigatório (4 dígitos, Tabela 3) e estava vazio em 130 das 165 rubricas geradas. As naturezas foram preenchidas conforme a Tabela 3 (por exemplo 1000, 1002, 1003, 1020, 1023, 1202, 1203, 1205, 1207, 1409, 5001, 6002, 6003, 6006, 6007, 6901, 9201, 9203, 9209, 9213, 9214, 9216) e as rubricas já salvas no navegador são completadas automaticamente. Para a rubrica de 1/3 de férias foi usado 1020, pois a descrição desse código inclui o adicional constitucional; para o aviso prévio indenizado foi usado 6003 (indenização compensatória), por ausência de código específico.
3. **S-1200:** o S-1.3 usa `remunPerApur` com `itensRemun` (e `matricula`, `indSimples`) dentro de `ideEstabLot`; o sistema emitia `detVerbas`, estrutura anterior. Corrigido, com `indSimples` emitido apenas quando a classificação tributária é 03 (Simples misto).
4. **S-1210:** a estrutura mudou no S-1.3: o `ideEvento` não tem `indApuracao`, e `infoPgto` contém diretamente `dtPgto`, `tpPgto`, `perRef`, `ideDmDev` e `vrLiq`, sem `indResBr` nem `detPgtoFl`. Corrigido.
5. **S-1299:** o sistema enviava o elemento `evtAqProd`, inexistente no S-1.3 (o correto é `evtComProd`). Corrigido.
6. **S-2200:** `nmMae` foi removido do leiaute; `cnpjSindCategProf` e `dscJorn` passaram a ser obrigatórios. Corrigido o XML, incluído o campo "Descrição da jornada" no cadastro do empregado e criadas validações que impedem o envio sem o CNPJ do sindicato e sem a descrição da jornada.
7. **S-2206:** `tpRegTrab` não existe em `vinculo` na alteração contratual; `localTrabalho` é obrigatório; `infoCeletista` exige `cnpjSindCategProf`. Corrigido.
8. **Falha de método:** no modo simulação o sistema marcava como "processado" XML que o XSD rejeita. A validação de natureza de rubrica e as novas validações do S-2200 passaram a valer em todos os modos.

## 4. Erros encontrados e corrigidos (regras de incidência e cálculo)

1. **Códigos de incidência das rubricas de INSS e IRRF (Tabelas 4 e 21).** A rubrica de INSS estava com `codIncCP` 00 e `codIncIRRF` 31 (que é retenção de IRRF), e a de IRRF com `codIncIRRF` 00. O correto é: INSS com `codIncCP` 31 (contribuição descontada do segurado, mensal) e `codIncIRRF` 41 (dedução da base, previdência oficial); IRRF com `codIncIRRF` 31 (retenção, remuneração mensal). O mesmo para o 13º: INSS 32/42 e IRRF 32. Sem isso, o eSocial não consolida corretamente a base do IRRF nem o desconto do segurado. Corrigido, inclusive nas rubricas já salvas.
2. **IRRF do 13º sem o redutor da Lei 15.270/2025** (Lei 9.250/1995, art. 3º-A, §3º). Corrigido na rodada anterior.

## 5. Conferências de cálculo sem divergência

- Recálculo independente a partir dos próprios XML, em 14 folhas de cinco regimes: líquido do S-1200 igual ao `vrLiq` do S-1210; INSS informado igual ao recálculo progressivo sobre a base de incidência (`codIncCP` 11 e 12); IRRF igual ao recálculo com dependentes, desconto simplificado e redutor (`tools/xmlcheck.py`).
- 14 casos de INSS e IRRF contra referências oficiais (Portaria Interministerial MPS/MF nº 13/2026; exemplos da Receita Federal para a Lei 15.270/2025), tabelas do Simples (Anexos I a V), rescisão por acordo (CLT, art. 484-A) e limites do Lucro Presumido (`tools/audit1.js`).

## 6. Pendências e limitações conhecidas

1. **CNPJ alfanumérico — corrigido na 3ª rodada** (validação, máscara, XML; `tools/cnpj_test.js`).
2. **Incidências de férias.** O sistema classifica FÉRIAS e 1/3 com `codIncIRRF` 13 (rendimento de férias, Tabela 21) e `codIncCP` 11; abono pecuniário com 75 e férias indenizadas com 74. A retenção do IRRF sobre férias sai na rubrica única de IRRF (31), e a Tabela 21 prevê retenção própria para férias (33). Confirmar a consolidação no leiaute. [VERIFICAR FONTE OFICIAL] Ver `docs/Roteiro_conferencia_calculos.md`.
3. **Natureza das rubricas:** os códigos da Tabela 3 foram conferidos em reprodução da tabela por fonte secundária; confirmar no Anexo I do leiaute vigente.
4. **Versão dos esquemas:** os pacotes fornecidos estão em `v_S_01_03_00`, mas não indicam a Nota Técnica de origem; a NT S-1.3 nº 07/2026 tem etapas até 14/12/2026 (por exemplo, nova validação de CPF no S-1000 e no S-2200). Conferir se o pacote corresponde à versão em produção.
5. **Eventos não cobertos:** S-1298, S-2300 e S-2399 (trabalhador sem vínculo), S-3000 (exclusão) e demais eventos não emitidos pelo sistema.
6. **Homologação:** transmissão real à produção restrita, com certificado ICP-Brasil, ainda não realizada (ver item 1 da seção 1).
7. **Demais pendências da 1ª rodada** (classTrib, Tabela 19, FPAS/terceiros, CPRB, prejuízo fiscal): ver histórico do repositório.

## 7. Como repetir a validação

Gerar os XML com `tools/dump.js` (usa jsdom e o `index.html`), colocar os XSD em uma pasta própria e executar `python3 tools/xsdval.py <pasta_dos_xsd>` e `python3 tools/xmlcheck.py`. Os caminhos nos scripts apontam para `/home/claude/xsd`; ajustar conforme o ambiente.

## 8. 3ª rodada (13/11/2026)

Correções: CNPJ alfanumérico; cofre criptografado, bloqueio por inatividade, trilha de auditoria; banner, política de cookies e de privacidade; CSP com hash; acessibilidade e menu móvel; eventos S-2205, S-1298 e S-3000 (306 XML válidos nos dois pacotes XSD). Pendências e notas estimadas: `docs/FolhaPro_pendencias_e_correcoes.xlsx`. Testes: `tools/cnpj_test.js`, `tools/vault_test.py` (requer servidor local na porta 8765).

## 9. 4ª rodada (13/11/2026)

**Regras de negócio:** convenção coletiva e pisos com reajuste da data-base (gera S-2206); jornada 12x36 (sem DSR sobre horas extras; `tpJornada` = 2, código corrigido conforme o XSD); banco de horas (saldo positivo pago como HE 50% na rescisão); estabilidade provisória (bloqueio de dispensa sem justa causa); laudo obrigatório para insalubridade e periculosidade; pensão alimentícia por base variável; consignado com margem de 35% e 5% (Lei 10.820/2003, art. 2º, §2º); plano de saúde e coparticipação; PLR com tabela exclusiva acumulada no ano (Lei 10.101/2000, art. 3º, §5º). Rubricas recodificadas pela Tabela 21 (o código 00 de incidência de IRRF expirou em 30/06/2021). Tela “Conferência de regras”.

**Leiaute:** S-2210, S-2220 e S-2240 (XSD válidos nos dois pacotes; 316 XML sem erro); leitura e conciliação de S-5001, S-5002 e S-5011 por importação manual; espelho de guias com vencimento (INSS/DCTFWeb, IRRF 0561 e 3562, FGTS Digital).

**Segurança:** backup em arquivo cifrado com senha própria (AES-GCM 256; PBKDF2-SHA-256, 600.000 iterações); a exportação em JSON aberto permanece com aviso.

**Jurídico:** `docs/juridico/` traz minuta de licença e suporte com SLA, contrato de operador, RIPD e plano de resposta a incidentes (campos [●] a preencher).

**Normativo:** referência ao leiaute S-1.3 até a NT 07/2026 (rev. 20/10/2026), cujos XSD de produção estão previstos para 26/10, 23/11, 14/12/2026 e 18/01/2027 (Portal eSocial). Natureza de rubrica 9254 (consignado) e 1300 (PLR) vêm de fonte secundária; `PLANO` e `COPART` seguem sem natureza e com envio bloqueado.

**Testes (todos reexecutados):** `smoke2.js` sem erros; `audit1.js` 14 de 14; `xmlcheck.py` sem divergência; `cnpj_test.js` ok; `vault_test.py` sem erros; `ui8_test.js`, `regras_test.js`, `bk_test.js` e `nat_test.js` novos. A validação XSD aponta apenas as duas rubricas sem natureza (bloqueadas no envio por desenho).

**Defeitos encontrados e corrigidos na rodada:** rubricas novas ausentes do cadastro padrão (a folha falhava ao usar consignado); backup em texto aberto.

**Limite:** as regras novas foram conferidas por cálculo independente do próprio autor, sem folhas reais, revisão independente ou transmissão real ao eSocial.

## 10. Atualizações pelo botão “Atualizar” (14/11/2026)

Botão “Atualizar” no cabeçalho; servidor de atualizações em `server/` (publicação assinada por painel administrativo); documentação em `server/README.md`. O cliente aceita somente avisos, parâmetros legais de lista permitida, natureza e incidência de rubricas existentes e arquivos com SHA-256 conferido, todos com assinatura ECDSA P-256 verificada no navegador; não executa código recebido. Correção de código segue pelo GitHub e pelo deploy, e o botão detecta a nova versão pelo `version.json`. Teste ponta a ponta em `tools/upd_test.js` (login, CSRF, limite de tentativas, publicação, pacote adulterado recusado, aplicação, desfazer, download com hash, revogação). Política de privacidade ganhou a seção 9 (consulta ao servidor) e a versão do consentimento passou a 2026-11-14. **Pendente:** o servidor ainda não foi implantado (exige serviço Node com disco persistente no Render); até lá o botão só informa nova versão do código.

## 11. 5ª rodada (16/11/2026) — conferência com o Anexo I, o leiaute e o padrão CNAB oficiais

Natureza: auditoria interna assistida, não independente. Fontes oficiais fornecidas pelo titular: Anexo I (Tabelas), Anexo II (Regras) e Leiautes do eSocial S-1.3 (cons. até NT 07/2026 rev. 20/10/2026), e o Padrão FEBRABAN 240 posições v10.9 (14/10/2021).

**Erros encontrados e corrigidos.** (1) Natureza de rubrica 1002 (DSR) e 1020 (férias e terço), ambas encerradas na Tabela 03 (30/04/2024 e 30/04/2023), que levariam à rejeição do S-1010; passaram a 1012, 1016 e 1017, com migração das bases gravadas. (2) FPAS 566 descrito de modo incorreto; incluídos 574 e 612 com seus códigos de terceiros (Tabela 04). (3) Classificação tributária do Simples invertida entre Anexo IV e regime misto (Tabela 08: 02 e 03). (4) Tipo de dependente 04, encerrado em 25/04/2023 (Tabela 07), ainda ofertado. (5) CNAB: lote 045 em vez de 046, código de retorno 02 tratado como agendamento e tabela de ocorrências incompleta (24 de 150 códigos). (6) Referência do teste audit1 em conflito com a regra de truncamento do INSS.

**Implementado.** Campo `infoMesmoMtv` do S-2230 (afastamentos a partir de 26/10/2026, motivos 01 e 03); motivos 21, 44, 45, 46, 47, 49 e 53 da Tabela 18, com bloqueio dos de licença-paternidade antes de 01/01/2027; Pix (forma 45) e poupança (05) no CNAB; ambiente de exemplo com 10 empresas.

**Conferido sem divergência.** Naturezas 1000, 1003, 1023, 1099, 1202, 1203, 1205, 1207, 1211, 1300, 1409, 5001, 6002, 6003, 6006, 6007, 6901, 9200 a 9254 e 3501 a 3520 (vigentes); códigos de IRRF 9, 11 a 14, 31, 32, 34, 41, 42, 51, 74, 75 e 79 (Tabela 21); motivos de afastamento 01, 03, 16 a 19 e de desligamento 01, 02, 06, 07, 17 e 33; FPAS 507 e 515 com terceiros 0079 e 0115; compatibilidade FPAS × classificação tributária (Tabela 22) e lotação × classificação (Tabela 12); procedimento 0295 (Tabela 27); estrutura dos registros CNAB.

**Resultados dos testes.** Todas as suítes `*_test.js`, `auditoria_final.js` (33 de 33), `audit1.js` (14 de 14) e `smoke2.js` passam. 1.403 XML das 11 empresas de exemplo e 321 XML dos seis regimes validam no XSD S-1.3. Não executável neste ambiente: `upd_test.js`, por falta do arquivo local de chaves de assinatura, o que é preexistente.

**Pontos de atenção que permanecem.** (a) O INSS é truncado por faixa, conforme o item 2.13 do S-5001 no MOS (consultado em 16/11/2026); o teto calculado é R$ 988,07, e o valor R$ 988,09 que consta da Portaria é aritmético; a diferença de R$ 0,02 deve ser confirmada com um S-5001 real em homologação. (b) Salário-paternidade (naturezas 4052, 4053 e 9928, `codIncCP` 23, 24, 27 e 28) e licença-paternidade (Tabela 18, códigos 46 a 52, a partir de 01/01/2027) não foram implementados. (c) A homologação do CNAB com o banco, a transmissão ao eSocial e a revisão independente continuam pendentes. (d) A lista de motivos de afastamento oferecida na tela é parcial; a validação completa de cada código contra a Tabela 18 por categoria ainda não existe.

**Lição de método.** Os erros 1 a 4 vieram de tabelas reproduzidas de fontes secundárias ou de memória; todos desapareceram ao conferir com o Anexo I oficial. Qualquer código de tabela novo só deve entrar após conferência com o documento oficial.
