from openpyxl import Workbook
from openpyxl.styles import Font,PatternFill,Alignment,Border,Side
from openpyxl.utils import get_column_letter
F='Arial'
wb=Workbook()
H=PatternFill('solid',fgColor='1F2A37');HF=Font(name=F,bold=True,color='FFFFFF',size=10)
B=Font(name=F,size=10);BB=Font(name=F,size=10,bold=True);T=Font(name=F,size=14,bold=True);S=Font(name=F,size=10,italic=True,color='555555')
INP=Font(name=F,size=10,color='0000FF')
th=Side(style='thin',color='BBBBBB');BD=Border(left=th,right=th,top=th,bottom=th)
WR=Alignment(wrap_text=True,vertical='top')
def sheet(ws,title,sub,head,rows,widths,start=4):
    ws['A1']=title;ws['A1'].font=T;ws['A2']=sub;ws['A2'].font=S
    for j,h in enumerate(head,1):
        c=ws.cell(row=start,column=j,value=h);c.font=HF;c.fill=H;c.alignment=Alignment(wrap_text=True,vertical='center');c.border=BD
    for i,r in enumerate(rows,start+1):
        for j,v in enumerate(r,1):
            c=ws.cell(row=i,column=j,value=v);c.font=B;c.alignment=WR;c.border=BD
    for j,w in enumerate(widths,1):ws.column_dimensions[get_column_letter(j)].width=w
    ws.freeze_panes=ws.cell(row=start+1,column=1)
# ---------- 1. Notas por módulo ----------
_old=[(0.06,9.5,8.0,9.0,8.5),(0.08,9.0,8.5,9.0,8.5),(0.08,8.5,7.5,8.0,8.0),(0.14,9.0,8.5,9.0,8.5),(0.10,8.5,7.5,7.5,8.0),(0.14,7.5,7.0,8.5,8.0),(0.05,7.5,7.0,7.5,8.0),(0.07,8.5,7.5,8.5,8.5),(0.05,9.0,9.0,9.0,8.5),(0.04,9.0,8.5,9.0,8.5),(0.04,9.0,8.0,7.5,8.5),(0.07,9.0,8.2,8.3,8.5),(0.03,8.5,8.0,7.5,8.0),(0.03,9.0,8.0,9.0,8.5),(0.02,8.0,8.0,8.0,8.0)]
PREV=round(sum(p*(f*0.25+c*0.35+t*0.25+u*0.15) for p,f,c,t,u in _old),2)
ws=wb.active;ws.title='Notas por módulo'
mods=[
('Empresa, estabelecimentos, lotações, cargos e rubricas (S-1000/1005/1020/1010)',0.06,9.5,8.0,9.0,8.5,'Natureza 9219 de PLANO/COPART conforme a Tabela 3 oficial recebida (S-1010 liberado); Tabelas 4 e 21 em parte de fonte secundária; rubricas incluídas pelo usuário ainda sem validação XSD do S-1010/S-1200 com rubrica nova e validação XSD do S-1010/S-1200 com rubrica nova concluída.'),
('Empregados e movimentações (S-2200/2205/2206/2230/2299)',0.08,9.0,8.5,9.0,8.5,'Atestados e afastamentos do controle interno não geram S-2230 automaticamente; conferir tabelas 18/19 com o leiaute oficial.'),
('Regras de trabalho (CCT/pisos, 12x36, banco de horas, estabilidades, pensão, consignado, plano, PLR)',0.08,8.5,7.5,8.0,8.0,'Sem validação contra folhas reais de cliente; adicionais por categoria/CCT além do piso não implementados; tabelas de PLR e consignado de fonte secundária.'),
('Cálculo da folha mensal (INSS, IRRF, FGTS, salário-família, VT, encargos)',0.14,9.0,8.8,9.0,8.5,'INSS por faixa, FGTS e encargos agora truncados na 2ª casa, como nos totalizadores do eSocial (MOS S-1.3); recálculo independente sem divergência; falta paralelo com folhas reais de sistema consolidado; eConsignado na rescisão (Portaria MTE 1.115/2026) e salário-maternidade não calculados.'),
('Férias, 13º salário e rescisão (S-2299)',0.10,8.5,7.5,7.5,8.0,'Retenção de IRRF de férias (código 31 x 33) em aberto; sem cálculo paralelo com casos reais (mínimo de 30 casos).'),
('eSocial: geração de XML, validação XSD, envio simulado e biblioteca (17 eventos)',0.14,7.5,7.5,8.5,8.0,'Nenhuma transmissão real à produção restrita; XML sem assinatura XMLDSig; cobertura de leiaute de 17 eventos; XSD da etapa vigente a baixar do portal.'),
('Retornos e guias (S-5001/5002/5011, espelho DCTFWeb/FGTS/DARF)',0.05,8.0,7.5,7.5,8.0,'Retornos só por importação manual e testados com XML sintético; guias com códigos de receita do Manual da DCTFWeb, mas sem emissão de DARF; feriados móveis não tratados.'),
('SST e saúde ocupacional (CAT, ASO, S-2240, prazos NR-7, soma de atestados)',0.07,8.5,7.5,8.5,8.5,'Prazos da NR-7 e texto do art. 75 do Decreto 3.048/1999 conferidos só em fontes secundárias (marcados com **); premissas de CID e janela de 60 dias a validar com jurídico e médico do trabalho.'),
('Ficha Financeira e relatórios por empresa',0.05,9.0,9.0,9.0,8.5,'Exportação em PDF/Excel pela tela atual (sem biblioteca): reproduz o que aparece na tela, sem o layout oficial de contracheque ou termo; PDF sem fontes embutidas (só Latin-1).'),
('Histórico do empregado e controle interno (advertências, cursos)',0.04,9.0,8.5,9.0,8.5,'Alterações cadastrais registradas só a partir da ativação; sem autoria (quem alterou) por falta de usuários no sistema.'),
('Multiempresa e ambiente de exemplo',0.04,9.0,8.0,7.5,8.5,'Modo local: todas as empresas no mesmo cofre e senha e capacidade do armazenamento do navegador; no modo servidor cada empresa tem dados e acessos próprios (sem exclusão de empresa pela API).'),
('Segurança e LGPD (cofre cifrado, cookies, auditoria, backup cifrado, login por usuário/MFA/permissões)',0.07,9.0,8.2,8.3,8.5,'Modo servidor construído e testado, mas ainda não implantado com disco/banco persistente; sem teste de intrusão independente; CSP com style inline; sessões em memória; sem recuperação de senha por e-mail nem QR code do MFA.'),
('Atualizações (botão Atualizar, servidor assinado e painel administrativo)',0.03,8.5,8.0,7.5,8.0,'Serviço em plano gratuito com disco efêmero; ainda sem teste ponta a ponta pela URL pública e sem pacote real publicado.'),
('Interface, menu e acessibilidade',0.03,9.0,8.0,9.0,8.5,'Sem teste com leitor de tela e sem teste com usuários reais; menu móvel retrátil ainda não implementado.'),
('Documentação jurídica e licenciamento (minuta, contrato de operador, RIPD, incidentes)',0.02,8.0,8.0,8.0,8.0,'Peças aguardam revisão do advogado responsável e dados do licenciado (fornecedor, encarregado).'),
('Contabilidade (plano de contas, lançamentos automáticos da folha, balancete e razão)',0.04,8.5,7.5,8.5,8.0,'Sem multa rescisória do FGTS, reversão de provisões no pagamento de férias/13º e centro de custo; CSV simples, sem ECD (SPED Contábil); política contábil das provisões a definir pela contabilidade da empresa.'),
('Financeiro e arquivos bancários (contas a pagar da folha, remessa e retorno CNAB 240)',0.04,8.0,6.5,7.5,8.0,'Leiaute CNAB 240 montado a partir do padrão FEBRABAN e testado só por estrutura (240 posições, totais, retorno sintético); nenhuma homologação com banco; sem PIX, Segmento J/O e guias por código de barras; códigos de ocorrência a confirmar por banco.'),
('DCTFWeb (apuração, créditos vinculáveis, calendário de prazos, MAED, mora e espelho do DARF)',0.04,8.5,7.5,8.5,8.0,'Espelho de conferência: não transmite a declaração nem emite o DARF numerado (exige certificado/e-CAC ou Serpro Integra Contador); códigos de receita conferidos no Manual da DCTFWeb (jan/2025) e no MOS S-1.3 (1099-01, 1138-04, 0588-06, 1141-01/-05, 2985-01/2991-01, terceiros por entidade e 1664-01); só o código do adicional do tomador de cooperativa de trabalho segue em aberto (**); MAED e mora são simulações; feriados municipais só os cadastrados pelo usuário.'),
('Contribuintes individuais, CPRB, adicionais e Reinf (pró-labore, autônomos, cooperados, GILRAT adicional, SENAI adicional)',0.04,8.0,7.5,8.5,7.5,'INSS 11% com teto e múltiplas fontes, patronal 20%, IRRF, CPRB da transição 2025–2027 e adicional de cooperados calculados e ligados à DCTFWeb; S-2300/S-1200/S-1210 de CI validados no XSD, mas não homologados; Reinf só como espelho (sem XML R-2010/R-2020/R-2060/R-2099); sem proporcionalidade da CPRB em atividades mistas; percentual do SENAI adicional (o MOS só informa o código 1664 e o limite de 500 empregados) e composição de entidades por FPAS a confirmar (**); código do adicional do tomador de cooperativa de trabalho em aberto; S-1200 de CI passou a usar rubricas próprias com as naturezas 3501, 3506, 3508 e 3520 da Tabela 3 (enviar o S-1010 antes).'),
]
tot=sum(m[1] for m in mods)
mods=[(m[0],round(m[1]/tot,3))+m[2:] for m in mods]
mods[3]=(mods[3][0],round(mods[3][1]+1-sum(m[1] for m in mods),3))+mods[3][2:]
ws['A1']='FolhaPro — notas por módulo (auditoria de 15/11/2026, revisão com modo servidor, usuários e licenças)';ws['A1'].font=T
ws['A2']='Notas atribuídas pelo próprio autor do código, após bateria de testes automatizados; não há revisão independente. Meta do projeto: 9,0 por módulo e na nota geral.';ws['A2'].font=S
ws['A3']='Pesos das dimensões:';ws['A3'].font=BB
dims=[('Funcionalidade',0.25),('Conformidade normativa',0.35),('Correção técnica (testes)',0.25),('Usabilidade',0.15)]
for k,(n,p) in enumerate(dims):
    ws.cell(row=3,column=2+2*k,value=n).font=B;c=ws.cell(row=3,column=3+2*k,value=p);c.font=INP;c.number_format='0%'
