---
title: "MANUAL DO USUÁRIO — FOLHAPRO"
subtitle: "Folha de pagamento, departamento pessoal e eSocial. Versão 2026.11. Itens marcados ** dependem de conferência em fonte oficial."
---

# 1. Antes de começar

O FolhaPro é uma ferramenta de apoio ao departamento pessoal. Ele calcula a folha, guarda os cadastros, gera os eventos do eSocial e produz relatórios, lançamentos contábeis, arquivos bancários e espelhos de guias. **A responsabilidade pelas informações enviadas aos órgãos públicos e pelo recolhimento dos tributos é da empresa e de seus contabilistas.** Confira sempre as bases, as alíquotas e os prazos antes de transmitir.

Limites atuais: o sistema não transmite a DCTFWeb nem emite DARF numerado (o menu “DARF (espelho)” apenas calcula e imprime); o Reinf é um espelho para conferência; a remessa CNAB 240 não foi homologada por banco; o envio ao eSocial exige certificado digital ICP-Brasil e gateway próprio da empresa. A lista completa está no documento “Matriz de conformidade e limitações”.

## 1.1. Primeiro acesso e senha do cofre

No modo local, o sistema pede que você crie uma **senha de, no mínimo, 12 caracteres**. Ela criptografa os dados no seu navegador. **Ninguém, nem o fornecedor, consegue recuperá-la.** Anote-a em local seguro e faça backup (tela “Backup e dados”). Após alguns minutos sem uso, o sistema bloqueia a tela e pede a senha novamente; após várias tentativas erradas, espera um tempo antes de aceitar nova tentativa. O ícone do olho mostra ou oculta a senha digitada.

No modo servidor, você entra com e-mail, senha e código de autenticação em duas etapas (aplicativo autenticador). O administrador da sua conta define o que cada pessoa pode ver ou editar.

## 1.2. Banner de privacidade

Na primeira visita, o sistema pergunta sobre o armazenamento de preferências. “Somente necessários” mantém tudo funcionando, mas não memoriza tema nem identidade visual. “Aceitar todos” memoriza essas preferências. Você pode mudar a escolha em “Privacidade e cookies”.

## 1.3. Conhecendo a tela

No topo ficam “Tela inicial”, “Voltar”, “Atualizar”, “Buscar (Ctrl+K)” e “Tema”. À esquerda, o menu agrupado por assunto, com busca no topo. Na parte inferior, a barra de ações da tela (salvar, exportar em PDF e Excel, enviar ao eSocial etc.). Em telas estreitas, o menu vira uma lista de seleção no topo.

| Atalho | Ação |
|---|---|
| Ctrl+K (ou Cmd+K) | Paleta de comandos: digite o nome de qualquer tela |
| ? | Lista de atalhos |
| Alt+I | Tela inicial |
| Alt+V | Voltar |
| Alt+S | Salvar a tela |
| Alt+E | Enviar ao eSocial, quando disponível |
| Esc | Fechar janela ou paleta |

O botão “Tema” alterna entre automático (segue o sistema), claro e escuro. Qualquer tela, relatório ou ficha pode ser exportada em **PDF** ou **Excel** pelos botões da barra inferior.

# 2. Fluxo de trabalho recomendado

A tela inicial mostra o fluxo em cartões numerados. A ordem correta é: empresa, tabelas, empregados, lançamentos, cálculo, conferência, fechamento e envio. Para treinar sem risco, use “Carregar demonstração”, que cria três empresas fictícias com dez empregados cada; apague-as depois em “Empresa e regime”.

# 3. Cadastros

## 3.1. Empresa e regime (S-1000)

Informe CNPJ (numérico ou alfanumérico), razão social, natureza jurídica, classificação tributária, regime (**Simples Nacional**, **Lucro Presumido** ou **Lucro Real**), porte, endereço, responsável e dados de contato. O regime comanda o cálculo dos encargos patronais: no Simples, a contribuição previdenciária patronal depende do Anexo; nos demais, aplicam-se contribuição patronal, RAT/FAP e terceiros conforme a lotação. A **CPRB** (desoneração) é opcional e segue a transição da Lei 12.546/2011, arts. 7º-A e 8º-A, com a Lei 14.973/2024 **. Para abrir outra empresa, clique no nome dela na lista e confirme; a exclusão pede confirmação e é irreversível.

