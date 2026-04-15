# 📁 Estrutura do Projeto — NutriLog

Sistema de gestão de alimentação escolar (PNAE). Monorepo com backend Node.js/Express e frontend React/Vite.

---

## 🗂️ Visão Geral do Monorepo

```
gestaoescolar/
├── backend/          # API REST — Node.js + Express + TypeScript + PostgreSQL
└── frontend/         # SPA — React + Vite + TypeScript + MUI
```

---

## 🔧 BACKEND

### Stack
- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Banco de dados:** PostgreSQL (Neon em produção)
- **Cache:** Redis (ioredis)
- **Auth:** JWT (jsonwebtoken)
- **Deploy:** Vercel (Serverless via `backend/api/index.js`)
- **Realtime:** Socket.IO

### Estrutura

```
backend/src/
├── index.ts                    # Entry point — registra rotas, middlewares, Socket.IO
├── database.ts                 # Conexão PostgreSQL (pool)
├── database-vercel.ts          # Conexão adaptada para Vercel (serverless)
│
├── config/
│   ├── config.ts               # Variáveis de ambiente e configurações globais
│   ├── redis.ts                # Configuração do cliente Redis
│   └── index.ts
│
├── middleware/
│   ├── authMiddleware.ts       # Verificação de JWT em rotas protegidas
│   ├── permissionMiddleware.ts # Controle de permissões por módulo/ação
│   ├── cache.ts                # Cache de respostas HTTP via Redis
│   ├── compression.ts          # Compressão gzip das respostas
│   ├── errorHandler.ts         # Handler global de erros
│   ├── rateLimiter.ts          # Rate limiting por IP
│   ├── monitoring.ts           # Métricas de performance das requisições
│   ├── pagination.ts           # Paginação automática de listagens
│   ├── validation.ts           # Validação de body/params com Zod
│   ├── devAuthMiddleware.ts    # Auth simplificado para desenvolvimento
│   └── systemAdminAuth.ts      # Auth exclusivo para rotas de admin do sistema
│
├── modules/                    # Domínios de negócio (cada um com controllers/models/routes)
│   ├── cardapios/              # Cardápios por modalidade, refeições por dia
│   ├── compras/                # Pedidos de compra, planejamento, geração de guias (jobs assíncronos)
│   ├── contratos/              # Contratos com fornecedores, produtos por contrato, saldo
│   ├── demandas/               # Demandas de escolas (ofícios), cardápios disponíveis
│   ├── entregas/               # Rotas de entrega, romaneio, comprovantes
│   ├── escolas/                # Cadastro de escolas, modalidades, portal da escola
│   ├── estoque/                # Estoque central, estoque escolar, movimentações
│   ├── faturamentos/           # Faturamentos por modalidade
│   ├── guias/                  # Guias de demanda, produtos por escola, status de entrega
│   ├── nutricao/               # Nutricionistas, preparações (refeições), ingredientes
│   ├── produtos/               # Cadastro de produtos, composição nutricional
│   ├── recebimentos/           # Recebimentos de mercadorias
│   ├── sistema/                # Dashboard, períodos letivos, usuários, configurações, PNAE
│   ├── solicitacoes/           # Solicitações de alimentos das escolas
│   ├── unidades/               # Unidades de medida
│   └── usuarios/               # Autenticação, perfis, permissões por módulo
│
├── services/
│   ├── jobService.ts           # Fila de jobs assíncronos (geração de guias/pedidos)
│   ├── notificationService.ts  # Envio de notificações via Socket.IO
│   └── unidadesMedidaService.ts
│
├── utils/
│   ├── errorHandler.ts         # Classes de erro padronizadas (ValidationError, NotFoundError…)
│   ├── periodoHelper.ts        # Obtém período ativo do usuário ou global
│   ├── cache.ts / cacheService.ts / cacheManager.ts  # Camadas de cache Redis
│   ├── auditLogger.ts          # Log de auditoria de ações
│   ├── dateUtils.ts            # Utilitários de data
│   ├── optimizedQueries.ts     # Queries SQL otimizadas reutilizáveis
│   └── typeHelpers.ts          # Helpers de tipagem TypeScript
│
└── routes/
    ├── health-check.ts         # GET /health — status da API
    └── debug-env.ts            # GET /debug-env — variáveis de ambiente (dev only)
```

