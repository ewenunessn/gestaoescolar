# Planejamento de Compras - Implementado ✅

## Funcionalidade

Módulo para calcular a demanda de alimentos baseado em cardápios selecionados, com 3 visualizações diferentes.

## Características

### Seleção de Cardápios
- ✅ Selecionar múltiplos cardápios
- ✅ Validação: não permite cardápios da mesma modalidade
- ✅ Definir período de planejamento (data início e fim)
- ✅ Filtrar escolas (opcional - padrão: todas)

### Cálculo de Demanda
- ✅ Baseado em per capita BRUTO (quantidade de compra)
- ✅ Considera fator de correção dos produtos
- ✅ Calcula por modalidade de ensino
- ✅ Considera frequência mensal das refeições
- ✅ Multiplica por número de alunos
- ✅ Calcula dias do período

### Fórmula de Cálculo

```typescript
// Per capita cadastrado é LÍQUIDO (consumo)
perCapitaLiquido = per_capita_cadastrado

// Para compras, calcular BRUTO
perCapitaBruto = perCapitaLiquido * fator_correcao

// Converter para gramas se necessário
if (tipo_medida === 'unidades') {
  perCapitaGramas = perCapitaBruto * 100 // 100g por unidade
} else {
  perCapitaGramas = perCapitaBruto
}

// Calcular frequência no período
diasPeriodo = (data_fim - data_inicio) + 1
frequenciaPeriodo = (frequencia_mensal / 30) * diasPeriodo

// Quantidade total
quantidadeGramas = numero_alunos * perCapitaGramas * frequenciaPeriodo
quantidadeKg = quantidadeGramas / 1000
```

## Visualizações

### 1. Por Escola
Mostra cada escola com seus produtos e quantidades:

```
Escola A (Ensino Fundamental - 500 alunos)
├─ Arroz: 150.50 kg
├─ Feijão: 80.25 kg
└─ Carne: 120.00 kg

Escola B (Ensino Médio - 300 alunos)
├─ Arroz: 90.30 kg
└─ Feijão: 48.15 kg
```

### 2. Por Produto
Lista todos os produtos com quantidade total:

```
Produto          | Quantidade Total
─────────────────┼─────────────────
Arroz            | 240.80 kg
Carne            | 120.00 kg
Feijão           | 128.40 kg
```

### 3. Consolidado (Matriz)
Tabela cruzada escola x produto:

```
Escola    | Arroz    | Feijão   | Carne
──────────┼──────────┼──────────┼──────────
Escola A  | 150.50kg | 80.25kg  | 120.00kg
Escola B  | 90.30kg  | 48.15kg  | -
```

## Arquivos Criados

### Backend

#### Controller
`backend/src/controllers/planejamentoComprasController.ts`
- `calcularDemanda()` - Calcula demanda baseado em cardápios

**Validações:**
- Pelo menos 1 cardápio selecionado
- Não permite cardápios com mesma modalidade
- Período obrigatório

**Retorno:**
```typescript
{
  periodo: { data_inicio, data_fim },
  cardapios_selecionados: number,
  escolas_total: number,
  demanda_por_escola: [...],
  demanda_por_produto: [...],
  consolidado: [...]
}
```

#### Rotas
`backend/src/routes/planejamentoComprasRoutes.ts`
- POST `/api/planejamento-compras/calcular-demanda`

**Body:**
```json
{
  "cardapios": [
    {
      "cardapio_id": 1,
      "data_inicio": "2026-03-01",
      "data_fim": "2026-03-31"
    }
  ],
  "escola_ids": [1, 2, 3] // opcional
}
```

### Frontend

#### Service
`frontend/src/services/planejamentoCompras.ts`
- `calcularDemanda()` - Chama API

#### Página
`frontend/src/pages/PlanejamentoCompras.tsx`

**Componentes:**
- Seleção de cardápios (Autocomplete)
- Seleção de período (DatePicker)
- Filtro de escolas (Autocomplete múltiplo)
- Botão calcular
- 3 tabs de visualização

**Rota:**
`/compras/planejamento`

## Fluxo de Uso

1. Usuário acessa `/compras/planejamento`
2. Define período (data início e fim)
3. Seleciona 1 ou mais cardápios
4. Opcionalmente filtra escolas
5. Clica em "Calcular Demanda"
6. Sistema valida:
   - Cardápios não têm mesma modalidade
   - Período está definido
7. Backend calcula demanda:
   - Busca refeições dos cardápios
   - Busca produtos das refeições
   - Calcula per capita bruto (com fator de correção)
   - Multiplica por alunos e frequência
   - Agrupa por escola, produto e consolidado
8. Frontend exibe resultados em 3 tabs

## Exemplo Prático

### Entrada
```
Cardápio: Ensino Fundamental (Março 2026)
Período: 01/03/2026 a 31/03/2026 (31 dias)
Escolas: Escola A (500 alunos, EF)

Refeições:
- Almoço (frequência: 22 dias/mês)
  - Arroz: 150g líquido, fator 1.0
  - Feijão: 80g líquido, fator 1.0
  - Carne: 100g líquido, fator 1.5
```

### Cálculo
```
Arroz:
- Per capita bruto: 150g * 1.0 = 150g
- Frequência período: (22/30) * 31 = 22.73 dias
- Quantidade: 500 * 150g * 22.73 = 1,704,750g = 1,704.75kg

Feijão:
- Per capita bruto: 80g * 1.0 = 80g
- Frequência período: 22.73 dias
- Quantidade: 500 * 80g * 22.73 = 909,200g = 909.20kg

Carne:
- Per capita bruto: 100g * 1.5 = 150g (comprar 150g para ter 100g líquido)
- Frequência período: 22.73 dias
- Quantidade: 500 * 150g * 22.73 = 1,704,750g = 1,704.75kg
```

### Saída
```
Por Escola:
Escola A: Arroz 1,704.75kg | Feijão 909.20kg | Carne 1,704.75kg

Por Produto:
Arroz: 1,704.75kg
Carne: 1,704.75kg
Feijão: 909.20kg

Consolidado:
Escola A | 1,704.75kg | 909.20kg | 1,704.75kg
```

## Benefícios

1. ✅ Planejamento preciso de compras
2. ✅ Considera perdas (fator de correção)
3. ✅ Múltiplas visualizações
4. ✅ Flexível (múltiplos cardápios)
5. ✅ Validação de modalidades
6. ✅ Filtro por escolas
7. ✅ Cálculo automático

## Próximos Passos (Futuro)

- [ ] Exportar para Excel
- [ ] Exportar para PDF
- [ ] Salvar planejamento
- [ ] Gerar ordem de compra
- [ ] Comparar com estoque
- [ ] Sugerir fornecedores
- [ ] Histórico de planejamentos

## Status

✅ Implementado e funcional
📍 Rota: `/compras/planejamento`
🔧 Apenas visualização (não salva no banco)

---
**Data:** 2026-03-14
**Versão:** 1.0
