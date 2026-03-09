# Como Funciona o Vínculo de Compras por Escola

## Contexto: Alimentação Escolar Municipal

### Cenário Real

Uma secretaria municipal de educação gerencia, por exemplo:
- 50 escolas
- 15.000 alunos
- 4 modalidades (Creche, Pré-escola, Fundamental, EJA)
- 20 dias letivos por mês

---

## Modelos de Compra: Centralizado vs Descentralizado

### Modelo 1: COMPRA CENTRALIZADA (Mais Comum)

**Como funciona:**
A secretaria compra para TODAS as escolas de uma vez e depois distribui.

```
SECRETARIA
    ↓ (compra centralizada)
ESTOQUE CENTRAL
    ↓ (distribui via guias)
ESCOLAS (recebem conforme necessidade)
```

**Exemplo Prático:**
```
Compra de Arroz - Março/2026
- Total necessário: 2.000 kg
- Distribuição:
  • Escola A: 150 kg
  • Escola B: 200 kg
  • Escola C: 100 kg
  • ... (outras 47 escolas)
```

**Vínculo no Sistema:**
```sql
-- Tabela: compras
compra_id: 1
numero: "COMP-MAR2026000001"
data_compra: "2026-03-01"
tipo_compra: "centralizada"
escola_id: NULL  -- Não tem escola específica
modalidade_id: NULL  -- Atende todas
valor_total: 10000.00

-- Tabela: compra_itens
item_id: 1
compra_id: 1
produto_id: 5 (Arroz)
quantidade: 2000 kg
preco_unitario: 5.00

-- Tabela: compra_distribuicao (NOVA)
distribuicao_id: 1
compra_id: 1
escola_id: 1 (Escola A)
quantidade_planejada: 150 kg
quantidade_entregue: 150 kg
data_entrega: "2026-03-05"

distribuicao_id: 2
compra_id: 1
escola_id: 2 (Escola B)
quantidade_planejada: 200 kg
quantidade_entregue: 200 kg
data_entrega: "2026-03-05"
```

---

### Modelo 2: COMPRA DESCENTRALIZADA (Menos Comum)

**Como funciona:**
Cada escola tem autonomia para fazer suas próprias compras.

```
ESCOLA A → Compra própria → Fornecedor A
ESCOLA B → Compra própria → Fornecedor B
ESCOLA C → Compra própria → Fornecedor C
```

**Exemplo Prático:**
```
Escola Municipal João Silva
- Compra de Arroz: 150 kg
- Compra de Feijão: 80 kg
- Compra de Óleo: 30 L
```

**Vínculo no Sistema:**
```sql
-- Tabela: compras
compra_id: 1
numero: "COMP-MAR2026000001"
data_compra: "2026-03-01"
tipo_compra: "descentralizada"
escola_id: 1  -- Escola Municipal João Silva
modalidade_id: 3  -- Fundamental
valor_total: 1500.00

-- Tabela: compra_itens
item_id: 1
compra_id: 1
produto_id: 5 (Arroz)
quantidade: 150 kg
preco_unitario: 5.00
```

---

### Modelo 3: HÍBRIDO (Mais Realista)

**Como funciona:**
Compra centralizada para produtos básicos + compra descentralizada para produtos específicos.

```
PRODUTOS BÁSICOS (arroz, feijão, óleo)
    → Compra Centralizada
    → Estoque Central
    → Distribui para todas

PRODUTOS ESPECÍFICOS (frutas, verduras, pão)
    → Compra Descentralizada
    → Cada escola compra conforme cardápio
```

**Exemplo Prático:**
```
Março/2026:

CENTRALIZADA:
- Arroz: 2.000 kg (todas as escolas)
- Feijão: 1.500 kg (todas as escolas)
- Óleo: 500 L (todas as escolas)

DESCENTRALIZADA:
- Escola A: Pão (300 unidades/semana)
- Escola B: Frutas (50 kg/semana)
- Escola C: Verduras (30 kg/semana)
```

---

## Estrutura de Dados Proposta

### Opção 1: Compra com Distribuição (Recomendado)

