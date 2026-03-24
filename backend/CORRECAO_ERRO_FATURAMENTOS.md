# Correção do Erro 500 em Faturamentos

## Problema Identificado

O endpoint `/api/faturamentos/pedido/:pedidoId` estava retornando erro 500 (Internal Server Error).

### Causa Raiz

As views de faturamentos (`vw_faturamentos_detalhados`, `vw_faturamento_tipo_fornecedor_modalidade`, `vw_faturamentos_resumo_modalidades`) estavam tentando acessar a coluna `prod.unidade` da tabela `produtos`, mas essa coluna não existe mais.

A coluna foi substituída por `unidade_distribuicao` na refatoração da tabela produtos (migration `20260323_refactor_produtos_final.sql`).

## Solução Implementada

### 1. Migration Criada

Arquivo: `backend/migrations/20260324_fix_views_faturamentos_only.sql`

A migration:
- Dropa as views antigas que estavam com erro
- Recria as views usando `COALESCE(prod.unidade_distribuicao, 'UN')` ao invés de `prod.unidade`

### 2. Views Corrigidas

- `vw_faturamentos_detalhados` - View principal com todos os detalhes dos faturamentos
- `vw_faturamentos_resumo_modalidades` - Resumo agrupado por modalidade
- `vw_faturamento_tipo_fornecedor_modalidade` - Relatório por tipo de fornecedor e modalidade

### 3. Script de Execução

Arquivo: `backend/scripts/fix-views-faturamentos.js`

Executa a migration e valida que as views foram criadas corretamente.

## Como Executar

```bash
node backend/scripts/fix-views-faturamentos.js
```

## Resultado

✅ Todas as views foram recriadas com sucesso
✅ O endpoint `/api/faturamentos/pedido/:pedidoId` agora funciona corretamente
✅ A coluna `unidade` nas views agora usa `unidade_distribuicao` da tabela produtos

## Teste

Para testar se está funcionando:

1. Acesse a página de faturamentos de um pedido no frontend
2. O endpoint deve retornar os dados sem erro 500
3. A coluna `unidade` deve exibir a unidade de distribuição do produto

## Observações

- A migration usa `COALESCE(prod.unidade_distribuicao, 'UN')` para garantir que sempre haja um valor, mesmo que o produto não tenha unidade definida
- Outras views que possam estar usando `prod.unidade` também precisarão ser corrigidas no futuro
