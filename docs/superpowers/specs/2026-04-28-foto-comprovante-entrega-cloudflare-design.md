# Foto de Comprovante de Entrega no Supabase Storage

Data: 2026-04-28
Atualizado: 2026-04-29

## Contexto

O app `entregador-native` permite selecionar itens de uma escola, informar quem entregou, informar quem recebeu e finalizar a entrega. O fluxo tambem cria comprovantes, suporta operacao offline por outbox e sincroniza as entregas pendentes quando a conexao volta.

A necessidade e registrar uma foto unica da mercadoria entregue como evidencia do comprovante, sem armazenar a imagem no banco de dados. O storage externo sera Supabase Storage no plano gratuito. A foto deve ser considerada expirada depois de 180 dias.

## Decisoes

- Cada comprovante tera no maximo uma foto da mercadoria.
- A imagem nao sera persistida em base64 nem em coluna binaria no banco.
- O banco salvara apenas metadados da foto, a chave/caminho do objeto no Supabase Storage e `expires_at`.
- O upload sera direto do app para Supabase Storage por URL/token assinado gerado pelo backend.
- O backend usara `SUPABASE_SERVICE_ROLE_KEY`; essa chave nunca sera exposta ao app.
- O banco registrara `expires_at` para a interface saber quando a foto deve ser considerada expirada.
- O fluxo offline guardara temporariamente o URI local da foto no aparelho ate a sincronizacao concluir.

## Fluxo

1. O entregador seleciona os itens da entrega.
2. O entregador informa o nome de quem recebeu e revisa a entrega.
3. Antes de finalizar, o app exige uma foto unica da mercadoria do comprovante.
4. O app confirma as entregas dos itens e obtem os `historico_id`.
5. O app cria o comprovante agrupando os itens.
6. Com o `comprovante_id`, o app pede ao backend uma URL/token assinado para upload da foto.
7. O app envia a foto diretamente ao Supabase Storage usando a URL/token assinado.
8. O app informa ao backend que o upload foi concluido.
9. O backend salva os metadados da foto vinculados ao comprovante.

No modo offline, os passos 4 a 9 ficam pendentes na outbox. O app guarda o URI local da foto junto do lote da entrega e executa o upload somente depois que o comprovante existir no servidor.

## Backend

O backend tera uma camada de storage para Supabase Storage. As credenciais ficam em variaveis de ambiente e nunca sao expostas ao app.

Endpoints:

- `POST /entregas/comprovantes/:id/foto/upload-url`
  - valida permissao de escrita em entregas;
  - verifica se o comprovante existe;
  - gera uma chave de objeto, por exemplo `entregas/comprovantes/{comprovanteId}/{uuid}.jpg`;
  - cria URL/token assinado de upload no Supabase Storage;
  - retorna `upload_url`, `upload_token`, `upload_path`, `storage_key`, headers obrigatorios e `expires_at`.
- `POST /entregas/comprovantes/:id/foto/confirmar`
  - valida permissao de escrita em entregas;
  - confirma que a chave pertence ao comprovante;
  - salva metadata da foto;
  - marca status como `uploaded`.
- `GET /entregas/comprovantes/:id/foto`
  - valida permissao de leitura;
  - retorna uma URL assinada de leitura se a foto existir e ainda nao estiver expirada.

O backend nao recebera o binario da foto no fluxo normal. Ele so emitira URLs/tokens assinados e registrara metadata.

## Banco de Dados

A tabela `comprovante_fotos` guarda:

- `id`
- `comprovante_id`
- `storage_key`
- `content_type`
- `size_bytes`
- `status`
- `uploaded_at`
- `expires_at`
- `created_at`
- `updated_at`

Regras:

- `comprovante_id` deve ser unico enquanto a foto estiver ativa, garantindo uma foto por comprovante.
- `storage_key` deve ser unico.
- `expires_at` sera `uploaded_at + interval '180 days'`.
- A exclusao fisica no Supabase deve ser feita por rotina de limpeza baseada em `expires_at`, quando necessario. O banco pode manter o registro historico como expirado.

## App Entregador

Na tela `EscolaDetalheScreen`, a etapa de revisao exige tirar foto. O app mostra preview simples e permite refazer antes de finalizar.

O pacote `expo-camera` e usado para capturar a foto. A imagem deve ser enviada como JPEG e limitada a 5 MB.

No fluxo online:

- captura foto;
- confirma itens;
- cria comprovante;
- solicita URL/token assinado;
- faz upload para Supabase Storage;
- confirma metadata no backend.

No fluxo offline:

- captura foto;
- salva URI local no registro da outbox;
- mostra comprovante pendente com status de foto pendente;
- na sincronizacao, depois que o comprovante for criado, faz upload e confirma metadata;
- limpa a referencia local depois de confirmacao bem-sucedida.

## Visualizacao

As telas de comprovantes mostram a foto anexada. Ao abrir detalhes, o app ou web solicita uma URL assinada de leitura e renderiza a imagem enquanto ela ainda estiver valida.

Quando a foto estiver expirada, a interface mostra estado claro de expiracao, mantendo os dados textuais do comprovante.

## Seguranca

- URLs assinadas de leitura devem expirar em poucos minutos.
- URLs assinadas de upload do Supabase sao temporarias e vinculadas ao caminho gerado.
- O app nao recebe credenciais do Supabase.
- O backend valida permissao antes de gerar qualquer URL.
- O backend valida tipo de arquivo e tamanho maximo antes de gerar URL/token de upload.
- A confirmacao de upload so aceita `storage_key` gerada para aquele comprovante.

## Configuracao

Variaveis de ambiente esperadas:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`
- `DELIVERY_PHOTO_RETENTION_DAYS=180`
- `DELIVERY_PHOTO_MAX_BYTES=5242880`

O bucket do Supabase deve existir antes do uso. Para manter a expiracao fisica, configurar uma rotina de limpeza que remova objetos em `entregas/comprovantes/` quando o registro correspondente em `comprovante_fotos.expires_at` estiver vencido.

## Erros e Retentativas

- Falha ao capturar foto: o app permite tentar novamente.
- Falha ao gerar URL/token assinado: a operacao fica pendente se o app estiver offline ou se houver erro temporario.
- Falha no upload para Supabase Storage: a outbox reenvia depois.
- Upload concluido, mas confirmacao de metadata falhou: a outbox reenvia a confirmacao usando a mesma `storage_key`, sem criar uma nova foto.
- Falha permanente de validacao, tamanho ou permissao: a outbox marca como acao necessaria.
- Comprovante criado sem foto por falha temporaria: o status do comprovante indica foto pendente ate sincronizar.

## Testes

Testes de backend:

- gerar chave de storage por comprovante;
- gerar metadata com expiracao de 180 dias;
- rejeitar content type invalido;
- rejeitar confirmacao de chave que nao pertence ao comprovante;
- gerar URL/token de upload no Supabase;
- retornar URL de leitura apenas para foto ativa.

Testes de app:

- bloquear finalizacao quando foto obrigatoria nao foi capturada;
- incluir URI local da foto na outbox offline;
- sincronizar na ordem correta: entrega, comprovante, upload da foto, confirmacao;
- manter comprovante pendente quando upload falhar;
- limpar URI local depois de upload confirmado.

## Fora de Escopo

- Armazenar multiplas fotos por comprovante.
- Salvar imagem em base64 no banco.
- Criar galeria publica de fotos.
- Implementar OCR, reconhecimento de imagem ou validacao automatica do conteudo fotografado.
