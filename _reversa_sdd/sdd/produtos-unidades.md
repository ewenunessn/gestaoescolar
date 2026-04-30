# Produtos e Unidades

## Visao Geral

🟢 O componente Produtos e Unidades administra o catalogo de produtos alimentares, suas unidades de medida, composicao nutricional, fatores de correcao/coccao e importacao em lote.
🟢 Ele fornece a base de produtos usada por cardapios, contratos, guias, compras, estoque, entregas e solicitacoes.
🟢 Unidades de medida sao usadas transversalmente para converter quantidades entre distribuicao, compra, embalagem, estoque e snapshots historicos.

## Responsabilidades

- 🟢 Listar produtos autenticados com unidade de medida, indicador de composicao nutricional e indicador de contrato.
- 🟢 Buscar produto por id para tela de detalhe.
- 🟢 Criar, editar e remover produtos com permissao de escrita no modulo `produtos`.
- 🟢 Validar nome, tipo de processamento, fator de correcao e indice de coccao antes de persistir produto.
- 🟢 Invalidar cache de produtos apos criacao, edicao ou remocao.
- 🟢 Buscar composicao nutricional do produto com suporte a schema novo, schema antigo ou tabela ausente.
- 🟢 Criar registro vazio de composicao nutricional quando o produto ainda nao possui composicao.
- 🟢 Salvar composicao nutricional normalizando numeros vazios para `null`.
- 🟢 Padronizar composicao nutricional criando/adaptando colunas canonicas.
- 🟢 Importar produtos por CSV/XLS/XLSX com validacao frontend.
- 🟢 Atualizar produto existente ou criar novo produto na importacao com base no nome.
- 🟢 Listar unidades de medida ativas, com filtro opcional por tipo.
- 🟢 Buscar unidade especifica por identificador.
- 🟢 Converter quantidades entre unidades compativeis de massa, volume ou unidade.
- 🟢 Calcular fator de conversao entre unidade de origem e destino.
- 🟢 Apoiar componentes frontend de selecao de unidades agrupadas por massa, volume e unidade.

## Interface

### Produtos

| Entrada/Saida | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `GET /api/produtos` | HTTP | Sim | Lista produtos para usuario autenticado. | 🟢 |
| `GET /api/produtos/:id` | HTTP | Sim | Busca produto por id. | 🟢 |
| `POST /api/produtos` | HTTP | Sim | Cria produto com permissao de escrita em `produtos`. | 🟢 |
| `PUT /api/produtos/:id` | HTTP | Sim | Edita produto com permissao de escrita em `produtos`. | 🟢 |
| `DELETE /api/produtos/:id` | HTTP | Sim | Remove produto com permissao de escrita em `produtos`. | 🟢 |
| `GET /api/produtos/:id/composicao-nutricional` | HTTP | Sim | Retorna ou cria composicao nutricional vazia para o produto. | 🟢 |
| `PUT /api/produtos/:id/composicao-nutricional` | HTTP | Sim | Atualiza ou insere composicao nutricional. | 🟢 |
| `POST /api/produtos/standardize-composicao` | HTTP | Sim | Padroniza tabela/colunas de composicao nutricional. | 🟢 |

### Unidades de medida

| Entrada/Saida | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `GET /api/unidades-medida` | HTTP | Sim | Lista unidades ativas, opcionalmente filtradas por `tipo`. | 🟢 |
| `GET /api/unidades-medida/:identificador` | HTTP | Sim | Busca unidade especifica por identificador. | 🟢 |
| `POST /api/unidades-medida/converter` | HTTP | Sim | Converte `quantidade` entre unidade de origem e destino. | 🟢 |
| `POST /api/unidades-medida/calcular-fator` | HTTP | Sim | Calcula fator de conversao entre origem e destino. | 🟢 |
| `tipo` | query/body | Nao | Filtra unidades por `massa`, `volume` ou `unidade`. | 🟢 |
| `pesoEmbalagem` | body | Condicional | Necessario para converter unidade de embalagem sem fator fixo. | 🟢 |
| `pesoProduto` | body | Condicional | Usado no calculo de fator quando existe peso do produto. | 🟢 |

