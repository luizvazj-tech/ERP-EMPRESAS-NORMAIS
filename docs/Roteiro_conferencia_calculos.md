---
title: "ROTEIRO DE CONFERÊNCIA DOS CÁLCULOS EM DÚVIDA — FOLHAPRO"
subtitle: "Férias, natureza das rubricas, PLR e consignado. Posição em 13/11/2026."
---

**Finalidade.** Quatro pontos do motor de cálculo dependem de fonte oficial que não consegui consultar. Para cada um, o roteiro diz o que o sistema faz hoje, qual é a dúvida, onde conferir, qual teste montar, o critério para considerar o ponto resolvido e o que alterar no código. Nenhum artigo de lei foi acrescentado além dos que já constam da auditoria; onde a base legal precisa ser localizada, isso vem dito expressamente.

**Correção de registro.** O item 2 da seção 6 de `AUDITORIA.md` dizia que as férias usavam `codIncIRRF` 11. O código atual já usa **13** (rendimento de férias, Tabela 21) nas rubricas FÉRIAS e 1/3 DE FÉRIAS, com migração das bases antigas. A dúvida que resta é outra: a retenção do IRRF incidente sobre férias continua na rubrica única de IRRF (código 31), e a Tabela 21 prevê código de retenção próprio para férias (33). O texto da auditoria foi corrigido.

## 1. Férias

**O que o sistema faz.** FÉRIAS e 1/3 constitucional: `codIncCP` 11, `codIncIRRF` 13, FGTS 11. Abono pecuniário e 1/3 sobre o abono: `codIncCP` 00, `codIncIRRF` 75, FGTS 00. Férias indenizadas na rescisão: `codIncIRRF` 74. O IRRF é calculado em conjunto com os demais rendimentos da competência de pagamento e retido numa só rubrica (31).

**Dúvida.** (a) Se a retenção sobre férias deve sair em rubrica com código 33, separada da retenção mensal; (b) se o código 13 é o correto para o rendimento de férias gozadas quando o pagamento ocorre na mesma competência da folha; (c) se o 1/3 compõe a base do INSS dos segurados na forma modelada (a incidência patronal sobre o terço de férias gozadas foi fixada pelo STF no Tema 985; confirmar a ementa e o alcance sobre o segurado) [VERIFICAR FONTE OFICIAL]; (d) isenção do abono pecuniário e das férias indenizadas no INSS (Lei 8.212/1991, art. 28, §9º; localizar a alínea exata na redação vigente) [VERIFICAR FONTE OFICIAL].

**Onde conferir.** Manual de Orientação do eSocial S-1.3, seção do S-1200 e do S-1210; Tabela 21 (códigos 13, 31, 33 e demais) e Tabela 4, ambas no Anexo I do leiaute vigente (NT S-1.3 nº 07/2026, rev. 20/10/2026); perguntas e respostas do eSocial sobre férias; texto vigente da Lei 8.212/1991, art. 28.

**Teste a montar.** Empregado com salário de R$ 4.000,00, dois dependentes, 30 dias de férias gozadas com pagamento na competência anterior ao gozo e outro caso com o pagamento na mesma competência; um terceiro caso com venda de 10 dias. Calcular à mão INSS e IRRF e comparar com o S-1200 e o S-1210 gerados.

**Critério de aceite.** Códigos coincidirem com a Tabela 21 e o MOS; IRRF e INSS do S-5002 e do S-5001 de um caso real (homologação) coincidirem com o cálculo do sistema até R$ 0,01.

**Alteração provável.** Se for confirmado o código 33, criar a rubrica de retenção de férias e separar o IRRF incidente sobre as rubricas de férias; ajustar `calcEmpregado` e a migração em `loadDB`.

## 2. Natureza das rubricas (Tabela 3)

**O que o sistema faz.** Natureza preenchida para as rubricas de folha usuais. 9254 para consignado e 1300 para PLR vieram de fonte secundária. PLANO (plano de saúde, parte do empregado) e COPART não têm natureza e o envio do S-1010 delas é bloqueado.

**Dúvida.** (a) Se 9254 é a natureza correta do desconto de consignado comum, reservando-se 9253 ao eConsignado do Crédito do Trabalhador, que exige `codIncFGTS` 31 e `tpRubr` 2 (o XSD confirma esta última regra); (b) se 1300 é a natureza da PLR; (c) qual natureza se aplica ao desconto de plano coletivo empresarial. Pesquisa em fontes secundárias indica que o código 9912 se aplica a plano fora do coletivo empresarial e que o plano coletivo é informado por outro meio (EFD-Reinf); isso precisa de confirmação oficial [VERIFICAR FONTE OFICIAL].

