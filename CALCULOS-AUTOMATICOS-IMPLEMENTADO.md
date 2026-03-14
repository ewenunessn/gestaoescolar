# Cálculos Automáticos - Refeições
## Valores Nutricionais e Custo

> ✅ Implementado em 13/03/2026

---

## 📋 Funcionalidades Implementadas

### 1. Campos Nutricionais nos Produtos

Adicionados campos na tabela `produtos` para armazenar informações nutricionais:

```sql
- calorias_100g (kcal por 100g)
- proteinas_100g (gramas por 100g)
- carboidratos_100g (gramas por 100g)
- lipidios_100g (gramas por 100g)
- fibras_100g (gramas por 100g)
- sodio_100g (miligramas por 100g)
- eh_fruta_hortalica (boolean)
```

**Benefício:** Base de dados nutricional para cálculos automáticos

---

### 2. Cálculo Automático de Valores Nutricionais

**Endpoint:** `POST /api/refeicoes/:id/calcular-nutricional`

**Como funciona:**
1. Busca todos os ingredientes da refeição
2. Para cada ingrediente:
   - Converte per capita para gramas (se for unidades, assume 100g/unidade)
   - Calcula proporção (quantidade / 100g)
   - Multiplica valores nutricionais pela proporção
3. Soma todos os valores
4. Divide pelo número de porções (rendimento)

**Exemplo:**
```
Arroz: 150g, 130 kcal/100g
Feijão: 80g, 77 kcal/100g
Frango: 100g, 165 kcal/100g

Total: (150/100 * 130) + (80/100 * 77) + (100/100 * 165) = 422 kcal
Por porção (10 porções): 422 / 10 = 42.2 kcal/porção
```

**Retorna:**
- Valores totais (soma de todos os ingredientes)
- Valores por porção
- Alertas nutricionais
- Lista de ingredientes sem informação nutricional

---

### 3. Cálculo Automático de Custo

**Endpoint:** `POST /api/refeicoes/:id/calcular-custo`

**Como funciona:**
1. Busca todos os ingredientes da refeição
2. Para cada ingrediente:
   - Busca preço unitário do contrato ativo mais recente
   - Se tipo_medida = 'gramas': converte para kg e multiplica pelo preço
   - Se tipo_medida = 'unidades': multiplica quantidade pelo preço unitário
3. Soma todos os custos
4. Divide pelo número de porções

**Exemplo:**
```
Arroz: 150g, R$ 4,50/kg
Feijão: 80g, R$ 6,00/kg
Frango: 100g, R$ 12,00/kg

Custo: (0.15 * 4.50) + (0.08 * 6.00) + (0.10 * 12.00) = R$ 2.55
Por porção (10 porções): R$ 2.55 / 10 = R$ 0.26/porção
```

**Retorna:**
- Custo total
- Custo por porção
- Detalhamento por ingrediente
- Lista de ingredientes sem contrato ativo
- Alertas de custo

---

### 4. Aplicar Cálculos e Salvar

**Endpoint:** `POST /api/refeicoes/:id/aplicar-calculos`

**Como funciona:**
1. Executa cálculo nutricional
2. Executa cálculo de custo
3. Atualiza a refeição com os valores calculados:
   - calorias_por_porcao
   - proteinas_g
   - carboidratos_g
   - lipidios_g
   - fibras_g
   - sodio_mg
   - custo_por_porcao
   - rendimento_porcoes

**Benefício:** Um clique para calcular e salvar tudo

---

## 🎯 Alertas Implementados

### Alertas Nutricionais

| Condição | Tipo | Mensagem |
|----------|------|----------|
| Calorias < 300 kcal | warning | Calorias abaixo do recomendado para refeição principal |
| Calorias > 800 kcal | warning | Calorias acima do recomendado para refeição principal |
| Proteínas < 10g | info | Proteínas abaixo do ideal |
| Sódio > 800mg | warning | Sódio elevado |
| Fibras < 3g | info | Fibras abaixo do ideal |

### Alertas de Custo

| Condição | Tipo | Mensagem |
|----------|------|----------|
| Custo > R$ 5,00/porção | warning | Custo por porção elevado |
| Ingredientes sem contrato | error | Ingredientes sem contrato ativo |

---

## 💻 Interface do Usuário

### Botão "Calcular Automaticamente"

**Localização:** Aba "Ficha Técnica" da página de refeições

