# Estratégia de Integridade de Dados - Comprovantes de Entrega

## ✅ IMPLEMENTAÇÃO COMPLETA

### Status da Implementação

#### ✅ 1. Migração do Banco de Dados (CONCLUÍDO)
- Migration aplicada com sucesso em 30/03/2026
- Tabelas e funções criadas:
  - `comprovante_cancelamentos` (auditoria)
  - `popular_dados_comprovante_item()` (trigger)
  - `cancelar_item_entrega()` (função segura)
- Campos adicionados em `comprovante_itens`:
  - `guia_demanda_id` (referência histórica)
  - `mes_referencia` (mês da guia)
  - `ano_referencia` (ano da guia)
  - `data_entrega_original` (backup da data)
- Campos adicionados em `comprovantes_entrega`:
  - `itens_cancelados` (contador)
  - `observacao_cancelamento` (log)
- Constraint modificada: `historico_entrega_id ON DELETE SET NULL`

#### ✅ 2. Backend (CONCLUÍDO)
- Interfaces TypeScript atualizadas com novos campos
- Métodos adicionados ao modelo:
  - `cancelarItemEntrega()` - cancela com auditoria
  - `buscarCancelamentos()` - histórico de cancelamentos
- Endpoints criados:
  - `POST /entregas/comprovantes/cancelar-item`
  - `GET /entregas/comprovantes/:id/cancelamentos`

#### ✅ 3. Frontend Web (CONCLUÍDO)
- Interfaces TypeScript atualizadas
- Visual indicators para itens cancelados:
  - Chip "Cancelado" em itens com `historico_entrega_id === null`
  - Exibição de guia de referência (mês/ano)
- Alert de aviso quando comprovante tem cancelamentos
- Método `cancelarItemEntrega()` adicionado ao service
- `ItensEntregaList` atualizado para usar cancelamento seguro com prompt de motivo

#### ✅ 4. Mobile App (CONCLUÍDO)
- Método `cancelarItemEntrega()` adicionado ao service
- Pronto para implementação de UI (quando necessário)

---

## Problema Identificado

Três cenários podem comprometer a integridade dos comprovantes:

1. **Cancelamento de Entrega**: Usuário cancela uma entrega já comprovada
2. **Exclusão de Item da Guia**: Item da guia de demanda é deletado
3. **Exclusão de Guia**: Guia de demanda inteira é deletada

## Solução Implementada: Desnormalização Controlada

### Princípio
> "Um comprovante é um documento histórico imutável que deve preservar os dados no momento da emissão, independente de alterações futuras nas tabelas de origem."

### Estratégia

#### 1. Dados Desnormalizados (Cópia no Comprovante)

A tabela `comprovante_itens` agora armazena:

```sql
- produto_nome (já existia)
- quantidade_entregue (já existia)
- unidade (já existia)
- lote (já existia)
- guia_demanda_id (NOVO - cópia do ID)
- mes_referencia (NOVO - mês da guia)
- ano_referencia (NOVO - ano da guia)
- data_entrega_original (NOVO - backup da data)
- historico_entrega_id (MODIFICADO - agora ON DELETE SET NULL)
```

**Vantagens:**
- Comprovante mantém informações mesmo se guia for deletada
- Dados históricos preservados
- Rastreabilidade completa

#### 2. Auditoria de Cancelamentos

Nova tabela `comprovante_cancelamentos`:

```sql
CREATE TABLE comprovante_cancelamentos (
  id SERIAL PRIMARY KEY,
  comprovante_id INTEGER,
  historico_entrega_id INTEGER,
  motivo TEXT,
  usuario_id INTEGER,
  data_cancelamento TIMESTAMP,
  dados_originais JSONB -- Backup completo
);
```

**Vantagens:**
- Histórico completo de cancelamentos
- Dados originais preservados em JSON
- Auditoria para compliance

#### 3. Status no Comprovante

Campos adicionados em `comprovantes_entrega`:

```sql
- itens_cancelados INTEGER (contador)
- observacao_cancelamento TEXT (log de mudanças)
```

**Vantagens:**
- Visibilidade imediata de alterações
- Comprovante indica se houve cancelamentos
- Transparência total

### Comportamento por Cenário

#### Cenário 1: Cancelar Entrega

**Antes:**
```
Comprovante → historico_entregas (ON DELETE CASCADE)
❌ Deletar entrega = Deletar item do comprovante
```

**Depois:**
```
Comprovante → historico_entregas (ON DELETE SET NULL)
✅ Deletar entrega:
   1. Item permanece no comprovante
   2. historico_entrega_id = NULL
   3. Dados preservados (produto_nome, quantidade, etc.)
   4. Registro em comprovante_cancelamentos
   5. Contador itens_cancelados++
```

**Resultado:**
- Comprovante continua válido
- Indica claramente que houve cancelamento
- Dados originais preservados para auditoria