### Módulos de Negócio — Detalhamento

| Módulo | Responsabilidade Principal |
|--------|---------------------------|
| `cardapios` | CRUD de cardápios por modalidade, refeições por dia, custo por cardápio |
| `compras` | Pedidos de compra, planejamento de demanda, geração assíncrona de guias via jobs |
| `contratos` | Contratos com fornecedores, produtos contratados, saldo disponível por modalidade |
| `demandas` | Demandas/ofícios das escolas, listagem de cardápios disponíveis por competência |
| `entregas` | Rotas de entrega, programação por escola, romaneio, comprovantes com assinatura |
| `escolas` | Cadastro de escolas, modalidades por escola, portal da escola (solicitações) |
| `estoque` | Estoque central (lotes, movimentações), estoque escolar, alertas de nível |
| `guias` | Guias de demanda geradas, produtos por escola, status de entrega por item |
| `nutricao` | Nutricionistas, preparações (refeições), ingredientes, ficha técnica, TACO |
| `produtos` | Cadastro de produtos, unidades de medida, composição nutricional, fator de correção |
| `sistema` | Dashboard, períodos letivos, usuários, permissões, configurações, dashboard PNAE |
| `compras/planejamento` | Cálculo de demanda por competência/período, geração de guias e pedidos (jobs async) |

### Padrão de Rotas

Cada módulo segue o padrão:
```
/api/{modulo}           GET    → listar
/api/{modulo}           POST   → criar
/api/{modulo}/:id       GET    → buscar por ID
/api/{modulo}/:id       PUT    → atualizar
/api/{modulo}/:id       DELETE → remover
```

---

## 🎨 FRONTEND

### Stack
- **Framework:** React 18 + Vite + TypeScript
- **UI:** Material UI (MUI) v5 — tema escuro customizado (GitHub Dark)
- **Estado servidor:** TanStack Query (React Query)
- **Roteamento:** React Router v6
- **Forms:** React Hook Form + Zod
- **PDF:** pdfmake
- **Excel:** ExcelJS / xlsx
- **Deploy:** Vercel (SPA)

### Estrutura

