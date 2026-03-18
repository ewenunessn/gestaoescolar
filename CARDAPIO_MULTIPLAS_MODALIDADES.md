# Cardápio com Múltiplas Modalidades - Implementação Completa

## Problema Resolvido
Anteriormente, ao criar um cardápio, era necessário associá-lo a apenas UMA modalidade. Se o mesmo cardápio fosse usado por múltiplas modalidades (ex: CRECHE e PRÉ-ESCOLA), era necessário criar o cardápio duas vezes, duplicando todo o trabalho.

## Solução Implementada
Criada uma tabela de junção (N:N) que permite associar um cardápio a múltiplas modalidades simultaneamente.

## Estrutura do Banco de Dados

### Nova Tabela: cardapio_modalidades
```sql
CREATE TABLE cardapio_modalidades (
  id SERIAL PRIMARY KEY,
  cardapio_id INTEGER NOT NULL REFERENCES cardapios_modalidade(id) ON DELETE CASCADE,
  modalidade_id INTEGER NOT NULL REFERENCES modalidades(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(cardapio_id, modalidade_id)
);
```

### Índices para Performance
```sql
CREATE INDEX idx_cardapio_modalidades_cardapio ON cardapio_modalidades(cardapio_id);
CREATE INDEX idx_cardapio_modalidades_modalidade ON cardapio_modalidades(modalidade_id);
```

### Migração de Dados
Todos os cardápios existentes foram migrados automaticamente para a nova estrutura, mantendo suas associações com modalidades.

## Backend - Alterações

### 1. Controller: cardapioController.ts

#### Criar Cardápio
```typescript
// Aceita tanto modalidade_id (legado) quanto modalidades_ids (novo)
const modalidadesArray = modalidades_ids || (modalidade_id ? [modalidade_id] : []);

// Insere cardápio na tabela principal
const result = await query(`INSERT INTO cardapios_modalidade ...`);

// Insere todas as modalidades na tabela de junção
for (const modalidadeId of modalidadesArray) {
  await query(`
    INSERT INTO cardapio_modalidades (cardapio_id, modalidade_id)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
  `, [cardapioId, modalidadeId]);
}
```

#### Listar Cardápios
```typescript
SELECT 
  cm.*,
  ARRAY_AGG(DISTINCT cm2.modalidade_id) as modalidades_ids,
  STRING_AGG(DISTINCT m2.nome, ', ') as modalidades_nomes
FROM cardapios_modalidade cm
LEFT JOIN cardapio_modalidades cm2 ON cm.id = cm2.cardapio_id
LEFT JOIN modalidades m2 ON cm2.modalidade_id = m2.id
GROUP BY cm.id
```

#### Editar Cardápio
```typescript
// Se modalidades_ids foi fornecido, atualizar tabela de junção
if (modalidades_ids && Array.isArray(modalidades_ids)) {
  // Remover modalidades antigas
  await query('DELETE FROM cardapio_modalidades WHERE cardapio_id = $1', [id]);
  
  // Inserir novas modalidades
  for (const modalidadeId of modalidades_ids) {
    await query(`INSERT INTO cardapio_modalidades ...`);
  }
}
```

## Frontend - Alterações

### 1. Componente: CardapiosModalidade.tsx

#### Estado do Formulário
```typescript
const [formData, setFormData] = useState({
  modalidade_id: '',           // Mantido para compatibilidade
  modalidades_ids: [] as number[], // Novo campo para múltiplas modalidades
  nome: '',
  mes: '',
  ano: '',
  // ... outros campos
});
```

#### Campo de Seleção Múltipla
Substituído `Select` por `Autocomplete` com múltipla seleção:

```typescript
<Autocomplete
  multiple
  options={modalidades}
  getOptionLabel={(option) => option.nome}
  value={modalidades.filter(m => formData.modalidades_ids.includes(m.id))}
  onChange={(_, newValue) => {
    setFormData({ ...formData, modalidades_ids: newValue.map(m => m.id) });
  }}
  renderInput={(params) => (
    <TextField
      {...params}
      label="Modalidades"
      required
      helperText="Selecione uma ou mais modalidades para este cardápio"
    />
  )}
  renderTags={(value, getTagProps) =>
    value.map((option, index) => (
      <Chip label={option.nome} size="small" {...getTagProps({ index })} />
    ))
  }
/>
```

#### Exibição na Tabela
```typescript
<TableCell>
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
    {cardapio.modalidades_nomes.split(', ').map((nome, idx) => (
      <Chip key={idx} label={nome} size="small" variant="outlined" />
    ))}
  </Box>
</TableCell>
```