head=['Módulo','Peso do módulo','Funcionalidade','Conformidade normativa','Correção técnica (testes)','Usabilidade','Nota do módulo','Meta','Distância da meta','Situação','Principais pendências para chegar a 9,0']
for j,h in enumerate(head,1):
    c=ws.cell(row=5,column=j,value=h);c.font=HF;c.fill=H;c.alignment=Alignment(wrap_text=True,vertical='center');c.border=BD
r0=6
for i,m in enumerate(mods):
    r=r0+i;nome,peso,f,cn,tc,us,pend=m
    vals=[nome,peso,f,cn,tc,us]
    for j,v in enumerate(vals,1):
        c=ws.cell(row=r,column=j,value=v);c.font=INP if j>=2 else B;c.border=BD;c.alignment=WR
        if j==2:c.number_format='0.0%'
        elif j>=3:c.number_format='0.0'
    ws.cell(row=r,column=7,value=f'=ROUND(SUMPRODUCT(C{r}:F{r},$C$3:$F$3*0+CHOOSE({{1,2,3,4}},$C$3,$E$3,$G$3,$I$3)),2)')
    ws.cell(row=r,column=8,value=9).font=B
    ws.cell(row=r,column=9,value=f'=H{r}-G{r}')
    ws.cell(row=r,column=10,value=f'=IF(G{r}>=H{r},"Atingida","Abaixo da meta")')
    ws.cell(row=r,column=11,value=pend)
    for j in (7,8,9,10,11):
        c=ws.cell(row=r,column=j);c.font=BB if j==7 else B;c.border=BD;c.alignment=WR
        if j in(7,8,9):c.number_format='0.00'
rl=r0+len(mods)-1;rt=rl+1
ws.cell(row=rt,column=1,value='NOTA GERAL PONDERADA').font=BB
ws.cell(row=rt,column=2,value=f'=SUM(B{r0}:B{rl})').number_format='0.0%'
for j,col in enumerate('CDEF',3):
    c=ws.cell(row=rt,column=j,value=f'=ROUND(SUMPRODUCT($B{r0}:$B{rl},{col}{r0}:{col}{rl}),2)');c.number_format='0.00'
c=ws.cell(row=rt,column=7,value=f'=ROUND(SUMPRODUCT($B{r0}:$B{rl},G{r0}:G{rl}),2)');c.number_format='0.00'
ws.cell(row=rt,column=8,value=9).number_format='0.00'
ws.cell(row=rt,column=9,value=f'=H{rt}-G{rt}').number_format='0.00'
ws.cell(row=rt,column=10,value=f'=IF(G{rt}>=H{rt},"Atingida","Abaixo da meta")')
for j in range(1,12):
    c=ws.cell(row=rt,column=j);c.font=BB;c.border=BD;c.fill=PatternFill('solid',fgColor='E8F3EC')
