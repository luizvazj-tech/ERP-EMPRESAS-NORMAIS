# Gateway local FolhaPro → eSocial (produção restrita)

Este gateway é o elo que faltava entre o FolhaPro (que gera e valida os eventos) e os web services do eSocial. Ele roda **no computador do usuário**, porque a transmissão exige certificado digital ICP-Brasil (e-CNPJ ou e-CPF) em TLS mútuo e assinatura XMLDSig de cada evento, o que um navegador não faz com segurança. Base normativa: Manual de Orientação do Desenvolvedor do eSocial v1.16, seções 6.4 a 6.7, 7.2 a 7.6 e 8.6.

## O que ele faz

Recebe do FolhaPro, por HTTP local (`127.0.0.1`), o lote de eventos em XML; confere se o Id de cada evento e o empregador conferem com o lote; remove assinaturas anteriores e assina cada evento (enveloped, C14N 1.0, RSA-SHA256, digest SHA-256, apenas o `X509Certificate`, `Reference URI=""`, conforme a seção 6.7); monta o `envioLoteEventos` (até 50 eventos, `ideEmpregador` com o CNPJ base e `ideTransmissor` extraído do próprio certificado); envia por SOAP 1.1 ao `EnviarLoteEventos` e, depois, consulta o `ConsultarLoteEventos` pelo protocolo, devolvendo ao FolhaPro o recibo ou as ocorrências de cada evento. Cada transmissão fica gravada em `gateway/log/` (lote assinado, SOAP enviado e resposta), como prova para a homologação.

## Salvaguardas

O gateway escuta apenas em `127.0.0.1`. O certificado e a senha ficam só na memória do processo; a senha é pedida no terminal sem eco (ou lida de `ESOCIAL_PFX_PASS`, se o usuário optar). Por padrão opera **somente em produção restrita (ambiente 2)**: se o FolhaPro pedir o ambiente 1, o gateway recusa (HTTP 409) e nada é enviado. A produção exige iniciar com `--producao`. Só aceitam chamadas as origens listadas em `ESOCIAL_ORIGENS` (padrão: o site do FolhaPro e o arquivo local). Também recusa certificado vencido, lote com mais de 50 eventos ou acima de 750 kB (validações 611 e 612 do manual) e evento de outro empregador.

## Instalação e uso

Requisitos: Node.js 18 ou superior e certificado **A1** (arquivo .pfx ou .p12). O certificado **A3** (token ou cartão) não é suportado por este gateway, porque a chave privada não sai do dispositivo; nesse caso, use o aplicativo oficial de transmissão ou exporte um A1.

```
cd gateway
npm install
set ESOCIAL_PFX=C:\certificados\empresa.pfx        (Windows)
export ESOCIAL_PFX=/caminho/empresa.pfx             (Linux ou macOS)
node server.js
```

Informe a senha quando solicitada. No FolhaPro, em **Integração**, escolha ambiente "2 – Produção restrita", modo "Webservice via gateway" e URL `http://127.0.0.1:8787`; use **Testar conexão**, que mostra o ambiente, o CNPJ do transmissor e a validade do certificado.

Antes do primeiro envio, rode `node server.js --diagnostico`. O comando baixa o WSDL de cada serviço com o seu certificado e lista os namespaces e as `SOAPAction` realmente publicados. Se a versão indicada diferir das usadas aqui (`ESOCIAL_VER_LOTE` v1_1_1, `ESOCIAL_VER_CONSULTA` v1_0_0, `ESOCIAL_VER_SERVICO` e `ESOCIAL_VER_SERVICO_CONSULTA` v1_1_0), ajuste as variáveis de ambiente de mesmo nome; as ações podem ser fixadas com `ESOCIAL_ACTION_ENVIO` e `ESOCIAL_ACTION_CONSULTA`. **Esses valores padrão não foram confirmados contra o serviço real** (o ambiente de desenvolvimento do FolhaPro não alcança o governo); o diagnóstico existe para isso.

## Variáveis de ambiente

`ESOCIAL_PFX` e `ESOCIAL_PFX_PASS` (ou `ESOCIAL_CERT_PEM` e `ESOCIAL_KEY_PEM`); `ESOCIAL_CA` (arquivo PEM com a cadeia que assina o servidor do eSocial, caso o Node não a reconheça); `ESOCIAL_TLS_INSEGURO=1` (desativa a verificação do servidor, **somente produção restrita**, e apenas se a cadeia não puder ser instalada); `ESOCIAL_ORIGENS`; `ESOCIAL_LOG`; `PORTA` (padrão 8787). O eSocial aceita somente TLS 1.2; o gateway já o impõe.

## Roteiro sugerido de homologação

Transmita nesta ordem, conferindo o retorno de cada grupo antes do seguinte: grupo 1 (tabelas) com S-1000, S-1005, S-1020 e S-1010; grupo 2 (não periódicos) com S-2200 e S-2230, se houver; grupo 3 (periódicos) com S-1200, S-1210 e S-1299, nesta sequência, pois o S-1299 exige que os anteriores estejam processados. O manual impõe ordem de precedência e proíbe o envio em paralelo de eventos que dependem uns dos outros (seção 7.9.7). Guarde `gateway/log/` e os recibos, que são a evidência do teste.

## Testes (sem acesso ao governo)

`npm test` sobe um eSocial **simulado** com TLS mútuo e verificação da assinatura e executa o fluxo completo: envio, consulta com "aguardando", sucesso, rejeição, ambiente trocado, evento de outro empregador e lote acima de 50. `node ../tools/gateway_eventos_test.js` assina eventos reais gerados pelo FolhaPro e os valida contra o XSD oficial. O simulado confirma a nossa mecânica, **não** substitui o teste no serviço real.
