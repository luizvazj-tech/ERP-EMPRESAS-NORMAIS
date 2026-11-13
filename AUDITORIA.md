# FolhaPro — Relatório de auditoria técnica e jurídica (13/11/2026)

Natureza: auditoria interna assistida, **não independente**. Fontes consultadas em 13/11/2026 por pesquisa na web (portais oficiais quando acessíveis; demais itens por fontes secundárias, indicadas). Itens sem fonte oficial confirmada permanecem marcados como [VERIFICAR FONTE OFICIAL].

## 1. Limites desta auditoria

A transmissão ao ambiente de produção restrita do eSocial **não foi realizada**. O ambiente de execução desta sessão não alcança os endereços do eSocial nem o portal gov.br (bloqueio de rede, HTTP 403), e a transmissão exige certificado digital ICP-Brasil (A1/A3) com autenticação TLS mútua e assinatura XMLDSig, material que não deve ser entregue a este ambiente. Por consequência, os esquemas XSD oficiais não puderam ser baixados e os XML gerados **não foram validados contra o XSD**. Essa validação e a homologação devem ser feitas no gateway do usuário (ver item 5).

## 2. Divergência encontrada e corrigida

**IRRF sobre o 13º salário sem o redutor da Lei 15.270/2025.** O sistema calculava o IRRF do 13º (inclusive o 13º proporcional da rescisão) sem aplicar a redução. A Lei 9.250/1995, art. 3º-A, §3º, incluído pela Lei 15.270/2025, determina que a redução também se aplica ao imposto cobrado exclusivamente na fonte sobre o 13º, e a Receita Federal confirmou esse entendimento em sua orientação sobre a redução a partir de 2026. **Corrigido** em `calc13` e em `calcRescisaoVerbas`; o aviso na tela de 13º foi atualizado.

## 3. Conferências realizadas, sem divergência

Cálculo independente (script `tools/audit1.js`), 14 casos, todos coincidentes:

- INSS 2026 progressivo em seis salários, inclusive o teto de R$ 8.475,55 com contribuição máxima de R$ 988,09 (Portaria Interministerial MPS/MF nº 13/2026).
- IRRF com redutor: exemplo oficial da Receita (rendimento R$ 6.000,00; imposto R$ 574,29; redução R$ 179,75; imposto devido R$ 394,54), exemplo de R$ 5.900,00 com INSS de R$ 635,60 (R$ 345,92), isenção até R$ 5.000,00 e ausência de redutor a partir de R$ 7.350,00.
- Tabelas do Simples Nacional, Anexos I a V (LC 123/2006, redação da LC 155/2016): alíquotas e parcelas a deduzir conferem com os valores publicados.
- Rescisão por acordo (CLT, art. 484-A): aviso prévio indenizado pela metade e multa do FGTS de 20% confirmados em fontes secundárias; o sistema aplica ambos.
- Limite do Lucro Presumido de R$ 78 milhões (Lei 9.718/1998, com a redação da Lei 12.814/2013) e acréscimo de 10% na presunção sobre a receita anual acima de R$ 5 milhões (LC 224/2025; IN RFB 2.305/2025 e 2.306/2026): conferem. A CSLL sofre o acréscimo apenas a partir de 1º/04/2026 (limite de R$ 3,75 milhões em 2026), e há ADIs no STF contra a norma; o comparativo anualiza 12 meses e já sinaliza esse ponto.
- Bateria de testes de fluxo por regime (Simples, Anexo IV, Presumido, Real, Presumido com CPRB), férias, 13º, rescisão e envio simulado: sem erros.

## 4. Itens que permanecem pendentes de fonte oficial

- Mapeamento classTrib (Tabela 8), natureza das rubricas (Tabela 3, preenchida só em parte) e códigos de motivo de desligamento (Tabela 19): conferir no Anexo I (Tabelas) do leiaute S-1.3 vigente (NT 07/2026).
- Códigos de terceiros (FPAS 515 → 0115; 507 → 0079): conferir na Tabela de FPAS/terceiros.
- Compensação de prejuízo fiscal limitada a 30% (Lei 9.065/1995, art. 15): não confirmada nesta rodada.
- Reoneração gradual da CPRB (Lei 14.973/2024): frações 25/50/75% a conferir.
- Aviso prévio projetado em 13º e férias (CLT, art. 487, §1º; Súmula 371 do TST), férias fracionadas e rescisão com afastamento: conferir texto e testar.
- Em 04/09/2026 foi publicada a NT S-1.3 nº 07/2026, com etapas até 14/12/2026 (por exemplo, nova validação de CPF no S-1000 e no S-2200). Os XML do sistema não foram revisados contra essa nota.

## 5. Roteiro para completar a auditoria

1. Baixar do portal eSocial (Documentação Técnica) o pacote de esquemas XSD vigente e validar os XML gerados pelo sistema, evento a evento.
2. Transmitir ao ambiente de produção restrita por um gateway com certificado do próprio usuário, e comparar os recibos e as críticas retornadas.
3. Cálculo paralelo de 15 a 20 folhas reais em sistema consolidado, comparando centavo a centavo.
4. Revisão jurídico-tributária dos itens da seção 4 pelo responsável técnico.
5. Antes de dados reais: autenticação, controle de acesso e armazenamento seguro (hoje os dados ficam no navegador e o endereço é público).
