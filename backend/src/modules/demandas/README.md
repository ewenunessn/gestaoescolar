# Módulo de Demandas das Escolas

Este módulo substitui a planilha manual de "Demanda das Escolas e Anexos da Secretaria Municipal de Educação".

## Funcionalidades

- ✅ Cadastro de demandas das escolas
- ✅ Controle de ofícios e solicitações
- ✅ Acompanhamento de status (Pendente, Enviado à SEMEAD, Atendido, Não Atendido)
- ✅ Cálculo automático de dias desde a solicitação
- ✅ Filtros por escola, status e período
- ✅ Histórico completo de demandas

## Instalação

### 1. Executar Migration

```bash
cd backend
psql -U seu_usuario -d seu_banco -f src/database/migrations/009_create_demandas.sql
```

### 2. Reiniciar o Backend

```bash
npm run dev
```

### 3. Acessar no Frontend

Navegue para: `http://localhost:3000/demandas`

## Estrutura de Dados

### Tabela: demandas

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | SERIAL | ID único |
| escola_id | INTEGER | Escola solicitante |
| numero_oficio | VARCHAR(50) | Número do ofício |
| data_solicitacao | DATE | Data da solicitação |
| data_semead | DATE | Data de envio à SEMEAD |
| objeto | TEXT | Objeto da solicitação |
| descricao_itens | TEXT | Descrição dos itens |
| data_resposta_semead | DATE | Data da resposta (opcional) |
| dias_solicitacao | INTEGER | Dias desde a solicitação |
| status | VARCHAR(20) | Status atual |
| observacoes | TEXT | Observações (opcional) |
| usuario_criacao_id | INTEGER | Usuário que criou |

## API Endpoints

### Listar Demandas
```
GET /api/demandas
Query params: escola_id, status, data_inicio, data_fim
```

### Criar Demanda
```
POST /api/demandas
Body: { escola_id, numero_oficio, data_solicitacao, ... }
```

### Buscar por ID
```
GET /api/demandas/:id
```

### Atualizar Demanda
```
PUT /api/demandas/:id
Body: { campos a atualizar }
```

### Atualizar Status
```
PATCH /api/demandas/:id/status
Body: { status, data_resposta_semead?, observacoes? }
```

### Excluir Demanda
```
DELETE /api/demandas/:id
```

## Status Disponíveis

- **pendente**: Demanda criada, aguardando envio
- **enviado_semead**: Enviado para a SEMEAD
- **atendido**: Demanda atendida
- **nao_atendido**: Demanda não atendida

## Fluxo de Uso

1. Escola faz uma solicitação
2. Secretaria registra a demanda no sistema
3. Define data de envio à SEMEAD
4. Sistema calcula automaticamente os dias
5. Quando houver resposta, atualiza o status
6. Pode adicionar observações em qualquer momento

## Vantagens sobre a Planilha

✅ Dados centralizados e seguros
✅ Cálculo automático de dias
✅ Filtros e buscas avançadas
✅ Histórico completo
✅ Múltiplos usuários simultâneos
✅ Backup automático
✅ Relatórios e exportações
