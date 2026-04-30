# Contratos e Fornecedores

## Visao Geral

🟢 O componente Contratos e Fornecedores gerencia fornecedores, contratos, itens de contrato e o saldo/consumo de produtos por modalidade.
🟢 Ele conecta cadastro de fornecedores e contratos com produtos, precos, vigencia, historico de consumo e disponibilidade financeira/quantitativa por modalidade.
🟢 O componente e insumo direto para custo de cardapio, compras, abastecimento e controles operacionais de saldo contratual.

## Responsabilidades

- 🟢 Listar, buscar, criar, editar e remover fornecedores.
- 🟢 Cachear listagem e detalhe de fornecedores.
- 🟢 Verificar relacionamentos de fornecedor antes da exclusao.
- 🟢 Bloquear exclusao de fornecedor quando ha contratos ativos vinculados.
- 🟢 Importar e exportar fornecedores em lote com validacao frontend.
- 🟢 Listar, buscar, criar, editar e remover contratos.
- 🟢 Expor estatisticas de contratos e busca de contratos por produto.
- 🟢 Bloquear remocao de contrato quando ainda existem contrato-produtos ativos.
- 🟢 Listar, buscar, criar, editar e remover itens de contrato (`contrato_produtos`).
- 🟢 Listar itens por contrato e por fornecedor.
- 🟢 Listar saldos de contrato por modalidade, modalidades disponiveis e produtos de contratos.
- 🟢 Cadastrar ou atualizar saldo inicial por modalidade.
- 🟢 Registrar consumo por modalidade e manter historico desse consumo.
- 🟢 Excluir consumo do historico e reverter quantidade consumida/disponivel.
- 🟢 Expor resumo de alunos por modalidade e resumo financeiro por categoria financeira.

## Interface

### Fornecedores

| Entrada/Saida | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `GET /api/fornecedores` | HTTP | Sim | Lista fornecedores para usuario autenticado. | 🟢 |
| `GET /api/fornecedores/:id` | HTTP | Sim | Busca detalhe do fornecedor. | 🟢 |
| `GET /api/fornecedores/:id/relacionamentos` | HTTP | Sim | Retorna contratos vinculados e se o fornecedor pode ser excluido. | 🟢 |
| `POST /api/fornecedores` | HTTP | Sim | Cria fornecedor com permissao de escrita em `fornecedores`. | 🟢 |
| `PUT /api/fornecedores/:id` | HTTP | Sim | Edita fornecedor com permissao de escrita em `fornecedores`. | 🟢 |
| `DELETE /api/fornecedores/:id` | HTTP | Sim | Remove fornecedor quando permitido. | 🟢 |

### Contratos

| Entrada/Saida | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `GET /api/contratos` | HTTP | Sim | Lista contratos. | 🟢 |
| `GET /api/contratos/:id` | HTTP | Sim | Busca contrato por id. | 🟢 |
| `GET /api/contratos/estatisticas` | HTTP | Sim | Retorna estatisticas agregadas de contratos. | 🟢 |
| `GET /api/contratos/buscar-por-produto` | HTTP | Sim | Busca contratos relacionados a um produto. | 🟢 |
| `POST /api/contratos` | HTTP | Sim | Cria contrato com permissao de escrita em `contratos`. | 🟢 |
| `PUT /api/contratos/:id` | HTTP | Sim | Edita contrato com permissao de escrita em `contratos`. | 🟢 |
| `DELETE /api/contratos/:id` | HTTP | Sim | Remove contrato quando nao ha produtos ativos vinculados. | 🟢 |

### Itens de contrato

| Entrada/Saida | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `GET /api/contrato-produtos` | HTTP | Sim | Lista todos os itens de contrato. | 🟢 |
| `GET /api/contrato-produtos/:id` | HTTP | Sim | Busca item de contrato por id. | 🟢 |
| `GET /api/contrato-produtos/contrato/:contrato_id` | HTTP | Sim | Lista produtos de um contrato especifico. | 🟢 |
| `GET /api/contrato-produtos/fornecedor/:fornecedor_id` | HTTP | Sim | Lista produtos por fornecedor. | 🟢 |
| `POST /api/contrato-produtos` | HTTP | Sim | Cria item de contrato autenticado. | 🟢 |
| `PUT /api/contrato-produtos/:id` | HTTP | Sim | Edita item de contrato autenticado. | 🟢 |
| `DELETE /api/contrato-produtos/:id` | HTTP | Sim | Remove item de contrato autenticado. | 🟢 |