### Importacao de produtos

| Campo | Obrigatorio | Regra | Confianca |
| --- | --- | --- | --- |
| `nome` | Sim | Minimo de 2 caracteres no frontend. | 🟢 |
| `unidade` | Sim | Padrao frontend `UN` quando ausente na linha. | 🟢 |
| `descricao` | Nao | Texto livre. | 🟢 |
| `categoria` | Nao | Texto livre/categoria. | 🟢 |
| `tipo_processamento` | Nao | Deve ser uma das categorias NOVA normalizadas. | 🟢 |
| `peso` | Nao | Se informado, deve ser numero maior que zero. | 🟢 |
| `fator_correcao` | Nao | Se informado, deve ser numero maior que zero. | 🟢 |
| `perecivel` | Nao | Booleano aceito como `true`, `1` ou boolean. | 🟢 |
| `ativo` | Nao | Booleano aceito como `true`, `1` ou boolean. | 🟢 |

### Estruturas principais

```ts
type ProdutoForm = {
  nome: string;
  unidade_medida_id?: number;
  tipo_processamento?: string;
  peso?: number;
  fator_correcao?: number;
  tipo_fator_correcao?: string;
  indice_coccao?: number;
  perecivel?: boolean;
  ativo: boolean;
};

type UnidadeMedida = {
  id: number;
  codigo: string;
  nome: string;
  tipo: "massa" | "volume" | "unidade";
  fator_conversao_base?: number | null;
  ativo: boolean;
};
```

🟢 O frontend de produto usa `fator_correcao` padrao `1.0`, `tipo_fator_correcao` padrao `perda`, `indice_coccao` padrao `1.0` e `ativo` padrao `true`.
🟢 O seletor de unidades exibe unidades como `nome (codigo)` e agrupa por `Massa`, `Volume` e `Unidade`.
🟡 O schema de composicao nutricional pode existir em formato novo ou antigo, por isso o controller detecta schema em tempo de execucao.

## Regras de Negocio

- 🟢 Todas as rotas de produtos exigem `authenticateToken`.
- 🟢 Leitura de produtos exige apenas usuario autenticado no router de produtos.
- 🟢 Criacao, edicao, exclusao, salvamento de composicao e padronizacao de composicao exigem `requireEscrita('produtos')`.
- 🟢 Listagem de produtos consulta produtos com dados de `unidades_medida`.
- 🟢 Listagem calcula indicador `tem_composicao_nutricional`.
- 🟢 Listagem calcula indicador `tem_contrato`.
- 🟢 Frontend filtra produtos por status, categoria e busca textual na tabela.
- 🟢 Produto ativo aparece no sistema como produto disponivel.
- 🟢 `fator_correcao` nao pode ser negativo no formulario principal.
- 🟢 Na importacao, `fator_correcao` informado deve ser maior que zero.
- 🟢 Na importacao, `peso` informado deve ser maior que zero.
- 🟢 Tipo de processamento importado e normalizado para lowercase.
- 🟢 Tipo de processamento importado deve ser `in natura`, `minimamente processado`, `ingrediente culinario`, `processado` ou `ultraprocessado`.
- 🟢 Importacao aceita apenas produtos sem erro de validacao.
- 🟢 Importacao inteligente identifica produto existente por nome para atualizar em vez de duplicar.
- 🟢 Busca de composicao nutricional garante existencia da tabela `produto_composicao_nutricional`.
- 🟢 Busca de composicao nutricional detecta se o schema e novo, antigo ou nenhum.
- 🟢 Busca de composicao nutricional retorna aliases canonicos para o frontend.
- 🟢 Se composicao nao existe para o produto, o backend cria registro vazio e retorna esse registro.
- 🟢 Salvamento de composicao nutricional normaliza campos numericos vazios para `null`.
- 🟢 Salvamento de composicao nutricional atualiza registro existente quando ha composicao do produto.
- 🟢 Salvamento de composicao nutricional insere registro quando nao existe composicao do produto.
- 🟢 Listagem de unidades retorna apenas unidades ativas.
- 🟢 Listagem de unidades pode filtrar por tipo.
- 🟢 Listagem de unidades ordena por `tipo` e `codigo`.
- 🟢 Listagem e busca de unidades usam cache estatico.
- 🟢 Conversao entre unidades iguais retorna a quantidade original.
- 🟢 Conversao exige unidade de origem e destino existentes.
- 🟢 Conversao entre tipos diferentes e bloqueada.
- 🟢 Conversao com ambas as unidades possuindo fator base usa `quantidade * fator_origem / fator_destino`.
- 🟢 Conversao envolvendo embalagem exige `pesoEmbalagem`.
- 🟢 Conversao de origem embalagem para destino com fator fixo usa `quantidade * pesoEmbalagem / fator_destino`.
- 🟢 Conversao de origem com fator fixo para destino embalagem usa `quantidade * fator_origem / pesoEmbalagem`.
- 🟢 Conversao entre duas embalagens sem contexto suficiente e bloqueada.
- 🟢 Fator de conversao entre unidades iguais retorna `1`.
- 🟢 Fator de conversao com `pesoEmbalagem` e `pesoProduto` positivos pode retornar `pesoEmbalagem / pesoProduto`.
- 🟡 Rotas de unidades de medida nao aplicam `authenticateToken` no router apresentado.

