---
title: "RELATÓRIO DE IMPACTO À PROTEÇÃO DE DADOS PESSOAIS (RIPD) — FOLHAPRO"
subtitle: "Modelo preenchido com o que o código demonstra; os campos [●] devem ser completados por cada Controladora."
---

**Fundamento.** Lei 13.709/2018, art. 5º, XVII (conceito de RIPD), art. 38 (a ANPD pode determinar sua elaboração) e art. 10, §3º. A elaboração é recomendada, porque o tratamento envolve dados sensíveis em escala (saúde, art. 11) e dados de crianças e adolescentes (dependentes, art. 14).

## 1. Identificação

Controladora: [●]. Encarregado: [●]. Fornecedor do software: [●]. Versão do sistema: [●]. Data: [●]. Revisão: anual ou a cada mudança relevante.

## 2. Descrição do tratamento

**Finalidade:** execução de contrato de trabalho e cumprimento de obrigação legal (folha, eSocial, FGTS, tributos, SST) — art. 7º, II e V; dados de saúde sob o art. 11, II, “a” (obrigação legal e regulatória do controlador).

**Dados tratados:** CPF, nome, filiação, nascimento, endereço, contato, dados bancários, remuneração, dependentes (inclusive menores), sindicato, afastamentos, ASO, CAT e agentes nocivos (dados de saúde).

**Titulares:** empregados, dependentes e pensionistas alimentícios. **Volume estimado:** [●].

**Ciclo de vida:** coleta (cadastro) → uso (cálculo, holerite, eventos) → armazenamento (navegador do dispositivo, criptografado) → compartilhamento (eSocial/Receita Federal/CEF por gateway do cliente) → descarte (exclusão e backup) .

**Retenção:** prazos legais — FGTS e contratos [●]; documentos trabalhistas conforme CLT e Lei 8.036/1990; SST conforme NR-7 e NR-9 [VERIFICAR FONTE OFICIAL].

## 3. Necessidade e proporcionalidade

Os campos coletados espelham o leiaute do eSocial. Dados de saúde são limitados ao exigido para S-2210, S-2220 e S-2240. A minimização é parcial: o cadastro aceita campos opcionais não exigidos; o controlador deve preenchê-los apenas se houver finalidade.

## 4. Fluxo e localização dos dados

Os dados ficam no **armazenamento local do navegador do cliente**, cifrados com AES-GCM de 256 bits, com chave derivada da senha por PBKDF2-SHA-256 (600.000 iterações); a chave só existe em memória durante a sessão. O fornecedor não recebe os dados. Há bloqueio por inatividade, atraso progressivo após cinco senhas erradas e trilha de auditoria local. Fontes tipográficas externas só são carregadas com consentimento. O backup em arquivo é cifrado (AES-GCM de 256 bits, chave derivada de senha própria do backup por PBKDF2-SHA-256 com 600.000 iterações); a opção de exportação em JSON aberto permanece disponível, com aviso de que não é cifrada.

## 5. Riscos e medidas

| Risco | Probabilidade | Impacto | Medida existente | Medida pendente |
|---|---|---|---|---|
| Acesso indevido ao dispositivo desbloqueado | Média | Alto | Bloqueio por inatividade; senha forte | Política de uso de estações; disco cifrado |
| Perda da senha (dados irrecuperáveis) | Média | Alto | Aviso explícito na criação | Rotina de backup cifrado do cliente |
| Vazamento de backup exportado | Média | Alto | Backup em arquivo cifrado com senha própria; aviso na exportação em JSON aberto | Remover a exportação em texto aberto; guarda da senha do backup pelo cliente |
| Malware/extensão do navegador lendo a página | Baixa | Alto | CSP restritiva com hash; sem scripts de terceiros | Perfil de navegador dedicado |
| Transmissão ao eSocial sem proteção | Baixa | Alto | Transmissão fora do app, por gateway com certificado do cliente | Contrato e RIPD do gateway |
| Dados de saúde acessados por pessoa sem necessidade | Média | Alto | Trilha de auditoria | Perfis de acesso (hoje há um único usuário) |
| Retenção além do prazo | Média | Médio | Exclusão manual | Rotina de descarte por prazo |

## 6. Direitos dos titulares

O controlador atende pedidos (art. 18) pelo canal do encarregado; o programa oferece exportação dos dados do titular (função “Exportar dados do titular”) e exclusão manual, observados os prazos de guarda obrigatória.

## 7. Parecer e aprovação

Parecer do encarregado: [●]. Aprovação do controlador: [●]. Data: [●].