```sql
-- Compra principal (pode ser centralizada ou descentralizada)
CREATE TABLE compras (
  id SERIAL PRIMARY KEY,
  numero VARCHAR(50) UNIQUE NOT NULL,
  tipo_compra VARCHAR(20) NOT NULL, -- 'centralizada', 'descentralizada'
  escola_id INTEGER REFERENCES escolas(id), -- NULL se centralizada
  modalidade_id INTEGER REFERENCES modalidades(id),
  cardapio_id INTEGER REFERENCES cardapios(id),
  data_compra DATE NOT NULL,
  competencia_mes_ano VARCHAR(7) NOT NULL, -- 'YYYY-MM'
  valor_total DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Itens da compra
CREATE TABLE compra_itens (
  id SERIAL PRIMARY KEY,
  compra_id INTEGER REFERENCES compras(id),
  produto_id INTEGER REFERENCES produtos(id),
  contrato_produto_id INTEGER REFERENCES contrato_produtos(id),
  quantidade DECIMAL(10,3) NOT NULL,
  preco_unitario DECIMAL(10,2) NOT NULL,
  valor_total DECIMAL(10,2) NOT NULL
);

-- Distribuição planejada (apenas para compras centralizadas)
CREATE TABLE compra_distribuicao (
  id SERIAL PRIMARY KEY,
  compra_id INTEGER REFERENCES compras(id),
  compra_item_id INTEGER REFERENCES compra_itens(id),
  escola_id INTEGER REFERENCES escolas(id) NOT NULL,
  modalidade_id INTEGER REFERENCES modalidades(id),
  quantidade_planejada DECIMAL(10,3) NOT NULL,
  quantidade_entregue DECIMAL(10,3) DEFAULT 0,
  data_entrega_prevista DATE,
  data_entrega_real DATE,
  status VARCHAR(20) DEFAULT 'pendente', -- 'pendente', 'entregue', 'parcial'
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Fluxos Detalhados

### Fluxo 1: Compra Centralizada

```
1. PLANEJAMENTO
   ├─ Nutricionista cria cardápio mensal
   ├─ Sistema calcula demanda total
   └─ Sistema sugere distribuição por escola

2. CRIAÇÃO DA COMPRA
   ├─ Gestor cria compra centralizada
   ├─ tipo_compra = 'centralizada'
   ├─ escola_id = NULL
   └─ Adiciona produtos e quantidades totais

3. PLANEJAMENTO DE DISTRIBUIÇÃO
   ├─ Sistema cria registros em compra_distribuicao
   ├─ Calcula quantidade por escola baseado em:
   │  ├─ Número de alunos
   │  ├─ Modalidade
   │  ├─ Dias letivos
   │  └─ Cardápio
   └─ Gera guias de entrega

4. APROVAÇÃO
   ├─ Nutricionista aprova (produtos adequados)
   ├─ Financeiro aprova (verifica orçamento)
   └─ Secretário aprova (alçada)

5. COMPRA APROVADA
   ├─ Envia ordem ao fornecedor
   └─ Aguarda entrega

6. RECEBIMENTO NO ESTOQUE CENTRAL
   ├─ Almoxarife confere produtos
   ├─ Atualiza estoque central
   └─ Libera para distribuição

7. DISTRIBUIÇÃO PARA ESCOLAS
   ├─ Cria guias de entrega
   ├─ Motorista entrega nas escolas
   ├─ Escola recebe e assina
   └─ Atualiza compra_distribuicao.quantidade_entregue
```

**Exemplo SQL:**
```sql
-- 1. Criar compra centralizada
INSERT INTO compras (
  numero, tipo_compra, escola_id, data_compra, 
  competencia_mes_ano, valor_total, status
) VALUES (
  'COMP-MAR2026000001', 'centralizada', NULL, '2026-03-01',
  '2026-03', 10000.00, 'pendente'
);

-- 2. Adicionar item (Arroz - 2000 kg)
INSERT INTO compra_itens (
  compra_id, produto_id, quantidade, preco_unitario, valor_total
) VALUES (
  1, 5, 2000, 5.00, 10000.00
);

-- 3. Planejar distribuição
INSERT INTO compra_distribuicao (
  compra_id, compra_item_id, escola_id, 
  quantidade_planejada, data_entrega_prevista
) VALUES
  (1, 1, 1, 150, '2026-03-05'), -- Escola A: 150 kg
  (1, 1, 2, 200, '2026-03-05'), -- Escola B: 200 kg
  (1, 1, 3, 100, '2026-03-05'), -- Escola C: 100 kg
  -- ... outras 47 escolas
  (1, 1, 50, 80, '2026-03-05'); -- Escola Z: 80 kg

-- 4. Consultar distribuição
SELECT 
  e.nome as escola,
  p.nome as produto,
  cd.quantidade_planejada,
  cd.quantidade_entregue,
  cd.status
