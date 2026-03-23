# Situação Atual: Múltiplos Contratos + Produtos Sem Contrato

## Problema Identificado

Ao tentar gerar pedido da Guia #58:
- ✅ 6 produtos COM contrato
- ❌ 2 produtos SEM contrato (Chicória, Coentro)
- ⚠️ 1 produto com MÚLTIPLOS contratos

## Logs do Backend

```
📊 Produtos com contratos: 6
🔍 Verificando produtos sem contrato...
✅ Produtos COM contrato: 6
❌ Produtos SEM contrato: 2
📋 Detalhes produtos sem contrato: Chicória (6.933kg), Coentro (3.1229999999999998kg)
🔍 Verificando produtos com múltiplos contratos...
📊 Produtos com múltiplos contratos: 1
🔍 Verificando seleção de contratos...
📋 Contratos selecionados recebidos: NÃO
📊 Produtos com múltiplos contratos: 1
⚠️ Retornando para seleção de múltiplos contratos
```

## Comportamento Atual

### Backend
1. ✅ Detecta produtos sem contrato corretamente
2. ✅ Detecta produtos com múltiplos contratos corretamente
3. ✅ Retorna `requer_selecao: true` quando há múltiplos contratos
4. ✅ Inclui `produtos_sem_contrato` na resposta

### Frontend (GerarPedidoDaGuiaDialog)
1. ✅ Recebe a resposta do backend
2. ✅ Detecta `requer_selecao: true`
3. ⚠️ Mostra mensagem de erro ao usuário
4. ❌ NÃO tem interface para selecionar contratos múltiplos
5. ✅ Avisa sobre produtos sem contrato

## Resposta do Backend

```json
{
  "requer_selecao": true,
  "produtos_multiplos_contratos": [
    {
      "produto_id": 128,
      "produto_nome": "Alface",
      "unidade": "kg",
      "quantidade_necessaria": 150.5,
      "contratos": [
        {
          "contrato_produto_id": 45,
          "contrato_id": 12,
          "contrato_numero": "CONT-2026-001",
          "fornecedor_id": 5,
          "fornecedor_nome": "Fornecedor A",
          "preco_unitario": 3.50,
          "saldo_disponivel": 1000,
          "data_fim": "2026-12-31"
        },
        {
          "contrato_produto_id": 67,
          "contrato_id": 15,
          "contrato_numero": "CONT-2026-002",
          "fornecedor_id": 8,
          "fornecedor_nome": "Fornecedor B",
          "preco_unitario": 3.20,
          "saldo_disponivel": 800,
          "data_fim": "2026-11-30"
        }
      ]
    }
  ],
  "produtos_sem_contrato": [
    {
      "produto_id": 118,
      "produto_nome": "Chicória",
      "quantidade": 6.933
    },
    {
      "produto_id": 169,
      "produto_nome": "Coentro",
      "quantidade": 3.123
    }
  ],
  "mensagem": "1 produto(s) encontrado(s) em múltiplos contratos. Selecione qual contrato usar para cada produto."
}
```

## Mensagem Atual ao Usuário

```
❌ 1 produto(s) encontrado(s) em múltiplos contratos. Selecione qual contrato usar para cada produto.

Por favor, use a tela de Planejamento de Compras para selecionar os contratos.

⚠️ Produtos sem contrato (serão ignorados): Chicória, Coentro
```

## Solução Temporária

O usuário deve:
1. Ir para a tela "Planejamento de Compras"
2. Usar a funcionalidade "Gerar Pedidos por Período"
3. Lá existe um dialog para selecionar contratos múltiplos
4. Após selecionar, o pedido será gerado

## Solução Ideal (Futura)

Implementar no `GerarPedidoDaGuiaDialog.tsx`:
1. Dialog de seleção de múltiplos contratos (similar ao PlanejamentoCompras)
2. Permitir que o usuário escolha qual contrato usar
3. Reenviar a requisição com `contratos_selecionados`

## Arquivos Envolvidos

### Backend
- `backend/src/controllers/planejamentoComprasController.ts`
  - Função `gerarPedidoDaGuia` (linhas 1313-1730)
  - ✅ Implementado corretamente

### Frontend
- `frontend/src/components/GerarPedidoDaGuiaDialog.tsx`
  - ⚠️ Falta implementar dialog de seleção de múltiplos contratos
  - ✅ Detecta e avisa o usuário

- `frontend/src/pages/PlanejamentoCompras.tsx`
  - ✅ Já tem dialog de seleção de múltiplos contratos implementado
  - Pode ser usado como referência

## Próximos Passos

### Opção 1: Implementar Dialog de Seleção (Recomendado)
1. Copiar lógica do `PlanejamentoCompras.tsx`
2. Criar componente `SelecaoMultiplosContratosDialog`
3. Integrar no `GerarPedidoDaGuiaDialog.tsx`

### Opção 2: Simplificar (Temporário)
1. Quando houver múltiplos contratos, usar sempre o mais barato
2. Ou usar sempre o com maior saldo disponível
3. Adicionar flag no backend: `usar_contrato_automatico: 'mais_barato' | 'maior_saldo'`

### Opção 3: Redirecionar (Atual)
1. ✅ Avisar usuário para usar Planejamento de Compras
2. ✅ Mostrar quais produtos têm múltiplos contratos
3. ✅ Mostrar quais produtos não têm contrato

## Código de Referência

### PlanejamentoCompras.tsx - Dialog de Seleção

```typescript
// Estado
const [dialogSelecaoContratos, setDialogSelecaoContratos] = useState(false);
const [produtosMultiplosContratos, setProdutosMultiplosContratos] = useState<any[]>([]);
const [contratosSelecionados, setContratosSelecionados] = useState<any[]>([]);

// Quando recebe requer_selecao
if (res.requer_selecao) {
  setProdutosMultiplosContratos(res.produtos_multiplos_contratos || []);
  setDialogSelecaoContratos(true);
  return;
}

// Dialog
<SelecaoMultiplosContratosDialog
  open={dialogSelecaoContratos}
  produtos={produtosMultiplosContratos}
  onConfirmar={(selecionados) => {
    setContratosSelecionados(selecionados);
    setDialogSelecaoContratos(false);
    // Reenviar requisição com contratos selecionados
    handleGerarPedidoDaGuia();
  }}
  onCancelar={() => setDialogSelecaoContratos(false)}
/>
```

## Teste

Para testar a situação atual:
1. Criar guia com produtos que têm múltiplos contratos
2. Tentar gerar pedido
3. Verificar mensagem de erro
4. Ir para Planejamento de Compras
5. Gerar pedido por período
6. Selecionar contratos no dialog
7. Verificar se pedido é gerado corretamente

## Conclusão

O backend está funcionando perfeitamente e detectando todas as situações:
- ✅ Produtos sem contrato
- ✅ Produtos com múltiplos contratos
- ✅ Retorna informações corretas

O frontend precisa de melhorias:
- ⚠️ Implementar dialog de seleção de múltiplos contratos
- ✅ Avisar usuário sobre produtos sem contrato
- ✅ Mostrar mensagens claras

Por enquanto, o usuário deve usar a tela de Planejamento de Compras quando houver produtos com múltiplos contratos.
