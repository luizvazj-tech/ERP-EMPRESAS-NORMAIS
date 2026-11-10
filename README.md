# FolhaPro — Folha de pagamento e eSocial (ERP de empresas em geral)

Aplicação de página única (HTML/CSS/JS, sem dependências) com departamento pessoal, folha de pagamento,
contracheque e geração/biblioteca de eventos eSocial (leiaute S-1.3).

## O que cobre

- Empresa por regime tributário: **Simples Nacional** (Anexos I–III/V, Anexo IV, misto), **Lucro Presumido** e **Lucro Real**, com CPRB opcional.
- **Estabelecimentos** (matriz, filiais, obras/CNO) com RAT/FAP e **lotações tributárias** (FPAS, terceiros, atividade substituída, CPRB), com validações e mapa da estrutura.
- Empregados, movimentações, lançamentos, cálculo (INSS, IRRF, FGTS, salário-família, VT, adicionais, DSR), contracheque.
- Férias, 13º salário e rescisão (S-2299 com verbas).
- Eventos S-1000, S-1005, S-1010, S-1020, S-2200, S-2206, S-2230, S-2299, S-1200, S-1210, S-1299; biblioteca com XML, protocolo, recibo e retificação.
- Relatórios por estabelecimento e lotação, e resumo de recolhimentos.

## Limites importantes

- O envio ao eSocial é **simulação** por padrão. A transmissão real exige certificado digital A1, mTLS e assinatura XML num gateway próprio (contrato descrito na tela Integração).
- Natureza das rubricas (Tabela 3) preenchida só onde conferida; as demais devem ser conferidas antes de produção.
- Itens marcados `[VERIFICAR FONTE OFICIAL]` na interface dependem de conferência com a legislação/leiaute vigentes.
- Os dados ficam no navegador (localStorage). Não há login nem servidor: **não use dados reais em instância pública**.
- Não cobre ainda: SST (S-2210/2220/2240), RAIS, DIRF/EFD-Reinf.

## Desenvolvimento

Edite os módulos em `src/` e rode `./build.sh` para regenerar `index.html`.
