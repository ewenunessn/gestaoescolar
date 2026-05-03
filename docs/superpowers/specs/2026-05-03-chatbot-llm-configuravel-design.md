# Chatbot LLM Configuravel

## Objetivo

Criar a base de um chatbot integrado ao sistema NutriLog para responder perguntas operacionais usando um LLM configuravel. A primeira versao deve funcionar com Ollama local e com APIs externas compativeis com OpenAI, sem amarrar o codigo a um fornecedor especifico.

O chatbot deve ser expansivel para novas ferramentas internas, mas a base inicial sera somente leitura e focada em consultas seguras ao sistema.

## Escopo Inicial

- Adicionar um botao flutuante global no frontend.
- Abrir um painel lateral de chat a partir do botao.
- Criar endpoint backend `/api/chatbot/message`.
- Permitir provedor LLM configuravel por ambiente.
- Suportar provedor `ollama`.
- Suportar provedor `openai_compatible`.
- Criar uma primeira ferramenta interna de consulta de estoque escolar por produto e periodo.
- Responder perguntas como: "quais escolas ja atualizaram o estoque do arroz branco nos ultimos 2 dias e quais ainda faltam".

Fica fora do escopo inicial:

- Criar ou editar registros pelo chatbot.
- Permitir SQL gerado livremente pelo LLM.
- Indexacao vetorial ou RAG sobre documentos.
- Tela administrativa completa para configurar provedores.
- Historico persistente de conversas.

## Arquitetura

### Frontend

O chatbot entra no `AppShellLayout`, para ficar disponivel em todas as telas autenticadas. O componente sera um botao flutuante fixo no canto inferior direito. Ao clicar, abre um painel lateral com:

- lista de mensagens da sessao atual;
- campo de texto;
- botao de envio;
- estado de carregamento;
- estado de erro;
- resposta formatada em texto com listas simples.

O historico inicial fica apenas em memoria no frontend. Ao recarregar a pagina, a conversa e perdida.

### Backend

Criar modulo `backend/src/modules/chatbot` com responsabilidades separadas:

- `routes`: expor `/api/chatbot/message`;
- `controller`: validar request e resposta HTTP;
- `orchestrator`: coordenar LLM, ferramentas e resposta final;
- `providers`: adaptar Ollama e API externa compativel com OpenAI;
- `tools`: declarar e executar consultas internas permitidas;
- `config`: carregar e validar configuracao do chatbot.

O endpoint recebe uma mensagem do usuario e um historico curto da sessao. O backend decide se a pergunta precisa de ferramenta interna, executa a ferramenta quando necessario e solicita ao LLM uma resposta em portugues com base nos dados retornados.

## Configuracao

As configuracoes iniciais serao variaveis de ambiente:

- `CHATBOT_ENABLED`: liga/desliga o recurso.
- `CHATBOT_PROVIDER`: `ollama` ou `openai_compatible`.
- `CHATBOT_MODEL`: modelo escolhido, por exemplo `llama3.1`, `mistral`, `gpt-4.1-mini` ou outro compativel.
- `CHATBOT_BASE_URL`: URL base do provedor.
- `CHATBOT_API_KEY`: chave para provedor externo; opcional para Ollama local.
- `CHATBOT_TIMEOUT_MS`: tempo maximo de chamada ao LLM.
- `CHATBOT_TEMPERATURE`: temperatura usada pelo modelo.

Defaults recomendados para desenvolvimento:

- `CHATBOT_ENABLED=true`
- `CHATBOT_PROVIDER=ollama`
- `CHATBOT_MODEL=llama3.1`
- `CHATBOT_BASE_URL=http://localhost:11434`
- `CHATBOT_TIMEOUT_MS=60000`
- `CHATBOT_TEMPERATURE=0.2`

## Provedores LLM

### Ollama

O adapter `ollama` chama `POST {CHATBOT_BASE_URL}/api/chat` com mensagens no formato suportado pelo Ollama. O retorno sera normalizado para o formato interno do chatbot.

### OpenAI Compatible

