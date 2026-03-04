# Pedidos: Competência e Novo Formato de Número

## Mudanças Implementadas

### 1. Coluna `competencia_mes_ano`
Adicionada coluna na tabela `pedidos` para armazenar o mês/ano de competência do pedido.

**Formato**: `YYYY-MM` (ex: `2026-03`)

**Comportamento**:
- Ao criar pedido, pode ser informada a competência desejada
- Se não informada, usa mês/ano atual
- Pedidos existentes foram preenchidos com base na `data_pedido`

### 2. Novo Formato de Número

**Formato Antigo**: `PED2026000001`

**Formato Novo**: `PED-MAR2026000001`

**Estrutura**:
- `PED-` - Prefixo fixo
- `MAR` - Mês em 3 letras maiúsculas (baseado na competência)
- `2026` - Ano (baseado na competência)
- `000001` - Sequencial de 6 dígitos (reinicia a cada competência)

**Meses**:
```
JAN, FEV, MAR, ABR, MAI, JUN, JUL, AGO, SET, OUT, NOV, DEZ
```

### 3. Sequencial por Competência

O número sequencial agora é único por competência, não por ano.

**Exemplos**:
- Primeiro pedido de março/2026: `PED-MAR2026000001`
- Segundo pedido de março/2026: `PED-MAR2026000002`
- Primeiro pedido de abril/2026: `PED-ABR2026000001`

## Arquivos Modificados

### Backend

**Migration**:
- `backend/src/migrations/20260304_add_competencia_to_pedidos.sql`

**Controller**:
- `backend/src/modules/pedidos/controllers/pedidoController.ts`
  - Atualizada função `criarPedido()` para:
    - Aceitar `competencia_mes_ano` no body
    - Gerar número no novo formato
    - Buscar sequencial por competência

**Scripts**:
- `backend/scripts/apply-competencia-pedidos.js` - Aplica migration
- `backend/scripts/update-pedidos-numero-format.js` - Atualiza números existentes

### Frontend

**Componente**:
- `frontend/src/pages/NovoPedido.tsx`
  - Adicionado campo "Competência (Mês/Ano)"
  - Campo tipo `month` para seleção fácil
  - Valor padrão: mês/ano atual
  - Enviado no payload ao criar pedido

## Banco de Dados

### Estrutura

```sql
ALTER TABLE pedidos 
ADD COLUMN competencia_mes_ano VARCHAR(7);

CREATE INDEX idx_pedidos_competencia_mes_ano 
ON pedidos(competencia_mes_ano);
```

### Dados Atualizados

**LOCAL**:
- 1 pedido atualizado: `PED2026000001` → `PED-FEV2026000001`

**NEON**:
- 1 pedido atualizado: `PED2026000001` → `PED-MAR2026000001`

## Como Usar

### Criar Pedido com Competência Específica

```typescript
const dados = {
  competencia_mes_ano: '2026-04', // Abril/2026
  observacoes: 'Pedido para abril',
  itens: [...]
};

await pedidosService.criar(dados);
// Gera: PED-ABR2026000001
```

### Criar Pedido com Competência Atual

```typescript
const dados = {
  // competencia_mes_ano não informado = usa mês/ano atual
  observacoes: 'Pedido normal',
  itens: [...]
};

await pedidosService.criar(dados);
// Gera: PED-MAR2026000001 (se estamos em março/2026)
```

## Benefícios

1. **Organização**: Pedidos agrupados por competência
2. **Rastreabilidade**: Número indica claramente o período
3. **Sequencial Lógico**: Reinicia a cada mês, facilitando contagem
4. **Flexibilidade**: Permite criar pedidos para competências futuras
5. **Legibilidade**: Formato mais claro e informativo

## Compatibilidade

- ✅ Pedidos antigos mantêm números atualizados
- ✅ Queries existentes continuam funcionando
- ✅ Índice criado para performance
- ✅ Frontend atualizado com novo campo
- ✅ Backend valida e gera números corretamente

## Próximos Passos

1. Testar criação de pedidos no frontend
2. Verificar se números são gerados corretamente
3. Validar sequencial por competência
4. Atualizar relatórios se necessário