### Saldo por modalidade

| Entrada/Saida | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `GET /api/saldo-contratos-modalidades` | HTTP | Sim | Lista saldos por modalidade. | 🟢 |
| `POST /api/saldo-contratos-modalidades` | HTTP | Sim | Cadastra ou atualiza saldo inicial por modalidade. | 🟢 |
| `POST /api/saldo-contratos-modalidades/:id/consumir` | HTTP | Sim | Registra consumo da modalidade. | 🟢 |
| `GET /api/saldo-contratos-modalidades/:id/historico` | HTTP | Sim | Busca historico de consumo. | 🟢 |
| `DELETE /api/saldo-contratos-modalidades/:id/consumo/:consumoId` | HTTP | Sim | Exclui um consumo e reverte saldo. | 🟢 |
| `GET /api/saldo-contratos-modalidades/modalidades` | HTTP | Sim | Lista modalidades disponiveis para saldo. | 🟢 |
| `GET /api/saldo-contratos-modalidades/produtos-contratos` | HTTP | Sim | Lista produtos de contratos disponiveis. | 🟢 |
| `GET /api/saldo-contratos-modalidades/resumo-alunos` | HTTP | Sim | Lista resumo de alunos por modalidade. | 🟢 |
| `GET /api/saldo-contratos-modalidades/resumo-alunos-financeiro` | HTTP | Sim | Lista resumo financeiro consolidado por categoria. | 🟢 |

### Importacao de fornecedores

| Campo | Obrigatorio | Regra | Confianca |
| --- | --- | --- | --- |
| `nome` | Sim | Minimo de 3 caracteres. | 🟢 |
| `cnpj` | Sim | Documento obrigatorio e validado como CPF/CNPJ. | 🟢 |
| `email` | Nao | Se informado, gera aviso quando formato parece incorreto. | 🟢 |
| `cep` | Nao | Se informado, gera aviso quando nao possui 8 digitos. | 🟢 |
| `ativo` | Nao | Aceita `true`, `1` ou boolean. | 🟢 |

## Regras de Negocio

- 🟢 Todas as rotas de contratos e fornecedores exigem `authenticateToken`.
- 🟢 Escrita de fornecedores exige `requireEscrita('fornecedores')`.
- 🟢 Escrita de contratos exige `requireEscrita('contratos')`.
- 🟢 Rotas de leitura de fornecedores e contratos aceitam qualquer usuario autenticado.
- 🟢 Listagem de fornecedores tenta usar cache `fornecedores:list:all`.
- 🟢 Detalhe de fornecedor tenta usar cache por id `fornecedores:{id}`.
- 🟢 Criacao de fornecedor invalida cache de fornecedores.
- 🟢 Edicao e remocao de fornecedor invalidam cache da entidade e do id.
- 🟢 Exclusao de fornecedor depende da verificacao previa de relacionamentos e contratos ativos.
- 🟢 Resposta de relacionamentos informa `podeExcluir`, `totalContratos`, `contratosAtivos` e contratos relacionados.
- 🟢 Importacao frontend de fornecedores aceita apenas linhas sem erro de validacao.
- 🟢 Importacao considera fornecedores iguais pelo documento (`CNPJ`/`CPF`) e evita duplicidade.
- 🟢 Exportacao de fornecedores monta XLSX localmente com os dados filtrados.
- 🟢 Remocao de contrato conta `contrato_produtos` ativos antes de excluir.
- 🟢 Contrato com produtos ativos nao pode ser removido.
- 🟢 Se nao houver produtos ativos, o contrato e removido por `DELETE ... RETURNING *`.
- 🟢 Se o contrato nao existe, a remocao retorna HTTP 404.
- 🟢 Registro de consumo por modalidade exige `quantidade > 0`.
- 🟢 Registro de consumo falha quando o saldo nao existe.
- 🟢 Registro de consumo falha quando `quantidade_disponivel` e insuficiente.
- 🟢 Registro de consumo incrementa `quantidade_consumida` e recalcula disponibilidade.
- 🟢 Registro de consumo cria tabela de historico se ainda nao existir.
- 🟢 Cada consumo registrado gera entrada em `contrato_produtos_modalidades_historico`.
- 🟢 Exclusao de consumo remove a entrada do historico e reverte `quantidade_consumida`/`quantidade_disponivel`.
- 🟢 Resumo financeiro por alunos consolida por categoria financeira.
- 🟡 A UI de `ItensFornecedor` navega para `GET /fornecedores/:id/itens`, mas essa rota nao aparece em `fornecedorRoutes.ts`.

