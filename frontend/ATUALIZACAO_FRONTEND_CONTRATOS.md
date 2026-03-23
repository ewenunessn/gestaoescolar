# Atualização Frontend - Contratos com Campos de Conversão

## Data: 23/03/2026
## Status: ✅ CONCLUÍDO

## Objetivo
Adicionar campos de conversão de unidades no formulário de produtos do contrato, permitindo configurar como o produto é comprado vs como é distribuído.

## Alterações Realizadas

### Arquivo: `frontend/src/pages/ContratoDetalhe.tsx`

#### 1. Estado Inicial Atualizado
```typescript
const produtoVazio = { 
  produto_id: "", 
  quantidade: "", 
  preco_unitario: "", 
  marca: "", 
  peso: "", 
  unidade: "",
  peso_embalagem: "",      // NOVO
  unidade_compra: "",      // NOVO
  fator_conversao: ""      // NOVO
};
```

#### 2. Formulário Atualizado
```typescript
const [formProduto, setFormProduto] = useState<any>({ 
  produto_id: "", 
  quantidade: "", 
  preco_unitario: "", 
  unidade: "Kg",
  peso_embalagem: "",      // NOVO
  unidade_compra: "",      // NOVO
  fator_conversao: ""      // NOVO
});
```

#### 3. Carregamento de Dados
Ao editar um produto, agora carrega também:
- `peso_embalagem`
- `unidade_compra`
- `fator_conversao`

#### 4. Payload de Salvamento
```typescript
const payload = { 
  contrato_id: Number(id), 
  produto_id: Number(formProduto.produto_id), 
  quantidade_contratada: Number(formProduto.quantidade), 
  preco_unitario: Number(formProduto.preco_unitario),
  marca: formProduto.marca || "",
  peso: formProduto.peso ? Number(formProduto.peso.toString().replace(',', '.')) : null,
  unidade: formProduto.unidade || null,
  peso_embalagem: formProduto.peso_embalagem ? Number(formProduto.peso_embalagem.toString().replace(',', '.')) : null,  // NOVO
  unidade_compra: formProduto.unidade_compra || null,  // NOVO
  fator_conversao: formProduto.fator_conversao ? Number(formProduto.fator_conversao.toString().replace(',', '.')) : null,  // NOVO
  ativo: true
};
```

#### 5. Novos Campos no Dialog

**Seção "Dados de Compra (Conversão de Unidades)"**

1. **Peso da Embalagem de Compra**
   - Tipo: Number (gramas)
   - Placeholder: "Ex: 5000 para caixa de 5kg"
   - Helper: "Peso da embalagem que você compra do fornecedor"

2. **Unidade de Compra**
   - Tipo: Select
   - Opções:
     - Não especificado
     - Caixa
     - Fardo
     - Saco
     - Pacote
     - Unidade
     - Dúzia
     - KG - Quilograma

3. **Fator de Conversão**
   - Tipo: Number (decimal)
   - Placeholder: "Ex: 0.1 se 10 pacotes = 1 caixa"
   - Helper: "Use apenas se a conversão por peso não for adequada"
   - Opcional

## Exemplo de Uso

### Cenário: Alho

**Produto Base (Distribuição)**:
- Peso: 500g
- Unidade: Pacote

**Contrato (Compra)**:
- Marca: Marca X
- Peso Embalagem: 5000g (5kg)
- Unidade Compra: Caixa
- Fator Conversão: (vazio - usa conversão por peso)

**Resultado**:
- Demanda: 7 pacotes (3.5kg)
- Pedido: 1 caixa (5kg)
- Conversão automática: 3.5kg ÷ 5kg = 0.7 → 1 caixa

### Cenário com Fator Manual

**Produto**: Bolacha
- Peso: 345g
- Unidade: Pacote

**Contrato**:
- Peso Embalagem: 3450g
- Unidade Compra: Caixa
- Fator Conversão: 0.1 (10 pacotes = 1 caixa)

**Resultado**:
- Demanda: 25 pacotes
- Pedido: 3 caixas (usando fator: 25 × 0.1 = 2.5 → 3)

## Interface do Usuário

### Alert Informativo
```
ℹ️ Configure como este produto é comprado. 
Exemplo: Compra em caixas de 5kg, mas distribui em pacotes de 500g.
```

### Campos Organizados
1. **Dados do Produto** (existentes)
   - Produto
   - Quantidade Contratada
   - Marca
   - Peso (distribuição)
   - Unidade (distribuição)
   - Preço Unitário

2. **Dados de Compra** (novos)
   - Peso da Embalagem de Compra
   - Unidade de Compra
   - Fator de Conversão

## Validações

- Todos os campos de compra são opcionais
- Se não preenchidos, o sistema usa kg como padrão
- Peso e fator aceitam decimais
- Conversão automática por peso tem prioridade sobre fator manual

## Benefícios

1. **Flexibilidade**: Suporta qualquer combinação de unidades
2. **Clareza**: Separa dados de distribuição vs compra
3. **Automação**: Conversão automática ao gerar pedidos
4. **Rastreabilidade**: Mantém histórico de conversões

## Próximos Passos

1. ✅ Campos adicionados ao formulário
2. ⏳ Testar adição/edição de produtos
3. ⏳ Verificar se dados são salvos corretamente
4. ⏳ Testar geração de pedidos com conversão
5. ⏳ Adicionar exibição dos campos de compra na tabela (opcional)

## Observações

- Os campos de compra só aparecem no formulário de edição
- A tabela principal continua mostrando apenas marca, peso e unidade de distribuição
- Para ver os dados de compra, é necessário editar o item
- Considerar adicionar tooltip ou coluna extra na tabela para mostrar dados de compra

## Compatibilidade

- Produtos sem dados de compra continuam funcionando normalmente
- Sistema usa kg como fallback quando não há conversão configurada
- Contratos antigos não são afetados
