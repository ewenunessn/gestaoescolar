# Cálculo de Custo do Cardápio

## Visão Geral

O sistema calcula automaticamente o custo total do cardápio considerando:
- Quantidade de alunos por modalidade
- Refeições adicionadas no calendário mensal
- Per capita de cada produto nas preparações
- Preço médio dos produtos

## Como Funciona

### 1. Estrutura de Dados

**Tabelas envolvidas:**
- `cardapios_modalidade` - Cardápio mensal
- `cardapio_modalidades` - Modalidades associadas ao cardápio (N:N)
- `cardapio_refeicoes_dia` - Refeições adicionadas em cada dia
- `refeicoes` - Preparações cadastradas
- `refeicao_produtos` - Produtos de cada preparação com per capita
- `produtos` - Produtos cadastrados
- `contrato_produtos` - Preço unitário dos produtos por contrato
- `contratos` - Contratos ativos
- `escola_modalidades` - Quantidade de alunos por modalidade

### 2. Fórmula de Cálculo

**Custo por aluno de uma refeição:**

Para produtos em **gramas**:
```
custo_por_aluno = Σ ((per_capita_gramas / 1000) × preco_unitario_kg)
```

Para produtos em **unidades**:
```
custo_por_aluno = Σ (per_capita_unidades × preco_unitario_unidade)
```

Onde:
- `per_capita_gramas` = quantidade em gramas por aluno
- `per_capita_unidades` = quantidade em unidades por aluno
- `preco_unitario_kg` = preço do produto no contrato (R$/kg)
- `preco_unitario_unidade` = preço do produto no contrato (R$/unidade)

**Custo total de uma refeição:**
```
custo_refeicao = custo_por_aluno × total_alunos
```

**Custo total do cardápio:**
```
custo_total = Σ custo_refeicao (para todas as refeições do mês)
```

### 3. Endpoint da API

**GET** `/cardapios/:cardapioId/custo`

**Resposta:**
```json
{
  "custo_total": 15000.50,
  "total_alunos": 500,
  "total_refeicoes": 60,
  "detalhes_por_refeicao": [
    {
      "id": 1,
      "dia": 1,
      "tipo_refeicao": "almoco",
      "refeicao_id": 10,
      "refeicao_nome": "Arroz com Feijão",
      "produtos": [
        {
          "produto_id": 5,
          "produto_nome": "Arroz",
          "per_capita": 150,
          "tipo_medida": "gramas",
          "preco_unitario": 5.50,
          "custo_por_aluno": 0.825
        }
      ],
      "custo_por_aluno": 2.50,
      "custo_total": 1250.00
    }
  ],
  "detalhes_por_modalidade": [
    {
      "modalidade_id": 1,
      "quantidade_alunos": 300,
      "custo_total": 9000.30
    }
  ]
}
```

## Interface do Usuário

### Exibição no CardapioCalendario

O custo é exibido automaticamente na lateral direita da página de cardápio:

**Card de Custo:**
- Custo Total Estimado (destaque)
- Total de Alunos
- Custo por Aluno
- Detalhamento por Modalidade

**Atualização Automática:**
- Ao adicionar uma refeição no calendário
- Ao remover uma refeição
- Ao carregar a página

## Otimizações

### Performance
- Query única com JOINs otimizados
- Índices nas tabelas relacionadas
- Cálculo em memória (não armazenado)

### Precisão
- Usa `preco_medio` dos produtos
- Considera apenas refeições ativas
- Agrupa por modalidade para detalhamento

## Limitações

1. **Preço dos Produtos**: Usa o preço do contrato ativo mais recente. Se não houver contrato ativo, considera R$ 0,00
2. **Quantidade de Alunos**: Usa a soma de alunos de todas as escolas da modalidade
3. **Per Capita**: Assume que o per capita é em gramas (divide por 1000 para converter em kg)

## Melhorias Futuras

- [ ] Considerar variação de preço por fornecedor
- [ ] Histórico de custos mensais
- [ ] Comparação entre cardápios
- [ ] Alertas de custo acima do orçamento
- [ ] Exportar relatório de custo em PDF