```
frontend/src/
├── App.tsx                     # Raiz — ThemeProvider, QueryProvider, AuthProvider, Router
├── main.tsx                    # Entry point Vite
│
├── routes/
│   └── AppRouter.tsx           # Todas as rotas da aplicação com lazy loading e guards
│
├── theme/
│   └── theme.ts                # Tema MUI escuro (GitHub Dark) — cores, tipografia, overrides
│
├── components/                 # Componentes globais reutilizáveis
│   ├── LayoutModerno.tsx       # Layout principal — sidebar, header bar, busca global
│   ├── GlobalSearch.tsx        # Busca global com Ctrl+K — pesquisa em APIs e páginas
│   ├── DataTable.tsx           # Tabela com busca, paginação, ordenação, mobile cards
│   ├── DataTableAdvanced.tsx   # Tabela com seleção de linhas, visibilidade de colunas, export
│   ├── PageContainer.tsx       # Container padrão de página (padding, fullHeight)
│   ├── PageHeader.tsx          # Cabeçalho de página (título, breadcrumbs, ação)
│   ├── PageBreadcrumbs.tsx     # Breadcrumbs de navegação
│   ├── PermissionGuard.tsx     # Guard de permissão por módulo/ação
│   ├── SeletorPeriodo.tsx      # Autocomplete de período letivo no header
│   ├── SeletorPeriodoCalendario.tsx  # Seletor de período para calendário
│   ├── NotificacoesMenu.tsx    # Menu de notificações do sistema
│   ├── NotificacoesEscolaMenu.tsx    # Menu de notificações da escola
│   ├── JobProgressModal.tsx    # Modal de progresso de jobs assíncronos
│   ├── LoadingScreen.tsx       # Tela de loading inline
│   ├── LoadingOverlay.tsx      # Backdrop de loading bloqueante
│   ├── LoginWrapper.tsx        # Wrapper da tela de login
│   ├── CalendarioProfissional.tsx    # Calendário mensal com eventos e refeições
│   ├── CalendarioMensal.tsx    # Calendário mensal simples
│   ├── CalendarioSemanalCardapio.tsx # Calendário semanal de cardápio
│   ├── AdicionarIngredienteDialog.tsx  # Dialog para adicionar ingrediente a preparação
│   ├── EditarIngredienteDialog.tsx     # Dialog para editar ingrediente de preparação
│   ├── AdicionarGrupoIngredientesDialog.tsx  # Dialog para adicionar grupo de ingredientes
│   ├── AdicionarProdutosLoteDialog.tsx # Dialog para adicionar produtos em lote
│   ├── BuscarTacoDialog.tsx    # Busca na tabela TACO de composição nutricional
│   ├── CalculoDetalhadoModal.tsx     # Modal com detalhamento de cálculo nutricional
│   ├── DetalhamentoCustoModal.tsx    # Modal com detalhamento de custo de preparação
│   ├── CustoCardapioDetalheModal.tsx # Modal com custo detalhado do cardápio
│   ├── DetalheDiaCardapioDialog.tsx  # Dialog com detalhe de um dia do cardápio
│   ├── DemandaFormModal.tsx    # Modal de criação/edição de demanda
│   ├── DemandaDetalhesModal.tsx      # Modal de detalhes de demanda
│   ├── GerarPedidoDaGuiaDialog.tsx   # Dialog para gerar pedido a partir de guia
│   ├── GerenciarGrupoDialog.tsx      # Dialog para gerenciar grupos de ingredientes
│   ├── ReplicarRefeicoesDialog.tsx   # Dialog para replicar refeições entre dias
│   ├── SelecionarContratosDialog.tsx # Dialog para selecionar contratos
│   ├── ConfirmacaoExclusaoFornecedor.tsx  # Confirmação de exclusão de fornecedor
│   ├── FiltrosEscolas.tsx      # Filtros de listagem de escolas
│   ├── ImportacaoEscolas.tsx   # Stepper de importação de escolas via XLSX
│   ├── ImportacaoFornecedores.tsx    # Stepper de importação de fornecedores via XLSX
│   ├── ImportacaoProdutos.tsx  # Stepper de importação de produtos via XLSX
│   ├── CriarEditarEventoDialog.tsx   # Dialog de criação/edição de evento no calendário
│   ├── DashboardConsistencia.tsx     # Dashboard de consistência de dados
│   ├── CompactPagination.tsx   # Paginação compacta
│   ├── BaseDialog.tsx          # Dialog base reutilizável
│   ├── LocationSelector.tsx    # Seletor de localização
│   ├── SignaturePad.tsx        # Pad de assinatura digital
│   ├── StatusIndicator.tsx     # Indicador de status (ativo/inativo)
│   ├── SafeButton.tsx          # Botão com proteção contra duplo clique
│   ├── SafeButtonWithOverlay.tsx     # SafeButton + LoadingOverlay
│   ├── Toast.tsx               # Notificações toast
│   ├── UpdateNotification.tsx  # Notificação de atualização disponível
│   ├── RealTimeNotificationContainer.tsx  # Container de notificações em tempo real
│   ├── UnidadeMedidaSelect.tsx # Select de unidade de medida
│   ├── ViewTabs.tsx            # Tabs de visualização
│   ├── TableFilter.tsx         # Filtros de tabela
│   └── index.ts                # Re-exports dos componentes principais
│
├── modules/                    # Páginas organizadas por domínio
│   ├── cardapios/pages/        # Cardápios, modalidades, calendário, tipos de refeição
│   ├── compras/pages/          # Pedidos, formulário, detalhe, planejamento, ajuste programações
│   ├── contratos/pages/        # Contratos, detalhe, saldo por modalidade
│   ├── demandas/pages/         # Guias de demanda, detalhe da guia, itens por escola
│   ├── entregas/               # Entregas, rotas, comprovantes, romaneio
│   ├── escolas/pages/          # Escolas, detalhe, gerenciar escolas da rota
│   ├── estoque/pages/          # Estoque central, estoque escolar, solicitações
│   ├── faturamento/pages/      # Faturamentos
│   ├── fornecedores/pages/     # Fornecedores, detalhe
│   ├── nutricao/pages/         # Preparações, detalhe (ficha técnica), nutricionistas
│   ├── portal-escola/          # Portal da escola (minha escola, solicitações, cardápio)
│   ├── produtos/pages/         # Produtos, detalhe, composição nutricional
│   ├── programacao/pages/      # Programação de entrega, ajuste de programações
│   ├── rotas/pages/            # Gestão de rotas de entrega
│   ├── sistema/pages/          # Dashboard, usuários, períodos, configurações, PNAE, calendário letivo
│   └── solicitacoes/pages/     # Solicitações recebidas
│
├── pages/                      # Páginas públicas (fora do layout autenticado)
│   ├── Login.tsx               # Tela de login
│   ├── LandingPage.tsx         # Landing page pública
│   └── InterestForm.tsx        # Formulário de interesse
│
├── contexts/
│   ├── AuthContext.tsx         # Autenticação — usuário logado, token JWT
│   ├── EscolasContext.tsx      # Lista de escolas disponível globalmente
│   ├── NotificacoesContext.tsx # Notificações do sistema (Socket.IO)
│   ├── NotificacoesEscolaContext.tsx  # Notificações da escola
│   ├── PageTitleContext.tsx    # Título dinâmico da página
│   ├── RealTimeContext.tsx     # Conexão Socket.IO
│   └── ThemeContext.tsx        # Tema claro/escuro
│
├── context/
│   └── ConfigContext.tsx       # Configurações do sistema (módulos habilitados)
│
├── hooks/
│   ├── useUserRole.ts          # Papel do usuário (admin, escola, nutricionista…)
│   ├── useUserPermissions.ts   # Permissões por módulo (leitura, escrita, exclusão)
│   ├── useToast.ts             # Notificações toast
│   ├── useDebounce.ts          # Debounce de valores
│   ├── useInstituicao.ts       # Dados da instituição
│   ├── useEscolasIntegradas.ts # Escolas com modalidades integradas
│   ├── useEstoqueAlertas.ts    # Alertas de estoque baixo
│   ├── useConfigChangeIndicator.ts  # Indicador de mudança de configuração
│   └── queries/                # Hooks React Query por entidade
│       ├── useEscolaQueries.ts
│       ├── useProdutoQueries.ts
│       ├── useRefeicaoQueries.ts
│       ├── useCardapioModalidadeQueries.ts
│       ├── usePeriodosQueries.ts
│       ├── useFornecedorQueries.ts
│       ├── useModalidadeQueries.ts
│       ├── useSaldoContratosQueries.ts
│       └── ... (demais entidades)
│
├── services/                   # Chamadas à API REST
│   ├── api.ts                  # Instância Axios com interceptors (auth, retry, erros)
│   ├── createCrudService.ts    # Factory de CRUD genérico (listar/buscar/criar/atualizar/remover)
│   ├── auth.ts                 # Login, logout, refresh token
│   ├── escolas.ts              # CRUD de escolas e escola-modalidades
│   ├── produtos.ts             # CRUD de produtos e composição nutricional
│   ├── contratos.ts            # CRUD de contratos e produtos por contrato
│   ├── cardapios.ts            # CRUD de cardápios
│   ├── cardapiosModalidade.ts  # Cardápios por modalidade
│   ├── refeicoes.ts            # CRUD de preparações e ingredientes
│   ├── guiaService.ts          # Guias de demanda, produtos por escola
│   ├── planejamentoCompras.ts  # Cálculo de demanda, geração de guias/pedidos (jobs)
│   ├── demanda.ts              # Demanda mensal, cardápios disponíveis
│   ├── pedidos.ts              # Pedidos de compra
│   ├── fornecedores.ts         # CRUD de fornecedores
│   ├── periodos.ts             # Períodos letivos
│   ├── estoqueCentralService.ts
│   ├── estoqueEscolarService.ts
│   ├── programacaoEntrega.ts   # Programação de entrega por escola
│   ├── pnae.ts                 # Dashboard PNAE
│   └── ... (demais serviços)
│
├── types/                      # Interfaces TypeScript
│   ├── pedido.ts
│   ├── produto.ts
│   ├── refeicao.ts
│   ├── contrato.ts
│   ├── escola.ts
│   ├── faturamento.ts
│   └── ...
│
├── utils/
│   ├── formatters.ts           # Formatação de moeda, datas, quantidades
│   ├── dateUtils.ts            # Utilitários de data
│   ├── pdfUtils.ts             # Utilitários base para geração de PDF
│   ├── cardapioPdfGenerators.ts # Geradores de PDF de cardápio
│   ├── fichaTecnicaPdf.ts      # PDF da ficha técnica de preparação
│   ├── exportarFaturamentoExcel.ts  # Export de faturamento para Excel
│   ├── requestQueue.ts         # Fila de requisições com deduplicação e cache
│   ├── performanceMonitor.ts   # Monitor de performance de operações
│   └── validacaoDocumento.ts   # Validação de CPF/CNPJ
│
├── config/
│   ├── api.ts                  # URL base da API e configurações de timeout
│   └── config.ts               # Configurações gerais do frontend
│
└── lib/
    └── queryClient.ts          # Configuração do TanStack Query (cache, stale time, keys)
```

