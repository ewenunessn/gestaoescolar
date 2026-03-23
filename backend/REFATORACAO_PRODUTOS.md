# Refatoração da Tabela Produtos

## Data: 2026-03-23

## Mudanças Realizadas

### Campos Removidos
- `unidade` - Removido (usar `unidade_distribuicao` no lugar)
- `fator_divisao` - Removido
- `marca` - Removido (movido para `contrato_produtos`)

### Campos Mantidos/Adicionados
- `peso` - Mantido (peso da embalagem em gramas)
- `estoque_minimo` INTEGER DEFAULT 0
- `fator_correcao` NUMERIC(5, 3) NOT NULL DEFAULT '1.000'
- `tipo_fator_correcao` VARCHAR(20) NOT NULL DEFAULT 'perda'
- `unidade_distribuicao` VARCHAR(50)

### Estrutura Final

```sql
CREATE TABLE produtos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo_processamento VARCHAR(100),
  categoria VARCHAR(100),
  validade_minima INTEGER,
  imagem_url TEXT,
  perecivel BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  estoque_minimo INTEGER DEFAULT 0,
  fator_correcao NUMERIC(5, 3) NOT NULL DEFAULT '1.000',
  tipo_fator_correcao VARCHAR(20) NOT NULL DEFAULT 'perda',
  unidade_distribuicao VARCHAR(50),
  peso NUMERIC
);
```

## Arquivos Atualizados

✅ `backend/src/modules/produtos/models/Produto.ts` - Interface atualizada
✅ `backend/src/modules/produtos/controllers/produtoController.ts` - Queries atualizadas
✅ `backend/database/schema.sql` - Schema atualizado
✅ `backend/src/migrations/20260323_refactor_produtos_schema.sql` - Migration criada

## Arquivos que Precisam de Atualização

Os seguintes arquivos ainda referenciam `p.unidade` e precisam ser atualizados para usar `p.unidade_distribuicao`:

### Controllers
- `backend/src/controllers/planejamentoComprasController.ts` (2 ocorrências)
- `backend/src/modules/estoque/controllers/estoqueEscolarController.ts` (3 ocorrências)
- `backend/src/modules/estoque/controllers/EstoqueCentralController.ts` (1 ocorrência)
- `backend/src/modules/estoque/controllers/demandaController.ts` (3 ocorrências)
- `backend/src/modules/compras/controllers/compraController.ts` (3 ocorrências)
- `backend/src/modules/contratos/controllers/saldoContratosModalidadesController.ts` (3 ocorrências)
- `backend/src/modules/contratos/controllers/contratoProdutoController.ts` (4 ocorrências - mas aqui é `cp.unidade` de contrato_produtos)
- `backend/src/controllers/escolaPortalController.ts` (1 ocorrência)

### Models
- `backend/src/utils/optimizedQueries.ts` (4 ocorrências)
- `backend/src/modules/produtos/models/Produto.ts` (2 ocorrências em funções antigas)
- `backend/src/modules/guias/models/Guia.ts` (2 ocorrências)
- `backend/src/modules/estoque/models/EstoqueCentralRefatorado.ts` (1 ocorrência)
- `backend/src/modules/estoque/models/EstoqueCentral.ts` (2 ocorrências)
- `backend/src/modules/cardapios/models/RefeicaoProduto.ts` (1 ocorrência)
- `backend/src/modules/compras/models/CompraItem.ts` (1 ocorrência)

### Services
- `backend/src/modules/compras/services/FaturamentoService.ts` (1 ocorrência)
- `backend/src/modules/contratos/models/ContratoProduto.ts` (1 ocorrência)

## Ação Recomendada

Para manter compatibilidade, você pode:

1. **Opção 1**: Atualizar todos os arquivos para usar `unidade_distribuicao`
2. **Opção 2**: Criar um alias nas queries: `p.unidade_distribuicao as unidade`
3. **Opção 3**: Adicionar uma view ou computed column para compatibilidade

## Nota sobre contrato_produtos

O campo `unidade` também foi removido de `contrato_produtos`. Verifique se isso está correto ou se precisa ser restaurado.