## Fluxo Principal

### Fornecedores

1. 🟢 Usuario abre `/fornecedores`.
2. 🟢 Frontend chama `GET /api/fornecedores`.
3. 🟢 Backend autentica o token.
4. 🟢 Backend tenta responder a partir do cache de listagem.
5. 🟢 Em cache miss, backend consulta fornecedores ordenados por nome.
6. 🟢 Backend salva a resposta em cache.
7. 🟢 Frontend filtra localmente por status, tipo e busca.
8. 🟢 Usuario cria ou edita fornecedor.
9. 🟢 Backend exige escrita em `fornecedores`, persiste e invalida cache.

### Exclusao de fornecedor

1. 🟢 Usuario clica para excluir fornecedor.
2. 🟢 Frontend abre `ConfirmacaoExclusaoFornecedor`.
3. 🟢 Frontend chama `GET /api/fornecedores/:id/relacionamentos`.
4. 🟢 Backend conta contratos ativos e total de contratos vinculados.
5. 🟢 Backend retorna contratos relacionados e `podeExcluir`.
6. 🟢 Se `contratosAtivos > 0`, a UI bloqueia confirmacao.
7. 🟢 Se `contratosAtivos == 0`, a UI permite `DELETE /api/fornecedores/:id`.
8. 🟢 Backend remove o fornecedor e invalida cache.

### Contratos

1. 🟢 Usuario acessa contratos.
2. 🟢 Frontend carrega contratos e fornecedores.
3. 🟢 Backend autentica e lista contratos.
4. 🟢 Usuario cria ou edita contrato com fornecedor, vigencia e valores.
5. 🟢 Backend exige escrita em `contratos` e persiste.
6. 🟢 Usuario tenta remover contrato.
7. 🟢 Backend conta itens ativos do contrato.
8. 🟢 Se houver itens ativos, bloqueia exclusao com erro.
9. 🟢 Se nao houver itens ativos, remove contrato e retorna sucesso.

### Itens de contrato

1. 🟢 Usuario abre o detalhe de um contrato.
2. 🟢 Frontend carrega produtos, fornecedores e `listarContratoProdutos(id)`.
3. 🟢 Usuario adiciona, edita ou remove item do contrato.
4. 🟢 Backend autentica as operacoes de escrita.
5. 🟢 Item de contrato persiste relacao entre contrato, produto, preco, unidade e demais metadados de compra.

### Saldo por modalidade

1. 🟢 Usuario acessa a tela de saldo por modalidades.
2. 🟢 Frontend chama `listarSaldosModalidades`, `listarModalidades` e resumos auxiliares.
3. 🟢 Backend agrega quantidades iniciais, consumidas e disponiveis por contrato-produto/modalidade.
4. 🟢 Usuario cadastra ou ajusta saldo inicial por modalidade.
5. 🟢 Usuario registra consumo informando quantidade positiva.
6. 🟢 Backend valida existencia do saldo e disponibilidade suficiente.
7. 🟢 Backend atualiza `quantidade_consumida`.
8. 🟢 Backend cria historico se necessario e insere a movimentacao.
9. 🟢 Frontend pode consultar historico e excluir uma movimentacao para reverter o saldo.

## Fluxos Alternativos