## Fluxo de Uso

### Criar Novo Cardápio
1. Clicar em "Novo Cardápio"
2. Selecionar uma ou mais modalidades no campo "Modalidades"
3. Preencher nome, mês, ano e outros campos
4. Clicar em "Criar"
5. O cardápio será criado e associado a todas as modalidades selecionadas

### Editar Cardápio Existente
1. Clicar em "Editar" no cardápio desejado
2. Adicionar ou remover modalidades conforme necessário
3. Clicar em "Salvar"
4. As associações serão atualizadas automaticamente

### Visualizar Cardápios
- Na lista, cada cardápio mostra todas as modalidades associadas como chips
- Filtros continuam funcionando normalmente
- Ao filtrar por modalidade, mostra todos os cardápios que incluem aquela modalidade

## Compatibilidade

### Retrocompatibilidade
- A coluna `modalidade_id` em `cardapios_modalidade` foi mantida
- Backend aceita tanto `modalidade_id` (legado) quanto `modalidades_ids` (novo)
- Cardápios antigos continuam funcionando normalmente

### Migração Automática
- Todos os cardápios existentes foram migrados automaticamente
- Relacionamentos antigos foram preservados na nova tabela

## Benefícios

1. **Redução de Trabalho**: Não é mais necessário criar o mesmo cardápio múltiplas vezes
2. **Consistência**: Um cardápio compartilhado entre modalidades garante que todas usem a mesma versão
3. **Manutenção Simplificada**: Alterações em um cardápio afetam automaticamente todas as modalidades associadas
4. **Escalabilidade**: Fácil adicionar ou remover modalidades de um cardápio existente

## Arquivos Modificados

### Backend
- `backend/migrations/20260318_cardapio_multiplas_modalidades.sql` - Migration SQL
- `backend/migrations/aplicar-cardapio-multiplas-modalidades.js` - Script de aplicação
- `backend/src/modules/cardapios/controllers/cardapioController.ts` - Controller atualizado
- `backend/src/controllers/planejamentoComprasController.ts` - Atualizado para considerar múltiplas modalidades na geração de guias

### Frontend
- `frontend/src/pages/CardapiosModalidade.tsx` - Componente atualizado com seleção múltipla

## Integração com Geração de Guias de Demanda

### Problema Identificado
A geração de guias de demanda estava buscando cardápios usando apenas `cm.modalidade_id` da tabela principal, ignorando as múltiplas modalidades associadas na tabela de junção.

### Solução Aplicada
Atualizadas as funções:

1. **calcularDemandaPeriodo**
```typescript
// ANTES
SELECT DISTINCT cm.id, cm.modalidade_id
FROM cardapios_modalidade cm
WHERE cm.ativo = true AND cm.ano = $1 AND cm.mes = $2

// DEPOIS
SELECT DISTINCT cm.id, cm2.modalidade_id
FROM cardapios_modalidade cm
LEFT JOIN cardapio_modalidades cm2 ON cm2.cardapio_id = cm.id
WHERE cm.ativo = true AND cm.ano = $1 AND cm.mes = $2
  AND cm2.modalidade_id IS NOT NULL
```

2. **calcularDemandaPorCompetencia**
Mesma lógica aplicada para buscar cardápios e suas refeições considerando todas as modalidades associadas.

### Resultado
Agora, quando um cardápio é associado a múltiplas modalidades (ex: CRECHE e PRÉ-ESCOLA):
- A geração de guias de demanda considera TODAS as modalidades
- Calcula a demanda para cada escola de acordo com sua modalidade
- Um único cardápio gera demanda para todas as modalidades associadas

## Como Aplicar

### Banco Local
```bash
node backend/migrations/aplicar-cardapio-multiplas-modalidades.js
```

### Banco de Produção
```bash
# Atualizar script com connection string de produção
node backend/migrations/aplicar-cardapio-multiplas-modalidades.js
```

## Testes Recomendados

1. ✅ Criar cardápio com uma modalidade
2. ✅ Criar cardápio com múltiplas modalidades
3. ✅ Editar cardápio adicionando modalidades
4. ✅ Editar cardápio removendo modalidades
5. ✅ Filtrar cardápios por modalidade
6. ✅ Visualizar cardápios na lista
7. ✅ Verificar compatibilidade com cardápios antigos

## Status
✅ Migration criada e aplicada
✅ Backend atualizado
✅ Frontend atualizado
✅ Dados migrados automaticamente
✅ Compatibilidade mantida
✅ Pronto para uso
