# Implementação: Seleção de Múltiplos Contratos no GerarPedidoDaGuiaDialog

## Problema Resolvido

Quando um produto da guia tem múltiplos contratos disponíveis, o sistema agora permite que o usuário:
1. ✅ Escolha qual contrato usar
2. ✅ Divida a quantidade entre múltiplos contratos
3. ✅ Veja informações detalhadas de cada contrato (fornecedor, preço, saldo)

## Implementação

### 1. Estados Adicionados

```typescript
// Estados para seleção de múltiplos contratos
const [produtosMultiplosContratos, setProdutosMultiplosContratos] = useState<any[]>([]);
const [dialogSelecaoContratos, setDialogSelecaoContratos] = useState(false);
const [contratosSelecionados, setContratosSelecionados] = useState<any[]>([]);
```

### 2. Fluxo de Geração de Pedido

```typescript
async function handleGerar() {
  const resultado = await gerarPedidoDaGuia(
    guiaSelecionada.id,
    contratosSelecionados.length > 0 ? contratosSelecionados : undefined
  );
  
  // 1. Se requer seleção de múltiplos contratos
  if (resultado.requer_selecao) {
    setProdutosMultiplosContratos(resultado.produtos_multiplos_contratos);
    setDialogSelecaoContratos(true);
    return;
  }
  
  // 2. Se requer confirmação (produtos sem contrato)
  if (resultado.requer_confirmacao) {
    setProdutosSemContrato(resultado.produtos_sem_contrato);
    setMostrarConfirmacao(true);
    return;
  }
  
  // 3. Sucesso
  if (resultado.total_criados > 0) {
    toast.success('Pedido gerado com sucesso!');
    onClose();
  }
}
```

### 3. Handlers de Seleção

```typescript
function handleConfirmarSelecaoContratos(selecao) {
  setContratosSelecionados(selecao);
  setDialogSelecaoContratos(false);
  
  // Tentar gerar pedido novamente com a seleção
  setTimeout(() => handleGerar(), 100);
}

function handleCancelarSelecaoContratos() {
  setDialogSelecaoContratos(false);
  setProdutosMultiplosContratos([]);
  setContratosSelecionados([]);
}
```

### 4. Componente SelecionarContratosDialog

Reutilizado do `PlanejamentoCompras.tsx`, permite:

- **Seleção Simples**: Escolher um único contrato
- **Divisão**: Dividir quantidade entre múltiplos contratos
- **Validação**: Garante que a soma das quantidades = quantidade necessária
- **Informações**: Mostra fornecedor, preço, saldo disponível
- **Divisão Automática**: Botão para dividir por saldo disponível

## Exemplo de Uso

### Cenário: Produto Alho com 2 Contratos

**Guia de Demanda:**
- Alho: 13 kg necessários

**Contratos Disponíveis:**
1. RAMOS COMERCIO LTDA: R$ 1,00/kg (saldo: 11 kg)
2. Distribuidora Mesquita LTDA: R$ 14,20/kg (saldo: 2.240 kg)

### Opção 1: Seleção Simples
Usuário escolhe apenas um contrato:
- RAMOS COMERCIO LTDA: 13 kg

### Opção 2: Divisão Manual
Usuário divide entre os dois:
- RAMOS COMERCIO LTDA: 11 kg (usa todo o saldo)
- Distribuidora Mesquita LTDA: 2 kg (completa o restante)

### Opção 3: Divisão Automática por Saldo
Sistema divide automaticamente:
- RAMOS COMERCIO LTDA: 11 kg (maior saldo disponível)
- Distribuidora Mesquita LTDA: 2 kg (restante)

## Interface do Dialog