- 🟢 **Fornecedor em cache:** listagem ou detalhe retorna cache sem nova consulta ao banco.
- 🟢 **Fornecedor com contratos ativos:** exclusao fica bloqueada e a UI exibe contratos vinculados.
- 🟢 **Fornecedor sem contratos ativos:** exclusao e permitida.
- 🟢 **Contrato com produtos ativos:** remocao retorna HTTP 400 orientando desativar/excluir produtos antes.
- 🟢 **Contrato inexistente na remocao:** backend retorna HTTP 404.
- 🟢 **Consumo com quantidade menor ou igual a zero:** backend retorna HTTP 400.
- 🟢 **Consumo sem saldo cadastrado:** backend retorna HTTP 404.
- 🟢 **Consumo acima da disponibilidade:** backend retorna HTTP 400 por quantidade insuficiente.
- 🟢 **Importacao sem linhas validas:** frontend bloqueia a importacao.
- 🟡 **Itens do fornecedor:** a tela tenta acessar rota nao evidenciada no router, indicando lacuna funcional ou rota fora do modulo esperado.

## Cenarios de Borda

- 🟢 **Historico de consumo em base nova:** o primeiro registro de consumo deve criar a tabela de historico antes da insercao.
- 🟢 **Exclusao de consumo antigo:** a reversao precisa subtrair exatamente a quantidade historica para nao corromper saldo acumulado.
- 🟢 **Fornecedor com muitos contratos:** a UI mostra apenas parte da lista e informa quantos contratos adicionais existem.
- 🟢 **Contrato sem itens:** exclusao pode prosseguir desde que nao haja produtos ativos vinculados.
- 🟡 **Leitura publica de contrato-produto:** como o router nao mostra `authenticateToken` para GETs, validar se esse acesso aberto e intencional.
- 🟡 **Importacao inteligente de fornecedores:** o frontend diz que a deduplicacao e por CNPJ, mas a logica exata do merge no backend precisa ser validada no fluxo real de importacao.

## Dependencias

- 🟢 `middleware/authMiddleware` - autentica rotas de contratos, fornecedores e escritas de saldo/itens.
- 🟢 `middleware/permissionMiddleware` - controla escrita em `contratos` e `fornecedores`.
- 🟢 `utils/cacheService` - cacheia fornecedores.
- 🟢 `backend/src/modules/contratos/controllers/contratoController.ts` - CRUD de contratos, estatisticas e busca por produto.
- 🟢 `backend/src/modules/contratos/controllers/contratoProdutoController.ts` - CRUD de itens de contrato.
- 🟢 `backend/src/modules/contratos/controllers/fornecedorController.ts` - CRUD de fornecedores e verificacao de relacionamentos.
- 🟢 `backend/src/modules/contratos/controllers/saldoContratosModalidadesController.ts` - saldo, consumo e historico por modalidade.
- 🟢 `frontend/src/modules/contratos/pages/Contratos.tsx` - lista de contratos.
- 🟢 `frontend/src/modules/contratos/pages/ContratoDetalhe.tsx` - detalhe de contrato e itens.
- 🟢 `frontend/src/modules/contratos/pages/NovoContrato.tsx` - criacao de contrato.
- 🟢 `frontend/src/modules/contratos/pages/SaldoContratosModalidades.tsx` - tela de saldo e historico.
- 🟢 `frontend/src/modules/fornecedores/pages/Fornecedores.tsx` - lista e formulario de fornecedores.
- 🟢 `frontend/src/modules/fornecedores/pages/FornecedorDetalhe.tsx` - detalhe de fornecedor com contratos filtrados no cliente.
- 🟢 `frontend/src/modules/fornecedores/pages/ItensFornecedor.tsx` - tela de itens do fornecedor com possivel lacuna de rota.
- 🟢 `frontend/src/components/ImportacaoFornecedores.tsx` - importacao em lote de fornecedores.
- 🟢 `frontend/src/components/ConfirmacaoExclusaoFornecedor.tsx` - bloqueio/confirmacao de exclusao.

## Requisitos Nao Funcionais