---

## 🗄️ Banco de Dados

### Principais Tabelas

| Tabela | Descrição |
|--------|-----------|
| `escolas` | Cadastro de escolas |
| `modalidades` | Modalidades de ensino (EI, EF, EJA…) |
| `escola_modalidades` | Relação escola × modalidade × quantidade de alunos |
| `produtos` | Produtos alimentícios com fator de correção e composição nutricional |
| `fornecedores` | Fornecedores |
| `contratos` | Contratos com fornecedores |
| `contrato_produtos` | Produtos por contrato com preço unitário |
| `cardapios_modalidade` | Cardápios por modalidade, mês e ano |
| `cardapio_modalidades` | Relação cardápio × modalidade |
| `cardapio_refeicoes_dia` | Refeições por dia do cardápio |
| `refeicoes` | Preparações/receitas |
| `refeicao_produtos` | Ingredientes de cada preparação com per capita |
| `guias` | Guias de demanda geradas |
| `guia_produto_escola` | Quantidade de produto por escola na guia |
| `pedidos` | Pedidos de compra |
| `pedido_itens` | Itens de cada pedido |
| `periodos` | Períodos letivos (ano, data início/fim, ativo) |
| `usuarios` | Usuários do sistema com período selecionado |
| `permissoes_usuario` | Permissões por módulo e ação |
| `estoque_central` | Estoque central por produto |
| `estoque_escolar` | Estoque por escola e produto |
| `entregas` | Entregas realizadas |
| `rotas` | Rotas de entrega |