FROM compra_distribuicao cd
JOIN escolas e ON cd.escola_id = e.id
JOIN compra_itens ci ON cd.compra_item_id = ci.id
JOIN produtos p ON ci.produto_id = p.id
WHERE cd.compra_id = 1;
```

---

### Fluxo 2: Compra Descentralizada

```
1. PLANEJAMENTO POR ESCOLA
   ├─ Nutricionista cria cardápio da escola
   ├─ Sistema calcula demanda da escola
   └─ Diretor/Gestor da escola visualiza necessidade

2. CRIAÇÃO DA COMPRA
   ├─ Gestor cria compra descentralizada
   ├─ tipo_compra = 'descentralizada'
   ├─ escola_id = 1 (Escola específica)
   └─ Adiciona produtos necessários

3. APROVAÇÃO
   ├─ Nutricionista aprova
   ├─ Financeiro aprova
   └─ Secretário aprova (se valor > alçada)

4. COMPRA APROVADA
   ├─ Envia ordem ao fornecedor
   └─ Fornecedor entrega DIRETO na escola

5. RECEBIMENTO NA ESCOLA
   ├─ Diretor/Merendeira confere
   ├─ Atualiza estoque escolar
   └─ Compra finalizada
```

**Exemplo SQL:**
```sql
-- 1. Criar compra descentralizada
INSERT INTO compras (
  numero, tipo_compra, escola_id, data_compra,
  competencia_mes_ano, valor_total, status
) VALUES (
  'COMP-MAR2026000002', 'descentralizada', 1, '2026-03-01',
  '2026-03', 1500.00, 'pendente'
);

-- 2. Adicionar itens específicos da escola
INSERT INTO compra_itens (
  compra_id, produto_id, quantidade, preco_unitario, valor_total
) VALUES
  (2, 5, 150, 5.00, 750.00),  -- Arroz: 150 kg
  (2, 8, 80, 6.00, 480.00),   -- Feijão: 80 kg
  (2, 12, 30, 9.00, 270.00);  -- Óleo: 30 L

-- 3. Consultar compras por escola
SELECT 
  c.numero,
  e.nome as escola,
  c.data_compra,
  c.valor_total,
  c.status
FROM compras c
JOIN escolas e ON c.escola_id = e.id
WHERE c.escola_id = 1
  AND c.competencia_mes_ano = '2026-03';
```

---

## Cálculo Automático de Distribuição

### Algoritmo de Distribuição Proporcional

```typescript
interface DistribuicaoEscola {
  escola_id: number;
  escola_nome: string;
  alunos_total: number;
  alunos_por_modalidade: {
    modalidade_id: number;
    quantidade: number;
  }[];
  quantidade_produto: number;
}

async function calcularDistribuicao(
  produto_id: number,
  quantidade_total: number,
  mes: string,
  ano: number
): Promise<DistribuicaoEscola[]> {
  
  // 1. Buscar todas as escolas ativas
  const escolas = await db.query(`
    SELECT 
      e.id,
      e.nome,
      COUNT(DISTINCT em.id) as total_modalidades
    FROM escolas e
    LEFT JOIN escola_modalidades em ON e.id = em.escola_id
    WHERE e.ativo = true
    GROUP BY e.id, e.nome
  `);

  // 2. Para cada escola, calcular alunos por modalidade
  const distribuicao: DistribuicaoEscola[] = [];
  let total_alunos_sistema = 0;

  for (const escola of escolas.rows) {
    const alunos = await db.query(`
      SELECT 
        em.modalidade_id,
        em.quantidade_alunos
      FROM escola_modalidades em
      WHERE em.escola_id = $1
        AND em.ano_letivo = $2
        AND em.ativo = true
    `, [escola.id, ano]);

    const total_alunos_escola = alunos.rows.reduce(
      (sum, m) => sum + m.quantidade_alunos, 
      0
    );

    total_alunos_sistema += total_alunos_escola;

    distribuicao.push({
      escola_id: escola.id,
      escola_nome: escola.nome,
      alunos_total: total_alunos_escola,
      alunos_por_modalidade: alunos.rows,
      quantidade_produto: 0 // Será calculado
    });
  }

  // 3. Distribuir proporcionalmente
  for (const dist of distribuicao) {
    const proporcao = dist.alunos_total / total_alunos_sistema;
    dist.quantidade_produto = Math.round(quantidade_total * proporcao);
  }

  // 4. Ajustar arredondamentos
  const total_distribuido = distribuicao.reduce(
    (sum, d) => sum + d.quantidade_produto, 
    0
  );
  const diferenca = quantidade_total - total_distribuido;
  
  if (diferenca !== 0) {
    // Adiciona/remove a diferença da escola com mais alunos
    const maior_escola = distribuicao.reduce((prev, curr) => 
      curr.alunos_total > prev.alunos_total ? curr : prev
    );
    maior_escola.quantidade_produto += diferenca;
  }

  return distribuicao;
}
```

**Exemplo de Uso:**
```typescript
// Compra de 2000 kg de arroz
const distribuicao = await calcularDistribuicao(
  5,        // produto_id: Arroz
  2000,     // quantidade_total: 2000 kg
  '03',     // mes: Março
  2026      // ano: 2026
);

