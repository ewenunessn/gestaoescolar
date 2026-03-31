# Integridade de Dados da Escola nas Guias de Entrega

## Problema Identificado

Quando uma guia de entrega é gerada, ela é baseada nos dados atuais da escola:
- Nome da escola
- Endereço
- Quantidade total de alunos
- Modalidades de ensino (Creche, Pré-escola, Ens. Fundamental, etc.)

Porém, se esses dados mudarem posteriormente (escola muda de endereço, altera modalidades, atualiza quantidade de alunos, ou até mesmo é deletada), as guias antigas ficam com informações inconsistentes, pois buscam os dados atualizados ao invés dos dados históricos do momento da geração.

## Solução Implementada

### 1. Snapshot de Dados da Escola

Adicionamos campos na tabela `guia_produto_escola` para armazenar um snapshot dos dados da escola no momento da geração da guia:

```sql
ALTER TABLE guia_produto_escola
ADD COLUMN escola_nome VARCHAR(255),
ADD COLUMN escola_endereco TEXT,
ADD COLUMN escola_municipio VARCHAR(100),
ADD COLUMN escola_total_alunos INTEGER,
ADD COLUMN escola_modalidades JSONB,
ADD COLUMN escola_snapshot_data TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
```

### 2. Estrutura do Campo `escola_modalidades`

O campo `escola_modalidades` armazena um array JSON com as modalidades da escola:

```json
[
  {
    "modalidade_id": 3,
    "modalidade_nome": "ENS. FUNDAMENTAL",
    "quantidade_alunos": 310
  },
  {
    "modalidade_id": 2,
    "modalidade_nome": "PRÉ ESCOLA",
    "quantidade_alunos": 45
  }
]
```

### 3. Quando o Snapshot é Criado

O snapshot deve ser criado automaticamente quando:
- Uma nova guia de entrega é gerada
- Itens são adicionados à guia para uma escola

### 4. Migração de Dados Históricos

A migração `20260331_guia_escola_snapshot.sql` preenche automaticamente os dados históricos com as informações atuais das escolas para guias já existentes.

## Benefícios

1. **Integridade Histórica**: PDFs de guias antigas sempre mostram os dados corretos do momento da geração
2. **Auditoria**: Possibilidade de rastrear mudanças nos dados das escolas ao longo do tempo
3. **Independência**: Guias não dependem mais da existência contínua dos registros de escola
4. **Consistência**: Mesmo que a escola seja deletada ou seus dados alterados, as guias antigas permanecem consistentes

## Implementação no Frontend

O componente `EscolasEntregaList.tsx` foi atualizado para:
1. Buscar os dados do snapshot dos itens retornados pela API
2. Usar esses dados ao invés de fazer chamadas adicionais à API
3. Exibir as modalidades formatadas no PDF

```typescript
// Extrair dados do snapshot
const primeiroItem = itens[0];
if (primeiroItem.escola_modalidades && Array.isArray(primeiroItem.escola_modalidades)) {
  modalidades = primeiroItem.escola_modalidades
    .map((m: any) => m.modalidade_nome)
    .join(', ');
}
```

## Implementação no Backend

O model `Entrega.ts` foi atualizado para incluir os campos de snapshot nas queries:

```typescript
SELECT 
  gpe.escola_nome,
  gpe.escola_endereco,
  gpe.escola_municipio,
  gpe.escola_total_alunos,
  gpe.escola_modalidades,
  gpe.escola_snapshot_data,
  ...
FROM guia_produto_escola gpe
```

## Próximos Passos

Para garantir que novos registros sempre tenham o snapshot:

1. **Atualizar o código de geração de guias** para preencher automaticamente os campos de snapshot
2. **Criar trigger no banco** (opcional) para preencher automaticamente quando `escola_nome` for NULL
3. **Adicionar validação** para garantir que guias não sejam geradas sem snapshot

## Arquivos Modificados

- `backend/migrations/20260331_guia_escola_snapshot.sql` - Migração SQL
- `backend/migrations/aplicar-guia-escola-snapshot.js` - Script de aplicação
- `backend/src/modules/entregas/models/Entrega.ts` - Model atualizado
- `frontend/src/modules/entregas/components/EscolasEntregaList.tsx` - Componente atualizado

## Exemplo de Uso

```typescript
// Ao gerar PDF, os dados vêm do snapshot
const modalidades = primeiroItem.escola_modalidades
  .map(m => m.modalidade_nome)
  .join(', ');
// Resultado: "ENS. FUNDAMENTAL, PRÉ ESCOLA"
```

## Data de Implementação

31/03/2026