| Tipo | Requisito inferido | Evidencia no codigo | Confianca |
| --- | --- | --- | --- |
| Seguranca | Rotas de contratos exigem `authenticateToken` no router inteiro. | `backend/src/modules/contratos/routes/contratoRoutes.ts:17` | 🟢 |
| Seguranca | Escrita de contratos exige `requireEscrita('contratos')`. | `backend/src/modules/contratos/routes/contratoRoutes.ts:26` | 🟢 |
| Seguranca | Rotas de fornecedores exigem `authenticateToken` no router inteiro. | `backend/src/modules/contratos/routes/fornecedorRoutes.ts:16` | 🟢 |
| Seguranca | Escrita de fornecedores exige `requireEscrita('fornecedores')`. | `backend/src/modules/contratos/routes/fornecedorRoutes.ts:24` | 🟢 |
| Performance | Listagem de fornecedores usa cache `fornecedores:list:all`. | `backend/src/modules/contratos/controllers/fornecedorController.ts:8` | 🟢 |
| Performance | Detalhe de fornecedor usa cache por id. | `backend/src/modules/contratos/controllers/fornecedorController.ts:45` | 🟢 |
| Integridade | Remocao de contrato bloqueia quando ha contrato-produtos ativos. | `backend/src/modules/contratos/controllers/contratoController.ts:139` | 🟢 |
| Integridade | Registro de consumo cria tabela de historico se necessario. | `backend/src/modules/contratos/controllers/saldoContratosModalidadesController.ts:523` | 🟢 |
| Integridade | Registro de consumo exige disponibilidade suficiente antes de atualizar. | `backend/src/modules/contratos/controllers/saldoContratosModalidadesController.ts:501` | 🟢 |
| Integridade | Importacao frontend valida documento, email e CEP antes de importar. | `frontend/src/components/ImportacaoFornecedores.tsx:238` | 🟢 |

> 🟢 Inferido a partir do codigo e dos fluxos Reversa de contratos e fornecedores.

## Criterios de Aceitacao

```gherkin
Cenario: Criar fornecedor com permissao
Dado um usuario autenticado com escrita em fornecedores
Quando ele envia nome e documento validos
Entao o fornecedor deve ser persistido e o cache de fornecedores invalidado

Cenario: Bloquear exclusao de fornecedor com contratos ativos
Dado um fornecedor com contratos ativos vinculados
Quando o usuario consulta os relacionamentos e tenta excluir
Entao a UI deve bloquear a confirmacao e o backend nao deve remover o fornecedor

Cenario: Excluir fornecedor sem contratos ativos
Dado um fornecedor sem contratos ativos vinculados
Quando o usuario confirma a exclusao
Entao o backend deve remover o fornecedor e invalidar o cache

Cenario: Criar contrato
Dado um usuario autenticado com escrita em contratos
Quando ele envia os dados validos do contrato
Entao o contrato deve ser criado e ficar disponivel para associacao de produtos

Cenario: Bloquear remocao de contrato com itens ativos
Dado um contrato com contrato-produtos ativos
Quando o usuario solicita remocao
Entao o backend deve retornar erro orientando desativar ou excluir os produtos antes

Cenario: Registrar consumo por modalidade
Dado um saldo de contrato-produto-modalidade existente com disponibilidade suficiente
Quando o usuario registra uma quantidade positiva
Entao o backend deve atualizar quantidade_consumida, recalcular disponibilidade e inserir historico

Cenario: Bloquear consumo acima do saldo
Dado um saldo existente com disponibilidade menor que a quantidade solicitada
Quando o usuario tenta consumir
Entao o backend deve retornar erro de quantidade insuficiente

Cenario: Excluir consumo do historico
Dado um consumo historico registrado
Quando o usuario exclui essa movimentacao
Entao o backend deve remover o historico e reverter quantidade consumida e disponivel

Cenario: Importar fornecedores validos
Dado um arquivo com linhas validas e avisos sem erros fatais
Quando o usuario confirma a importacao
Entao apenas as linhas sem erro devem seguir para a rotina de importacao

Cenario: Bloquear fornecedor importado com documento invalido
Dado uma linha de importacao com CPF/CNPJ invalido
Quando o frontend valida o arquivo
Entao a linha deve receber status erro e nao deve ser importada
```

## Prioridade

| Requisito | MoSCoW | Justificativa | Confianca |
| --- | --- | --- | --- |
| Cadastro de fornecedores | Must | Fornecedor e contraparte obrigatoria para contratos e compras. | 🟢 |
| Contratos | Must | Base de preco, vigencia e saldo para custo e abastecimento. | 🟢 |
| Itens de contrato | Must | Vinculam produto, preco e condicoes operacionais do contrato. | 🟢 |
| Saldo por modalidade | Should | Controle operacional importante para distribuicao e financeiro por modalidade. | 🟢 |
| Historico de consumo | Should | Necessario para auditoria e reversao de consumo. | 🟢 |
| Verificacao de exclusao de fornecedor | Should | Reduz remocoes incoerentes e melhora a UX administrativa. | 🟢 |
| Importacao/exportacao de fornecedores | Could | Acelera carga operacional, mas CRUD manual cobre o basico. | 🟢 |
| Itens do fornecedor na UI | Could | Fluxo auxiliar e atualmente com lacuna de rota aparente. | 🟡 |