## 3.2. Estabelecimentos (S-1005) e lotações tributárias (S-1020)

Cadastre matriz, filiais e obras (CNO), com CNAE, RAT, FAP e a indicação de aposentadoria especial quando houver. A **lotação tributária** reúne FPAS, código de terceiros, atividade substituída e CPRB; o sistema valida combinações incompatíveis. O “Mapa da estrutura e regras” mostra tudo isso em uma tela e aponta pendências.

## 3.3. Cargos e CBO, Rubricas (S-1010)

Cargos têm CBO e piso. As **rubricas** (proventos, descontos e informativas) trazem natureza (Tabela 3 do eSocial) e códigos de incidência para INSS, IRRF e FGTS. É possível incluir, **pausar por competência** e excluir rubricas. A proporcionalidade (admissão, desligamento e dias trabalhados) é opção da rubrica. Não altere natureza e incidência sem validar na Tabela 3; use o botão de validação do S-1010 antes de enviar. O sistema acrescenta rubricas padrão que faltarem quando você abre um cadastro antigo.

# 4. Departamento pessoal

## 4.1. Empregados (S-2200)

Preencha identificação, contrato, jornada, remuneração, cargo, lotação, dependentes, dados bancários e a aba de regras (jornada 12x36, convenção coletiva, estabilidade provisória etc.). O campo “aposentadoria especial” aciona o **adicional de GILRAT**. O botão “Enviar S-2200” gera o evento. Em “Movimentações” registram-se alterações contratuais (S-2206), afastamentos (S-2230) e o desligamento (S-2299).

## 4.2. Convenções coletivas, banco de horas, conferência de regras

Em “Convenções coletivas e pisos” cadastre pisos e regras por categoria; em “Banco de horas”, os saldos; em “Conferência de regras”, o sistema aponta empregados abaixo do piso, estabilidade provisória e inconsistências de jornada.

## 4.3. Saúde e segurança (S-2210, S-2220, S-2240)

CAT, ASO e condições ambientais têm telas próprias, com prazos e alertas em “Saúde ocupacional”. Dados de saúde são **sensíveis** (LGPD, art. 11); dê acesso apenas a quem precisa.

## 4.4. Histórico, advertências, cursos, atestados

O histórico do empregado reúne ocorrências; advertências e suspensões, cursos e atestados têm telas próprias e alimentam a ficha.

# 5. Folha de pagamento

## 5.1. Lançamentos do mês e Cálculo da folha

1. Escolha a **competência** (mês/ano).
2. Em “Lançamentos do mês”, registre variáveis: horas extras, faltas, comissões, adicionais, descontos.
3. Em “Cálculo da folha”, execute o cálculo. O sistema apura salário, DSR, adicionais, INSS progressivo, IRRF (com dedução de dependentes e redutor), FGTS, salário-família e vale-transporte, além dos encargos da empresa.
4. Confira o resumo por empregado e os totais. Divergências aparecem como alertas.
5. **Feche a competência** quando estiver correta. Reabrir exige nível de permissão adequado e fica registrado na auditoria.

O sistema respeita **feriados móveis** (Páscoa, Carnaval, Sexta-feira Santa, Corpus Christi) e feriados locais cadastrados em “Feriados e dias não úteis”, o que afeta DSR e prazos.

## 5.2. Férias, 13º salário e rescisão

“Férias” calcula período aquisitivo, abono pecuniário e terço constitucional; “13º salário” trata as parcelas e o IRRF próprio; “Rescisão (S-2299)” calcula as verbas conforme o motivo. **Verifique** os pontos marcados ** no roteiro de conferência de cálculos (férias, natureza de rubricas, PLR e consignado), pois dependem de conferência em fonte oficial.

## 5.3. Contracheques, Ficha financeira, Relatórios

