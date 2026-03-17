# Produtos em Múltiplos Contratos - Análise e Solução

## 🔍 Problema Identificado

Atualmente, quando um produto está presente em mais de um contrato ativo, o sistema:
- Pega apenas o **primeiro contrato** encontrado (ordenado por `data_fim ASC`)
- **Ignora** os demais contratos disponíveis
- Não permite ao usuário escolher qual contrato usar

### Código Atual (linha 199 do planejamentoComprasController.ts)
```typescript
const contratosPorProduto = new Map<number, any>();
for (const row of contratosQuery.rows) {
  if (!contratosPorProduto.has(row.produto_id)) {
    contratosPorProduto.set(row.produto_id, row);  // ❌ Pega só o primeiro!
  }
}
```

## 💡 Soluções Propostas

### Opção 1: Seleção Manual (Recomendada)
**Melhor experiência do usuário, mais controle**

#### Como funciona:
1. Ao gerar pedido, o sistema detecta produtos com múltiplos contratos
2. Exibe um modal/dialog para o usuário escolher qual contrato usar
3. Mostra informações relevantes para decisão:
   - Fornecedor
   - Preço unitário
   - Saldo disponível
   - Data de validade do contrato
   - Marca/especificações

#### Implementação:
```typescript
// Backend: Retornar TODOS os contratos por produto
const contratosPorProduto = new Map<number, any[]>();
for (const row of contratosQuery.rows) {
  if (!contratosPorProduto.has(row.produto_id)) {
    contratosPorProduto.set(row.produto_id, []);
  }
  contratosPorProduto.get(row.produto_id)!.push(row);
}

// Identificar produtos com múltiplos contratos
const produtosComMultiplosContratos = [];
for (const [produto_id, contratos] of contratosPorProduto) {
  if (contratos.length > 1) {
    produtosComMultiplosContratos.push({
      produto_id,
      produto_nome: contratos[0].produto_nome,
      contratos: contratos.map(c => ({
        contrato_produto_id: c.contrato_produto_id,
        fornecedor: c.fornecedor_nome,
        preco: c.preco_unitario,
        contrato_numero: c.contrato_numero,
        saldo: c.saldo_disponivel
      }))
    });
  }
}

// Se houver produtos com múltiplos contratos, retornar para seleção
if (produtosComMultiplosContratos.length > 0) {
  return res.status(200).json({
    requer_selecao: true,
    produtos_multiplos_contratos: produtosComMultiplosContratos,
    // ... outros dados
  });
}
```

#### Frontend:
```tsx
// Dialog de seleção de contratos
<Dialog open={mostrarSelecaoContratos}>
  <DialogTitle>Selecionar Contratos</DialogTitle>
  <DialogContent>
    <Typography variant="body2" sx={{ mb: 2 }}>
      Os seguintes produtos estão em múltiplos contratos. 
      Selecione qual contrato usar para cada produto:
    </Typography>
    
    {produtosMultiplos.map(produto => (
      <Card key={produto.produto_id} sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600}>
            {produto.produto_nome}
          </Typography>
          
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Contrato</InputLabel>
            <Select
              value={contratosSelecionados[produto.produto_id] || ''}
              onChange={(e) => handleSelecionarContrato(produto.produto_id, e.target.value)}
            >
              {produto.contratos.map(contrato => (
                <MenuItem key={contrato.contrato_produto_id} value={contrato.contrato_produto_id}>
                  <Box>
                    <Typography variant="body2">
                      {contrato.fornecedor} - {formatarMoeda(contrato.preco)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Contrato {contrato.contrato_numero} • Saldo: {contrato.saldo}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>
    ))}
  </DialogContent>
  <DialogActions>
    <Button onClick={handleCancelar}>Cancelar</Button>
    <Button 
      variant="contained" 
      onClick={handleConfirmarSelecao}
      disabled={!todosContratosSelecionados}
    >
      Confirmar e Gerar Pedido
    </Button>
  </DialogActions>
</Dialog>
```

---

### Opção 2: Critério Automático
**Mais rápido, menos flexível**