> 🟢 Prioridade inferida por impacto em preco, custo, compras, abastecimento e integridade relacional.

## Rastreabilidade de Codigo

| Arquivo | Funcao / Classe | Cobertura |
| --- | --- | --- |
| `backend/src/modules/contratos/routes/contratoRoutes.ts` | Rotas e permissoes de contratos | 🟢 |
| `backend/src/modules/contratos/controllers/contratoController.ts` | CRUD de contratos, estatisticas e busca por produto | 🟢 |
| `backend/src/modules/contratos/routes/contratoProdutoRoutes.ts` | Rotas de itens de contrato | 🟢 |
| `backend/src/modules/contratos/controllers/contratoProdutoController.ts` | CRUD de contrato-produtos | 🟢 |
| `backend/src/modules/contratos/routes/fornecedorRoutes.ts` | Rotas e permissoes de fornecedores | 🟢 |
| `backend/src/modules/contratos/controllers/fornecedorController.ts` | CRUD de fornecedores e relacionamentos | 🟢 |
| `backend/src/modules/contratos/routes/saldoContratosModalidadesRoutes.ts` | Rotas de saldo, consumo e resumos | 🟢 |
| `backend/src/modules/contratos/controllers/saldoContratosModalidadesController.ts` | Saldos, historico, consumo e resumos | 🟢 |
| `frontend/src/modules/contratos/pages/Contratos.tsx` | Lista de contratos | 🟢 |
| `frontend/src/modules/contratos/pages/ContratoDetalhe.tsx` | Detalhe e itens do contrato | 🟢 |
| `frontend/src/modules/contratos/pages/NovoContrato.tsx` | Criacao de contrato | 🟢 |
| `frontend/src/modules/contratos/pages/SaldoContratosModalidades.tsx` | Tela de saldo e historico | 🟢 |
| `frontend/src/modules/fornecedores/pages/Fornecedores.tsx` | Lista e formulario de fornecedores | 🟢 |
| `frontend/src/modules/fornecedores/pages/FornecedorDetalhe.tsx` | Detalhe de fornecedor | 🟢 |
| `frontend/src/modules/fornecedores/pages/ItensFornecedor.tsx` | Itens de fornecedor com lacuna de rota | 🟡 |
| `frontend/src/components/ImportacaoFornecedores.tsx` | Importacao em lote de fornecedores | 🟢 |
| `frontend/src/components/ConfirmacaoExclusaoFornecedor.tsx` | Confirmacao de exclusao baseada em relacionamentos | 🟢 |
| `_reversa_sdd/flowcharts/contratos.md` | Fluxo macro de contratos | 🟢 |
| `_reversa_sdd/flowcharts/contratos-removerContrato.md` | Fluxo de remocao de contrato | 🟢 |
| `_reversa_sdd/flowcharts/contratos-registrarConsumoModalidade.md` | Fluxo de consumo por modalidade | 🟢 |
| `_reversa_sdd/flowcharts/fornecedores.md` | Fluxo macro de fornecedores | 🟢 |
| `_reversa_sdd/flowcharts/fornecedores-exclusao.md` | Fluxo de exclusao de fornecedor | 🟢 |
| `_reversa_sdd/flowcharts/fornecedores-importacao-itens.md` | Fluxo de importacao e lacuna de itens | 🟢 |

## Notas de Hardening

- [Implementacao 2026-04-30] `contratoProdutoRoutes.ts` passou a exigir `authenticateToken` e permissao `contratos` para leitura/escrita de itens de contrato.
- [Implementacao 2026-04-30] `saldoContratosModalidadesRoutes.ts` passou a exigir `authenticateToken` e permissao `saldo_contratos` para leitura/escrita de saldos e historicos.
