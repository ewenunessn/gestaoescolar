# API PNAE - Documentação

## Base URL
```
/api/pnae
```

## Endpoints Disponíveis

### 1. Dashboard PNAE
**GET** `/api/pnae/dashboard`

Retorna resumo geral do PNAE para o ano atual.

**Response:**
```json
{
  "success": true,
  "data": {
    "ano": 2026,
    "agricultura_familiar": {
      "percentual_af": 32.50,
      "valor_total": 150000.00,
      "valor_af": 48750.00,
      "total_pedidos": 45
    },
    "fornecedores": {
      "total": 12,
      "vencidos": 1,
      "vencendo": 2
    },
    "evolucao_mensal": [
      {
        "mes": 1,
        "mes_nome": "Jan/26",
        "valor_total": 12000.00,
        "valor_af": 3600.00,
        "percentual_af": 30.00
      }
    ],
    "alertas": {
      "atende_30_porcento": true,
      "fornecedores_vencidos": true,
      "fornecedores_vencendo": true
    }
  }
}
```

### 2. Relatório Agricultura Familiar
**GET** `/api/pnae/relatorios/agricultura-familiar`

Calcula percentual de agricultura familiar por período.

**Query Parameters:**
- `ano` (optional): Ano para filtrar
- `mes_inicio` (optional): Mês inicial
- `mes_fim` (optional): Mês final

**Response:**
```json
{
  "success": true,
  "data": {
    "resumo": {
      "total_pedidos": 45,
      "total_fornecedores": 12,
      "valor_total": 150000.00,
      "valor_agricultura_familiar": 48750.00,
      "percentual_agricultura_familiar": 32.50,
      "atende_requisito_30_porcento": true
    },
    "detalhamento_fornecedores": [
      {
        "fornecedor_id": 1,
        "fornecedor_nome": "Cooperativa Agricultores",
        "tipo_fornecedor": "COOPERATIVA_AF",
        "total_pedidos": 15,
        "valor_total": 45000.00,
        "valor_agricultura_familiar": 45000.00
      }
    ],
    "periodo": {
      "ano": 2026,
      "mes_inicio": 1,
      "mes_fim": 12
    }
  }
}
```

### 3. Relatório Per Capita
**GET** `/api/pnae/relatorios/per-capita`

Relatório de valores per capita por modalidade.

**Query Parameters:**
- `ano` (optional): Ano para filtrar

**Response:**
```json
{
  "success": true,
  "data": {
    "modalidades": [
      {
        "modalidade_id": 1,
        "modalidade_nome": "Creche",
        "ano": 2026,
        "valor_per_capita": 1.50,
        "dias_letivos": 200,
        "total_pedidos": 20,
        "valor_total_gasto": 60000.00,
        "total_escolas": 5,
        "valor_per_capita_real": 1.20
      }
    ],
    "ano": 2026
  }
}
```

### 4. Listar Valores Per Capita
**GET** `/api/pnae/per-capita`

Lista valores per capita configurados.