“Contracheques” imprime por empregado ou em lote. A “Ficha Financeira” pode ser consolidada ou individual, com busca e seleção múltipla. “Relatórios por empresa” permite escolher empresas, informações e período; “Relatórios e guias” traz resumos e a memória das guias.

# 6. Contribuintes individuais, CPRB e Reinf

“Contribuintes individuais” registra pagamentos a autônomos, diretores sem vínculo, sócios e cooperados, com cálculo de INSS (11% limitado ao teto, considerando outras fontes), contribuição patronal, IRRF e adicional de cooperado, e gera **S-2300, S-1200 e S-1210**. “CPRB (receita bruta)” registra a receita por dispositivo legal e calcula a contribuição com a transição de alíquotas. “Reinf — notas e retenções” registra notas e retenções, e “Reinf — espelho e fechamento” os totaliza **para conferência; não gera XML nem transmite**.

# 7. Contabilidade, Financeiro e Arquivos bancários

“Lançamentos contábeis” gera automaticamente débitos e créditos da folha conforme a “Parametrização contábil”, sobre o “Plano de contas”. “Balancete e razão” consolida. Em “Contas a pagar” os compromissos da folha são programados e conciliados com “Contas bancárias”. “Remessa e retorno CNAB 240” gera o arquivo de pagamento de salários e lê o retorno. **Antes de usar em produção, homologue o layout com o seu banco.**

# 8. DCTFWeb

“Apuração e saldo a pagar” soma as contribuições previdenciárias, terceiros e retenções por código de receita e as confronta com os créditos. “Calendário de prazos” e “Multas e acréscimos” calculam vencimentos (com dias úteis e feriados) e mora. “DARF (espelho)” imprime, por código de receita, o valor, o vencimento e os acréscimos, **como espelho**: para pagar, gere o DARF oficial no portal e-CAC. Os códigos de receita foram conferidos no Manual da DCTFWeb e no MOS do eSocial.

# 9. eSocial

“Enviar competência” gera e envia os eventos pendentes na ordem correta, respeitando dependências (por exemplo, o S-1000 antes do S-1005). “Biblioteca de eventos” guarda XML, protocolo, recibo e permite retificação. “Retornos e conciliação” lê S-5001, S-5002 e S-5011 e compara com a folha. “Guias e vencimentos” mostra o que vence. “Webservice / Integração” configura o ambiente e o gateway: **produção restrita** para testes; **produção** só após validação. O sistema valida XML contra os esquemas S-1.3 antes de enviar. Um evento rejeitado mostra a ocorrência; corrija e retifique.

# 10. Planejamento e painel

O “Painel gerencial” mostra custo da folha por competência, situação dos eventos e indicadores; o “Comparativo de regimes” simula Simples, Presumido e Real com os dados da empresa. São estimativas para decisão, não parecer tributário.

# 11. Sistema

“Parâmetros legais” guarda tabelas (INSS, IRRF, salário mínimo, salário-família, FGTS). Eles são atualizados por **pacote assinado** pelo botão “Atualizar”; **conferir a folha após cada atualização**. “Backup e dados” exporta e importa cópia criptografada e remove os dados do dispositivo. “Segurança e acesso” altera a senha e o tempo de inatividade. “Trilha de auditoria” registra as ações. “Identidade visual” permite configurar nome, cores, fonte e logotipo (white-label).

# 12. Perguntas frequentes

**Esqueci a senha do cofre.** Não há recuperação. Restaure o último backup (que usa a senha com que foi criado).

**O valor do INSS parece diferente.** Verifique a competência, o teto e as tabelas em “Parâmetros legais”, as rubricas com incidência e se há atualização pendente.

**O evento foi rejeitado.** Abra a biblioteca de eventos, leia a ocorrência, corrija o cadastro e retifique.

**A tela ficou lenta.** Exporte um backup, feche abas desnecessárias e confira o espaço de armazenamento do navegador.

**Quero alterar o tema ou a marca e não gravou.** Aceite as preferências em “Privacidade e cookies”.

**Onde peço ajuda?** Conforme o seu contrato: primeiro nível com o revendedor; segundo nível com o fornecedor. Informe tela, competência e a mensagem exibida.
