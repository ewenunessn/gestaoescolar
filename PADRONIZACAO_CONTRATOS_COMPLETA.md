# Padronização da Página de Contratos - Completa

## Resumo
A página de Contratos foi completamente atualizada para seguir o mesmo padrão visual e funcional das páginas de Escolas, Produtos, Modalidades e Nutricionistas, utilizando o componente DataTable com TanStack Table.

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
- Número (150px) - com sorting, texto em negrito
- Fornecedor (250px) - nome do fornecedor via mapa
- Status (120px) - Chip colorido (Vigente/Vencido/Suspenso)
- Vigência (200px) - formatado como "DD/MM/AAAA a DD/MM/AAAA"
- Valor Total (150px) - com sorting, formatado como moeda em negrito
- Ações (100px) - botão de ver detalhes

### 4. Diferenças em Relação às Outras Páginas
Esta página tem características únicas:

#### Sem Modal de Criação
- Botão "Novo Contrato" navega para `/contratos/novo` (página separada)
- Não abre modal como nas outras páginas
- Criação de contrato é mais complexa e requer página dedicada

#### Navegação para Detalhes
- handleRowClick navega para `/contratos/${id}` (página de detalhes)
- Não abre modal de edição como nas outras páginas
- Página de detalhes permite visualizar e editar produtos do contrato

#### Cálculo de Status Dinâmico
- Status calculado baseado em datas (não armazenado no banco)
- Função `getStatusContrato` verifica:
  - Se `ativo === false` → "suspenso"
  - Se `data_fim < hoje` → "vencido"
  - Caso contrário → "vigente"

### 5. Sistema de Filtros com Popover
- **Fornecedor**: Dropdown com todos os fornecedores cadastrados
- **Status**: Todos / Vigente / Vencido / Suspenso
- Chips mostrando filtros ativos
- Botões "Limpar" e "Aplicar"
- Indicador visual de filtros aplicados

### 6. Funcionalidades Mantidas
- ✅ Navegação para criação de contrato
- ✅ Navegação para detalhes do contrato
- ✅ Exclusão com confirmação (modal)
- ✅ Loading states
- ✅ Mensagens de erro/sucesso
- ✅ Cálculo dinâmico de status
- ✅ Formatação de valores monetários
- ✅ Formatação de datas
- ✅ Mapa de fornecedores para performance

### 7. Funcionalidades Removidas/Simplificadas
- ❌ TableFilter component (substituído por Popover)
- ❌ CompactPagination (agora interno no DataTable)
- ❌ Card wrapper na toolbar (integrado no DataTable)
- ❌ StatusIndicator component (substituído por Chip)
- ❌ Legenda de status manual (removida)
- ❌ Menu de ações vazio (mantido apenas estrutura)

## Componentes Utilizados

### DataTable
```typescript
<DataTable
  data={contratosFiltrados}
  columns={columns}
  loading={loading}
  onRowClick={handleRowClick}
  searchPlaceholder="Buscar contratos..."
  onCreateClick={() => navigate('/contratos/novo')}
  createButtonLabel="Novo Contrato"
  onFilterClick={(e) => setFilterAnchorEl(e.currentTarget)}
/>
```

### Popover de Filtros
- Posicionado à direita do botão
- Largura mínima de 280px
- 2 filtros: Fornecedor (dropdown) e Status (dropdown)
- Indicador visual de filtros ativos com Chips removíveis

### Modal de Exclusão
- Confirmação simples com nome do contrato
- Botão de excluir com loading state
- Tratamento de erros (contrato em uso)

## Padrão Visual

### Cores
- Background da toolbar: branco (gerenciado pelo DataTable)
- Background do TableHead: `#f5f5f5` (gerenciado pelo DataTable)
- Botão de criar: preto (`#000`)
- Chip de status vigente: verde (`success`)
- Chip de status vencido: vermelho (`error`)
- Chip de status suspenso: cinza (`default`)

### Bordas
- Container: `borderRadius: 2` com `overflow: hidden`
- Gerenciadas pelo DataTable component

### Espaçamento
- Padding do modal: consistente (px: 3, py: 2)
- Gap entre elementos: padrão Material UI

## Funções Auxiliares

### getStatusContrato
```typescript
const getStatusContrato = useCallback((contrato: Contrato) => {
  if (!contrato.ativo) return { status: 'suspenso', color: 'default' as const };
  const hoje = new Date();
  const fim = new Date(contrato.data_fim);
  if (hoje > fim) return { status: 'vencido', color: 'error' as const };
  return { status: 'vigente', color: 'success' as const };
}, []);
```