**Query Parameters:**
- `ano` (optional): Filtrar por ano

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "modalidade_id": 1,
      "modalidade_nome": "Creche",
      "ano": 2026,
      "valor_per_capita": 1.50,
      "dias_letivos": 200,
      "ativo": true,
      "created_at": "2026-03-12T10:00:00Z",
      "updated_at": "2026-03-12T10:00:00Z"
    }
  ]
}
```

### 5. Criar/Atualizar Valor Per Capita
**POST** `/api/pnae/per-capita`

Cria ou atualiza valor per capita para uma modalidade/ano.

**Request Body:**
```json
{
  "modalidade_id": 1,
  "ano": 2027,
  "valor_per_capita": 1.60,
  "dias_letivos": 200
}
```

**Response:**
```json
{
  "success": true,
  "message": "Valor per capita criado/atualizado com sucesso",
  "data": {
    "id": 10,
    "modalidade_id": 1,
    "ano": 2027,
    "valor_per_capita": 1.60,
    "dias_letivos": 200,
    "ativo": true
  }
}
```

### 6. Atualizar Valor Per Capita
**PUT** `/api/pnae/per-capita/:id`

Atualiza um valor per capita existente.

**Request Body:**
```json
{
  "valor_per_capita": 1.70,
  "dias_letivos": 200,
  "ativo": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Valor per capita atualizado com sucesso",
  "data": {
    "id": 1,
    "modalidade_id": 1,
    "ano": 2026,
    "valor_per_capita": 1.70,
    "dias_letivos": 200,
    "ativo": true
  }
}
```

### 7. Salvar Relatório
**POST** `/api/pnae/relatorios`

Salva um relatório gerado no histórico.

**Request Body:**
```json
{
  "tipo_relatorio": "AGRICULTURA_FAMILIAR",
  "ano": 2026,
  "mes": 3,
  "periodo_inicio": "2026-03-01",
  "periodo_fim": "2026-03-31",
  "dados_json": {
    "resumo": {},
    "detalhamento": []
  },
  "percentual_agricultura_familiar": 32.50,
  "valor_total": 150000.00,
  "valor_agricultura_familiar": 48750.00,
  "observacoes": "Relatório mensal março/2026"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Relatório salvo com sucesso",
  "data": {
    "id": 1,
    "tipo_relatorio": "AGRICULTURA_FAMILIAR",
    "ano": 2026,
    "mes": 3,
    "gerado_em": "2026-03-12T10:00:00Z"
  }
}
```

### 8. Listar Relatórios Salvos
**GET** `/api/pnae/relatorios`

Lista relatórios salvos no histórico.

**Query Parameters:**
- `tipo_relatorio` (optional): Filtrar por tipo
- `ano` (optional): Filtrar por ano
- `mes` (optional): Filtrar por mês

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "tipo_relatorio": "AGRICULTURA_FAMILIAR",
      "ano": 2026,
      "mes": 3,
      "periodo_inicio": "2026-03-01",
      "periodo_fim": "2026-03-31",
      "percentual_agricultura_familiar": 32.50,
      "valor_total": 150000.00,
      "valor_agricultura_familiar": 48750.00,
      "gerado_por": 1,
      "gerado_por_nome": "Admin",
      "gerado_em": "2026-03-12T10:00:00Z",
      "observacoes": "Relatório mensal março/2026"
    }
  ]
}
```

## Fornecedores - Campos PNAE Adicionados

### Criar Fornecedor
**POST** `/api/fornecedores`

**Novos campos:**
```json
{
  "nome": "Cooperativa Agricultores",
  "cnpj": "12345678000190",
  "email": "contato@cooperativa.com",
  "tipo_fornecedor": "COOPERATIVA_AF",
  "dap_caf": "12345678901234",
  "data_validade_dap": "2026-12-31",
  "ativo": true
}
```

**Valores válidos para `tipo_fornecedor`:**
- `AGRICULTURA_FAMILIAR` - Agricultor familiar individual
- `COOPERATIVA_AF` - Cooperativa de agricultura familiar
- `ASSOCIACAO_AF` - Associação de agricultura familiar
- `CONVENCIONAL` - Fornecedor convencional (padrão)

### Atualizar Fornecedor
**PUT** `/api/fornecedores/:id`

Mesmos campos do criar, todos opcionais.

## Tipos de Relatório

- `AGRICULTURA_FAMILIAR` - Relatório de percentual AF
- `PER_CAPITA` - Relatório per capita por modalidade
- `PRESTACAO_CONTAS_FNDE` - Prestação de contas completa
- `MENSAL` - Relatório mensal consolidado
- `ANUAL` - Relatório anual consolidado

## Códigos de Erro

- `400` - Bad Request (parâmetros inválidos)
- `404` - Not Found (recurso não encontrado)
- `500` - Internal Server Error (erro no servidor)

## Exemplos de Uso

### Verificar se atende 30% agricultura familiar
```bash
curl -X GET "http://localhost:3000/api/pnae/relatorios/agricultura-familiar?ano=2026"
```

### Configurar valor per capita para 2027
```bash
curl -X POST "http://localhost:3000/api/pnae/per-capita" \
  -H "Content-Type: application/json" \
  -d '{
    "modalidade_id": 1,
    "ano": 2027,
    "valor_per_capita": 1.60,
    "dias_letivos": 200
  }'
```

### Cadastrar fornecedor de agricultura familiar
```bash
curl -X POST "http://localhost:3000/api/fornecedores" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Cooperativa Agricultores",
    "cnpj": "12345678000190",
    "tipo_fornecedor": "COOPERATIVA_AF",
    "dap_caf": "12345678901234",
    "data_validade_dap": "2026-12-31"
  }'
```

### Obter dashboard PNAE
```bash
curl -X GET "http://localhost:3000/api/pnae/dashboard"
```