### Migrações
Localizadas em `backend/migrations/` — arquivos `.sql` numerados e datados, executados em ordem.

---

## 🔐 Autenticação e Permissões

- **JWT** armazenado no `localStorage`
- Interceptor Axios adiciona `Authorization: Bearer <token>` automaticamente
- Expiração de sessão redireciona para `/login`
- **Permissões por módulo:** cada usuário tem permissões de `leitura`, `escrita` e `exclusao` por módulo (ex: `escolas`, `produtos`, `cardapios`…)
- **Roles:** `admin` (acesso total), `nutricionista`, `escola` (portal restrito)
- Guard `PermissionGuard` no frontend bloqueia acesso a rotas sem permissão

---

## 🚀 Deploy

| Serviço | Plataforma | Configuração |
|---------|-----------|--------------|
| Backend | Vercel (Serverless) | `backend/vercel.json` → entry `api/index.js` |
| Frontend | Vercel (SPA) | `frontend/vercel.json` → rewrites para `index.html` |
| Banco | Neon (PostgreSQL serverless) | `DATABASE_URL` via variável de ambiente |
| Cache | Redis (Upstash ou similar) | `REDIS_URL` via variável de ambiente |

---

## � Fluxo Principal — Geração de Guia de Demanda

```
1. Usuário seleciona competência (mês/ano) e cardápios
2. Seleciona período(s) de entrega
3. Frontend → POST /api/planejamento-compras/gerar-guias-async
4. Backend cria Job na tabela jobs (status: pendente)
5. Job processa em background:
   a. Busca cardápios ativos da competência
   b. Para cada escola × modalidade, calcula quantidade por produto
      (alunos × per capita × fator correção × dias do período)
   c. Cria guia na tabela guias
   d. Insere guia_produto_escola com quantidades por escola
6. Frontend polling via GET /api/planejamento-compras/jobs/:id
7. JobProgressModal exibe progresso em tempo real
8. Ao concluir, usuário acessa a guia gerada
```
