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
2. **Incidências de férias.** O sistema classifica as rubricas de férias com `codIncIRRF` 11 (remuneração mensal); a Tabela 21 prevê código próprio para férias (13) e retenção específica (33). Como o IRRF é calculado em conjunto com a folha do mês, a forma correta de consolidação deve ser confirmada no leiaute. [VERIFICAR FONTE OFICIAL]
3. **Natureza das rubricas:** os códigos da Tabela 3 foram conferidos em reprodução da tabela por fonte secundária; confirmar no Anexo I do leiaute vigente.
4. **Versão dos esquemas:** os pacotes fornecidos estão em `v_S_01_03_00`, mas não indicam a Nota Técnica de origem; a NT S-1.3 nº 07/2026 tem etapas até 14/12/2026 (por exemplo, nova validação de CPF no S-1000 e no S-2200). Conferir se o pacote corresponde à versão em produção.
5. **Eventos não cobertos:** S-1298, S-2300 e S-2399 (trabalhador sem vínculo), S-3000 (exclusão) e demais eventos não emitidos pelo sistema.
6. **Homologação:** transmissão real à produção restrita, com certificado ICP-Brasil, ainda não realizada (ver item 1 da seção 1).
7. **Demais pendências da 1ª rodada** (classTrib, Tabela 19, FPAS/terceiros, CPRB, prejuízo fiscal): ver histórico do repositório.

## 7. Como repetir a validação

Gerar os XML com `tools/dump.js` (usa jsdom e o `index.html`), colocar os XSD em uma pasta própria e executar `python3 tools/xsdval.py <pasta_dos_xsd>` e `python3 tools/xmlcheck.py`. Os caminhos nos scripts apontam para `/home/claude/xsd`; ajustar conforme o ambiente.

## 8. 3ª rodada (13/11/2026)

Correções: CNPJ alfanumérico; cofre criptografado, bloqueio por inatividade, trilha de auditoria; banner, política de cookies e de privacidade; CSP com hash; acessibilidade e menu móvel; eventos S-2205, S-1298 e S-3000 (306 XML válidos nos dois pacotes XSD). Pendências e notas estimadas: `docs/FolhaPro_pendencias_e_correcoes.xlsx`. Testes: `tools/cnpj_test.js`, `tools/vault_test.py` (requer servidor local na porta 8765).