## Fluxo Principal

### Cadastro de produto

1. 🟢 Usuario acessa `/produtos`.
2. 🟢 Frontend aciona rota lazy protegida por `moduloSlug=produtos`.
3. 🟢 Tela `Produtos.tsx` carrega `GET /api/produtos`.
4. 🟢 Backend autentica o token.
5. 🟢 Backend lista produtos com unidade de medida associada.
6. 🟢 Backend calcula indicadores de composicao nutricional e contrato.
7. 🟢 Frontend aplica filtros de status, categoria e busca.
8. 🟢 Usuario cria, edita ou remove produto.
9. 🟢 Backend exige escrita em `produtos`.
10. 🟢 Backend valida campos operacionais e persiste em `produtos`.
11. 🟢 Backend invalida cache de produtos.

### Composicao nutricional

1. 🟢 Usuario abre detalhe de produto.
2. 🟢 Frontend solicita `GET /api/produtos/:id/composicao-nutricional`.
3. 🟢 Backend garante a tabela de composicao.
4. 🟢 Backend detecta schema novo, antigo ou ausente.
5. 🟢 Backend seleciona campos canonicos ou aliases compativeis.
6. 🟢 Se nao houver composicao, backend cria registro vazio para o produto.
7. 🟢 Usuario edita campos manualmente ou carrega dados TACO.
8. 🟢 Frontend envia `PUT /api/produtos/:id/composicao-nutricional`.
9. 🟢 Backend exige escrita em `produtos`.
10. 🟢 Backend normaliza numeros vazios para `null`.
11. 🟢 Backend atualiza ou insere composicao e retorna aliases canonicos.

### Importacao de produtos

1. 🟢 Usuario abre importacao em lote.
2. 🟢 Frontend permite baixar modelo CSV ou Excel.
3. 🟢 Usuario envia arquivo CSV, XLS ou XLSX.
4. 🟢 Frontend parseia a primeira planilha ou CSV.
5. 🟢 Frontend normaliza e valida cada linha.
6. 🟢 Produtos com erro ficam bloqueados para importacao.
7. 🟢 Produtos validos sao enviados para a rotina de importacao.
8. 🟢 Para cada linha, o sistema identifica se o nome ja existe na lista local.
9. 🟢 Se existir, chama atualizacao do produto.
10. 🟢 Se nao existir, chama criacao do produto.
11. 🟢 Ao final, frontend refaz consulta dos produtos.

### Unidades de medida

1. 🟢 Componente `UnidadeMedidaSelect` solicita unidades com tipo opcional.
2. 🟢 Backend tenta retornar cache `unidades_medida:list:all`.
3. 🟢 Se nao houver cache, backend consulta `unidades_medida` com `ativo = true`.
4. 🟢 Backend ordena por tipo e codigo.
5. 🟢 Frontend agrupa unidades por massa, volume e unidade.
6. 🟢 Usuario seleciona a unidade exibida como `nome (codigo)`.

