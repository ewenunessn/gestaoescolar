# Plano: Padronização de Saldo Contrato Modalidade

## Análise do Arquivo Atual
- **Tamanho**: 1489 linhas
- **Complexidade**: MUITO ALTA
- **Funcionalidades**:
  - Listagem de produtos com saldo por modalidade
  - Modal para gerenciar modalidades de um produto
  - Modal para editar quantidade inicial
  - Modal para registrar consumo
  - Modal para ver histórico
  - Modal para selecionar contrato (quando produto tem múltiplos contratos)
  - Navegação por teclado complexa
  - Agrupamento de produtos por contrato

## Estratégia de Padronização

### Opção 1: Padronização Completa (RECOMENDADA)
Reescrever apenas a listagem principal com DataTable, mantendo os modais existentes:

**Vantagens**:
- Consistência visual com outras páginas
- Scroll apenas no corpo da tabela
- Filtros padronizados com Popover
- Mais fácil de manter

**Desvantagens**:
- Precisa adaptar a lógica de agrupamento
- Pode quebrar funcionalidades existentes se não for cuidadoso

### Opção 2: Padronização Mínima
Apenas ajustar o layout para usar PageContainer/PageHeader, mantendo Table manual:

**Vantagens**:
- Menos risco de quebrar funcionalidades
- Mais rápido

**Desvantagens**:
- Não fica consistente com outras páginas
- Mantém problemas de scroll

## Decisão: Opção 1 - Padronização Completa

### Estrutura Proposta

```typescript
// Listagem principal com DataTable
<Box sx={{ height: 'calc(100vh - 56px)', ... }}>
  <PageContainer fullHeight>
    <PageHeader title="Saldo Contratos por Modalidade" />
    
    <Box sx={{ flex: 1, minHeight: 0, ... }}>
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
  
  {/* Manter todos os modais existentes */}
  {/* Modal Gerenciar Modalidades */}
  {/* Modal Quantidade Inicial */}
  {/* Modal Consumo */}
  {/* Modal Histórico */}
  {/* Modal Selecionar Contrato */}
</Box>
```

### Colunas do DataTable

1. **Produto** - Nome do produto
2. **Contrato** - Número do contrato (ou "Múltiplos" se > 1)
3. **Fornecedor** - Nome do fornecedor
4. **Qtd Contratada** - Quantidade total contratada
5. **Distribuído** - Total distribuído nas modalidades
6. **Consumido** - Total consumido
7. **Disponível** - Saldo disponível
8. **Status** - Chip colorido (Disponível/Baixo/Esgotado)
9. **Ações** - Botão "Gerenciar Modalidades"

### Filtros com Popover

- Status (Disponível, Baixo Estoque, Esgotado)
- Fornecedor (select)
- Contrato (select)

## Implementação

Devido ao tamanho e complexidade, vou:
1. Criar um novo arquivo temporário com a versão padronizada
2. Testar
3. Substituir o original

## Riscos

- Navegação por teclado pode precisar ser adaptada
- Agrupamento de produtos pode ter bugs
- Modais podem precisar ajustes nas referências

## Tempo Estimado

- 30-45 minutos para implementação completa
- Mais 15-30 minutos para testes e ajustes
