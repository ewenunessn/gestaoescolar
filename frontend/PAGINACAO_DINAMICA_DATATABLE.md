# Paginação Dinâmica no DataTable

## Implementação Concluída

O DataTable agora calcula automaticamente o número de linhas por página baseado na altura disponível da tela, eliminando espaços em branco e preenchendo toda a área visível.

## Mudanças Realizadas

### Componente DataTable

**Arquivo**: `frontend/src/components/DataTable.tsx`

#### Novas Props

```typescript
interface DataTableProps<TData> {
  // ... props existentes
  initialPageSize?: number; // Tamanho inicial da página (padrão: 10)
  autoCalculatePageSize?: boolean; // Calcular automaticamente baseado na altura
}
```

#### Funcionalidade

1. **Cálculo Automático**:
   - Usa `ResizeObserver` para detectar mudanças no tamanho do container
   - Calcula quantas linhas cabem na altura disponível
   - Altura de linha: 53px (padrão do MUI TableRow)
   - Mínimo: 5 linhas
   - Máximo: 100 linhas

2. **Responsividade**:
   - Recalcula ao redimensionar a janela
   - Recalcula ao mudar o tamanho do container
   - Atualiza automaticamente o pageSize

3. **Referência ao Container**:
   ```typescript
   const tableContainerRef = useRef<HTMLDivElement>(null);
   ```

#### Código de Cálculo

```typescript
useEffect(() => {
  if (!autoCalculatePageSize) return;

  const calculatePageSize = () => {
    if (!tableContainerRef.current) return;

    const container = tableContainerRef.current;
    const availableHeight = container.clientHeight;
    const rowHeight = 53; // altura padrão de uma TableRow do MUI
    
    const calculatedPageSize = Math.floor(availableHeight / rowHeight);
    const newPageSize = Math.max(5, Math.min(100, calculatedPageSize));
    
    setPagination((prev) => ({
      ...prev,
      pageSize: newPageSize,
    }));
  };

  calculatePageSize();

  window.addEventListener('resize', handleResize);
  
  const resizeObserver = new ResizeObserver(() => {
    calculatePageSize();
  });

  if (tableContainerRef.current) {
    resizeObserver.observe(tableContainerRef.current);
  }

  return () => {
    window.removeEventListener('resize', handleResize);
    resizeObserver.disconnect();
  };
}, [autoCalculatePageSize]);
```

### Páginas Atualizadas

Todas as páginas principais agora usam paginação dinâmica:

#### 1. Escolas
```typescript
<DataTable
  // ... outras props
  initialPageSize={100}
  autoCalculatePageSize={true}
/>
```
- Tamanho inicial: 100 linhas
- Cálculo automático ativado

#### 2. Contratos
```typescript
<DataTable
  // ... outras props
  autoCalculatePageSize={true}
/>
```
- Tamanho inicial: padrão (10)
- Cálculo automático ativado

#### 3. Produtos
```typescript
<DataTable
  // ... outras props
  autoCalculatePageSize={true}
/>
```

#### 4. Fornecedores
```typescript
<DataTable
  // ... outras props
  autoCalculatePageSize={true}
/>
```

#### 5. Nutricionistas
```typescript
<DataTable
  // ... outras props
  autoCalculatePageSize={true}
/>
```

#### 6. Modalidades
```typescript
<DataTable
  // ... outras props
  autoCalculatePageSize={true}
/>
```

#### 7. Preparações
```typescript
<DataTable
  // ... outras props
  autoCalculatePageSize={true}
/>
```

#### 8. Compras (Pedidos)
```typescript
<DataTable
  // ... outras props
  autoCalculatePageSize={true}
/>
```

## Como Funciona

1. **Inicialização**:
   - DataTable renderiza com `initialPageSize` (padrão: 10)
   - Se `autoCalculatePageSize={true}`, inicia cálculo automático

2. **Cálculo**:
   - Mede altura do container da tabela
   - Divide pela altura de uma linha (53px)
   - Aplica limites (min: 5, max: 100)
   - Atualiza `pageSize` automaticamente

3. **Responsividade**:
   - `window.resize` → recalcula
   - `ResizeObserver` → recalcula quando container muda
   - Sidebar abre/fecha → recalcula automaticamente

4. **Resultado**:
   - Tabela sempre preenche o espaço disponível
   - Sem espaços em branco
   - Melhor aproveitamento da tela

## Vantagens

- ✅ Elimina espaços em branco
- ✅ Aproveita toda a altura da tela
- ✅ Responsivo (adapta ao redimensionar)
- ✅ Configurável por página
- ✅ Mantém compatibilidade com paginação manual
- ✅ Performance: usa ResizeObserver nativo

## Configuração

### Ativar Cálculo Automático
```typescript
<DataTable
  autoCalculatePageSize={true}
/>
```

### Definir Tamanho Inicial Específico
```typescript
<DataTable
  initialPageSize={100}
  autoCalculatePageSize={true}
/>
```

### Desativar (Usar Paginação Manual)
```typescript
<DataTable
  initialPageSize={25}
  // autoCalculatePageSize não definido ou false
/>
```

## Observações

- Altura de linha: 53px (padrão MUI)
- Mínimo: 5 linhas (evita paginação muito pequena)
- Máximo: 100 linhas (evita sobrecarga)
- Escolas usa 100 como inicial (requisito do usuário)
- Outras páginas usam cálculo automático sem inicial específico

## Compatibilidade

- ✅ Funciona com todas as features existentes do DataTable
- ✅ Compatível com filtros
- ✅ Compatível com busca
- ✅ Compatível com ordenação
- ✅ Usuário pode mudar manualmente o pageSize
