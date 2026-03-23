# Como Executar: Conversão de Unidades de Compra

## ✅ O que foi implementado

Sistema completo de conversão entre unidades de distribuição e compra:
- Demanda calculada em unidades de distribuição (ex: pacotes)
- Pedidos gerados em unidades de compra do contrato (ex: caixas)
- Rastreabilidade completa de todas as conversões

## 📋 Pré-requisitos

1. Backend atualizado com as alterações
2. Banco de dados PostgreSQL acessível
3. Variável `DATABASE_URL` configurada no `.env`

## 🚀 Passo a Passo

### 1. Executar Migration

**Opção A: Via Script Node.js (Recomendado)**
```bash
cd backend
node scripts/migrate-pedido-itens-unidades.js
```

**Opção B: Via psql**
```bash
psql -U postgres -d seu_banco -f backend/migrations/20260323_add_unidades_pedido_itens.sql
```

### 2. Verificar Migration

```sql
-- Verificar se os campos foram criados
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'pedido_itens'
  AND column_name IN ('quantidade_kg', 'unidade', 'quantidade_distribuicao', 'unidade_distribuicao')
ORDER BY column_name;
```

Resultado esperado:
```
column_name              | data_type | is_nullable
-------------------------+-----------+-------------
quantidade_distribuicao  | numeric   | YES
quantidade_kg            | numeric   | YES
unidade                  | varchar   | YES
unidade_distribuicao     | varchar   | YES
```

### 3. Reiniciar Backend

```bash
cd backend
npm run dev
```

### 4. Testar Conversão

#### Teste 1: Verificar Produto com Peso

```sql
-- Ver produtos com peso definido
SELECT 
  id, 
  nome, 
  peso, 
  unidade_distribuicao,
  CASE 
    WHEN peso > 0 AND unidade_distribuicao IS NOT NULL 
    THEN '✅ Pronto para conversão'
    ELSE '⚠️ Falta configurar'
  END as status
FROM produtos
WHERE ativo = true
ORDER BY nome;
```

#### Teste 2: Verificar Contrato com Embalagem

```sql
-- Ver contratos com embalagem definida
SELECT 
  c.numero as contrato,
  p.nome as produto,
  cp.peso_embalagem,
  cp.unidade_compra,
  cp.fator_conversao,
  CASE 
    WHEN cp.peso_embalagem > 0 AND cp.unidade_compra IS NOT NULL 
    THEN '✅ Pronto para conversão'
    WHEN cp.fator_conversao > 0
    THEN '✅ Usa fator manual'
    ELSE '⚠️ Falta configurar'
  END as status
FROM contrato_produtos cp
JOIN contratos c ON c.id = cp.contrato_id
JOIN produtos p ON p.id = cp.produto_id
WHERE cp.ativo = true AND c.status = 'ativo'
ORDER BY p.nome;
```

#### Teste 3: Gerar Pedido de Teste

Via API:
```bash
curl -X POST http://localhost:3000/api/planejamento-compras/gerar-pedidos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "competencia": "2026-03",
    "periodos": [
      {
        "data_inicio": "2026-03-01",
        "data_fim": "2026-03-31"
      }
    ]
  }'
```

#### Teste 4: Verificar Conversão no Pedido

```sql
-- Ver último pedido com conversões
SELECT 
  p.numero as pedido,
  prod.nome as produto,
  pi.quantidade as qtd_compra,
  pi.unidade as un_compra,
  pi.quantidade_kg as qtd_kg,
  pi.quantidade_distribuicao as qtd_dist,
  pi.unidade_distribuicao as un_dist,
  pi.preco_unitario,
  pi.valor_total,
  -- Calcular sobra
  CASE 
    WHEN pi.unidade != 'kg' AND pi.quantidade_kg IS NOT NULL
    THEN ROUND((pi.quantidade * cp.peso_embalagem / 1000.0) - pi.quantidade_kg, 3)
    ELSE NULL
  END as sobra_kg
FROM pedido_itens pi
JOIN pedidos p ON p.id = pi.pedido_id
JOIN produtos prod ON prod.id = pi.produto_id
LEFT JOIN contrato_produtos cp ON cp.id = pi.contrato_produto_id
WHERE p.id = (SELECT MAX(id) FROM pedidos)
ORDER BY prod.nome;
```

