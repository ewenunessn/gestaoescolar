# Padronização da Página de Fornecedores - Completa

## Resumo
A página de Fornecedores foi completamente atualizada para seguir o mesmo padrão visual e funcional das páginas de Escolas, Produtos, Modalidades e Nutricionistas, utilizando o componente DataTable com TanStack Table.

## Alterações Realizadas

### 1. Substituição do Sistema de Tabela
- Removido Table, TableContainer, TableHead, TableBody manual
- Removido CompactPagination
- Removido TableFilter component
- Implementado TanStack Table v8 com componente DataTable reutilizável
- Paginação agora gerenciada internamente pelo DataTable

### 2. Estrutura Visual Padronizada
- **Toolbar**: Integrada no DataTable com botões de criar, filtro, busca e menu
- **Filtros**: Popover customizado substituindo TableFilter
- **Busca**: Campo expansível integrado no DataTable
- **Scroll**: Apenas no corpo da tabela, header fixo
- **Bordas**: Container com bordas arredondadas e overflow hidden

### 3. Colunas da Tabela (ColumnDef)
- ID (80px) - com sorting
- Nome (300px) - com sorting
- CNPJ (150px) - com sorting, formatado com máscara
- Tipo (200px) - com sorting, exibido como Chip (verde para AF)
- Email (200px) - com sorting, mostra "Não informado" se vazio
- Status (100px) - indicador visual circular
- Ações (120px) - botões de ver detalhes, editar e excluir

### 4. Modal de Cadastro Melhorado
Organizado em 5 seções com títulos coloridos:

#### Informações Básicas
- Nome (obrigatório)
- CNPJ (obrigatório, com validação de 14 dígitos)
- Email (opcional)

#### Classificação
- Tipo de Fornecedor (dropdown):
  - Convencional
  - Agricultura Familiar
  - Cooperativa de Agricultura Familiar
  - Associação de Agricultura Familiar

#### Agricultura Familiar (Condicional)
Aparece apenas quando o tipo é AF, Cooperativa AF ou Associação AF:
- DAP/CAF (número da declaração)
- Data de Validade DAP/CAF (campo de data)

#### Status
- Switch "Fornecedor Ativo" com descrição explicativa

### 5. Sistema de Filtros com Popover
- **Status**: Todos / Ativos / Inativos
- **Tipo**: Todos / Convencional / Agricultura Familiar / Cooperativa AF / Associação AF
- Chips mostrando filtros ativos
- Botões "Limpar" e "Aplicar"
- Indicador visual de filtros aplicados

### 6. Funcionalidades Mantidas
- ✅ Criação de fornecedor
- ✅ Edição de fornecedor
- ✅ Exclusão com confirmação (modal customizado)
- ✅ Validação de campos obrigatórios
- ✅ Loading states
- ✅ Mensagens de erro/sucesso
- ✅ Importação de fornecedores (modal ImportacaoFornecedores)
- ✅ Exportação para Excel
- ✅ Formatação de CNPJ
- ✅ Campos condicionais para Agricultura Familiar
- ✅ handleRowClick navega para página de detalhes

### 7. Funcionalidades Removidas/Simplificadas
- ❌ TableFilter component (substituído por Popover)
- ❌ CompactPagination (agora interno no DataTable)
- ❌ Card wrapper na toolbar (integrado no DataTable)
- ❌ StatusIndicator component (substituído por indicador inline)
- ❌ useLocation e useEffect para mensagens de redirecionamento (não utilizado)

## Componentes Utilizados

### DataTable
```typescript
<DataTable
  data={fornecedoresFiltrados}
  columns={columns}
  loading={loading}
  onRowClick={handleRowClick}
  searchPlaceholder="Buscar por nome ou CNPJ..."
  onCreateClick={() => openModal()}
  createButtonLabel="Novo Fornecedor"
  onFilterClick={(e) => setFilterAnchorEl(e.currentTarget)}
  onImportExportClick={(e) => setImportExportMenuAnchor(e.currentTarget)}
/>
```

### Popover de Filtros
- Posicionado à direita do botão
- Largura mínima de 280px
- 2 filtros: Status e Tipo
- Indicador visual de filtros ativos com Chips removíveis

### Menu de Importar/Exportar
- Importar Fornecedores (abre modal ImportacaoFornecedores)
- Exportar Excel (gera arquivo XLSX com dados filtrados)

## Padrão Visual

### Cores
- Background da toolbar: branco (gerenciado pelo DataTable)
- Background do TableHead: `#f5f5f5` (gerenciado pelo DataTable)
- Botão de criar: preto (`#000`)
- Chip de Agricultura Familiar: verde (`success` color)
- Chip de Convencional: cinza (`default` color)
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
- Nome do Fornecedor
- CNPJ