ws.cell(row=rt+1,column=1,value='Módulos abaixo da meta').font=B;ws.cell(row=rt+1,column=2,value=f'=COUNTIF(J{r0}:J{rl},"Abaixo da meta")').font=BB
ws.cell(row=rt+2,column=1,value='Nota geral na rodada anterior (15/11/2026, antes dos módulos de contabilidade, financeiro, CNAB, DCTFWeb e contribuintes individuais)').font=B;c=ws.cell(row=rt+2,column=2,value=PREV);c.font=INP;c.number_format='0.0'
ws.cell(row=rt+3,column=1,value='Evolução da nota geral').font=B;c=ws.cell(row=rt+3,column=2,value=f'=G{rt}-B{rt+2}');c.number_format='+0.00;-0.00';c.font=BB
ws.cell(row=rt+5,column=1,value='Leitura honesta: a meta de 9,0 NÃO foi atingida. Os módulos novos (contabilidade, financeiro/CNAB, DCTFWeb e contribuintes individuais/CPRB/Reinf) entraram com notas mais baixas e, por terem peso, reduzem a média geral em relação à rodada anterior, apesar das correções de cálculo e de conformidade feitas em outros módulos. A maior parte da distância vem de itens que dependem de terceiros ou de dados que o autor não tem: homologação real no eSocial e com banco, folhas reais para cálculo paralelo, revisão independente e usuários para teste. O manual do eSocial (430 páginas) foi conferido de forma parcial (prazos, totalizadores e novidades de 2026), não evento a evento.').alignment=WR
ws.merge_cells(start_row=rt+5,start_column=1,end_row=rt+5,end_column=11);ws.row_dimensions[rt+5].height=62;ws.cell(row=rt+5,column=1).font=BB
for j,w in enumerate([58,10,13,14,14,12,11,8,11,16,70],1):ws.column_dimensions[get_column_letter(j)].width=w
ws.row_dimensions[5].height=32;ws.freeze_panes='B6'
# fix G formula (simple, explicit weights)
for i in range(len(mods)):
    r=r0+i;ws.cell(row=r,column=7,value=f'=ROUND(C{r}*$C$3+D{r}*$E$3+E{r}*$G$3+F{r}*$I$3,2)')