## 📊 Exemplo de Resultado Esperado

```
pedido              | produto | qtd_compra | un_compra | qtd_kg | qtd_dist | un_dist | preco_unitario | valor_total | sobra_kg
--------------------+---------+------------+-----------+--------+----------+---------+----------------+-------------+----------
PED-MAR2026000001  | Alho    | 1          | Caixa     | 3.5    | 7        | Pacote  | 25.00          | 25.00       | 1.5
PED-MAR2026000001  | Arroz   | 38         | Fardo     | 187.38 | 187      | kg      | 45.00          | 1710.00     | 2.62
```

## 🔧 Configurar Produtos e Contratos

### Configurar Produto (Distribuição)

```sql
UPDATE produtos
SET 
  peso = 500,  -- 500g
  unidade_distribuicao = 'Pacote'
WHERE nome = 'Alho';
```

### Configurar Contrato (Compra)

```sql
UPDATE contrato_produtos
SET 
  peso_embalagem = 5000,  -- 5kg
  unidade_compra = 'Caixa'
WHERE produto_id = (SELECT id FROM produtos WHERE nome = 'Alho')
  AND contrato_id = 123;  -- ID do contrato
```

### Configurar Fator de Conversão Manual (Opcional)

```sql
-- Exemplo: 10 pacotes = 1 caixa → fator = 0.1
UPDATE contrato_produtos
SET fator_conversao = 0.1
WHERE produto_id = (SELECT id FROM produtos WHERE nome = 'Alho')
  AND contrato_id = 123;
```

## ⚠️ Troubleshooting

### Problema: Pedido ainda em kg

**Causa**: Produto ou contrato sem peso/unidade configurado

**Solução**:
```sql
-- Verificar configuração
SELECT 
  p.nome,
  p.peso as peso_dist,
  p.unidade_distribuicao as un_dist,
  cp.peso_embalagem as peso_compra,
  cp.unidade_compra as un_compra
FROM produtos p
LEFT JOIN contrato_produtos cp ON cp.produto_id = p.id AND cp.ativo = true
WHERE p.nome = 'SEU_PRODUTO';
```

### Problema: Conversão incorreta

**Causa**: Peso em unidade errada

**Verificar**:
- `produtos.peso` deve estar em GRAMAS
- `contrato_produtos.peso_embalagem` deve estar em GRAMAS

**Exemplo**:
- ❌ Errado: peso = 0.5 (meio kg)
- ✅ Correto: peso = 500 (500 gramas)

### Problema: Migration falhou

**Solução**:
```sql
-- Reverter migration
ALTER TABLE pedido_itens 
  DROP COLUMN IF EXISTS quantidade_kg,
  DROP COLUMN IF EXISTS unidade,
  DROP COLUMN IF EXISTS quantidade_distribuicao,
  DROP COLUMN IF EXISTS unidade_distribuicao;

-- Executar novamente
```

## 📚 Documentação Adicional

- `SOLUCAO_CONVERSAO_UNIDADES_COMPRA.md` - Explicação detalhada da solução
- `IMPLEMENTACAO_CONVERSAO_UNIDADES_CONCLUIDA.md` - Detalhes da implementação
- `migrations/20260323_add_unidades_pedido_itens.sql` - SQL da migration

## ✅ Checklist de Validação

- [ ] Migration executada com sucesso
- [ ] Campos criados em `pedido_itens`
- [ ] Backend reiniciado
- [ ] Produtos configurados com peso e unidade_distribuicao
- [ ] Contratos configurados com peso_embalagem e unidade_compra
- [ ] Pedido de teste gerado
- [ ] Conversões verificadas no banco
- [ ] Frontend exibindo corretamente (próximo passo)

## 🎯 Próximos Passos

1. Atualizar frontend para exibir conversões
2. Adicionar tooltips com detalhes
3. Mostrar alertas de sobra
4. Criar relatório de conversões