**Requisitos para habilitar:**
- ✅ Refeição em modo de edição
- ✅ Rendimento (porções) informado
- ✅ Pelo menos 1 ingrediente adicionado

**Comportamento:**
1. Clique no botão
2. Sistema calcula valores nutricionais e custo
3. Preenche automaticamente os campos da ficha técnica
4. Salva os valores no banco de dados
5. Mostra alertas se houver

**Avisos:**
- ⚠️ "Informe o rendimento (porções) para calcular valores"
- ⚠️ "Adicione ingredientes na aba 'Ingredientes' para calcular valores"

---

## 📊 Exemplo de Uso

### Passo 1: Adicionar Ingredientes
```
Aba "Ingredientes":
- Arroz: 150g
- Feijão: 80g
- Frango: 100g
- Alface: 30g
```

### Passo 2: Informar Rendimento
```
Aba "Ficha Técnica":
- Rendimento: 10 porções
```

### Passo 3: Calcular
```
Clique em "Calcular Automaticamente"
```

### Passo 4: Resultado
```
Valores Nutricionais (por porção):
- Calorias: 422 kcal
- Proteínas: 28g
- Carboidratos: 45g
- Lipídios: 12g
- Fibras: 5g
- Sódio: 320mg

Custo:
- Custo por porção: R$ 2,55

Alertas:
✅ Valores nutricionais adequados
✅ Custo dentro do esperado
```

---

## 🔧 Configuração Necessária

### 1. Cadastrar Informações Nutricionais nos Produtos

**Onde:** Página de Produtos → Editar Produto

**Campos:**
- Calorias (kcal/100g)
- Proteínas (g/100g)
- Carboidratos (g/100g)
- Lipídios (g/100g)
- Fibras (g/100g)
- Sódio (mg/100g)
- É fruta ou hortaliça? (checkbox)

**Dica:** Use tabelas nutricionais como TACO (Tabela Brasileira de Composição de Alimentos)

### 2. Cadastrar Contratos com Preços

**Onde:** Página de Contratos → Adicionar Produto ao Contrato

**Campos:**
- Produto
- Quantidade contratada
- Preço unitário (R$/kg ou R$/unidade)

**Importante:** O sistema busca o contrato ativo mais recente para cada produto

---

## 🎓 Valores de Referência

### Refeição Principal (Almoço/Jantar)

| Nutriente | Mínimo | Máximo | Ideal |
|-----------|--------|--------|-------|
| Calorias | 300 kcal | 800 kcal | 400-600 kcal |
| Proteínas | 10g | - | 15-25g |
| Carboidratos | 40g | - | 50-80g |
| Lipídios | 5g | 30g | 10-20g |
| Fibras | 3g | - | 5-8g |
| Sódio | - | 800mg | 400-600mg |

### Lanche

| Nutriente | Mínimo | Máximo | Ideal |
|-----------|--------|--------|-------|
| Calorias | 150 kcal | 400 kcal | 200-300 kcal |
| Proteínas | 5g | - | 8-12g |
| Fibras | 2g | - | 3-5g |

---

## 🚀 Próximos Passos

### Melhorias Futuras

1. **Integração com Open Food Facts**
   - Buscar informações nutricionais automaticamente
   - Preencher campos ao cadastrar produto

2. **Cálculo por Modalidade**
   - Considerar per capita diferente por modalidade
   - Valores nutricionais específicos por faixa etária

3. **Relatórios**
   - Relatório semanal de valores nutricionais
   - Controle de 200g frutas/hortaliças por semana
   - Análise de custo por período

4. **Validações Avançadas**
   - Alertas personalizados por tipo de refeição
   - Sugestões de ajustes nutricionais
   - Comparação com cardápios anteriores

---

## ✅ Conclusão

Com essa implementação, o sistema agora:

- ✅ Calcula automaticamente valores nutricionais das refeições
- ✅ Calcula automaticamente custo das refeições
- ✅ Considera apenas ingredientes usados na refeição
- ✅ Busca preços dos contratos ativos
- ✅ Gera alertas de valores inadequados
- ✅ Salva valores calculados na ficha técnica
- ✅ Interface simples: um clique para calcular tudo

**Benefícios:**
- ⏱️ Economia de tempo do nutricionista
- 📊 Precisão nos valores nutricionais
- 💰 Controle de custo por refeição
- ⚠️ Alertas preventivos
- 📋 Fichas técnicas completas e padronizadas