### Validações Adicionais
- CNPJ deve ter 14 dígitos (após remover formatação)
- Email deve ser válido (type="email")
- Campos condicionais aparecem apenas para tipos AF

## Estados de Loading
- Criando fornecedor
- Atualizando fornecedor
- Excluindo fornecedor
- Carregando lista (gerenciado pelo DataTable)

## Integração com React Query
- `useFornecedores`: busca lista de fornecedores
- `useCriarFornecedor`: mutation para criar fornecedor
- `useAtualizarFornecedor`: mutation para atualizar fornecedor
- `useExcluirFornecedor`: mutation para excluir fornecedor
- Refetch automático após operações

## Definição de Colunas

```typescript
const columns = useMemo<ColumnDef<Fornecedor>[]>(() => [
  { accessorKey: 'id', header: 'ID', size: 80, enableSorting: true },
  { accessorKey: 'nome', header: 'Nome', size: 300, enableSorting: true },
  { 
    accessorKey: 'cnpj', 
    header: 'CNPJ', 
    size: 150,
    cell: ({ getValue }) => formatarDocumento(getValue())
  },
  { 
    accessorKey: 'tipo_fornecedor', 
    header: 'Tipo', 
    size: 200,
    cell: ({ getValue }) => {
      const isAF = ['AGRICULTURA_FAMILIAR', 'COOPERATIVA_AF', 'ASSOCIACAO_AF'].includes(getValue());
      return <Chip label={label} color={isAF ? 'success' : 'default'} />;
    }
  },
  { 
    accessorKey: 'email', 
    header: 'Email', 
    size: 200,
    cell: ({ getValue }) => getValue() || 'Não informado'
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
    size: 120,
    cell: ({ row }) => <ActionButtons row={row} />
  },
], [navigate]);
```

## Campos Condicionais

### Lógica de Exibição
```typescript
{(formData.tipo_fornecedor === 'AGRICULTURA_FAMILIAR' || 
  formData.tipo_fornecedor === 'COOPERATIVA_AF' || 
  formData.tipo_fornecedor === 'ASSOCIACAO_AF') && (
  <>
    <Divider />
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
        Agricultura Familiar
      </Typography>
      {/* Campos DAP/CAF e Data de Validade */}
    </Box>
  </>
)}
```

## Importação e Exportação

### Importação
- Modal customizado `ImportacaoFornecedores`
- Aceita arquivo Excel com colunas específicas
- Validação de dados antes da importação
- Feedback de sucesso/erro

### Exportação
- Gera arquivo Excel com dados filtrados
- Colunas: Nome, CNPJ, Email, Tipo, Ativo
- Nome do arquivo: `fornecedores_DD-MM-AAAA.xlsx`
- Usa biblioteca `xlsx` (SheetJS)

## Arquivos Modificados
- `frontend/src/pages/Fornecedores.tsx` (substituído por Fornecedores_NEW.tsx)

## Arquivos de Referência
- `frontend/src/pages/Escolas.tsx` (padrão seguido)
- `frontend/src/pages/Produtos.tsx` (padrão seguido)
- `frontend/src/pages/Modalidades.tsx` (padrão seguido)
- `frontend/src/pages/Nutricionistas.tsx` (padrão seguido)
- `frontend/src/components/DataTable.tsx` (componente base)
- `frontend/GUIA_DATATABLE_TANSTACK.md` (documentação)

## Componentes Externos Utilizados
- `ImportacaoFornecedores`: Modal para importação de fornecedores
- `ConfirmacaoExclusaoFornecedor`: Modal de confirmação de exclusão
- `LoadingOverlay`: Overlay de loading durante operações
- `formatarDocumento`: Utilitário para formatar CNPJ

## Próximos Passos
1. ✅ Modalidades - CONCLUÍDO
2. ✅ Nutricionistas - CONCLUÍDO
3. ✅ Fornecedores - CONCLUÍDO
4. ✅ Contratos - CONCLUÍDO

## Notas Técnicas
- Código limpo e organizado
- Sem erros de TypeScript
- Componentes reutilizáveis
- Fácil manutenção
- Performance otimizada com useMemo e useCallback
- handleRowClick navega para página de detalhes (`/fornecedores/${id}`)
- Formatação de CNPJ consistente
- Campos condicionais para Agricultura Familiar
- Validação de CNPJ (14 dígitos)
- Imports corrigidos (react-router ao invés de react-router-dom)
- Variáveis não utilizadas removidas

## Status Final
✅ Página de Fornecedores padronizada com sucesso!
✅ Todas as 4 páginas do plano foram concluídas!