```
┌─────────────────────────────────────────────────────┐
│ Selecionar Contratos                            [X] │
├─────────────────────────────────────────────────────┤
│ ℹ️ Você pode selecionar um único contrato ou       │
│    dividir a quantidade entre múltiplos contratos   │
│                                                     │
│ [Dividir por Saldo Disponível]                     │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ 1. Alho                    ☑ Dividir        │   │
│ │ Quantidade necessária: 13.00 kg             │   │
│ │                                             │   │
│ │ ┌─────────────────────────────────────────┐ │   │
│ │ │ Contrato: RAMOS COMERCIO LTDA          │ │   │
│ │ │ R$ 1.00/kg • Saldo: 11.00              │ │   │
│ │ │ Quantidade: [11.00] kg                 │ │   │
│ │ │ Valor: R$ 11.00                        │ │   │
│ │ └─────────────────────────────────────────┘ │   │
│ │                                             │   │
│ │ ┌─────────────────────────────────────────┐ │   │
│ │ │ Contrato: Distribuidora Mesquita       │ │   │
│ │ │ R$ 14.20/kg • Saldo: 2240.00           │ │   │
│ │ │ Quantidade: [2.00] kg                  │ │   │
│ │ │ Valor: R$ 28.40                        │ │   │
│ │ └─────────────────────────────────────────┘ │   │
│ │                                             │   │
│ │ ✓ Total alocado: 13.00 / 13.00 kg          │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ Resumo da Seleção:                                 │
│ ✓ Alho: 13.00 / 13.00 kg (2 contratos)            │
│                                                     │
│                    [Cancelar] [Confirmar e Gerar]  │
└─────────────────────────────────────────────────────┘
```

## Validações

1. **Quantidade Total**: Soma das quantidades deve ser igual à necessária
2. **Saldo Disponível**: Não pode exceder o saldo do contrato
3. **Contratos Únicos**: Não pode usar o mesmo contrato duas vezes
4. **Botão Confirmar**: Só ativa quando todas as validações passam

## Integração com Backend

### Request
```json
{
  "guia_id": 58,
  "contratos_selecionados": [
    {
      "produto_id": 154,
      "contrato_produto_id": 67,
      "quantidade": 11.0
    },
    {
      "produto_id": 154,
      "contrato_produto_id": 45,
      "quantidade": 2.0
    }
  ],
  "ignorar_sem_contrato": true
}
```

### Response (Sucesso)
```json
{
  "pedidos_criados": [{
    "pedido_id": 46,
    "numero": "PED-MAR2026000002",
    "guia_id": 58,
    "total_itens": 6,
    "valor_total": 2850.40,
    "produtos_sem_contrato": [
      { "produto_id": 118, "produto_nome": "Chicória", "quantidade": 6.93 }
    ]
  }],
  "total_criados": 1,
  "total_erros": 0,
  "aviso": "1 produto(s) não incluído(s) por falta de contrato: Chicória"
}
```

## Arquivos Modificados

### Frontend
- `frontend/src/components/GerarPedidoDaGuiaDialog.tsx`
  - Adicionados estados para múltiplos contratos
  - Integrado `SelecionarContratosDialog`
  - Adicionados handlers de confirmação/cancelamento
  - Atualizado fluxo de geração

- `frontend/src/components/SelecionarContratosDialog.tsx`
  - Componente reutilizado (já existia)
  - Permite seleção e divisão de contratos

- `frontend/src/services/planejamentoCompras.ts`
  - Parâmetro `ignorar_sem_contrato` adicionado

### Backend
- `backend/src/controllers/planejamentoComprasController.ts`
  - Função `gerarPedidoDaGuia` já suporta `contratos_selecionados`
  - Retorna `requer_selecao` quando há múltiplos contratos
  - Retorna `requer_confirmacao` quando há produtos sem contrato

## Benefícios

1. ✅ **Controle Total**: Usuário decide qual contrato usar
2. ✅ **Flexibilidade**: Pode dividir entre múltiplos contratos
3. ✅ **Transparência**: Vê preços e saldos antes de decidir
4. ✅ **Otimização**: Pode escolher o mais barato ou dividir por saldo
5. ✅ **Validação**: Sistema garante que as quantidades estão corretas
6. ✅ **UX**: Interface intuitiva e fácil de usar

## Teste

1. Criar guia com produto que tem múltiplos contratos (ex: Alho)
2. Clicar em "Gerar Pedido da Guia"
3. Selecionar a guia de março
4. Clicar em "Gerar Pedido"
5. Dialog de seleção de contratos abre automaticamente
6. Escolher contratos e quantidades
7. Clicar em "Confirmar e Gerar"
8. Se houver produtos sem contrato, confirmar
9. Pedido é gerado com sucesso!

## Próximos Passos (Opcional)

- [ ] Salvar preferências de contratos do usuário
- [ ] Sugerir automaticamente o contrato mais barato
- [ ] Histórico de seleções anteriores
- [ ] Alertas quando saldo está baixo
- [ ] Comparação visual de preços entre contratos
