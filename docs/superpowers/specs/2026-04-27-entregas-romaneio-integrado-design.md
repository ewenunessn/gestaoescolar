# Entregas e Romaneio Integrados

Data: 2026-04-27

## Contexto

O modulo web de Entregas e o modulo de Romaneio existem como paginas separadas. A tela de Entregas ja possui filtros de periodo, guia, rota e pendencia. A tela de Romaneio possui filtros proprios de periodo, status, busca e rotas, mas o filtro de rota so e enviado ao backend quando existe exatamente uma rota selecionada.

O objetivo e fazer o Romaneio ser acessado pelo fluxo de Entregas, iniciar com os mesmos filtros principais da tela de Entregas e ainda permitir selecionar uma, varias ou todas as rotas na propria tela de Romaneio para exibicao e impressao com QR Code.

## Decisoes

- A tela de Entregas tera um botao para abrir o Romaneio.
- O botao enviara os filtros por query string, incluindo periodo e rotas selecionadas quando houver.
- O item "Romaneio" sera removido do menu lateral, mantendo a rota tecnica `/romaneio` ativa para navegacao pelo botao e compatibilidade com links existentes.
- O Romaneio inicializara seus filtros a partir da URL, mas continuara permitindo ajuste local de periodo, status, busca e rotas.
- O backend aceitara filtro de rota unico e multiplo para o endpoint do Romaneio.
- Quando nenhuma rota estiver selecionada no Romaneio, o resultado e o PDF considerarao todas as rotas.
- O QR Code gerado no Romaneio incluira periodo, rotas selecionadas e nomes das rotas. Para todas as rotas, registrara explicitamente que o filtro e "todas".

## Fluxo

1. Usuario acessa Entregas pelo menu.
2. Usuario configura filtros de data e rota na tela de Entregas.
3. Usuario clica em "Romaneio".
4. Aplicacao navega para `/romaneio` com os filtros na URL.
5. Romaneio carrega os dados usando esses filtros iniciais.
6. Usuario pode alterar rotas no Romaneio para uma, varias ou todas.
7. Ao imprimir, o PDF e o QR Code usam exatamente os filtros atuais do Romaneio.

## Frontend

Na tela `Entregas`, o estado de filtros sera serializado em query params. O botao "Romaneio" ficara no cabecalho ou na area de acoes da listagem, seguindo o padrao visual existente de botoes MUI com icone.

Na tela `Romaneio`, a inicializacao dos filtros lera `dataInicio`, `dataFim`, `status`, `rotaId` e `rotaIds` da URL. O estado interno continuara sendo a fonte da verdade depois do carregamento inicial, para permitir ajustes sem depender da tela de Entregas.

O seletor de rotas do Romaneio continuara multiplo. A opcao "todas" sera representada por lista vazia, como ja ocorre visualmente hoje. A chamada de API enviara `rota_ids` quando houver uma ou mais rotas selecionadas.

## Backend

O endpoint `GET /guias/romaneio` aceitara:

- `rota_id=1` para compatibilidade com chamadas antigas.
- `rota_ids=1,2,3` para multiplas rotas.
- Sem rota para todas as rotas.

O model de guias aplicara filtro `EXISTS` usando `ANY` ou lista parametrizada quando receber mais de uma rota. O comportamento de status e periodo permanece o mesmo.

## Permissoes e Navegacao

O menu lateral deixara de exibir "Romaneio". A rota `/romaneio` continuara protegida por permissao de leitura do modulo `romaneio`, pois a pagina ainda existe e sera acessada por navegacao interna.

## Testes

Os testes devem cobrir:

- Serializacao dos filtros da tela de Entregas para a URL do Romaneio.
- Inicializacao do Romaneio com `rotaIds` multiplos vindos da URL.
- Chamada de API do Romaneio com `rota_ids` para uma ou mais rotas.
- Backend filtrando corretamente uma rota, varias rotas e todas.

## Fora de Escopo

- Redesenhar visualmente a tela de Entregas ou Romaneio.
- Mudar o modelo de permissao.
- Remover a rota `/romaneio` do roteador.
- Alterar a logica de status de entrega.
