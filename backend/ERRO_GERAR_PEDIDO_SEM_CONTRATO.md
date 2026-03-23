# Erro ao Gerar Pedido: Produtos Sem Contrato

## Problema Identificado

Ao tentar gerar um pedido a partir da Guia #58, o sistema não encontrou contratos ativos para os produtos.

## Diagnóstico

### Guia #58
- Competência: 2026-03
- Status: aberta
- Produtos: Chicória (ID 118) e outros

### Produto: Chicória (ID 118)
```json
{
  "id": 118,
  "nome": "Chicória",
  "peso": null,
  "unidade_distribuicao": null
}
```

### Contratos
❌ **Nenhum contrato ativo encontrado para Chicória**

## Causa do Erro

O sistema busca contratos com as seguintes condições:
```sql
WHERE cp.produto_id = ANY($1) 
  AND cp.ativo = true
  AND c.status = 'ativo' 
  AND c.data_fim >= CURRENT_DATE
```

Se nenhum contrato atender essas condições, o pedido não pode ser gerado.

## Soluções

### Solução 1: Cadastrar Contrato para o Produto

1. Acesse **Contratos** no menu
2. Selecione um contrato ativo ou crie um novo
3. Adicione o produto **Chicória** ao contrato:
   - Quantidade contratada
   - Preço unitário
   - Marca (opcional)
   - Dados de compra (opcional):
     - Peso da embalagem
     - Unidade de compra
     - Fator de conversão

### Solução 2: Ativar Contrato Existente

Se já existe um contrato para Chicória mas está inativo:

```sql
-- Verificar contratos inativos
SELECT 
  c.id, 
  c.numero, 
  c.status, 
  c.data_fim,
  cp.id as contrato_produto_id
FROM contrato_produtos cp
JOIN contratos c ON c.id = cp.contrato_id
WHERE cp.produto_id = 118;

-- Ativar contrato
UPDATE contratos 
SET status = 'ativo' 
WHERE id = [ID_DO_CONTRATO];

-- Ativar produto no contrato
UPDATE contrato_produtos 
SET ativo = true 
WHERE id = [ID_DO_CONTRATO_PRODUTO];
```

### Solução 3: Estender Vigência do Contrato

Se o contrato expirou:

```sql
-- Verificar data de fim
SELECT numero, data_fim 
FROM contratos 
WHERE id IN (
  SELECT contrato_id 
  FROM contrato_produtos 
  WHERE produto_id = 118
);

-- Estender vigência
UPDATE contratos 
SET data_fim = '2026-12-31' 
WHERE id = [ID_DO_CONTRATO];
```

## Melhorias Implementadas

### Logs Adicionados

O sistema agora exibe logs detalhados:
```
🚀 Gerando pedido da guia: { guia_id: 58 }
📋 Guia encontrada: { id: 58, mes: 3, ano: 2026, ... }
📦 Contratos encontrados: 0
📋 Produtos buscados: [118, ...]
❌ Nenhum produto com contrato ativo
📋 Produtos sem contrato: Chicória, ...
```

### Mensagem de Erro Melhorada

Resposta da API:
```json
{
  "pedidos_criados": [],
  "erros": [{
    "motivo": "Nenhum produto com contrato ativo. Sem contrato: Chicória, ..."
  }],
  "total_criados": 0,
  "total_erros": 1
}
```

## Verificação Rápida

### Script para Verificar Contratos

```bash
cd backend
node scripts/check-contratos-chicoria.js
```

### Query Manual

```sql
-- Verificar todos os produtos da guia sem contrato
SELECT DISTINCT
  p.id,
  p.nome,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM contrato_produtos cp
      JOIN contratos c ON c.id = cp.contrato_id
      WHERE cp.produto_id = p.id
        AND cp.ativo = true
        AND c.status = 'ativo'
        AND c.data_fim >= CURRENT_DATE
    ) THEN '✅ Tem contrato'
    ELSE '❌ Sem contrato'
  END as status_contrato
FROM guia_produto_escola gpe
JOIN produtos p ON p.id = gpe.produto_id
WHERE gpe.guia_id = 58
ORDER BY p.nome;
```

## Prevenção

### Validação ao Criar Guia

Considerar adicionar validação ao criar guia:
- Avisar se produtos não têm contrato
- Sugerir cadastro de contratos
- Permitir criar guia mesmo assim (para ajustes futuros)

### Dashboard de Contratos

Criar relatório mostrando:
- Produtos sem contrato ativo
- Contratos próximos do vencimento
- Produtos com baixo saldo contratual

## Próximos Passos

1. ✅ Logs adicionados para debug
2. ✅ Mensagem de erro melhorada
3. ⏳ Cadastrar contratos para produtos da guia
4. ⏳ Testar geração de pedido novamente
5. ⏳ Implementar validações preventivas
