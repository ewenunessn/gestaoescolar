# Migração: p.unidade → p.unidade_distribuicao

## Data: 2026-03-23

## Resumo
Todas as referências SQL a `p.unidade` foram atualizadas para `p.unidade_distribuicao` para refletir a nova estrutura da tabela produtos.

## Arquivos Atualizados

### Controllers
✅ `backend/src/controllers/planejamentoComprasController.ts` (2 ocorrências)
✅ `backend/src/controllers/escolaPortalController.ts` (1 ocorrência)
✅ `backend/src/modules/estoque/controllers/estoqueEscolarController.ts` (2 ocorrências)
✅ `backend/src/modules/estoque/controllers/demandaController.ts` (3 ocorrências)
✅ `backend/src/modules/contratos/controllers/saldoContratosModalidadesController.ts` (3 ocorrências)
✅ `backend/src/modules/compras/controllers/compraController.ts` (3 ocorrências)

### Models
✅ `backend/src/utils/optimizedQueries.ts` (5 ocorrências)
✅ `backend/src/modules/guias/models/Guia.ts` (2 ocorrências)
✅ `backend/src/modules/estoque/models/EstoqueCentral.ts` (2 ocorrências)
✅ `backend/src/modules/estoque/models/EstoqueCentralRefatorado.ts` (1 ocorrência)
✅ `backend/src/modules/cardapios/models/RefeicaoProduto.ts` (1 ocorrência)
✅ `backend/src/modules/compras/models/CompraItem.ts` (1 ocorrência)
✅ `backend/src/modules/contratos/models/ContratoProduto.ts` (1 ocorrência)

### Services
✅ `backend/src/modules/compras/services/FaturamentoService.ts` (1 ocorrência)

## Total de Ocorrências Atualizadas
**27 ocorrências** em **14 arquivos**

## Padrões de Substituição

### Antes:
```sql
SELECT p.unidade FROM produtos p
SELECT COALESCE(p.unidade, 'UN') as unidade FROM produtos p
SELECT p.unidade as produto_unidade FROM produtos p
SELECT p.unidade as unidade_medida FROM produtos p
```

### Depois:
```sql
SELECT p.unidade_distribuicao FROM produtos p
SELECT COALESCE(p.unidade_distribuicao, 'UN') as unidade FROM produtos p
SELECT p.unidade_distribuicao as produto_unidade FROM produtos p
SELECT p.unidade_distribuicao as unidade_medida FROM produtos p
```

## Impacto

### Queries Afetadas
- Listagem de produtos com estoque
- Cálculo de demanda
- Geração de guias
- Planejamento de compras
- Faturamento
- Relatórios de estoque
- Saldos de contratos por modalidade

### Compatibilidade
- ✅ Todas as queries foram atualizadas
- ✅ Mantém compatibilidade com o banco de dados Neon
- ✅ Fallback para 'UN' quando unidade_distribuicao é NULL

## Verificação

Para verificar se todas as referências foram atualizadas, execute:

```bash
cd backend
grep -r "p\.unidade[^_]" src/ --include="*.ts"
```

Deve retornar apenas referências a variáveis JavaScript (não queries SQL).

## Próximos Passos

1. ✅ Migração da tabela produtos concluída
2. ✅ Atualização de todas as queries SQL concluída
3. ✅ Backend totalmente atualizado
4. ⏳ Testar todas as funcionalidades afetadas
5. ⏳ Atualizar frontend se necessário

## Notas

- O campo `unidade` foi removido da tabela `produtos`
- O novo campo `unidade_distribuicao` armazena a unidade de distribuição do produto
- Queries usam `COALESCE(p.unidade_distribuicao, 'UN')` para garantir um valor padrão
- A unidade específica por contrato agora está em `contrato_produtos.unidade_compra`
