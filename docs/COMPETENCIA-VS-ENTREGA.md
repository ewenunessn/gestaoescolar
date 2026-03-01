# Competência vs Data de Entrega

## Conceitos

O sistema agora separa dois conceitos importantes:

### 1. **Mês de Competência** (Guia)
- Para qual mês o consumo do alimento deve ser contabilizado
- Exemplo: Março/2026 significa que o alimento será consumido em março

### 2. **Data de Entrega**
- Quando o produto será fisicamente entregue na escola
- Exemplo: 25/02/2026 significa que a entrega física acontece em 25 de fevereiro

## Casos de Uso

### Caso 1: Entrega Normal
**Situação**: Entregar em março para consumo em março
- **Mês de Competência**: Março/2026
- **Data de Entrega**: 15/03/2026
- **Resultado**: Item vai para guia 03/2026

### Caso 2: Entrega Antecipada ⭐
**Situação**: Entregar em fevereiro para consumo em março
- **Mês de Competência**: Março/2026
- **Data de Entrega**: 25/02/2026
- **Resultado**: Item vai para guia 03/2026, mas será entregue em 25/02

### Caso 3: Entrega de Fim de Mês
**Situação**: Entregar no último dia do mês para consumo no mês seguinte
- **Mês de Competência**: Abril/2026
- **Data de Entrega**: 31/03/2026
- **Resultado**: Item vai para guia 04/2026, mas será entregue em 31/03

## Como Usar no Sistema

### Opção 1: Automático (Padrão)
Ao adicionar um produto, informe apenas a **data de entrega**:
- O sistema automaticamente usa o mês/ano da data de entrega como competência
- Exemplo: Data de entrega = 15/03/2026 → Guia 03/2026

### Opção 2: Manual (Avançado)
Para entregas antecipadas, informe:
1. **Data de Entrega**: 25/02/2026
2. **Mês de Competência**: Março
3. **Ano de Competência**: 2026

O sistema criará/usará a guia 03/2026, mas a entrega física será em 25/02/2026.

## API

### Adicionar Produto com Competência Explícita

```javascript
POST /api/guias/escola/:escolaId/produtos

// Entrega antecipada
{
  "produtoId": 123,
  "quantidade": 50,
  "unidade": "Kg",
  "data_entrega": "2026-02-25",      // Quando entregar
  "mes_competencia": 3,               // Para qual mês contabilizar
  "ano_competencia": 2026,            // Para qual ano contabilizar
  "observacao": "Entrega antecipada para março"
}

// Entrega normal (automático)
{
  "produtoId": 123,
  "quantidade": 50,
  "unidade": "Kg",
  "data_entrega": "2026-03-15"       // Usa 03/2026 automaticamente
}
```

### Resposta

```javascript
{
  "success": true,
  "data": { /* dados do produto */ },
  "info": {
    "mes_competencia": 3,
    "ano_competencia": 2026,
    "data_entrega": "2026-02-25",
    "entrega_antecipada": true        // Flag indicando entrega antecipada
  }
}
```

## Consultas Úteis

### Listar Entregas Antecipadas

```sql
SELECT * FROM vw_entregas_programadas 
WHERE entrega_antecipada = true;
```

### Listar Entregas de Março que Serão Entregues em Fevereiro

```sql
SELECT * FROM vw_entregas_programadas 
WHERE mes_competencia = 3 
  AND ano_competencia = 2026 
  AND mes_entrega = 2 
  AND ano_entrega = 2026;
```

### Listar Todas as Entregas Físicas de uma Data

```sql
SELECT * FROM vw_entregas_programadas 
WHERE data_entrega = '2026-02-25';
```

## Benefícios

1. **Flexibilidade**: Permite entregas antecipadas sem confusão contábil
2. **Clareza**: Separa logística (quando entregar) de contabilidade (quando consumir)
3. **Planejamento**: Facilita programação antecipada de entregas
4. **Relatórios**: Permite relatórios por competência ou por data de entrega

## Exemplos Práticos

### Exemplo 1: Escola Fechada no Início do Mês
- Escola fecha para reforma em 01-10/03
- Solução: Entregar em 25/02 para consumo em março
- Configuração:
  - Data Entrega: 25/02/2026
  - Competência: Março/2026

### Exemplo 2: Produto Perecível
- Produto com validade curta
- Solução: Entregar no dia anterior ao consumo
- Configuração:
  - Data Entrega: 31/03/2026
  - Competência: Abril/2026

### Exemplo 3: Logística de Rota
- Rota passa pela escola apenas às sextas
- Última sexta de fevereiro: 28/02
- Solução: Entregar em 28/02 para consumo em março
- Configuração:
  - Data Entrega: 28/02/2026
  - Competência: Março/2026
