# Resumo: Seleção e Divisão de Contratos

## Status: ✅ IMPLEMENTADO E CORRIGIDO

## Problema Resolvido
Produtos que aparecem em múltiplos contratos agora podem ser:
1. Selecionados de um único contrato (modo simples)
2. Divididos entre múltiplos contratos com quantidades específicas (modo divisão)

## Correções Aplicadas
- ✅ Erro crítico corrigido: `pedido_item_id` → `pedido_id` no INSERT de pedido_itens
- ✅ Imports não utilizados removidos do dialog

## Funcionalidades Implementadas

### Backend (`planejamentoComprasController.ts`)
1. **Detecção de múltiplos contratos**
   - Query retorna TODOS os contratos ativos para cada produto
   - Flag `requer_selecao: true` quando produto tem 2+ contratos
   - Retorna array `contratos_disponiveis` com detalhes

2. **Suporte a divisão de quantidade**
   - Aceita `contratos_selecionados` com campo `quantidade` opcional
   - Se `quantidade` especificada: cria item com essa quantidade
   - Se `quantidade` não especificada: usa quantidade total do produto
   - Permite múltiplos itens do mesmo produto (um por contrato)

3. **Aplicado em ambas funções**
   - `gerarPedidosPorPeriodo`: Gera pedidos por período
   - `gerarPedidoDaGuia`: Gera pedido de uma guia específica

### Frontend

#### Dialog (`SelecionarContratosDialog.tsx`)
- **Modo Simples**: Checkbox desmarcado
  - Seleciona 1 contrato por produto
  - Quantidade total vai para o contrato selecionado
  
- **Modo Divisão**: Checkbox marcado
  - Permite adicionar múltiplos contratos
  - Campo de quantidade para cada contrato
  - Botão para adicionar/remover contratos
  - Validação: total alocado = quantidade necessária

- **Botão "Dividir por Saldo Disponível"**
  - Distribui automaticamente entre contratos
  - Prioriza contratos com maior saldo
  - Ativa modo divisão automaticamente

- **Validação Visual**
  - Mostra total alocado vs necessário
  - Alerta se falta ou sobra quantidade
  - Botão confirmar desabilitado se inválido

#### Integração (`PlanejamentoCompras.tsx`)
- Estados para contratos selecionados
- Abre dialog quando `requer_selecao: true`
- Envia seleção para backend ao confirmar

#### Serviço (`planejamentoCompras.ts`)
- Interface atualizada com `quantidade?: number`
- Suporta envio de contratos com divisão

## Exemplo de Uso

### Cenário: Coentro em 3 contratos
```
Produto: Coentro
Quantidade necessária: 100kg

Contratos disponíveis:
1. Fornecedor A - R$ 5,00/kg - Saldo: 40kg
2. Fornecedor B - R$ 4,50/kg - Saldo: 50kg
3. Fornecedor C - R$ 6,00/kg - Saldo: 30kg
```

**Opção 1: Modo Simples**
- Seleciona apenas Fornecedor B
- 100kg vai para Fornecedor B

**Opção 2: Modo Divisão Manual**
- Fornecedor A: 40kg
- Fornecedor B: 60kg
- Total: 100kg ✓

**Opção 3: Divisão Automática por Saldo**
- Fornecedor B: 50kg (maior saldo)
- Fornecedor A: 40kg
- Fornecedor C: 10kg
- Total: 100kg ✓

## Estrutura de Dados

### Request para Backend
```typescript
{
  guia_id: 123,
  contratos_selecionados: [
    { produto_id: 1, contrato_produto_id: 10, quantidade: 40 },
    { produto_id: 1, contrato_produto_id: 11, quantidade: 60 },
    { produto_id: 2, contrato_produto_id: 15 } // sem quantidade = total
  ]
}
```

### Response do Backend (quando requer seleção)
```typescript
{
  requer_selecao: true,
  produtos_multiplos_contratos: [
    {
      produto_id: 1,
      produto_nome: "Coentro",
      unidade: "kg",
      quantidade_necessaria: 100,
      contratos: [
        {
          contrato_produto_id: 10,
          contrato_numero: "001/2024",
          fornecedor_nome: "Fornecedor A",
          preco_unitario: 5.00,
          saldo_disponivel: 40
        },
        // ... mais contratos
      ]
    }
  ]
}
```

## Próximos Passos para Teste

1. **Teste Básico**
   - Produto em 1 contrato → deve funcionar automaticamente
   - Produto em 2+ contratos → deve abrir dialog

2. **Teste Modo Simples**
   - Selecionar 1 contrato
   - Confirmar
   - Verificar pedido criado com quantidade total

3. **Teste Modo Divisão**
   - Marcar checkbox "Dividir entre contratos"
   - Adicionar múltiplos contratos
   - Especificar quantidades
   - Confirmar quando total = necessário
   - Verificar múltiplos itens no pedido

4. **Teste Divisão Automática**
   - Clicar "Dividir por Saldo Disponível"
   - Verificar distribuição automática
   - Confirmar e verificar pedido

## Arquivos Modificados
- `backend/src/controllers/planejamentoComprasController.ts`
- `frontend/src/components/SelecionarContratosDialog.tsx` (novo)
- `frontend/src/pages/PlanejamentoCompras.tsx`
- `frontend/src/services/planejamentoCompras.ts`

## Commit
```
feat: implementa seleção e divisão de contratos para produtos em múltiplos contratos
- Corrige erro crítico: pedido_item_id -> pedido_id no INSERT
- Backend: detecta produtos em múltiplos contratos e retorna flag requer_selecao
- Backend: suporta divisão de quantidade entre múltiplos contratos
- Frontend: dialog completo com modo simples e modo divisão
- Frontend: botão 'Dividir por Saldo Disponível' para distribuição automática
- Frontend: validação de quantidade total alocada
```