O adapter `openai_compatible` chama `POST {CHATBOT_BASE_URL}/chat/completions`, enviando bearer token quando `CHATBOT_API_KEY` estiver configurada. O retorno tambem sera normalizado para o formato interno.

Nenhum codigo de dominio do chatbot deve depender diretamente de payload especifico de fornecedor.

## Ferramentas Internas

### `estoque.atualizacoesProdutoPorPeriodo`

Ferramenta somente leitura para responder quais escolas atualizaram ou nao atualizaram o estoque de um produto em uma janela de tempo.

Entrada:

- `produtoNome`: texto informado pelo usuario, como `arroz branco`;
- `dias`: quantidade de dias, com limite maximo inicial de 30;
- `escolaId`: opcional, para restringir a uma escola quando aplicavel.

Processamento:

1. Resolver o produto por nome aproximado na tabela `produtos`.
2. Consultar escolas ativas em `escolas`.
3. Consultar eventos em `estoque_eventos` com `escopo = 'escola'`, produto resolvido e `data_evento >= now() - dias`.
4. Agrupar por escola.
5. Retornar escolas com atualizacao e escolas sem atualizacao no periodo.
6. Quando disponivel, incluir usuario, data, tipo de evento, quantidade movimentada e saldo atual.

Saida:

- produto resolvido;
- periodo consultado;
- total de escolas ativas;
- escolas atualizadas;
- escolas pendentes;
- observacoes de confianca, por exemplo quando mais de um produto parecido for encontrado.

## Permissoes e Seguranca

- O endpoint deve usar autentificacao existente.
- A primeira versao exige permissao de leitura sobre estoque ou perfil administrador.
- A ferramenta nao aceita SQL vindo do LLM.
- O LLM recebe apenas o catalogo de ferramentas permitidas e os dados retornados por elas.
- Chaves de API ficam somente no backend.
- Falhas do LLM nao devem interromper o restante do sistema.
- O backend deve limitar tamanho de mensagem, tamanho de historico e janela maxima de consulta.

## Fluxo de Dados

1. Usuario abre o painel pelo botao flutuante.
2. Usuario envia uma pergunta.
3. Frontend chama `POST /api/chatbot/message`.
4. Backend valida autenticacao, configuracao e payload.
5. Orquestrador identifica a intencao e seleciona ferramenta quando a pergunta pedir dados do sistema.
6. Ferramenta consulta o banco com SQL controlado.
7. Orquestrador envia ao LLM a pergunta, os dados estruturados e as instrucoes de resposta.
8. Backend retorna resposta final e metadados basicos da ferramenta usada.
9. Frontend exibe a resposta no painel.

## Tratamento de Erros

- Chatbot desligado: retornar HTTP 503 com mensagem amigavel.
- Provedor nao configurado: retornar HTTP 500 com mensagem operacional.
- Timeout do LLM: retornar resposta de erro recuperavel.
- Produto ambiguo: responder pedindo refinamento ou apresentar os candidatos mais provaveis.
- Sem dados no periodo: responder explicitando que nenhuma escola atualizou e listar pendentes.
- Sem permissao: retornar HTTP 403.

## Testes

Backend:

- validar carregamento de configuracao;
- validar selecao de provider;
- testar normalizacao de resposta dos adapters;
- testar ferramenta de estoque com mocks de banco;
- testar erro de produto nao encontrado;
- testar limite maximo de periodo;
- testar endpoint sem permissao.

Frontend:

- renderizar botao flutuante no shell autenticado;
- abrir e fechar painel;
- enviar mensagem;
- exibir loading;
- exibir erro;
- exibir resposta.

## Criterios de Aceite

- O usuario consegue abrir o chatbot por um botao flutuante global.
- O chatbot consegue usar Ollama local por configuracao.
- O chatbot consegue usar uma API externa compativel com OpenAI por configuracao.
- O LLM nao executa SQL livre.
- A pergunta sobre atualizacao de estoque de arroz branco nos ultimos 2 dias retorna escolas atualizadas e pendentes com base em `estoque_eventos`.
- O recurso pode ser desligado por configuracao sem afetar o sistema.
- Novas ferramentas podem ser adicionadas sem alterar os providers LLM.