# ---------- 2. Melhorias ----------
ws2=wb.create_sheet('Melhorias realizadas')
mel=[
(1,'Base','Sistema de folha e departamento pessoal em arquivo único (HTML): cadastro da empresa, empregados, cálculo, contracheque, eSocial com biblioteca de eventos, botões de voltar, tela inicial e envio em todas as telas.'),
(2,'Regimes','Diferenciação entre Simples Nacional (Anexos I a V e IV), Lucro Presumido (com e sem CPRB) e Lucro Real; estabelecimentos e lotações tributárias com regras claras e mapa da estrutura.'),
(3,'Publicação','Código no GitHub (luizvazj-tech/ERP-EMPRESAS-NORMAIS) e site estático no Render com link público; deploy por gatilho.'),
(4,'Gestão','Dashboards gerenciais e comparativo de enquadramento tributário (Simples x Presumido x Real).'),
(5,'Auditoria','Auditoria inicial do sistema e validação dos cálculos com base nos pacotes XSD do eSocial S-1.3 fornecidos (dois pacotes).'),
(6,'eSocial','Camada de simulação de homologação (gateway simulado) e validação local dos eventos antes do envio, com ocorrências por evento.'),
(7,'Marca','Identidade visual white-label (cores, fonte, logotipo, nome do produto) adaptada ao cliente Mallora Tecnologia.'),
(8,'Avaliação','Notas de conformidade, veracidade dos cálculos e usabilidade, mais valoração do sistema com base em código, dados e funcionalidades.'),
(9,'Conformidade','CNPJ alfanumérico (IN RFB 2.229/2024), política de cookies com banner e consentimento, cofre cifrado (PBKDF2-SHA-256 600.000 iterações + AES-GCM-256), trilha de auditoria, CSP, acessibilidade básica e menu móvel.'),
(10,'Regras de negócio','Convenção coletiva e pisos com reajuste (S-2206), jornada 12x36, banco de horas, estabilidades provisórias, insalubridade/periculosidade por laudo, pensão alimentícia por base variável, consignado com margem, plano de saúde com coparticipação e PLR.'),
(11,'eSocial','Cobertura ampliada para 17 eventos (S-2210 CAT, S-2220 ASO, S-2240), leitura de retornos S-5001/5002/5011, espelho de guias com vencimentos, referência à NT S-1.3 nº 07/2026.'),
(12,'Jurídico','Quatro peças: minuta de licença e suporte (com SLA), contrato de operador de dados, RIPD e plano de resposta a incidentes; fornecedor e encarregado na política de privacidade.'),
(13,'Segurança','Backup em arquivo cifrado com senha própria (AES-GCM-256).'),
(14,'Cálculo','Roteiro de conferência dos pontos em dúvida (retenção de IRRF de férias, Tabela 3, PLR, consignado) em .md e .docx.'),
(15,'Atualizações','Botão “Atualizar” no sistema e servidor de atualizações no Render com painel administrativo: pacotes assinados (ECDSA P-256), whitelist de parâmetros, desfazer por lote, login com rate limit, CSRF e auditoria.'),
(16,'Folha','Ficha Financeira no menu da folha: consolidada, individualizada por empregado (busca e seleção múltipla, visualizar e imprimir) e rascunho com marca d’água.'),
(17,'Multiempresa','Botões “Novo cadastro” e “Excluir cadastro” (confirmação digitada), lista de empresas cadastradas, abrir/trocar entre empresas e bloqueio de CNPJ duplicado; tudo no mesmo cofre.'),
(18,'Relatórios','Relatórios por empresa: uma, várias ou todas; seleção das informações (cadastro, estrutura, quadro, folha, encargos, eventos, férias, SST, alertas) e do período; consolidado, impressão e CSV.'),
(19,'Usabilidade','Menu lateral reformulado: grupos recolhíveis com ícone e contador, busca no menu, destaque da página atual e acessibilidade por teclado.'),
(20,'Controle interno','Histórico do empregado (linha do tempo com alterações cadastrais automáticas antes/depois, movimentações, advertências, cursos, exames, atestados, férias e desligamento), cadastros de advertências/suspensões e de cursos, com impressão e CSV; nada é enviado ao eSocial.'),
(21,'Saúde ocupacional','Painel de exames e prazos (admissional, periódico, retorno, demissional com dispensa por grau de risco), controle de afastamentos e licenças e soma de atestados conforme o art. 75 do Decreto 3.048/1999.'),
(22,'Treinamento','Ambiente de exemplo com 3 empresas (Simples, Presumido e Real) e 10 empregados cada: 4 competências fechadas, competência atual, férias, ~130 eventos processados em simulação por empresa, SST, atestados, advertências e histórico; carregar/remover sem tocar nos dados reais.'),
(23,'Padronização','Marcação “**” no lugar de “[VERIFICAR FONTE OFICIAL]” em todos os textos do sistema.'),
(24,'Qualidade','Bateria de auditoria final (33 verificações), nomes acessíveis em todos os controles de formulário, xmlcheck por período, correção de erros de data e validação XSD de 391 eventos do exemplo.'),
(25,'Rubricas','Rubricas incluídas pelo usuário: botão “Incluir rubrica” (tipo, valor fixo ou % do salário, natureza e incidências, vigência, todos ou empregados selecionados), “Pausar/Retomar” por competência (competências anteriores intactas, histórico de pausas) e “Excluir” (apaga; barrado se a rubrica já foi usada em folha ou S-1010, caso em que se usa a pausa). Rubricas do sistema não podem ser pausadas nem excluídas.'),
(26,'Rubricas','Proporcionalidade das rubricas incluídas, em três modos: integral; proporcional à admissão e ao desligamento (dias/30); e proporcional aos dias trabalhados (também desconta as férias gozadas no mês). Vale para valor fixo e para percentual do salário; o contracheque mostra a fração (ex.: 20/30).'),
(27,'Acesso e licenças','Modo servidor: API própria (sem dependências) com contas de clientes, usuários com perfis (administrador, DP, aprovador, consulta, auditor, personalizado) e nível 0–4 por módulo e por empresa, login com senha forte e MFA (TOTP), bloqueio por tentativas, sessões, gravação por chave com controle de conflito, nível 3 para fechar competência e transmitir ao eSocial, auditoria encadeada por hash, licença por faixa (empresas, vínculos ativos, usuários) com carência, somente leitura e suspensão, webhook de pagamento assinado e painel do fornecedor para contas, planos e preços. No app: login, troca de senha, cadastro do MFA, escolha de empresa, telas de usuários e permissões, licença, registro de ações e minha conta; menu e telas respeitam o perfil.'),
(28,'Contabilidade','Menu Contabilidade: plano de contas resumido editável, parametrização de contas por tipo de lançamento, geração automática dos lançamentos da folha por partidas dobradas (apropriação de proventos, líquido, INSS, IRRF e descontos; encargos patronais, RAT e terceiros; FGTS), provisões mensais opcionais de férias e 13º, lançamentos manuais, encerramento da competência contábil, balancete, razão por conta e exportação em CSV.'),
(29,'Financeiro','Menu Financeiro: contas a pagar geradas da folha (salário líquido por empregado no 5º dia útil, verbas rescisórias em 10 dias, INSS, IRRF e FGTS nos vencimentos dos parâmetros), títulos avulsos, baixa com lançamento contábil automático, cancelamento e cadastro de contas bancárias da empresa.'),
(30,'Arquivos bancários','Remessa de pagamentos CNAB 240 (padrão FEBRABAN: header/trailer de arquivo e de lote, Segmentos A e B, lotes por forma de lançamento), validação de dados bancários e CPF do favorecido com lista de pendências, histórico de remessas, e leitura do arquivo de retorno com baixa automática, reabertura dos rejeitados e motivo da ocorrência. Homologação bancária obrigatória (**).'),
(31,'DCTFWeb','Menu DCTFWeb com base no Manual da DCTFWeb (jan/2025): apuração por código de receita (1082-01, 1138-01, 1646-01, terceiros, 0561-07, 3562-01 e 13º), vinculação automática de créditos (salário-família, salário-maternidade, retenção Lei 9.711/98) na ordem padrão, saldo a pagar, prazo de transmissão e vencimento, registro da transmissão, conciliação com o S-5011, calendário de prazos do eSocial e da DCTFWeb e simuladores de MAED e de multa/juros de mora.'),
(32,'eSocial','Conferência com o Manual de Orientação do eSocial S-1.3 (consolidado até 12.2026): truncamento na 2ª casa decimal do INSS (faixa a faixa), do FGTS e dos encargos; alertas de terceiros 0079 (FPAS 507/833, desde 05/2026), natureza 9253 do eConsignado e SENAI adicional; códigos de receita das guias.'),
(33,'Servidor','Módulos “contabil” e “financeiro” nas permissões da API (perfis com acesso zero por padrão; auditor com leitura) e mapeamento das novas chaves do banco.'),
(34,'Exportação','Botões “PDF” e “Excel” em todas as telas e em janelas com tabela: o conteúdo exibido (títulos, textos, campos, indicadores e tabelas) vira .xlsx nativo (números reais, cabeçalho em negrito, larguras) ou PDF A4 (retrato ou paisagem, cabeçalho repetido, rodapé com empresa e página x de y), sem bibliotecas e sem enviar dados a servidor; registro na auditoria.'),
(35,'Prazos','Feriados móveis (Páscoa, Carnaval, Sexta-feira Santa e Corpus Christi) e feriados estaduais/municipais cadastráveis, aplicados aos vencimentos de guias, prazos do eSocial e DCTFWeb e ao 5º dia útil; tela “Feriados e dias não úteis”.'),
(36,'DARF','Tela “DARF (espelho)”: um DARF por código de receita, campos 01 a 10, vencimento, multa de mora (0,33% ao dia, teto de 20%) e juros Selic + 1% para pagamento em atraso, com impressão. Não emite o DARF numerado nem transmite a DCTFWeb.'),
(37,'Encargos','Adicional ao GILRAT por empregado exposto (25/20/15 anos = 6/9/12 p.p., Lei 8.213/1991, art. 57, §6º), contribuição adicional ao SENAI (mais de 500 empregados, código 1664, desde 05/2026), terceiros divididos por entidade (FPAS 507 e 515) e CPRB com a transição da Lei 14.973/2024 (80%, 60% e 40% da alíquota, extinta em 2028).'),
(38,'Contribuintes individuais','Cadastro de pró-labore, diretor, autônomo e cooperado: INSS 11% até o teto com remuneração de outras fontes, patronal 20% (reduzida pelo fator da CPRB; zero no Simples Anexos I–III e V), IRRF, adicional de cooperado (cooperativa de produção 12/9/6 p.p. e tomador de cooperativa de trabalho 9/7/5 p.p.), integração à DCTFWeb e geração dos eventos S-2300, S-1200 (infoMV, infoComplem, infoComplCont) e S-1210, validados no XSD.'),
(39,'Reinf','Cadastro de notas com retenção previdenciária (R-2010/R-2020) e espelho da competência com R-2060 (CPRB) e checklist do fechamento R-2099.'),
(40,'Códigos de receita','Pesquisa na tabela oficial (Manual da DCTFWeb de janeiro/2025 e MOS S-1.3): contribuintes individuais passam a usar 1099-01 (segurado 11%), 1138-04 (patronal) e 0588-06 (IRRF); adicional de cooperativa de produção 1141-05; CPRB por dispositivo (2985-01, 2991-01, 2985-06, escolhido no cadastro); terceiros com um DARF por entidade (1170, 1176, 1181, 1184, 1191, 1196 e 1200); SENAI adicional 1664-01.'),
(41,'Tabela 3','Com a Tabela 3 do eSocial fornecida: rubricas próprias para contribuintes individuais (301 a 304) com as naturezas 3501 (autônomo), 3506 (diretor não empregado), 3508 (sócio) e 3520 (cooperado), escolhidas pela categoria no S-1200; plano de saúde e coparticipação (desconto) passam à natureza 9219, o que desbloqueia o S-1010 dessas duas rubricas. S-1010 das seis rubricas e S-1200 de CI validados no XSD (S-1010 6/6).'),
(42,'Usabilidade e design','Tema claro, escuro e automático (segue o sistema, com alternância manual lembrada no navegador) em variáveis de cor, inclusive gráficos e cor da marca derivada por tema; paleta de comandos (Ctrl+K) para abrir qualquer tela; atalho ? com a lista de atalhos; diálogos com papel, nome, foco inicial, foco preso e devolução do foco; título da página acompanha a tela; cabeçalho de tabela fixo, números tabulares e alvos de toque de 44 px em telas de toque; botão de envio ao eSocial com contraste mínimo de 4,5:1. Contraste dos textos do tema escuro verificado por script nas telas inicial, empregados, painel e DCTFWeb (nenhum par abaixo de 4,5:1).'),
]
sheet(ws2,'Melhorias realizadas até 15/11/2026','Resumo por entrega, em ordem cronológica.',['#','Área','Melhoria'],mel,[6,20,130])
# ---------- 3. Auditoria ----------
ws3=wb.create_sheet('Auditoria desta rodada')
aud=[
('Cálculo da folha','3 empresas, 147 contracheques: totais, líquido, INSS progressivo e FGTS recalculados de forma independente','Aprovado','tools/auditoria_final.js'),
('Cálculo da folha','Recálculo independente de INSS e IRRF a partir dos XML: 117 S-1200 do exemplo; líquido do S-1200 igual ao vrLiq do S-1210 por competência','Aprovado (sem divergência)','tools/xmlcheck.py (REGS=ex1,ex2,ex3)'),
('eSocial','Validação XSD de 391 XML do exemplo nos dois pacotes (S-1000, 1005, 1010, 1020, 1200, 1210, 1299, 2200, 2206)','Aprovado (0 erro)','tools/xsdval.py'),
('eSocial','Cenários originais (Simples, Presumido, Real, CPRB, CNPJ alfanumérico): 316 XML','Aprovado; S-1010 de PLANO/COPART liberado com a natureza 9219 (Tabela 3 oficial)','tools/dump.js + xsdval.py'),
('Ficha Financeira','Consolidada = soma das individuais = totais da folha, por empresa; rascunho inclui competência não fechada; relatório por empresa = folha','Aprovado','auditoria_final.js'),
('Soma de atestados','11 casos de borda do art. 75 (15/16 dias, 7+8, 7+9, 60 e 61 dias, CIDs diferentes, grupo manual, sem CID, excesso, sobreposição)','Aprovado (11/11)','auditoria_final.js'),
('Saúde ocupacional','Limites do exame demissional (134/136 dias no grau 1-2; 89/91 no grau 3-4)','Aprovado','auditoria_final.js'),
('Integridade','CNPJ e CPF válidos e únicos; ids únicos; nenhum registro órfão nas 4 bases; ida e volta de snapshot idêntica; 6 trocas de empresa','Aprovado','auditoria_final.js'),
('Histórico','Gravações sem mudança não geram registro; uma alteração gera exatamente um registro com antes/depois','Aprovado','auditoria_final.js'),
('Telas','42 telas x 3 empresas + abas de saúde: sem exceção e sem “undefined/NaN”','Aprovado','auditoria_final.js'),
('Segurança','Injeção de HTML em nome, curso, CID e motivo neutralizada em 12 telas; hash da CSP confere; sem manipuladores inline nem eval','Aprovado','auditoria_final.js'),
('Capacidade','3 empresas de exemplo ocupam 1.821 KB no armazenamento local (limite típico 5.000 KB)','Aprovado com ressalva (ver pendência 27)','auditoria_final.js'),
('Desempenho','500 empregados: cálculo da folha 37 ms, gravação 26 ms','Aprovado','auditoria_final.js'),
('Datas','Soma de meses no fim do mês (31/08 + 6 meses) e datas vazias/inválidas','REPROVADO na 1ª execução; corrigido (erros 9 e 10)','auditoria_final.js'),
('Acessibilidade','Controles de formulário sem nome acessível, em 42 telas','REPROVADO na 1ª execução (49 controles); corrigido (erro 11); agora 0','tools/a11y_test.js'),
('Rubricas (incluir, pausar, excluir)','Teste novo rubricas_test: 24 verificações — criação pelo formulário, entrada no cálculo e nas bases, vigência, pausa a partir da competência (anteriores intactas), retomada, % do salário, empregados selecionados, exclusão barrada se usada e liberada se nunca usada, validações (código duplicado, valor zero, seleção vazia), persistência','Aprovado (24/24)','tools/rubricas_test.js'),
('Rubricas: proporcionalidade','Teste rubxml_test: integral em mês cheio; 20/30 com admissão no dia 11; 15/30 com desligamento no dia 15; “adm.” ignora férias e “dias” as considera; desconto que reduz bases diminui a base de INSS em R$ 25','Aprovado (13/13)','tools/rubxml_test.js'),
('Rubricas: eSocial','S-1010 de 4 rubricas novas (provento fixo, provento %, desconto, desconto que reduz bases) e S-1200/S-1210 com elas: 53 XML válidos nos dois pacotes XSD; recálculo independente (xmlcheck) de INSS e IRRF sem divergência; S-1200 bloqueado quando a natureza está em branco','Aprovado (0 erro XSD; 0 divergência)','tools/rubxml_test.js + xsdval.py + xmlcheck.py'),
('Modo servidor: API','test.js da API: 86 verificações — senha forte e troca obrigatória, MFA (inclusive anti-replay), bloqueio após 5 falhas, perfis e níveis por módulo, restrição por empresa, limites de empresas/vínculos/usuários, conflito por chave, nível 3 para fechar competência e transmitir, isolamento entre contas, último administrador protegido, cadeia de auditoria e detecção de adulteração, licença vencida/suspensa e webhook assinado','Aprovado (0 falha)','api/test.js'),
('Modo servidor: app e painel','servidor_test (app em jsdom contra a API real): login, senha, MFA, empresa, gravação sem dados no navegador, menu e leitura conforme o perfil, recusa e reversão de gravação sem permissão, licença vencida, conflito e recarga, usuários e auditoria; test_painel: painel do fornecedor (contas, licença, planos)','Aprovado (0 falha)','tools/servidor_test.js, api/test_painel.js'),
('Regressão','smoke2, audit1 (14/14), cnpj_test, ui8_test, regras_test, bk_test, ficha, multiempresa, relatórios, menu, histórico, exemplo, vault (Chromium)','Aprovado, inclusive após a inclusão das rubricas (auditoria_final 33/33; a11y 0 sem nome; vault no Chromium); repetida após o modo servidor','tools/*'),
('Contabilidade','contab_fin_test: lançamentos balanceados (D = C) em cada partida e no balancete; salários a pagar = líquido da folha; despesas = proventos; FGTS = totalizador; regeração sem duplicar; provisões; competência encerrada bloqueia regeração','Aprovado (43/43 no teste conjunto)','tools/contab_fin_test.js'),
('Financeiro e CNAB 240','Títulos da folha sem duplicar; vencimento do salário no 5º dia útil; remessa com todas as linhas de 240 posições, estrutura 0-1-3-5-9, Segmentos A e B, dois lotes (mesmo banco e TED), soma dos trailers = soma dos pagamentos, contagem de registros, ASCII; retorno sintético com 2 pagos e 1 rejeitado; baixa contábil; balancete após baixas','Aprovado (estrutural); sem homologação com banco','tools/contab_fin_test.js'),
('DCTFWeb e eSocial','dctf_test: exemplo do MOS (remuneração 2.500,00 → INSS 221,62 com truncamento); 1.045 × 7,5% = 78,37; apuração igual ao totalizador de INSS; créditos só sobre CP e terceiros; prazos (último dia útil, dia 15 postergado, 20/12 antecipado); MAED (mínimo, 2%/mês, teto de 20%, redução de 50%, MEI e Simples); mora de 0,33%/dia; calendário; alertas 0079 e 9253','Aprovado (todas as verificações)','tools/dctf_test.js'),
('Correção do cálculo','auditoria_final com recálculo independente do INSS truncado por faixa, após a mudança de arredondamento para truncamento','Aprovado (33/33)','tools/auditoria_final.js'),
('Regressão','servidor_test, test.js e test_painel da API, rubricas, rubxml, menu (todas as telas abrem), multiempresa, a11y (0 sem nome), smoke2, histórico, regras e vault (Chromium) após os módulos novos','Aprovado','tools/*'),
('Exportação PDF/Excel','export_test: 22 exportações (11 telas x PDF e Excel) sem erro; PDF com cabeçalho %PDF-1.4, tabela xref apontando para os objetos e %%EOF; XLSX com CRC32 do ZIP conferido, números como valores e leitura correta no LibreOffice; texto do PDF extraído com pdftotext','Aprovado','tools/export_test.js'),
('Feriados e DARF','darf_fer_test: Páscoa de 2024, 2025 e 2026; Carnaval, Sexta-feira Santa e Corpus Christi de 2026; desativação por feriado; feriado local recorrente; um DARF por código com soma igual ao saldo da DCTFWeb; atraso de 10 dias = 3,3% + juros','Aprovado (13/13)','tools/darf_fer_test.js'),
('Encargos e contribuintes individuais','encargos2_test: adicional de 6% e 12% sobre a base do exposto; terceiros por entidade somam o totalizador; INSS de CI = 11% do teto; outra fonte no teto zera o INSS; Simples zera a patronal; CPRB 2025/2026/2027/2028 = 3.600, 2.700, 1.800 e 0; SENAI adicional acima de 500 empregados','Aprovado (21/21)','tools/encargos2_test.js'),
('eSocial de contribuintes individuais','ci_esocial_test: S-2300, S-1200 (com e sem infoComplem, com infoMV) e S-1210 gerados e validados contra o XSD do pacote S-1.3: 6 de 6 válidos; S-1200 de sócio sem S-2300 processado é barrado; adicional de cooperado = 450 + 700 na DCTFWeb','Aprovado (7/7; XSD 6/6)','tools/ci_esocial_test.js + xsdval.py'),
('Regressão','Todas as suítes anteriores (dctf, contab_fin, auditoria_final 33/33, a11y 0, servidor, rubricas, rubxml, smoke2, hist, regras, side, multiemp, API e vault no Chromium) após os quatro blocos desta rodada','Aprovado','várias'),
('Manual do eSocial S-1.3','Leitura parcial do manual consolidado (430 páginas): prazos de envio, totalizadores, novidades de 2026 (terceiros 0079, eConsignado, SENAI adicional)','Parcial; leitura evento a evento não feita','—'),
('Usabilidade','Tema escuro, paleta Ctrl+K, atalho ?, foco de diálogos e título por tela','13 verificações aprovadas; contraste do tema escuro sem pares abaixo de 4,5:1 nas telas amostradas','node tools/ux_test.js'),
('Regressão','Todas as suítes existentes após as mudanças de interface','Aprovadas; upd_test depende de arquivo de chaves local ausente neste ambiente e não foi executável','tools/*.js e api/test*.js'),
]
sheet(ws3,'Auditoria desta rodada (15/11/2026)','Testes executados pelo autor sobre o ambiente de exemplo; resultado e onde reproduzir.',['Área','Verificação','Resultado','Como reproduzir'],aud,[24,110,48,34])
# ---------- 4. Erros corrigidos ----------
ws4=wb.create_sheet('Erros corrigidos')
err=[
(1,'Cálculo','Rubricas opcionais novas (PLR, consignado, plano, coparticipação) ausentes do cadastro padrão: a folha quebrava ao usar consignado.','Rubricas adicionadas e mescladas automaticamente no carregamento dos dados.'),
(2,'Segurança','Backup em arquivo era texto aberto com CPF e salários.','Backup cifrado com senha própria (AES-GCM-256); exportação aberta mantida só com aviso.'),
(3,'eSocial','Tabela de tipo de jornada e código de incidência de IRRF desatualizados.','Tabelas recodificadas e migração automática de dados antigos.'),
(4,'Cálculo','Afirmação incorreta do autor: férias com incidência de IRRF código 11.','Corrigido para 13 (Tabela 21); texto da auditoria ajustado; retenção 31 x 33 mantida como dúvida aberta.'),
(5,'Atualizações','“Desfazer” desfazia só o último pacote do lote.','Instantâneo por lote (seqs e seqAntes).'),
(6,'Testes','audit1 travava por timers (setInterval) no jsdom.','Timers só rodam fora do modo de teste.'),
(7,'Atualizações','Chave privada de assinatura destruída antes de criar o serviço.','Novo par de chaves; pública atualizada no cliente; commit e deploy refeitos; privada só no Render.'),
(8,'Atualizações','Perda de dados no plano gratuito poderia reiniciar a numeração dos pacotes.','Numeração baseada em relógio.'),
(9,'Datas','Soma de meses estourava o mês (31/08 + 6 meses = 03/03/2027) e antecipava/adiava em até 3 dias o vencimento do exame periódico.','Soma limitada ao último dia do mês de destino (28/02/2027); teste de regressão incluído.'),
(10,'Datas','Data vazia ou inválida em atestado/afastamento causava exceção (RangeError) na linha do tempo e na soma.','Funções de data devolvem vazio/zero em vez de exceção.'),
(11,'Acessibilidade','49 controles de formulário sem nome acessível (lançamentos, biblioteca, retornos, identidade visual, buscas, etc.).','Rotina que atribui nome acessível a todo controle (rótulo, cabeçalho da coluna, texto vizinho), executada em cada tela e modal; teste a11y_test.js com 0 pendências.'),
(12,'Testes','xmlcheck.py mapeava o líquido do S-1210 só por CPF, gerando falsas divergências com várias competências.','Chave por CPF e período de referência.'),
(13,'Impressão','Estilo de página em paisagem para a ficha também alteraria a impressão do contracheque.','Regra de @page removida; fonte da ficha reduzida na impressão.'),
(14,'Menu','Item “Relatórios por empresa” caía no grupo errado do menu.','Movido para o grupo Folha de pagamento.'),
(15,'Modo servidor','Falha de projeto achada nos testes: a primeira versão da gravação enviava o banco inteiro e o servidor comparava chave a chave; usuários sem permissão em um módulo (ou com defaults/migrações do carregamento diferentes) teriam toda gravação recusada, e edições simultâneas em módulos diferentes gerariam conflito.','Gravação por chave alterada, com controle de conflito por chave e devolução do que outros alteraram; histórico automático e entregas mapeados ao módulo de quem edita; verificação automática de atualizações desligada no modo servidor.'),
(16,'Rodadas 3 e 4','28 correções anteriores (CNPJ alfanumérico, cookies, cofre, CSP, regras de negócio, eventos de SST, retornos, guias, peças jurídicas etc.).','Ver arquivo FolhaPro_pendencias_e_correcoes.xlsx (aba Corrigido).'),
(17,'Cálculo','Totalizadores calculados com arredondamento; o MOS do eSocial S-1.3 manda truncar na 2ª casa decimal, inclusive em cada faixa da tabela do INSS, no FGTS e nos encargos. Risco de divergência de centavos contra S-5001/S-5011.','Função de truncamento aplicada a INSS por faixa, FGTS e encargos (patronal, RAT e terceiros somados e truncados no total); teste com o exemplo do manual; recálculo independente da auditoria também alterado.'),
(18,'Guias','Códigos de receita genéricos (0561 e 3562) na tela de guias.','Passaram a 0561-07 e 3562-01, com os códigos de CP segurados, patronal, RAT ajustado e terceiros, conforme o Anexo I do Manual da DCTFWeb.'),
(19,'eSocial','Sem alerta para as mudanças de 2026: terceiros 0079 para FPAS 507/833 a partir de 05/2026 e natureza 9253 para consignado.','Alertas na conferência da estrutura (itens com **).'),
(20,'Cooperado','Premissa do autor de que o adicional de cooperado seria 12/9/6 p.p. a cargo da tomadora: a Lei 10.666/2003, art. 1º, distingue cooperativa de produção (12/9/6 sobre a remuneração) e tomador de cooperativa de trabalho (9/7/5 sobre a nota fiscal).','Calculados os dois casos; texto legal conferido só por fonte secundária (**).'),
(21,'Categorias','Categoria 741 (cooperado) usada no cadastro de contribuintes individuais: no MOS S-1.3 a 741 é MEI; cooperados são 731, 734 e 738.','Lista de categorias corrigida e regra de obrigatoriedade do S-2300 conforme o item 10.2.1 do MOS.'),
(22,'Códigos de receita','Contribuintes individuais lançados nos códigos de empregados (1082-01 e 1138-01) e IRRF com código provisório, por falta de consulta à tabela oficial; terceiros somados sob um único código genérico.','Corrigidos para 1099-01, 1138-04 (1138-06 no Simples concomitante) e 0588-06, com um código por entidade de terceiros, conforme o Manual da DCTFWeb e o MOS.'),
]
sheet(ws4,'Erros corrigidos','Erros encontrados (por testes, auditoria ou pelo próprio autor) e a correção aplicada.',['#','Área','Erro','Correção'],err,[6,16,90,80])
# ---------- 5. Pendências ----------
ws5=wb.create_sheet('Pendências')
pen=[
('eSocial','Homologação real na produção restrita (transmissão com certificado ICP-Brasil, mTLS e XMLDSig); hoje o envio é simulado e o XML sai sem assinatura.','Certificado e conta do cliente; gateway próprio.','Sim',120),
('eSocial','Cobertura do leiaute: 20 eventos (com S-2300 e S-1200/S-1210 de contribuintes individuais, validados no XSD e não homologados); faltam S-2399, S-1207, S-2231, S-2250 e outros conforme a necessidade do cliente; S-1200 de CI usa rubricas próprias (naturezas 3501, 3506, 3508 e 3520 da Tabela 3) e não informa deduções de dependentes do IRRF; FGTS do diretor com FGTS (721) não é calculado.','Definir com o cliente os eventos obrigatórios.','Não',160),
('eSocial','XSD da etapa vigente (NT S-1.3 nº 07/2026) e Tabelas 3, 4 e 21 oficiais: parte veio de fonte secundária (natureza de PLR 1300, consignado 9254).','Baixar do portal e reexecutar xsdval.py.','Sim',20),
('Cálculo','Retenção de IRRF de férias (código 31 x 33), PLR e consignado (a natureza de PLANO/COPART já foi confirmada na Tabela 3 oficial): roteiro de conferência entregue, ainda não confirmado com fonte oficial.','Conferência por contador/jurídico.','Sim',8),
('Cálculo','Cálculo paralelo de folha, férias, 13º e rescisão contra pelo menos 30 casos reais anonimizados de sistema consolidado.','Casos reais de clientes.','Sim',90),
('Cálculo','Adicionais por categoria e por CCT além do piso; regras setoriais.','CCT e folhas reais de ao menos três clientes.','Não',90),
('Guias','DCTFWeb e DARF: espelho de conferência; sem transmissão, sem emissão do DARF numerado (certificado/e-CAC ou Serpro Integra Contador) e sem importação do XML da declaração; FGTS Digital só espelho; códigos de receita agora conferidos na tabela oficial (Manual da DCTFWeb jan/2025 e MOS S-1.3), exceto o do adicional do tomador de cooperativa de trabalho (**); feriados municipais só os cadastrados.','Certificado/e-CAC ou contrato Serpro; tabela oficial de códigos da DCTFWeb.','Sim',60),
('Segurança','Modo servidor (usuários, perfis por módulo, MFA, auditoria encadeada, licenças) implantado: criar o serviço da API com disco persistente ou PostgreSQL (plano pago), definir variáveis (hash do fornecedor, segredo do webhook, origem) e gerar o front-end com FP_API_URL; depois teste de intrusão independente.','Decisão de custo do hospedeiro e credenciais.','Sim',40),
('Segurança','Teste de intrusão e análise de dependências por terceiro independente; CSP ainda com style inline.','Contratação externa.','Sim',84),
('Capacidade','Armazenamento local: ≈ 600 KB por empresa de 10 empregados com 4 competências; clientes com centenas de empregados e 12+ competências ultrapassam o limite típico de 5 MB. Migrar para IndexedDB e/ou servidor, guardando XML sob demanda.','Decisão de arquitetura.','Sim',60),
('LGPD','Eliminação/anonimização automática por prazo de guarda; revisão das peças jurídicas pelo advogado; dados do fornecedor e do encarregado.','Política de retenção do controlador.','Não',28),
('Usabilidade','Teste com usuários reais (DP e contabilidade); teste com leitores de tela (NVDA/JAWS/VoiceOver); menu móvel retrátil.','5 usuários e auditoria WCAG 2.1 AA.','Sim',80),
('Histórico','Alterações cadastrais só são registradas a partir da ativação; sem autoria (quem alterou) por falta de usuários; sem retroativo.','Depende do item de login por usuário.','Não',16),
('Saúde ocupacional','Texto e numeração do art. 75 do Decreto 3.048/1999 (redação do Decreto 10.410/2020) e prazos da NR-7 (inclusive o caso de parto) conferidos só em fontes secundárias; premissas do cálculo (3 caracteres do CID, janela de 60 dias desde o retorno) a validar com jurídico e médico do trabalho.','Fonte oficial e validação.','Não',8),
('Saúde ocupacional','Atestados e afastamentos do controle interno não geram S-2230 nem exigem S-2220 automaticamente.','Integração opcional com Movimentações.','Não',24),
('Multiempresa','No modo local todas as empresas compartilham um cofre e uma senha; no modo servidor o problema não existe, mas falta exclusão de empresa e política de retenção/eliminação por conta (LGPD).','Regra de retenção do controlador.','Não',16),
('Rubricas','Rubricas incluídas pelo usuário: natureza (Tabela 3) e incidências (CP, IRRF, FGTS) são informadas por quem inclui; o sistema só bloqueia o envio quando a natureza está em branco, sem conferir se a combinação é admissível no leiaute.','Tabela oficial de combinações natureza x incidência (Anexo I) para travar combinações inválidas.','Não',6),
('Exemplo','Códigos FPAS/terceiros da metalúrgica (507/0079) e CBO dos cargos fictícios vieram de memória; conferir antes de qualquer uso fora do exemplo.','Conferência de tabelas.','Não',2),
('Licenças','Cobrança: o servidor já bloqueia por faixa, validade e inadimplência e aceita webhook assinado, mas não há conector de nenhum provedor de pagamento, emissão de nota fiscal de serviço nem cobrança recorrente.','Escolha do provedor e credenciais; regra tributária do ISS pelo contador.','Não',60),
('Acesso','Recuperação de senha por e-mail, QR code para o MFA (hoje a chave é digitada), códigos de recuperação do MFA, sessões persistentes e armazenamento em PostgreSQL acima de dezenas de contas.','Serviço de e-mail e banco.','Não',70),
('Atualizações','Serviço de atualizações em plano gratuito (disco efêmero); falta Starter + disco persistente, teste ponta a ponta pela URL pública e primeiro pacote real.','Upgrade e teste pelo usuário.','Não',6),
('Marca','Manual de marca da Mallora (cor de destaque, fonte, logotipo).','Receber o manual.','Não',2),
('Qualidade','Testes automatizados em integração contínua (GitHub Actions) e cobertura de regressão.','Configurar CI.','Não',24),
('Operação','Suporte e SLA: valores, calendário de atualização das tabelas e responsável.','Decisão comercial.','Não',14),
('Segurança','Exportação em JSON aberto ainda existe (com aviso).','Remover ou exigir senha.','Não',2),
('Financeiro','Remessa CNAB 240 sem homologação com banco: convênio, câmara, finalidade, uso do Segmento B e códigos de ocorrência variam por instituição; arquivo de retorno só testado com dado sintético.','Manual CNAB do banco, arquivo de teste e validação pela mesa de integração.','Sim',24),
('Reinf','EFD-Reinf só como espelho: sem XML nem transmissão de R-2010, R-2020, R-2060 e R-2099, sem R-4010/R-4020 e sem escrituração de notas fiscais; retenção de 3,5% para prestador optante pela CPRB pela Solução de Consulta Cosit nº 153/2026 (**).','Leiaute e XSD do Reinf; certificado.','Não',120),
('Financeiro','Fora do arquivo bancário: PIX, Segmentos J/O (boletos e tributos por código de barras), pagamento de guias, conciliação por extrato (OFX/CNAB 240 de extrato) e fluxo de caixa.','Definir escopo com o cliente e o banco.','Não',60),
('Contabilidade','Sem lançamento da multa rescisória do FGTS, reversão de provisões no pagamento de férias e 13º, centro de custo e integração com plano de contas externo; exportação só em CSV simples, sem ECD (SPED Contábil).','Política contábil e leiaute do sistema contábil do cliente.','Não',50),
('Cálculo','Salário-maternidade não calculado na folha (entra na DCTFWeb só por valor informado); eConsignado na rescisão pelo percentual dado em garantia (Portaria MTE 1.115/2026) não implementado; percentual do SENAI adicional (20% sobre 1%, DL 4.048/1942, art. 6º; o MOS não o informa) e composição de entidades por FPAS a confirmar; CPRB sem proporcionalidade de atividades mistas e sem exclusões da receita bruta; adicional de cooperado conferido só em fonte secundária.','Fonte oficial dos percentuais e da legislação; casos de atividades mistas.','Sim',40),
('eSocial','Leitura integral do Manual de Orientação S-1.3 (430 páginas) evento a evento, comparando campos, prazos e regras com o gerador; até aqui a conferência foi parcial.','Tempo de revisão e, de preferência, validação por especialista em eSocial.','Sim',60),
]
rows=[(i+1,)+p for i,p in enumerate(pen)]
sheet(ws5,'O que falta corrigir ou está pendente','Horas = estimativa do autor (suposição), sem base de mercado. “Bloqueia 9,0” = sem o item a nota geral não chega a 9,0 com honestidade.',['#','Área','Pendência','O que é necessário','Bloqueia 9,0?','Horas (estim.)'],rows,[6,18,100,48,14,14])
n=len(rows);e=5+n
ws5.cell(row=e+1,column=4,value='Total de pendências').font=BB;ws5.cell(row=e+1,column=5,value=f'=COUNTA(C5:C{e})').font=BB
ws5.cell(row=e+2,column=4,value='Bloqueiam a nota 9,0').font=BB;ws5.cell(row=e+2,column=5,value=f'=COUNTIF(E5:E{e},"Sim")').font=BB
ws5.cell(row=e+3,column=4,value='Horas totais estimadas').font=BB;ws5.cell(row=e+3,column=5,value=f'=SUM(F5:F{e})').font=BB
ws5.cell(row=e+4,column=4,value='Horas dos itens que bloqueiam 9,0').font=BB;ws5.cell(row=e+4,column=5,value=f'=SUMIF(E5:E{e},"Sim",F5:F{e})').font=BB
wb.save('/home/claude/erp-empresas-normais/docs/FolhaPro_auditoria_e_notas_2026-11-15.xlsx')