// Resultado:
[
  { escola_id: 1, escola_nome: "Escola A", alunos_total: 450, quantidade_produto: 150 },
  { escola_id: 2, escola_nome: "Escola B", alunos_total: 600, quantidade_produto: 200 },
  { escola_id: 3, escola_nome: "Escola C", alunos_total: 300, quantidade_produto: 100 },
  // ... outras escolas
]
```

---

## Relatórios e Consultas

### Relatório 1: Compras por Escola

```sql
-- Quanto cada escola recebeu no mês
SELECT 
  e.nome as escola,
  p.nome as produto,
  SUM(cd.quantidade_entregue) as quantidade_total,
  SUM(ci.preco_unitario * cd.quantidade_entregue) as valor_total
FROM compra_distribuicao cd
JOIN escolas e ON cd.escola_id = e.id
JOIN compra_itens ci ON cd.compra_item_id = ci.id
JOIN produtos p ON ci.produto_id = p.id
JOIN compras c ON cd.compra_id = c.id
WHERE c.competencia_mes_ano = '2026-03'
  AND cd.status = 'entregue'
GROUP BY e.id, e.nome, p.id, p.nome
ORDER BY e.nome, p.nome;
```

### Relatório 2: Per Capita por Escola

```sql
-- Valor per capita de alimentação por escola
SELECT 
  e.nome as escola,
  em.quantidade_alunos as total_alunos,
  SUM(ci.preco_unitario * cd.quantidade_entregue) as valor_total_recebido,
  ROUND(
    SUM(ci.preco_unitario * cd.quantidade_entregue) / em.quantidade_alunos,
    2
  ) as per_capita
FROM compra_distribuicao cd
JOIN escolas e ON cd.escola_id = e.id
JOIN escola_modalidades em ON e.id = em.escola_id
JOIN compra_itens ci ON cd.compra_item_id = ci.id
JOIN compras c ON cd.compra_id = c.id
WHERE c.competencia_mes_ano = '2026-03'
  AND cd.status = 'entregue'
  AND em.ano_letivo = 2026
GROUP BY e.id, e.nome, em.quantidade_alunos
ORDER BY per_capita DESC;
```

### Relatório 3: Pendências de Entrega

```sql
-- Escolas que ainda não receberam produtos
SELECT 
  e.nome as escola,
  p.nome as produto,
  cd.quantidade_planejada,
  cd.quantidade_entregue,
  cd.quantidade_planejada - cd.quantidade_entregue as quantidade_pendente,
  cd.data_entrega_prevista,
  CASE 
    WHEN cd.data_entrega_prevista < CURRENT_DATE THEN 'ATRASADO'
    ELSE 'NO PRAZO'
  END as situacao
FROM compra_distribuicao cd
JOIN escolas e ON cd.escola_id = e.id
JOIN compra_itens ci ON cd.compra_item_id = ci.id
JOIN produtos p ON ci.produto_id = p.id
WHERE cd.status IN ('pendente', 'parcial')
ORDER BY cd.data_entrega_prevista, e.nome;
```

---

## Vantagens do Vínculo por Escola

### 1. Rastreabilidade Total
✅ Sabe exatamente o que cada escola recebeu
✅ Facilita prestação de contas
✅ Identifica escolas com problemas de abastecimento

### 2. Controle Financeiro
✅ Calcula per capita por escola
✅ Identifica desvios de consumo
✅ Otimiza distribuição de recursos

### 3. Planejamento Melhor
✅ Compra baseada em necessidade real
✅ Reduz desperdício
✅ Evita falta de produtos

### 4. Conformidade Legal
✅ Atende PNAE
✅ Facilita auditoria
✅ Gera relatórios obrigatórios

---

## Conclusão

O vínculo por escola pode funcionar de **3 formas**:

1. **Centralizada**: Compra única → Distribui para todas
2. **Descentralizada**: Cada escola compra separado
3. **Híbrida**: Básicos centralizados + Específicos descentralizados

**Recomendação**: Modelo Híbrido com distribuição planejada.

---

**Documento criado em**: 2026-03-07  
**Autor**: Kiro AI  
**Contexto**: Sistema de Alimentação Escolar Municipal