**Onde conferir.** Tabela 3 do Anexo I do leiaute vigente, com as regras de preenchimento por natureza (`tpRubr`, `codIncCP`, `codIncIRRF`, `codIncFGTS`); MOS, seção do S-1010.

**Teste a montar.** Gerar o S-1010 de cada rubrica com a natureza proposta e transmitir em produção restrita; o ambiente aplica as regras de combinação da natureza com os códigos de incidência e acusa as incompatibilidades.

**Critério de aceite.** S-1010 aceito em produção restrita sem ocorrência de regra de validação.

**Alteração.** Preencher `nat` em `defaultRubricas()` (core.js) para PLANO e COPART ou removê-las do fluxo de S-1010 se a informação for outra; ajustar incidências conforme a natureza.

## 3. PLR

**O que o sistema faz.** Tributação exclusiva na fonte, separada do salário, sem INSS e sem FGTS, pela tabela progressiva própria, aplicada sobre o valor acumulado no ano (parâmetro `plrTab`: faixas de até 8.214,40, 9.922,28, 13.167,00, 16.380,38 e acima, com alíquotas de 0, 7,5, 15, 22,5 e 27,5% e deduções de 0, 616,08, 1.360,35, 2.347,85 e 3.166,58). Rubrica de IRRF própria (113, natureza 9203, código de retenção 34); rendimento com código 14.

**Dúvida.** (a) Se os limites e deduções são os vigentes em 2026 (os valores foram tomados de fonte secundária); (b) se a Lei 15.270/2025 alterou a tributação da PLR e em que termos (confirmar o texto e a regulamentação da Receita Federal); (c) a base legal da exclusão de INSS e FGTS (Lei 10.101/2000, art. 3º, caput e §5º, quanto ao IRRF; art. 3º, caput, quanto à não incidência de encargos) [VERIFICAR FONTE OFICIAL].

**Onde conferir.** Texto vigente da Lei 10.101/2000, art. 3º; instrução normativa e tabela de IRRF sobre PLR publicadas pela Receita Federal para 2026; orientação do eSocial sobre os códigos 14 e 34 da Tabela 21 e o DARF 3562.

**Teste a montar.** PLR de R$ 5.000, R$ 9.000 e R$ 12.000, em parcela única e em duas parcelas no ano, comparando o imposto acumulado com o de uma calculadora oficial da Receita ou com folha de sistema consolidado. O sistema gera hoje, para R$ 12.000, imposto de R$ 439,65 (12.000 × 15% − 1.360,35).

**Critério de aceite.** Tabela e fórmula idênticas às oficiais, com diferença zero nos três casos.

**Alteração.** Atualizar `plrTab` e, se a regra mudou, `impostoPlr` e o acúmulo anual em `calcEmpregado`.

## 4. Consignado

**O que o sistema faz.** Limites de 35% para empréstimo e 5% para cartão sobre a remuneração disponível, com alerta na conferência de regras quando excedidos; desconto em rubrica 114 (natureza 9254, FGTS 00). A base da "remuneração disponível" segue o conceito de remuneração após descontos obrigatórios.

**Dúvida.** (a) Os percentuais vigentes em 2026, pois a margem foi alterada por normas posteriores à Lei 10.820/2003 (confirmar a redação atual do art. 2º, §2º e a regulamentação do Crédito do Trabalhador); (b) o conceito de remuneração disponível (parcelas que entram e saem da base); (c) a ordem de prioridade entre consignado e pensão alimentícia; (d) a regra de desconto na rescisão [VERIFICAR FONTE OFICIAL].

**Onde conferir.** Texto vigente da Lei 10.820/2003 e do decreto e das portarias que a regulamentam; normas do Crédito do Trabalhador no eConsignado.

**Teste a montar.** Salário de R$ 4.000 com consignado de R$ 1.200 (acima de 35%) e de R$ 1.000 (abaixo); com pensão por percentual do líquido; conferir margem e alerta.

**Critério de aceite.** Percentuais e base idênticos aos da norma vigente; alerta coerente com o contrato do empregado.

**Alteração.** Parâmetro `consig` e a função de margem em `calcEmpregado`.

## 5. Ordem de execução sugerida

Primeiro a Tabela 3 e a Tabela 21 (itens 1 e 2), porque a transmissão em produção restrita depende delas. Em seguida PLR e consignado, que têm tabela e percentual de fácil conferência. Ao final, rodar `tools/regras_test.js`, `tools/audit1.js` e a validação XSD (`tools/xsdval.py`), atualizar a planilha de pendências e retirar a marca [VERIFICAR FONTE OFICIAL] só dos pontos confirmados em fonte oficial, anotando a fonte e a data da consulta.
