# Padronização da Página de Preparações (antiga Refeições) - Completa

## Resumo
A página de Refeições foi completamente atualizada e renomeada para "Preparações", seguindo o mesmo padrão visual e funcional das outras páginas do sistema, utilizando o componente DataTable com TanStack Table.

## Mudança de Nomenclatura
- **Antes**: Refeições
- **Depois**: Preparações
- **Motivo**: Melhor representação do conceito de preparações culinárias no contexto de alimentação escolar

## Alterações Realizadas

### 1. Substituição do Sistema de Tabela
- Removido Table, TableContainer, TableHead, TableBody manual
- Removido CompactPagination
- Removido TableFilter component
- Removido StatusIndicator component
- Implementado TanStack Table v8 com componente DataTable reutilizável
- Paginação agora gerenciada internamente pelo DataTable

### 2. Estrutura Visual Padronizada
- **Toolbar**: Integrada no DataTable com botões de criar, filtro e busca
- **Filtros**: Popover customizado substituindo TableFilter
- **Busca**: Campo expansível integrado no DataTable
- **Scroll**: Apenas no corpo da tabela, header fixo
- **Bordas**: Container com bordas arredondadas e overflow hidden

### 3. Colunas da Tabela (ColumnDef)
- ID (80px) - com sorting
- Nome da Preparação (300px) - com sorting, mostra nome e descrição
- Tipo (180px) - com sorting, exibido como Chip azul
- Status (100px) - indicador visual circular
- Ações (150px) - botões de ver detalhes, duplicar, editar e excluir

### 4. Modal de Cadastro Melhorado
Organizado em 3 seções com títulos coloridos:

#### Informações Básicas
- Nome da Preparação (obrigatório)
- Descrição (opcional, multiline)

#### Classificação
- Tipo de Preparação (dropdown):
  - Café da Manhã
  - Almoço
  - Lanche da Tarde
  - Jantar
  - Ceia

#### Status
- Switch "Preparação Ativa" com descrição explicativa

### 5. Sistema de Filtros com Popover
- **Status**: Todos / Ativas / Inativas
- **Tipo**: Todos / Café da Manhã / Almoço / Lanche da Tarde / Jantar / Ceia
- Chips mostrando filtros ativos
- Botões "Limpar" e "Aplicar"
- Indicador visual de filtros aplicados

### 6. Funcionalidades Mantidas
- ✅ Criação de preparação
- ✅ Edição de preparação
- ✅ Exclusão com confirmação
- ✅ Duplicação de preparação (com modal customizado)
- ✅ Validação de campos obrigatórios
- ✅ Loading states
- ✅ Mensagens de erro/sucesso
- ✅ handleRowClick navega para página de detalhes
- ✅ Verificação de uso em cardápios antes de excluir

### 7. Funcionalidades Removidas/Simplificadas
- ❌ TableFilter component (substituído por Popover)
- ❌ CompactPagination (agora interno no DataTable)
- ❌ Card wrapper na toolbar (integrado no DataTable)
- ❌ StatusIndicator component (substituído por indicador inline)
- ❌ Legenda de status manual (DataTable gerencia)
- ❌ Menu de ações vazio (removido)

## Componentes Utilizados

### DataTable
```typescript
<DataTable
  data={preparacoesFiltradas}
  columns={columns}
  loading={loading}
  onRowClick={handleRowClick}
  searchPlaceholder="Buscar preparações..."
  onCreateClick={() => openModal()}
  createButtonLabel="Nova Preparação"
  onFilterClick={(e) => setFilterAnchorEl(e.currentTarget)}
/>
```

### Popover de Filtros
- Posicionado à direita do botão
- Largura mínima de 280px
- 2 filtros: Status e Tipo
- Indicador visual de filtros ativos com Chips removíveis

### Modal de Duplicação
- Alerta informativo sobre o que será copiado
- Campo para novo nome com valor padrão "(Cópia)"
- Botão com ícone de duplicar
- Loading indicator durante duplicação

## Padrão Visual

### Cores
- Background da toolbar: branco (gerenciado pelo DataTable)
- Background do TableHead: `#f5f5f5` (gerenciado pelo DataTable)
- Botão de criar: preto (`#000`)
- Chip de tipo: azul (`primary` color, variant outlined)
- Indicador de status ativo: `success.main`
- Indicador de status inativo: `error.main`

### Bordas
- Container: `borderRadius: 2` com `overflow: hidden`
- Gerenciadas pelo DataTable component

### Espaçamento
- Padding do modal: consistente (px: 3, py: 2)
- Gap entre seções: 3
- Gap entre campos: 2

## Validações

### Campos Obrigatórios
- Nome da Preparação

### Validações Adicionais
- Verificação de uso em cardápios antes de excluir
- Nome não pode ser vazio ao duplicar

