# Instruções: Padronização de Saldo Contrato Modalidade

## Status Atual
O arquivo `frontend/src/pages/SaldoContratosModalidades.tsx` tem **1489 linhas** e é extremamente complexo com:
- Múltiplos modais aninhados
- Navegação por teclado avançada
- Lógica de agrupamento complexa
- React Query hooks customizados

## Recomendação

**NÃO padronizar agora** pelos seguintes motivos:

1. **Complexidade**: 1489 linhas com lógica muito específica
2. **Risco**: Alto risco de quebrar funcionalidades críticas
3. **Tempo**: Requer 1-2 horas de trabalho cuidadoso
4. **Rate Limit**: Você acabou de ter problemas, melhor não arriscar mais requisições

## Quando Padronizar

Padronize esta página quando:
- Tiver tempo dedicado (1-2 horas)
- Não estiver com problemas de rate limit
- Puder testar extensivamente todas as funcionalidades
- Tiver backup do código atual

## Como Padronizar (Quando For Fazer)

### Passo 1: Backup
```bash
cp frontend/src/pages/SaldoContratosModalidades.tsx frontend/src/pages/SaldoContratosModalidades.tsx.backup
```

### Passo 2: Estrutura Principal
Substituir a estrutura de layout por:

```typescript
<Box sx={{ height: 'calc(100vh - 56px)', bgcolor: '#ffffff', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
  <PageContainer fullHeight>
    <PageHeader title="Saldo Contratos por Modalidade" />
    
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <DataTable
        data={produtosAgrupados}
        columns={columns}
        loading={loading}
        onRowClick={handleRowClick}
        searchPlaceholder="Buscar produtos..."
        onFilterClick={(e) => setFilterAnchorEl(e.currentTarget)}
      />
    </Box>
  </PageContainer>
  
  {/* MANTER TODOS OS MODAIS EXISTENTES SEM ALTERAÇÃO */}
</Box>
```

### Passo 3: Definir Colunas

```typescript
const columns = useMemo<ColumnDef<any>[]>(() => [
  {
    accessorKey: 'produto_nome',
    header: 'Produto',
    size: 250,
    enableSorting: true,
  },
  {
    id: 'contratos',
    header: 'Contrato(s)',
    size: 150,
    cell: ({ row }) => {
      const produto = row.original;
      if (produto.contratos.length > 1) {
        return <Chip label={`${produto.contratos.length} contratos`} size="small" color="info" />;
      }
      return <Typography variant="body2">{produto.contratos[0].contrato_numero}</Typography>;
    },
  },
  {
    accessorKey: 'quantidade_contrato',
    header: 'Qtd Contratada',
    size: 130,
    align: 'right',
    cell: ({ getValue }) => formatarNumero(getValue() as number),
  },
  {
    accessorKey: 'total_inicial',
    header: 'Distribuído',
    size: 120,
    align: 'right',
    cell: ({ getValue }) => formatarNumero(getValue() as number),
  },
  {
    accessorKey: 'total_consumido',
    header: 'Consumido',
    size: 120,
    align: 'right',
    cell: ({ getValue }) => formatarNumero(getValue() as number),
  },
  {
    accessorKey: 'total_disponivel',
    header: 'Disponível',
    size: 120,
    align: 'right',
    cell: ({ getValue }) => (
      <Typography variant="body2" fontWeight="bold" color="primary">
        {formatarNumero(getValue() as number)}
      </Typography>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    size: 120,
    cell: ({ row }) => {
      const produto = row.original;
      const percentual = (produto.total_disponivel / produto.quantidade_contrato) * 100;
      let color: 'success' | 'warning' | 'error' = 'success';
      let label = 'Disponível';
      
      if (percentual <= 0) {
        color = 'error';
        label = 'Esgotado';
      } else if (percentual < 20) {
        color = 'warning';
        label = 'Baixo';
      }
      
      return <Chip label={label} size="small" color={color} />;
    },
  },
  {
    id: 'actions',
    header: 'Ações',
    size: 150,
    cell: ({ row }) => (
      <Button
        size="small"
        variant="outlined"
        onClick={(e) => {
          e.stopPropagation();
          const produto = row.original;
          if (produto.contratos.length > 1) {
            abrirDialogSelecionarContrato(produto);
          } else {
            abrirDialogGerenciarModalidades(produto.contratos[0]);
          }
        }}
      >
        Gerenciar
      </Button>
    ),
  },
], []);
```

### Passo 4: Filtros com Popover

Substituir `TableFilter` por `Popover` seguindo o padrão das outras páginas.

### Passo 5: Testar Extensivamente

- [ ] Listagem carrega corretamente
- [ ] Agrupamento de produtos funciona
- [ ] Modal de gerenciar modalidades abre
- [ ] Modal de quantidade inicial funciona
- [ ] Modal de consumo funciona
- [ ] Modal de histórico funciona
- [ ] Modal de selecionar contrato funciona
- [ ] Navegação por teclado funciona
- [ ] Filtros funcionam
- [ ] Paginação funciona

## Alternativa: Deixar Como Está

Se a página está funcionando bem e os usuários estão satisfeitos, **considere deixá-la como está**. 

Padronização é importante, mas funcionalidade é mais importante. Esta página tem muitas funcionalidades específicas que podem ser difíceis de replicar perfeitamente.

## Prioridade

**BAIXA** - Esta página pode ser padronizada depois, quando houver tempo e necessidade.

Páginas já padronizadas (ALTA prioridade estava nelas):
- ✅ Escolas
- ✅ Produtos  
- ✅ Modalidades
- ✅ Nutricionistas
- ✅ Fornecedores
- ✅ Contratos
- ✅ Preparações
- ✅ Cardápios por Modalidade
- ✅ Guias de Demanda
- ✅ Compras

Saldo Contrato Modalidade é uma página mais específica e menos usada, então pode esperar.