#### Cenário 2: Deletar Item da Guia

**Antes:**
```
guias_programacao_escola → historico_entregas → comprovante_itens
❌ Deletar item = Quebra referência
```

**Depois:**
```
✅ Comprovante tem cópia dos dados:
   - produto_nome (independente)
   - guia_demanda_id (referência histórica)
   - mes_referencia, ano_referencia
   - Todos os dados essenciais preservados
```

**Resultado:**
- Comprovante permanece íntegro
- Dados históricos completos
- Referência à guia mantida (mesmo que guia não exista mais)

#### Cenário 3: Deletar Guia de Demanda

**Antes:**
```
guias_demanda → guias_programacao_escola → historico_entregas
❌ Deletar guia = Cascata de exclusões
```

**Depois:**
```
✅ Comprovante independente:
   - guia_demanda_id preservado (valor histórico)
   - mes_referencia, ano_referencia
   - Todos os dados do item
   - Comprovante continua válido
```

**Resultado:**
- Comprovante não é afetado
- Histórico completo preservado
- Auditoria mantida

### Visualização no Sistema

#### Comprovante Normal
```
Comprovante COMP-2026-03-00001
Status: Finalizado
Itens: 5
Cancelamentos: 0
✓ Todos os itens ativos
```

#### Comprovante com Cancelamento
```
Comprovante COMP-2026-03-00002
Status: Finalizado (com alterações)
Itens: 5 (1 cancelado)
Cancelamentos: 1

⚠️ Observações:
- Item cancelado em 30/03/2026: Arroz 5kg
- Motivo: Produto entregue com defeito
```

#### Comprovante com Guia Deletada
```
Comprovante COMP-2026-03-00003
Status: Finalizado
Itens: 3
Referência: Guia 03/2026 (histórico)

ℹ️ Nota: Guia original não está mais disponível,
mas todos os dados foram preservados.
```

### Função de Cancelamento Seguro

```typescript
// Frontend
await entregaService.cancelarEntrega(itemId, {
  motivo: 'Produto com defeito',
  usuario_id: currentUser.id
});

// Backend executa:
// 1. Registra em comprovante_cancelamentos
// 2. Atualiza contador no comprovante
// 3. Adiciona observação
// 4. Remove historico_entregas (SET NULL no comprovante)
```

### View para Consultas

```sql
SELECT * FROM vw_comprovantes_detalhados
WHERE escola_id = 123;

-- Retorna:
{
  "numero_comprovante": "COMP-2026-03-00001",
  "total_itens_comprovante": 5,
  "itens_com_referencia_perdida": 1,
  "itens_cancelados": 1,
  "itens_detalhados": [
    {
      "produto_nome": "Arroz 5kg",
      "quantidade_entregue": 10,
      "referencia_ativa": false, // Indica que foi cancelado/deletado
      "mes": 3,
      "ano": 2026
    }
  ]
}
```

## Benefícios da Solução

### 1. Integridade Histórica
- Comprovantes são documentos permanentes
- Dados preservados independente de alterações
- Auditoria completa

### 2. Transparência
- Cancelamentos claramente indicados
- Motivos registrados
- Rastreabilidade total

### 3. Compliance
- Documentos fiscais preservados
- Histórico de alterações
- Dados para auditorias

### 4. Flexibilidade Operacional
- Permite correção de erros
- Mantém histórico
- Não perde informações

## Implementação no Frontend

### Indicadores Visuais

```typescript
// Comprovante com cancelamentos
{comprovante.itens_cancelados > 0 && (
  <Alert severity="warning">
    Este comprovante teve {comprovante.itens_cancelados} item(ns) cancelado(s).
    <Button onClick={() => verHistoricoCancelamentos()}>
      Ver Detalhes
    </Button>
  </Alert>
)}

// Item sem referência ativa
{!item.referencia_ativa && (
  <Chip 
    label="Histórico" 
    size="small" 
    color="default"
    icon={<HistoryIcon />}
  />
)}
```

### Validação de Comprovante

```typescript
const validarComprovante = async (numero: string) => {
  const comprovante = await api.get(`/comprovantes/numero/${numero}`);
  
  return {
    valido: comprovante.status === 'finalizado',
    alterado: comprovante.itens_cancelados > 0,
    observacoes: comprovante.observacao_cancelamento,
    itens: comprovante.itens.map(item => ({
      ...item,
      status: item.referencia_ativa ? 'ativo' : 'histórico'
    }))
  };
};
```

## Conclusão

Esta solução garante que:

✅ Comprovantes são documentos permanentes e confiáveis
✅ Cancelamentos são rastreáveis e auditáveis  
✅ Exclusões de guias não afetam comprovantes
✅ Histórico completo é preservado
✅ Sistema mantém flexibilidade operacional
✅ Compliance e auditoria são garantidos

**Resultado:** Sistema robusto que permite operações normais sem perder integridade de dados históricos.
