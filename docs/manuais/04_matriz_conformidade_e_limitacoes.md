---
title: "MATRIZ DE CONFORMIDADE NORMATIVA E LIMITAÇÕES — FOLHAPRO"
subtitle: "Posição em 15/11/2026. Auditoria interna assistida, não independente. Itens marcados ** dependem de conferência em fonte oficial."
---

**Natureza do documento.** Esta matriz informa ao cliente, ao revendedor e ao advogado o que o sistema faz, em qual norma se apoia, o que foi verificado e o que **não** faz. Deve ser entregue ao Licenciado (contrato, cláusula 7.2) e atualizada a cada versão. Não é certificação nem laudo.

# 1. Matriz por assunto

| Assunto | Base normativa | Situação no sistema | Verificação | Limites e pontos ** |
|---|---|---|---|---|
| Leiaute eSocial S-1.3 | Leiaute vigente e Nota Orientativa S-1.3 nº 09/2026 | Geradores de S-1000, S-1005, S-1010, S-1020, S-1200, S-1210, S-1299, S-2200, S-2206, S-2300 | XML validados contra os XSD (pacotes fornecidos) | Sem homologação em produção restrita real; leitura integral do MOS (430 páginas) pendente |
| Naturezas de rubrica | Tabela 3 do eSocial | Preenchidas nas rubricas padrão, incluindo 3501, 3506, 3508, 3520 e 9219 | Conferidas na Tabela 3 fornecida | Tabelas 4 e 21 (incidências) não fornecidas; férias, PLR e consignado em roteiro de conferência ** |
| INSS do empregado | Lei 8.213/1991 e portaria anual de faixas ** | Tabela progressiva, teto, parâmetros editáveis | Recalculado de forma independente (auditoria_final) | Tabela anual deve ser atualizada em janeiro |
| IRRF | Lei 9.250/1995, art. 3º-A ** e tabela vigente | Dedução por dependente, redutor, 13º com redutor | Casos de teste | Pensão alimentícia e planos têm regras próprias; conferir caso a caso |
| FGTS | Lei 8.036/1990, art. 15 | 8% (e alíquotas especiais por categoria) | Auditoria final | FGTS de diretor (categoria 721) não calculado; guia pelo FGTS Digital fora do sistema |
| Salário-família, VT, DSR, horas extras, 12x36 | Lei 8.213/1991, art. 65; Lei 7.418/1985; Lei 605/1949 **; CLT, arts. 59 e 59-A | Cálculo e regras de convenção coletiva | Testes de regras | Salário-maternidade não calculado (entra na DCTFWeb por valor informado) |
| Encargos patronais | Lei 8.212/1991, arts. 22 e 22-A | Por regime e lotação; RAT/FAP; terceiros por FPAS | Testes de encargos | Composição de entidades por FPAS tem pontos ** |
| Adicional de GILRAT | Lei 8.213/1991, art. 57, §6º; Lei 8.212/1991, art. 22, II ** | 12%, 9% ou 6% por aposentadoria especial | Teste de encargos | Depende do campo de aposentadoria especial no cadastro |
| CPRB (reoneração) | Lei 12.546/2011, arts. 7º-A, 8º-A, 9º-A, 9º-B, com Lei 14.973/2024 ** | Receita por dispositivo e transição 80/60/40/0% | Teste de encargos | Conferir enquadramento de cada atividade |
| SENAI adicional | DL 4.048/1942, art. 6º; DL 6.246/1944, art. 3º ** | Cálculo sobre empregados acima de 500 | Teste de encargos | Percentual do adicional e composição por FPAS **; Nota S-1.3 nº 09/2026 |
| Contribuintes individuais | Lei 8.212/1991, arts. 21, 22, III e 30, §4º ** | INSS 11% com teto, patronal, IRRF, S-2300/1200/1210 | XSD válido; MOS item 10.2.1 | Sem dedução de dependentes no S-1200 de CI; categorias 721, 722, 723, 731, 734, 738 exigem S-2300 |
| Cooperados | Lei 10.666/2003, arts. 1º e 4º ** | Adicional (produção e trabalho) e retenção 3,5% ** | Fonte secundária | Código de receita do adicional do tomador de cooperativa de trabalho em aberto |
| DCTFWeb | IN RFB 2.005/2021 **; Manual da DCTFWeb | Apuração, créditos, prazos e mora; códigos de receita | Conferido no Manual e no MOS | **Não transmite** a DCTFWeb |
| DARF | Lei 9.430/1996, art. 61 (mora 0,33% ao dia, máx. 20%); Selic | Espelho com campos 01 a 10, multa e juros | Teste | **Não emite DARF numerado**; pagar pelo e-CAC |
| Reinf | IN RFB 2.043/2021 ** | Espelho de notas e retenções | — | **Sem XML nem transmissão** (R-2010, R-2020, R-2060, R-2099, R-4010/4020) |
| Prazos e feriados | Calendário nacional; Lei 662/1949 ** | Feriados fixos e móveis configuráveis | Teste de feriados | Feriados municipais e facultativos devem ser cadastrados pelo usuário |
| Contabilidade | NBC TG 26 e práticas ** | Lançamentos automáticos da folha | Teste | Sem multa rescisória do FGTS, reversão de provisões e centro de custo |
| Arquivos bancários | Layout FEBRABAN CNAB 240 ** | Remessa e retorno | Teste interno | **Sem homologação com banco** |
| LGPD | Lei 13.709/2018, arts. 6º, 7º, 11, 18, 37 a 42, 46 e 48 | Cofre criptografado, consentimento, trilha, política | Documentos 01 a 06 | Encarregado e fornecedor a preencher; transferência internacional a definir |
| Programa de computador | Lei 9.609/1998 | Licença de uso; titularidade do autor | Documentos 05 e 07 | Registro no INPI recomendado |
| Acessibilidade | WCAG 2.2 AA (referência técnica) | Nomes acessíveis, foco, contraste, teclado, movimento reduzido | Scripts automáticos (0 controles sem nome; contraste do tema escuro) | **Sem teste com leitor de tela** e sem auditoria independente |
| Segurança de aplicação | CSP, criptografia local, MFA, auditoria | Implementados | Testes de cofre, servidor e API | Sem teste de intrusão independente |

# 2. O que o sistema não faz (resumo para o cliente)

O FolhaPro não transmite a DCTFWeb; não emite DARF numerado; não gera nem transmite arquivos do Reinf; não homologa o CNAB com banco; não guarda nem usa certificado digital sozinho; não calcula salário-maternidade, FGTS de diretor não empregado e multa rescisória do FGTS na contabilidade; não substitui parecer contábil, jurídico ou trabalhista.

# 3. Pendências que dependem de fonte oficial ou decisão

Tabelas 4 e 21 do eSocial (incidências); tabela de FPAS por entidade e percentual do SENAI adicional; código de receita do adicional do tomador de cooperativa de trabalho; leitura integral do Manual de Orientação S-1.3; homologação do eSocial em produção restrita e do CNAB com banco; decisão de hospedagem e PostgreSQL para a API; teste de acessibilidade com leitor de tela; teste de intrusão. A planilha “Pendências” traz a lista completa com estimativas de horas.

# 4. Como usar esta matriz

Antes de contratar: conferir se o escopo do cliente está coberto. A cada atualização: rever as linhas afetadas. Ao responder dúvida de cliente: indicar a linha correspondente e a fonte. Ao divulgar o produto: não prometer o que consta na seção 2.
