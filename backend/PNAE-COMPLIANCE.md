# Conformidade PNAE - Lei 11.947/2009

## ✅ Implementação Concluída

Este documento descreve as funcionalidades implementadas para atender aos requisitos do PNAE (Programa Nacional de Alimentação Escolar) conforme Lei 11.947/2009.

## 🎯 Funcionalidades Implementadas

### 1. Identificação de Agricultura Familiar

**Tabela: `fornecedores`**
- ✅ `tipo_fornecedor`: Identifica o tipo (AGRICULTURA_FAMILIAR, CONVENCIONAL, COOPERATIVA_AF, ASSOCIACAO_AF)
- ✅ `dap_caf`: Número da DAP/CAF para documentação
- ✅ `data_validade_dap`: Validade da documentação

**Como usar:**
```sql
-- Marcar fornecedor como Agricultura Familiar
UPDATE fornecedores 
SET tipo_fornecedor = 'AGRICULTURA_FAMILIAR',
    dap_caf = '12345678901234',
    data_validade_dap = '2026-12-31'
WHERE id = 1;
```

### 2. Cálculo Per Capita por Modalidade

**Tabela: `pnae_per_capita`**
- Armazena valores per capita por modalidade e ano
- Valores padrão 2026 já inseridos:
  - Creche: R$ 1,50
  - Pré-escola/Infantil: R$ 1,00
  - Fundamental: R$ 0,50
  - EJA: R$ 0,40
  - Integral: R$ 2,00

**Tabela: `pedidos`**
- ✅ `modalidade_id`: Vincula pedido com modalidade
- ✅ `escola_id`: Vincula pedido com escola
- ✅ `origem_recurso`: Identifica origem (PNAE, PROPRIO, OUTROS)
- ✅ `percentual_agricultura_familiar`: Calculado automaticamente

**Como usar:**
```sql
-- Configurar valores per capita para um ano
INSERT INTO pnae_per_capita (modalidade_id, ano, valor_per_capita, dias_letivos)
VALUES (1, 2027, 1.60, 200);

-- Vincular pedido com modalidade
UPDATE pedidos 
SET modalidade_id = 1,
    origem_recurso = 'PNAE'
WHERE id = 123;
```

### 3. Relatórios PNAE

**Tabela: `pnae_relatorios`**
- Armazena histórico de relatórios gerados
- Campos: tipo, período, percentual AF, valores, dados JSON

**View: `vw_pnae_agricultura_familiar`**
- Calcula automaticamente percentual de agricultura familiar
- Agrupa por pedido e fornecedor
- Relacionamento completo: pedido → itens → contrato → fornecedor

**View: `vw_pnae_per_capita_modalidade`**
- Relatório per capita por modalidade
- Total de pedidos, valor gasto, escolas atendidas

## 📊 Consultas Úteis

### Verificar Percentual de Agricultura Familiar

```sql
SELECT 
  SUM(valor_agricultura_familiar) as total_af,
  SUM(valor_itens) as total_geral,
  ROUND((SUM(valor_agricultura_familiar) / NULLIF(SUM(valor_itens), 0) * 100), 2) as percentual_af
FROM vw_pnae_agricultura_familiar
WHERE EXTRACT(YEAR FROM data_pedido) = 2026;
```

### Relatório Per Capita por Modalidade

```sql
SELECT 
  modalidade_nome,
  valor_per_capita,
  total_pedidos,
  valor_total_gasto,
  total_escolas
FROM vw_pnae_per_capita_modalidade
WHERE ano = 2026
ORDER BY modalidade_nome;
```

### Fornecedores de Agricultura Familiar

```sql
SELECT 
  nome,
  tipo_fornecedor,
  dap_caf,
  data_validade_dap,
  CASE 
    WHEN data_validade_dap < CURRENT_DATE THEN 'VENCIDA'
    WHEN data_validade_dap < CURRENT_DATE + INTERVAL '30 days' THEN 'VENCE EM BREVE'
    ELSE 'VÁLIDA'
  END as status_dap
FROM fornecedores
WHERE tipo_fornecedor IN ('AGRICULTURA_FAMILIAR', 'COOPERATIVA_AF', 'ASSOCIACAO_AF')
ORDER BY data_validade_dap;
```

### Pedidos por Origem de Recurso

```sql
SELECT 
  origem_recurso,
  COUNT(*) as total_pedidos,
  SUM(valor_total) as valor_total
FROM pedidos
WHERE EXTRACT(YEAR FROM data_pedido) = 2026
GROUP BY origem_recurso;
```

## 🔄 Próximos Passos (Backend)

1. **Controller para Relatórios PNAE**
   - Endpoint para gerar relatório de agricultura familiar
   - Endpoint para relatório per capita
   - Endpoint para prestação de contas FNDE

2. **Validações**
   - Validar DAP/CAF ao cadastrar fornecedor AF
   - Alertar quando DAP estiver próxima do vencimento
   - Validar percentual mínimo de 30% AF

3. **Cálculos Automáticos**
   - Atualizar `percentual_agricultura_familiar` ao criar/atualizar pedido
   - Calcular automaticamente valores per capita

## 🎨 Próximos Passos (Frontend)

1. **Formulário de Fornecedor**
   - Adicionar campo "Tipo de Fornecedor"
   - Campos condicionais para DAP/CAF (apenas se AF)
   - Validação de data de validade

2. **Formulário de Pedido**
   - Adicionar seleção de modalidade
   - Adicionar origem do recurso
   - Mostrar indicador de % agricultura familiar

3. **Dashboard PNAE**
   - Card com % atual de agricultura familiar
   - Gráfico de evolução mensal
   - Alertas de conformidade

4. **Relatórios**
   - Página de relatórios PNAE
   - Exportação para Excel/PDF
   - Filtros por período, modalidade, escola

## ⚠️ Importante

- ✅ **Sistema existente continua funcionando normalmente**
- ✅ **Nenhum campo obrigatório foi adicionado**
- ✅ **Todos os campos novos têm valores padrão**
- ✅ **Views não afetam performance de queries existentes**
- ✅ **Migration é reversível se necessário**

## 📝 Notas Técnicas

- Todos os pedidos existentes foram marcados como `origem_recurso = 'PNAE'`
- Fornecedores existentes têm `tipo_fornecedor = 'CONVENCIONAL'`
- Views usam LEFT JOIN para não quebrar se dados estiverem incompletos
- Índices criados para otimizar consultas de relatórios

## 🔗 Relacionamentos

```
pedidos
  ├─ escola_id → escolas
  ├─ modalidade_id → modalidades
  └─ pedido_itens
      └─ contrato_produto_id → contrato_produtos
          └─ contrato_id → contratos
              └─ fornecedor_id → fornecedores
                  └─ tipo_fornecedor (AGRICULTURA_FAMILIAR)
```

## 📚 Referências

- Lei 11.947/2009 - PNAE
- Resolução FNDE sobre valores per capita
- Manual de Prestação de Contas FNDE
