# Padronização da Página de Nutricionistas - Completa

## Resumo
A página de Nutricionistas foi completamente atualizada para seguir o mesmo padrão visual e funcional das páginas de Escolas, Produtos e Modalidades, utilizando o componente DataTable com TanStack Table.

## Alterações Realizadas

### 1. Substituição do Sistema de Tabela
- Removido Table, TableContainer, TableHead, TableBody manual
- Removido CompactPagination
- Removido Card wrapper na toolbar
- Implementado TanStack Table v8 com componente DataTable reutilizável
- Paginação agora gerenciada internamente pelo DataTable

### 2. Estrutura Visual Padronizada
- **Toolbar**: Integrada no DataTable com botões de criar, filtro e busca
- **Filtros**: Popover customizado
- **Busca**: Campo expansível integrado no DataTable
- **Scroll**: Apenas no corpo da tabela, header fixo
- **Bordas**: Container com bordas arredondadas e overflow hidden

### 3. Colunas da Tabela (ColumnDef)
- ID (80px) - com sorting
- Nome (300px) - com sorting
- CRN (150px) - Chip azul com região + número
- Especialidade (150px) - com sorting, mostra '-' se vazio
- Contato (200px) - email ou telefone
- Status (100px) - indicador visual circular
- Ações (100px) - botões de editar e excluir

### 4. Modal de Cadastro Melhorado
Organizado em 5 seções com títulos coloridos:

#### Informações Pessoais
- Nome Completo (obrigatório)

#### Registro Profissional
- Região CRN (obrigatório, select com 10 opções)
- Número CRN (obrigatório)

#### Contato
- CPF (opcional)
- Telefone (opcional)
- E-mail (opcional)

#### Especialização
- Especialidade (opcional, com helper text)

#### Status
- Switch "Nutricionista Ativo" com descrição explicativa

### 5. Sistema de Filtros com Popover
- **Status**: Todos / Ativos / Inativos
- Chips mostrando filtros ativos
- Botões "Limpar" e "Aplicar"
- Indicador visual de filtros aplicados

### 6. Funcionalidades Mantidas
- ✅ Criação de nutricionista
- ✅ Edição de nutricionista
- ✅ Exclusão com confirmação
- ✅ Validação de campos obrigatórios (nome, CRN, região CRN)
- ✅ Loading states
- ✅ Mensagens de erro/sucesso
- ✅ Formatação do CRN como Chip

### 7. Funcionalidades Removidas/Simplificadas
- ❌ Dialog de confirmação para descartar alterações (simplificado)
- ❌ CompactPagination (agora interno no DataTable)
- ❌ Card wrapper na toolbar (integrado no DataTable)
- ❌ StatusIndicator component (substituído por indicador inline)
- ❌ Legenda de status manual (DataTable gerencia)
- ❌ Controle de formDataInicial e hasUnsavedChanges (simplificado)

## Componentes Utilizados

### DataTable
```typescript
<DataTable
  data={nutricionistasFiltrados}
  columns={columns}
  loading={loading}
  onRowClick={handleRowClick}
  searchPlaceholder="Buscar nutricionistas..."
  onCreateClick={() => openModal()}
  createButtonLabel="Novo Nutricionista"
  onFilterClick={(e) => setFilterAnchorEl(e.currentTarget)}
/>
```

### Popover de Filtros
- Posicionado à direita do botão
- Largura mínima de 280px
- 1 filtro: Status
- Indicador visual de filtros ativos com Chips removíveis

## Padrão Visual

### Cores
- Background da toolbar: branco (gerenciado pelo DataTable)
- Background do TableHead: `#f5f5f5` (gerenciado pelo DataTable)
- Botão de criar: preto (`#000`)
- Chip de CRN: azul (`#e3f2fd` / `#1976d2`)
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
- Nome Completo
- Região CRN
- Número CRN

### Validações Adicionais
- Campos marcados como touched mostram erro visual
- Botão de salvar desabilitado se campos obrigatórios vazios

## Estados de Loading
- Criando nutricionista
- Atualizando nutricionista
- Excluindo nutricionista
- Carregando lista (gerenciado pelo DataTable)

## Integração com React Query
- `useNutricionistas`: busca lista de nutricionistas
- `useCreateNutricionista`: mutation para criar nutricionista
- `useUpdateNutricionista`: mutation para atualizar nutricionista
- `useDeleteNutricionista`: mutation para excluir nutricionista
- Refetch automático após operações

## Definição de Colunas

```typescript
const columns = useMemo<ColumnDef<Nutricionista>[]>(() => [
  { accessorKey: 'id', header: 'ID', size: 80, enableSorting: true },
  { accessorKey: 'nome', header: 'Nome', size: 300, enableSorting: true },
  { 
    id: 'crn',
    header: 'CRN',
    size: 150,
    cell: ({ row }) => (
      <Chip label={`${row.original.crn_regiao} ${row.original.crn}`} />
    )
  },
  { 
    accessorKey: 'especialidade', 
    header: 'Especialidade', 
    size: 150,
    cell: ({ getValue }) => getValue() || '-'
  },
  { 
    id: 'contato',
    header: 'Contato',
    size: 200,
    cell: ({ row }) => row.original.email || row.original.telefone || '-'
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
    size: 100,
    cell: ({ row }) => <ActionButtons row={row} />
  },
], []);
```

## Regiões CRN Disponíveis
- CRN-1 (RJ/ES)
- CRN-2 (RS)
- CRN-3 (SP/MS)
- CRN-4 (RJ)
- CRN-5 (PR)
- CRN-6 (MG)
- CRN-7 (BA/SE)
- CRN-8 (PE/AL)
- CRN-9 (GO/TO/DF)
- CRN-10 (SC)

## Arquivos Modificados
- `frontend/src/pages/Nutricionistas.tsx`

## Arquivos de Referência
- `frontend/src/pages/Escolas.tsx` (padrão seguido)
- `frontend/src/pages/Produtos.tsx` (padrão seguido)
- `frontend/src/pages/Modalidades.tsx` (padrão seguido)
- `frontend/src/components/DataTable.tsx` (componente base)
- `frontend/GUIA_DATATABLE_TANSTACK.md` (documentação)

## Próximos Passos
1. ✅ Modalidades - CONCLUÍDO
2. ✅ Nutricionistas - CONCLUÍDO
3. ⏳ Fornecedores - Próximo
4. ⏳ Contratos - Aguardando

## Notas Técnicas
- Código limpo e organizado
- Sem erros de TypeScript
- Componentes reutilizáveis
- Fácil manutenção
- Performance otimizada com useMemo e useCallback
- handleRowClick abre modal de edição ao clicar na linha
- Modal organizado em 5 seções lógicas
- Validação robusta de campos obrigatórios