### formatarData
```typescript
const formatarData = (data: string) => new Date(data).toLocaleDateString('pt-BR');
```

### formatarValor
```typescript
const formatarValor = (valor?: number) =>
  `R$ ${(Number(valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
```

## Estados de Loading
- Carregando lista de contratos
- Excluindo contrato (no botão do modal)
- Carregando lista (gerenciado pelo DataTable)

## Integração com Services
- `listarContratos()`: busca lista de contratos
- `listarFornecedores()`: busca lista de fornecedores
- `removerContrato(id)`: exclui contrato
- Navegação para `/contratos/novo` para criar
- Navegação para `/contratos/${id}` para detalhes

## Definição de Colunas

```typescript
const columns = useMemo<ColumnDef<Contrato>[]>(
  () => [
    { accessorKey: 'id', header: 'ID', size: 80, enableSorting: true },
    { 
      accessorKey: 'numero', 
      header: 'Número', 
      size: 150,
      cell: ({ getValue }) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {getValue() as string}
        </Typography>
      )
    },
    { 
      accessorKey: 'fornecedor_id', 
      header: 'Fornecedor', 
      size: 250,
      cell: ({ getValue }) => fornecedorMap.get(getValue() as number) || 'N/A'
    },
    { 
      id: 'status',
      header: 'Status',
      size: 120,
      cell: ({ row }) => {
        const statusInfo = getStatusContrato(row.original);
        return <Chip label={statusInfo.status} color={statusInfo.color} />;
      }
    },
    { 
      id: 'vigencia',
      header: 'Vigência',
      size: 200,
      cell: ({ row }) => `${formatarData(row.original.data_inicio)} a ${formatarData(row.original.data_fim)}`
    },
    { 
      accessorKey: 'valor_total_contrato', 
      header: 'Valor Total', 
      size: 150,
      cell: ({ getValue }) => formatarValor(getValue() as number)
    },
    {
      id: 'actions',
      header: 'Ações',
      size: 100,
      cell: ({ row }) => <ActionButtons row={row} />
    },
  ],
  [fornecedorMap, getStatusContrato]
);
```

## Arquivos Modificados
- `frontend/src/pages/Contratos.tsx`

## Arquivos de Referência
- `frontend/src/pages/Escolas.tsx` (padrão seguido)
- `frontend/src/pages/Produtos.tsx` (padrão seguido)
- `frontend/src/pages/Modalidades.tsx` (padrão seguido)
- `frontend/src/pages/Nutricionistas.tsx` (padrão seguido)
- `frontend/src/components/DataTable.tsx` (componente base)
- `frontend/GUIA_DATATABLE_TANSTACK.md` (documentação)

## Progresso da Padronização
1. ✅ Escolas - CONCLUÍDO
2. ✅ Produtos - CONCLUÍDO
3. ✅ Modalidades - CONCLUÍDO
4. ✅ Nutricionistas - CONCLUÍDO
5. ✅ Contratos - CONCLUÍDO
6. ⏳ Fornecedores - Próximo

## Notas Técnicas
- Código limpo e organizado
- Sem erros de TypeScript
- Componentes reutilizáveis
- Fácil manutenção
- Performance otimizada com useMemo e useCallback
- handleRowClick navega para página de detalhes
- Formatação de moeda e data consistente
- Cálculo dinâmico de status baseado em datas
- Navegação para página separada de criação (diferente das outras)

## Diferenças Importantes

### Contratos vs Outras Páginas

| Característica | Escolas/Produtos/Modalidades/Nutricionistas | Contratos |
|----------------|---------------------------------------------|-----------|
| Criação | Modal inline | Página separada (`/contratos/novo`) |
| Edição | Modal inline | Página de detalhes (`/contratos/${id}`) |
| handleRowClick | Abre modal de edição | Navega para detalhes |
| Status | Campo no banco | Calculado dinamicamente |
| Complexidade | Formulário simples | Formulário complexo com produtos |

## Próximos Passos
1. ✅ Contratos - CONCLUÍDO
2. ⏳ Fornecedores - Finalizar `Fornecedores_NEW.tsx`
   - Adicionar menu de importar/exportar
   - Implementar campos condicionais para Agricultura Familiar
   - Modal em 5 seções
   - Filtros: Status e Tipo de Fornecedor
   - Substituir arquivo original
   - Criar documento de padronização
