# Per Capita por Modalidade - Funcionalidade Existente

## Status: ✅ BACKEND IMPLEMENTADO | ⚠️ FRONTEND PENDENTE

## Descrição

A funcionalidade permite ajustar o per capita de cada ingrediente de uma refeição de acordo com a modalidade de ensino (Creche, Pré-escola, Fundamental, etc.). Isso é útil porque crianças de diferentes idades têm necessidades nutricionais diferentes.

## Backend - Implementado

### Tabela: `refeicao_produto_modalidade`

```sql
CREATE TABLE refeicao_produto_modalidade (
  id SERIAL PRIMARY KEY,
  refeicao_produto_id INTEGER NOT NULL REFERENCES refeicao_produtos(id),
  modalidade_id INTEGER NOT NULL REFERENCES modalidades(id),
  per_capita_ajustado NUMERIC(10,2) NOT NULL,
  observacao TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(refeicao_produto_id, modalidade_id)
);
```

### View: `vw_refeicao_produtos_com_modalidade`

Retorna o per capita efetivo para cada combinação produto/modalidade:
- Se existe ajuste específico, usa `per_capita_ajustado`
- Se não existe ajuste, usa `per_capita_padrao` da tabela `refeicao_produtos`

### Controller: `refeicaoProdutoModalidadeController.ts`

Funções disponíveis:
1. `listarAjustes` - Lista ajustes de um produto
2. `salvarAjustes` - Salva ajustes em lote
3. `obterPerCapitaEfetivo` - Obtém per capita para modalidade específica
4. `listarProdutosComModalidades` - Lista todos produtos com ajustes
5. `deletarAjuste` - Remove um ajuste específico

### Rotas Disponíveis

```
GET    /api/refeicao-produto/:refeicaoProdutoId/ajustes
POST   /api/refeicao-produto/:refeicaoProdutoId/ajustes
GET    /api/refeicao-produto/:refeicaoProdutoId/modalidade/:modalidadeId
GET    /api/refeicao/:refeicaoId/produtos-modalidades
DELETE /api/ajuste/:id
```

## Frontend - Pendente

### O que precisa ser implementado:

1. **Nova aba na página RefeicaoDetalhe**
   - Adicionar aba "Per Capita por Modalidade" ao lado de "Ingredientes" e "Ficha Técnica"

2. **Interface de ajuste**
   - Tabela mostrando todos os ingredientes da refeição
   - Para cada ingrediente, mostrar:
     - Nome do produto
     - Per capita padrão
     - Colunas para cada modalidade ativa (Creche, Pré-escola, etc.)
     - Campo de input para ajustar per capita por modalidade
     - Campo de observação (opcional)

3. **Serviço frontend**
   - Criar `frontend/src/services/refeicaoProdutoModalidade.ts`
   - Funções para consumir as rotas do backend

4. **Exemplo de interface:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ Ingredientes │ Ficha Técnica │ Per Capita por Modalidade │         │
└─────────────────────────────────────────────────────────────────────┘

Ajuste o per capita de cada ingrediente por modalidade de ensino.
Se não houver ajuste, será usado o per capita padrão.

┌──────────┬─────────┬─────────┬────────────┬──────────────┬──────────┐
│ Produto  │ Padrão  │ Creche  │ Pré-escola │ Fundamental  │ Obs      │
├──────────┼─────────┼─────────┼────────────┼──────────────┼──────────┤
│ Arroz    │ 100g    │ [80g]   │ [100g]     │ [120g]       │ [____]   │
│ Feijão   │ 80g     │ [60g]   │ [80g]      │ [100g]       │ [____]   │
│ Frango   │ 150g    │ [100g]  │ [150g]     │ [180g]       │ [____]   │
└──────────┴─────────┴─────────┴────────────┴──────────────┴──────────┘

                                          [Cancelar] [Salvar Ajustes]
```

## Casos de Uso

### 1. Creche (0-3 anos)
- Porções menores
- Exemplo: Arroz 80g ao invés de 100g padrão

### 2. Pré-escola (4-5 anos)
- Porções intermediárias
- Exemplo: Arroz 100g (padrão)

### 3. Fundamental (6-14 anos)
- Porções maiores
- Exemplo: Arroz 120g ao invés de 100g padrão

## Benefícios

1. **Precisão nutricional**: Atende necessidades específicas de cada faixa etária
2. **Redução de desperdício**: Evita servir porções inadequadas
3. **Conformidade PNAE**: Atende diretrizes do programa
4. **Flexibilidade**: Permite ajustes finos por modalidade

## Impacto nos Cálculos

Quando implementado no frontend, os cálculos de:
- Valores nutricionais
- Custo da refeição
- Quantidade de ingredientes

Deverão considerar a modalidade selecionada para usar o per capita correto.

## Próximos Passos

1. [ ] Criar serviço frontend `refeicaoProdutoModalidade.ts`
2. [ ] Adicionar nova aba na página RefeicaoDetalhe
3. [ ] Implementar tabela de ajustes com inputs por modalidade
4. [ ] Adicionar botão "Salvar Ajustes"
5. [ ] Integrar com cálculos nutricionais e de custo
6. [ ] Adicionar indicador visual quando há ajustes (badge, ícone)
7. [ ] Testar com diferentes modalidades

## Arquivos Relacionados

- `backend/migrations/20260313_add_percapita_modalidade.sql`
- `backend/src/controllers/refeicaoProdutoModalidadeController.ts`
- `backend/src/routes/refeicaoProdutoModalidadeRoutes.ts`
- `frontend/src/pages/RefeicaoDetalhe.tsx` (precisa modificação)

## Observações

- A tabela e rotas já estão prontas e funcionando
- Apenas falta a interface visual no frontend
- A implementação é não-destrutiva: se não houver ajuste, usa o padrão
- Suporta observações para justificar ajustes