### Conversao de unidades

1. 🟢 Cliente envia `quantidade`, `unidadeOrigemId`, `unidadeDestinoId` e opcionalmente `pesoEmbalagem`.
2. 🟢 Controller valida campos obrigatorios.
3. 🟢 Service busca as duas unidades.
4. 🟢 Service bloqueia unidades inexistentes.
5. 🟢 Service bloqueia tipos diferentes.
6. 🟢 Se as unidades sao iguais, retorna quantidade original.
7. 🟢 Se ambas possuem fator base, converte via base comum.
8. 🟢 Se envolver embalagem, exige peso da embalagem.
9. 🟢 Se contexto de embalagem for insuficiente, retorna erro.

## Fluxos Alternativos

- 🟢 **Produto sem composicao:** busca de composicao cria registro vazio e retorna estrutura para edicao.
- 🟢 **Schema antigo de composicao:** controller seleciona campos antigos e retorna aliases canonicos.
- 🟢 **Produto importado com erro:** linha permanece no passo de validacao e nao segue para importacao.
- 🟢 **Produto importado com nome existente:** importacao atualiza o produto ao inves de criar duplicado.
- 🟢 **Unidades em cache:** listagem ou busca retorna resposta cacheada.
- 🟢 **Unidades de tipos diferentes:** conversao falha com erro de impossibilidade entre tipos.
- 🟢 **Conversao sem peso de embalagem:** quando embalagem exige contexto, conversao falha com mensagem de peso necessario.
- 🟢 **Mesma unidade na conversao:** resultado e a quantidade original sem busca adicional de formula.

## Cenarios de Borda

- 🟢 **Composicao nutricional com schema divergente:** backend deve detectar schema novo/antigo e manter retorno compativel com o frontend.
- 🟢 **Importacao com booleanos heterogeneos:** `ativo` e `perecivel` aceitam boolean, `1` ou string `true`.
- 🟢 **Unidade de embalagem sem fator fixo:** conversao so pode ocorrer quando `pesoEmbalagem` fornece contexto.
- 🟢 **Conversao embalagem para embalagem:** sem informacoes adicionais, service bloqueia por contexto insuficiente.
- 🟢 **Produto sem contrato:** listagem ainda retorna produto, mas indicador `tem_contrato` sinaliza ausencia.
- 🟡 **Rotas publicas de unidades:** como o router nao exige token, validar se conversao/listagem aberta e intencional.

## Dependencias

- 🟢 `middleware/authMiddleware` - autentica rotas de produtos.
- 🟢 `middleware/permissionMiddleware` - exige escrita em `produtos`.
- 🟢 `utils/cacheService` - cacheia e invalida produtos/unidades.
- 🟢 `backend/src/modules/produtos/controllers/produtoController.ts` - implementa produtos e composicao nutricional.
- 🟢 `backend/src/modules/produtos/routes/produtoRoutes.ts` - define endpoints e permissoes de produtos.
- 🟢 `backend/src/modules/unidades/controllers/unidadeMedidaController.ts` - implementa listagem, busca, conversao e fator de unidades.
- 🟢 `backend/src/modules/unidades/routes/unidadeMedidaRoutes.ts` - define endpoints de unidades.
- 🟢 `backend/src/services/unidadesMedidaService.ts` - implementa regras de conversao e catalogo de unidades.
- 🟢 `frontend/src/modules/produtos/pages/Produtos.tsx` - lista, filtro e formulario de produtos.
- 🟢 `frontend/src/modules/produtos/pages/ProdutoDetalhe.tsx` - detalhe, composicao nutricional e TACO.
- 🟢 `frontend/src/components/ImportacaoProdutos.tsx` - importacao CSV/Excel e validacao frontend.
- 🟢 `frontend/src/components/UnidadeMedidaSelect.tsx` - autocomplete de unidades.
- 🟢 `frontend/src/services/produtos.ts` e `frontend/src/services/produtoService.ts` - chamadas frontend de produtos.
- 🟢 `frontend/src/services/unidadesMedida.ts` - chamadas frontend de unidades.

## Requisitos Nao Funcionais

