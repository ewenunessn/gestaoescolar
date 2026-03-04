# Como Aplicar a Migration de Unidade nas Movimentações

## Contexto

Esta migration resolve o problema de unidades incorretas no histórico quando a unidade de um produto é alterada.

## Passo a Passo

### 1. Certifique-se que o backend está parado

```bash
# Pare o servidor se estiver rodando
# Ctrl+C no terminal do backend
```

### 2. Execute o script de migration

```bash
cd backend
node scripts/apply-unidade-movimentacoes.js
```

### 3. Verifique a saída

O script deve exibir:
- ✅ Número de movimentações atualizadas
- 📋 Amostra de 5 movimentações recentes
- ⚠️ Avisos se houver unidades diferentes

### 4. Reinicie o backend

```bash
npm run dev
```

### 5. Teste no app

1. Abra o app mobile
2. Acesse Estoque Central
3. Entre em um produto
4. Vá para aba "Histórico"
5. Verifique se as unidades estão corretas

### 6. Teste mudança de unidade

1. No frontend web, altere a unidade de um produto
2. No app, registre uma nova movimentação
3. Verifique que o histórico mostra:
   - Movimentações antigas com unidade antiga
   - Movimentações novas com unidade nova

## Troubleshooting

### Erro: "column unidade already exists"

A migration já foi aplicada. Você pode pular este passo.

### Erro: "relation estoque_central_movimentacoes does not exist"

Você precisa aplicar as migrations anteriores primeiro:
```bash
node scripts/apply-refactor-estoque.js
```

### Movimentações sem unidade

Se após a migration ainda houver movimentações sem unidade, execute:

```sql
UPDATE estoque_central_movimentacoes ecm
SET unidade = p.unidade
FROM estoque_central ec
INNER JOIN produtos p ON p.id = ec.produto_id
WHERE ecm.estoque_central_id = ec.id
  AND ecm.unidade IS NULL;
```

## Rollback (se necessário)

Se precisar reverter a migration:

```sql
ALTER TABLE estoque_central_movimentacoes 
DROP COLUMN IF EXISTS unidade;
```

⚠️ Isso removerá permanentemente os dados de unidade das movimentações!

