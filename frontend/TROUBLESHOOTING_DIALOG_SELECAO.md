# Troubleshooting: Dialog de Seleção de Contratos

## Problema

Dialog de seleção de múltiplos contratos não abre quando deveria.

## Logs Esperados no Console do Navegador

### 1. Ao clicar em "Gerar Pedido"
```
🚀 Iniciando geração de pedido...
📋 Guia selecionada: 58
📋 Contratos já selecionados: []
```

### 2. Após receber resposta do backend
```
📋 Resultado completo recebido: {
  "requer_selecao": true,
  "produtos_multiplos_contratos": [...],
  "produtos_sem_contrato": [...],
  "mensagem": "1 produto(s) encontrado(s) em múltiplos contratos..."
}
```

### 3. Ao detectar requer_selecao
```
⚠️ Requer seleção de múltiplos contratos
📦 Produtos com múltiplos contratos: [...]
✅ Dialog de seleção deve abrir agora
⚠️ Também há produtos sem contrato: [...]
```

### 4. Ao atualizar estados
```
🔄 Estado dialogSelecaoContratos mudou: true
🔄 Produtos múltiplos contratos: 1
```

### 5. Ao renderizar componente
```
🎨 Renderizando SelecionarContratosDialog: { open: true, produtos: 1 }
```

## Possíveis Problemas

### 1. Response não tem requer_selecao

**Sintoma**: Logs param em "Resultado completo recebido" e não mostram "Requer seleção"

**Causa**: Backend não está retornando `requer_selecao: true`

**Solução**: Verificar logs do backend

### 2. Estado não atualiza

**Sintoma**: Logs mostram "Dialog de seleção deve abrir" mas não mostram "Estado dialogSelecaoContratos mudou: true"

**Causa**: React não está atualizando o estado

**Solução**: 
```typescript
// Forçar atualização
setDialogSelecaoContratos(false);
setTimeout(() => setDialogSelecaoContratos(true), 0);
```

### 3. Componente não renderiza

**Sintoma**: Estado muda para true mas dialog não aparece

**Causa**: Componente SelecionarContratosDialog não está importado ou tem erro

**Solução**: Verificar imports e console de erros

### 4. Dialog abre mas está vazio

**Sintoma**: Dialog abre mas não mostra produtos

**Causa**: Array de produtos está vazio

**Solução**: Verificar se `produtos_multiplos_contratos` vem do backend

### 5. Erro de CORS ou Network

**Sintoma**: Request falha antes de receber resposta

**Causa**: Backend não está rodando ou CORS bloqueando

**Solução**: Verificar se backend está rodando e CORS configurado

## Checklist de Verificação

- [ ] Backend está rodando?
- [ ] Logs do backend mostram "⚠️ Retornando para seleção de múltiplos contratos"?
- [ ] Response do backend tem `requer_selecao: true`?
- [ ] Frontend recebe a response completa?
- [ ] Estado `dialogSelecaoContratos` muda para `true`?
- [ ] Array `produtosMultiplosContratos` tem itens?
- [ ] Componente `SelecionarContratosDialog` está importado?
- [ ] Não há erros no console do navegador?
- [ ] Dialog principal (`GerarPedidoDaGuiaDialog`) está aberto?

## Teste Manual

1. Abrir DevTools (F12)
2. Ir para aba Console
3. Limpar console (Ctrl+L)
4. Clicar em "Gerar Pedido da Guia"
5. Selecionar guia de março
6. Clicar em "Gerar Pedido"
7. Observar logs no console
8. Copiar e colar todos os logs

## Solução Temporária

Se o dialog não abrir, use a tela de **Planejamento de Compras** que já tem o dialog funcionando:

1. Ir para "Planejamento de Compras"
2. Selecionar competência 2026-03
3. Clicar em "Gerar Pedidos por Período"
4. Selecionar período e escolas
5. Dialog de seleção abrirá normalmente
6. Selecionar contratos
7. Confirmar e gerar

## Debug Avançado

### Verificar se componente está montado
```typescript
useEffect(() => {
  console.log('🎯 GerarPedidoDaGuiaDialog montado');
  return () => console.log('🎯 GerarPedidoDaGuiaDialog desmontado');
}, []);
```

### Verificar props do SelecionarContratosDialog
```typescript
<SelecionarContratosDialog
  open={dialogSelecaoContratos}
  onClose={() => {
    console.log('🔴 Dialog fechado');
    handleCancelarSelecaoContratos();
  }}
  produtos={produtosMultiplosContratos}
  onConfirmar={(selecao) => {
    console.log('✅ Contratos confirmados:', selecao);
    handleConfirmarSelecaoContratos(selecao);
  }}
/>
```

### Forçar abertura do dialog (teste)
```typescript
// Adicionar botão de teste
<Button onClick={() => {
  setProdutosMultiplosContratos([{
    produto_id: 154,
    produto_nome: "Alho",
    unidade: "kg",
    quantidade_necessaria: 13,
    contratos: [
      {
        contrato_produto_id: 67,
        contrato_id: 12,
        contrato_numero: "CONT-001",
        fornecedor_id: 5,
        fornecedor_nome: "RAMOS COMERCIO LTDA",
        preco_unitario: 1.00,
        saldo_disponivel: 11.00,
        data_fim: "2026-12-31"
      },
      {
        contrato_produto_id: 45,
        contrato_id: 10,
        contrato_numero: "CONT-002",
        fornecedor_id: 3,
        fornecedor_nome: "Distribuidora Mesquita LTDA",
        preco_unitario: 14.20,
        saldo_disponivel: 2240.00,
        data_fim: "2026-12-31"
      }
    ]
  }]);
  setDialogSelecaoContratos(true);
}}>
  Teste: Abrir Dialog
</Button>
```

## Contato

Se o problema persistir, envie:
1. Todos os logs do console do navegador
2. Logs do backend
3. Screenshot da tela
4. Versão do navegador