#### Critérios possíveis (em ordem de prioridade):
1. **Menor preço** - Economiza recursos
2. **Maior saldo disponível** - Evita problemas de estoque
3. **Contrato mais próximo do vencimento** - Usa contratos que vão expirar primeiro
4. **Fornecedor preferencial** - Se houver configuração de preferência

#### Implementação:
```typescript
// Selecionar automaticamente por critério
const contratosPorProduto = new Map<number, any>();
for (const row of contratosQuery.rows) {
  if (!contratosPorProduto.has(row.produto_id)) {
    contratosPorProduto.set(row.produto_id, row);
  } else {
    const atual = contratosPorProduto.get(row.produto_id);
    
    // Critério: menor preço
    if (toNum(row.preco_unitario) < toNum(atual.preco_unitario)) {
      contratosPorProduto.set(row.produto_id, row);
    }
    
    // OU Critério: maior saldo
    // if (toNum(row.saldo_disponivel) > toNum(atual.saldo_disponivel)) {
    //   contratosPorProduto.set(row.produto_id, row);
    // }
  }
}

// Registrar no log/observações qual critério foi usado
const observacoes = `Contratos selecionados automaticamente por menor preço`;
```

---

### Opção 3: Divisão Proporcional (Avançada)
**Para casos onde um contrato não tem saldo suficiente**

#### Como funciona:
1. Verifica se o contrato tem saldo suficiente
2. Se não tiver, divide a quantidade entre múltiplos contratos
3. Cria múltiplos itens no pedido (um por contrato)

#### Exemplo:
```
Produto: Arroz
Quantidade necessária: 1000kg

Contrato A: 600kg disponíveis a R$ 3,50/kg
Contrato B: 800kg disponíveis a R$ 3,80/kg

Resultado:
- Item 1: 600kg do Contrato A (R$ 2.100,00)
- Item 2: 400kg do Contrato B (R$ 1.520,00)
Total: 1000kg (R$ 3.620,00)
```

---

## 🎯 Recomendação

**Implementar Opção 1 (Seleção Manual) com fallback para Opção 2**

### Fluxo proposto:
1. Sistema detecta produtos com múltiplos contratos
2. Exibe dialog para seleção manual
3. Usuário pode:
   - Selecionar manualmente cada contrato
   - Clicar em "Usar Menor Preço" para seleção automática
   - Clicar em "Usar Maior Saldo" para seleção automática
4. Sistema gera pedido com os contratos selecionados

### Vantagens:
- ✅ Flexibilidade total para o usuário
- ✅ Transparência na escolha
- ✅ Opção de automação quando desejado
- ✅ Evita erros de seleção incorreta
- ✅ Permite considerar fatores não técnicos (qualidade, relacionamento com fornecedor, etc.)

---

## 📋 Checklist de Implementação

### Backend
- [ ] Modificar query para retornar TODOS os contratos por produto
- [ ] Adicionar campo `saldo_disponivel` na query de contratos
- [ ] Criar endpoint para validar seleção de contratos
- [ ] Adicionar lógica de divisão proporcional (opcional)
- [ ] Registrar no pedido qual critério foi usado

### Frontend
- [ ] Criar componente `SelecionarContratosDialog`
- [ ] Adicionar estado para contratos selecionados
- [ ] Implementar validação (todos produtos devem ter contrato selecionado)
- [ ] Adicionar botões de seleção automática
- [ ] Mostrar comparativo de preços e saldos
- [ ] Adicionar indicador visual do contrato recomendado

### Testes
- [ ] Testar com produto em 1 contrato (fluxo normal)
- [ ] Testar com produto em 2+ contratos (seleção manual)
- [ ] Testar seleção automática por menor preço
- [ ] Testar seleção automática por maior saldo
- [ ] Testar cancelamento da seleção
- [ ] Testar com contratos sem saldo suficiente

---

## 🔄 Migração

### Comportamento atual:
- Usa primeiro contrato encontrado (ordenado por data_fim)

### Comportamento novo:
- Se 1 contrato: usa automaticamente (sem mudança)
- Se 2+ contratos: solicita seleção do usuário
- Opção de configurar critério padrão nas configurações do sistema

---

**Data:** 17/03/2026
**Status:** Proposta - Aguardando aprovação para implementação