| Tipo | Requisito inferido | Evidencia no codigo | Confianca |
| --- | --- | --- | --- |
| Seguranca | Todas as rotas de produtos exigem autenticacao. | `backend/src/modules/produtos/routes/produtoRoutes.ts:18` | 🟢 |
| Seguranca | Escrita de produtos e composicao exige `requireEscrita('produtos')`. | `backend/src/modules/produtos/routes/produtoRoutes.ts:26` | 🟢 |
| Performance | Listagem de unidades usa cache estatico `unidades_medida:list:all`. | `backend/src/modules/unidades/controllers/unidadeMedidaController.ts:12` | 🟢 |
| Performance | Busca de unidade especifica usa cache por identificador. | `backend/src/modules/unidades/controllers/unidadeMedidaController.ts:44` | 🟢 |
| Integridade | Composicao nutricional garante tabela e indice por `produto_id`. | `backend/src/modules/produtos/controllers/produtoController.ts:13` | 🟢 |
| Integridade | Importacao valida nome minimo, unidade, tipo de processamento, peso e fator de correcao antes de importar. | `frontend/src/components/ImportacaoProdutos.tsx:178` | 🟢 |
| Integridade | Conversao bloqueia unidades de tipos diferentes. | `backend/src/services/unidadesMedidaService.ts:86` | 🟢 |
| Integridade | Conversao com embalagem exige peso de embalagem. | `backend/src/services/unidadesMedidaService.ts:100` | 🟢 |

> 🟢 Inferido a partir do codigo e dos fluxos Reversa de produtos e unidades.

## Criterios de Aceitacao

```gherkin
Cenario: Listar produtos autenticado
Dado um usuario autenticado
Quando ele acessa a lista de produtos
Entao o backend deve retornar produtos com unidade, indicador de composicao nutricional e indicador de contrato

Cenario: Bloquear criacao sem permissao de escrita
Dado um usuario autenticado sem escrita em produtos
Quando ele tenta criar produto
Entao o middleware deve bloquear a operacao

Cenario: Criar produto com dados validos
Dado um usuario com escrita em produtos
Quando ele envia nome, unidade e dados operacionais validos
Entao o produto deve ser persistido e o cache de produtos invalidado

Cenario: Buscar composicao inexistente
Dado um produto sem composicao nutricional
Quando o usuario consulta a composicao do produto
Entao o backend deve criar registro vazio e retornar campos canonicos para edicao

Cenario: Salvar composicao com campos vazios
Dado um produto existente
Quando o usuario salva composicao nutricional com numeros vazios
Entao o backend deve persistir esses campos como null

Cenario: Importar produtos validos
Dado um arquivo CSV ou Excel com produtos validos
Quando o usuario confirma a importacao
Entao o sistema deve criar produtos novos e atualizar produtos com nomes ja existentes

Cenario: Bloquear linha importada invalida
Dado uma linha de importacao sem nome ou com fator de correcao menor ou igual a zero
Quando o frontend valida o arquivo
Entao essa linha deve receber status erro e nao deve ser importada

Cenario: Listar unidades ativas
Dado uma chamada para unidades de medida
Quando o cliente informa ou nao um tipo
Entao o backend deve retornar unidades ativas ordenadas por tipo e codigo

Cenario: Converter unidades compativeis
Dado duas unidades do mesmo tipo com fator de conversao base
Quando o cliente envia quantidade, origem e destino
Entao o backend deve retornar quantidade convertida por fator de origem e destino

Cenario: Bloquear conversao massa para volume
Dado uma unidade de origem do tipo massa e destino do tipo volume
Quando o cliente solicita conversao
Entao o backend deve retornar erro informando que nao e possivel converter tipos diferentes

Cenario: Converter embalagem com peso informado
Dado uma unidade embalagem e uma unidade com fator fixo do mesmo tipo
Quando o cliente informa pesoEmbalagem
Entao o backend deve converter usando o peso da embalagem como contexto
```

## Prioridade