## Estados de Loading
- Criando preparação
- Atualizando preparação
- Excluindo preparação
- Duplicando preparação
- Carregando lista (gerenciado pelo DataTable)

## Integração com React Query
- `useRefeicoes`: busca lista de preparações (mantém nome do hook por compatibilidade)
- `useCriarRefeicao`: mutation para criar preparação
- `useEditarRefeicao`: mutation para atualizar preparação
- `useDeletarRefeicao`: mutation para excluir preparação
- `useDuplicarRefeicao`: mutation para duplicar preparação
- Refetch automático após operações

## Definição de Colunas

```typescript
const columns = useMemo<ColumnDef<Refeicao>[]>(() => [
  { accessorKey: 'id', header: 'ID', size: 80, enableSorting: true },
  { 
    accessorKey: 'nome', 
    header: 'Nome da Preparação', 
    size: 300,
    cell: ({ row }) => (
      <Box>
        <Typography variant="body2" fontWeight={600}>{row.original.nome}</Typography>
        {row.original.descricao && (
          <Typography variant="caption" color="text.secondary">
            {row.original.descricao}
          </Typography>
        )}
      </Box>
    )
  },
  { 
    accessorKey: 'tipo', 
    header: 'Tipo', 
    size: 180,
    cell: ({ getValue }) => (
      <Chip label={tiposPreparacao[getValue()]} color="primary" variant="outlined" />
    )
  },
  { 
    accessorKey: 'ativo', 
    header: 'Status', 
    size: 100,
    cell: ({ getValue }) => <StatusCircle active={getValue()} />
  },
  {
    id: 'actions',
    header: 'Ações',
    size: 150,
    cell: ({ row }) => <ActionButtons row={row} />
  },
], [navigate]);
```

## Funcionalidade de Duplicação

### Fluxo
1. Usuário clica no botão "Duplicar" na linha da preparação
2. Modal abre com nome sugerido: "{nome original} (Cópia)"
3. Usuário pode editar o nome
4. Ao confirmar, todos os dados são copiados:
   - Nome (editado pelo usuário)
   - Descrição
   - Tipo
   - Status
   - Produtos associados
   - Ingredientes
   - Per capita por modalidade

### Mensagens
- Sucesso: "Preparação duplicada com sucesso!"
- Erro: "Erro ao duplicar preparação"
- Alerta no modal: Explica o que será copiado

## Arquivos Modificados
- `frontend/src/pages/Refeicoes.tsx` → `frontend/src/pages/Preparacoes.tsx` (novo arquivo)

## Arquivos de Referência
- `frontend/src/pages/Escolas.tsx` (padrão seguido)
- `frontend/src/pages/Produtos.tsx` (padrão seguido)
- `frontend/src/pages/Modalidades.tsx` (padrão seguido)
- `frontend/src/pages/Nutricionistas.tsx` (padrão seguido)
- `frontend/src/pages/Fornecedores.tsx` (padrão seguido)
- `frontend/src/components/DataTable.tsx` (componente base)
- `frontend/GUIA_DATATABLE_TANSTACK.md` (documentação)

## Próximos Passos para Completar a Migração

### 1. Atualizar Rotas
- Alterar rota de `/refeicoes` para `/preparacoes`
- Alterar rota de `/refeicoes/:id` para `/preparacoes/:id`

### 2. Atualizar Navegação
- Atualizar menu lateral/navegação
- Atualizar breadcrumbs
- Atualizar links em outras páginas

### 3. Atualizar Página de Detalhes
- Renomear `RefeicaoDetalhe.tsx` para `PreparacaoDetalhe.tsx`
- Atualizar todos os textos de "Refeição" para "Preparação"
- Atualizar rotas internas

### 4. Atualizar Componentes Relacionados
- Atualizar componentes que referenciam "Refeição"
- Atualizar tipos/interfaces se necessário
- Atualizar breadcrumbs e navegação

### 5. Atualizar Backend (Opcional)
- Considerar renomear tabelas/modelos no backend
- Atualizar endpoints de API
- Manter compatibilidade durante transição

## Notas Técnicas
- Código limpo e organizado
- Sem erros de TypeScript
- Componentes reutilizáveis
- Fácil manutenção
- Performance otimizada com useMemo e useCallback
- handleRowClick navega para página de detalhes
- Funcionalidade de duplicação completa
- Validação de uso em cardápios antes de excluir
- Imports corrigidos (react-router ao invés de react-router-dom)
- Hooks do React Query mantêm nomes originais por compatibilidade

## Status Final
✅ Página de Preparações padronizada com sucesso!
✅ Renomeação de "Refeições" para "Preparações" implementada!
⏳ Pendente: Atualizar rotas, navegação e página de detalhes