| Requisito | MoSCoW | Justificativa | Confianca |
| --- | --- | --- | --- |
| Catalogo de produtos | Must | Produto e entidade central para cardapios, contratos, guias, compras, estoque e solicitacoes. | 🟢 |
| Unidade de medida do produto | Must | Quantidades e conversoes dependem da unidade em todos os fluxos de abastecimento. | 🟢 |
| Escrita protegida por permissao | Must | Evita alteracao indevida do catalogo operacional. | 🟢 |
| Composicao nutricional | Should | Necessaria para calculos nutricionais, mas produto pode existir sem composicao. | 🟢 |
| Conversao de unidades | Must | Necessaria para compra, contrato, distribuicao e estoque com unidades diferentes. | 🟢 |
| Importacao em lote | Should | Acelera carga cadastral, mas CRUD individual cobre o fluxo essencial. | 🟢 |
| Padronizacao de composicao | Could | Corrige evolucao de schema, mas e fluxo administrativo/tecnico. | 🟢 |
| Cache de unidades | Should | Reduz custo de leitura de catalogo quase estatico. | 🟢 |

> 🟢 Prioridade inferida por centralidade do catalogo em outros modulos e impacto operacional das unidades.

## Notas de Hardening

- [Implementacao 2026-04-30] `unidadeMedidaRoutes.ts` passou a exigir `authenticateToken` e permissao de leitura `produtos` para listagem, busca, conversao e calculo de fator.
- [Implementacao 2026-04-30] `tacoRoutes.ts` exige `authenticateToken` e permissao de leitura `produtos` para busca TACO usada na composicao nutricional.
- [Implementacao 2026-04-30] `produtoRoutes.ts` passou a exigir permissao de leitura `produtos` para consultas e permissao de escrita `produtos` para CRUD, composicao e padronizacao.
- [Implementacao 2026-04-30] `cacheService` usa `unref` no timer de limpeza para nao manter processos de teste/CLI abertos apos importacao.

## Rastreabilidade de Codigo

| Arquivo | Funcao / Classe | Cobertura |
| --- | --- | --- |
| `backend/src/modules/produtos/routes/produtoRoutes.ts` | Rotas e permissoes de produtos | 🟢 |
| `backend/src/modules/produtos/controllers/produtoController.ts` | `listarProdutos`, CRUD, composicao nutricional e padronizacao | 🟢 |
| `backend/src/modules/unidades/routes/unidadeMedidaRoutes.ts` | Rotas de unidades e conversao | 🟢 |
| `backend/src/modules/unidades/controllers/unidadeMedidaController.ts` | `listarUnidades`, `buscarUnidade`, `converterUnidades`, `calcularFator` | 🟢 |
| `backend/src/services/unidadesMedidaService.ts` | Catalogo e regras de conversao | 🟢 |
| `frontend/src/modules/produtos/pages/Produtos.tsx` | Lista, filtros, formulario e acoes de produto | 🟢 |
| `frontend/src/modules/produtos/pages/ProdutoDetalhe.tsx` | Detalhe, composicao e carga TACO | 🟢 |
| `frontend/src/components/ImportacaoProdutos.tsx` | Importacao e validacao em lote | 🟢 |
| `frontend/src/components/UnidadeMedidaSelect.tsx` | Seletor de unidades agrupadas | 🟢 |
| `frontend/src/services/produtos.ts` | Cliente HTTP de produtos | 🟢 |
| `frontend/src/services/produtoService.ts` | Servicos auxiliares de produto | 🟢 |
| `frontend/src/services/unidadesMedida.ts` | Cliente HTTP de unidades | 🟢 |
| `_reversa_sdd/flowcharts/produtos.md` | Fluxo macro de produtos | 🟢 |
| `_reversa_sdd/flowcharts/produtos-composicao.md` | Fluxo de composicao nutricional | 🟢 |
| `_reversa_sdd/flowcharts/produtos-unidades-importacao.md` | Fluxo de unidades e importacao | 🟢 |
| `_reversa_sdd/flowcharts/unidades-catalogo.md` | Fluxo do catalogo de unidades | 🟢 |
| `_reversa_sdd/flowcharts/unidades-conversao.md` | Fluxo de conversao de unidades | 🟢 |
| `_reversa_sdd/flowcharts/unidades-integracoes.md` | Uso transversal de unidades | 🟢 |
