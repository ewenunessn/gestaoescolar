# 🧪 Roteiro de Testes - Calendário Letivo

## ✅ Checklist de Testes

Use este roteiro para validar que o sistema está funcionando corretamente.

## 1️⃣ Preparação

### Aplicar Migration

```bash
node backend/migrations/aplicar-calendario-letivo.js
```

**Resultado Esperado:**
```
✅ Migration aplicada com sucesso!
📊 Tabelas criadas:
   ✓ calendario_letivo
   ✓ eventos_calendario
   ✓ periodos_avaliativos
   ✓ dias_letivos_excecoes
📅 Criando calendário letivo de exemplo para 2024...
   ✓ Calendário 2024 criado
   ✓ Eventos de exemplo criados
   ✓ Períodos avaliativos (bimestres) criados
```

- [ ] Migration executada sem erros
- [ ] 4 tabelas criadas
- [ ] Calendário 2024 criado
- [ ] Eventos criados
- [ ] Períodos criados

## 2️⃣ Testes de Backend

### Verificar Tabelas no Banco

```sql
-- Verificar calendário
SELECT * FROM calendario_letivo;

-- Verificar eventos
SELECT * FROM eventos_calendario;

-- Verificar períodos
SELECT * FROM periodos_avaliativos;
```

**Resultado Esperado:**
- [ ] 1 calendário para 2024
- [ ] 11 eventos (9 feriados + 1 recesso + 1 início do ano)
- [ ] 4 períodos (bimestres)

### Testar API (Postman/Insomnia)

#### GET /api/calendario-letivo/ativo
```
GET http://localhost:3000/api/calendario-letivo/ativo
Authorization: Bearer {seu_token}
```

**Resultado Esperado:**
```json
{
  "id": 1,
  "ano_letivo": 2024,
  "data_inicio": "2024-02-05",
  "data_fim": "2024-12-20",
  "total_dias_letivos_obrigatorio": 200,
  "ativo": true
}
```

- [ ] Retorna calendário 2024
- [ ] Status 200

#### GET /api/eventos-calendario?calendario_id=1&ano=2024&mes=2
```
GET http://localhost:3000/api/eventos-calendario?calendario_id=1&ano=2024&mes=2
Authorization: Bearer {seu_token}
```

**Resultado Esperado:**
- [ ] Retorna eventos de fevereiro 2024
- [ ] Inclui Carnaval (13-14/02)
- [ ] Inclui Início do Ano Letivo (05/02)
- [ ] Status 200

#### GET /api/calendario-letivo/1/dias-letivos
```
GET http://localhost:3000/api/calendario-letivo/1/dias-letivos
Authorization: Bearer {seu_token}
```

**Resultado Esperado:**
```json
{
  "total_dias_letivos": 180,
  "total_dias_letivos_obrigatorio": 200,
  "diferenca": -20,
  "atende_minimo": false,
  "dias_letivos": [...]
}
```

- [ ] Retorna cálculo de dias letivos
- [ ] Mostra diferença para o mínimo
- [ ] Status 200

## 3️⃣ Testes de Frontend

### Acessar a Página

1. Faça login no sistema
2. Vá em **Configurações > Calendário Letivo**

**Resultado Esperado:**
- [ ] Página carrega sem erros
- [ ] Mostra calendário de fevereiro 2024
- [ ] Mostra título "Calendário Letivo"
- [ ] Mostra subtítulo "Ano Letivo 2024"

### Visualização do Calendário

**Resultado Esperado:**
- [ ] Grid de dias do mês visível
- [ ] Dias da semana (Dom, Seg, Ter, etc) visíveis
- [ ] Setas de navegação ◀ ▶ visíveis
- [ ] Eventos coloridos nos dias corretos
- [ ] Carnaval (13-14/02) em vermelho
- [ ] Início do Ano Letivo (05/02) em azul

### Card de Estatísticas

**Resultado Esperado:**
- [ ] Mostra "Total de Dias Letivos"
- [ ] Mostra "Mínimo Obrigatório: 200"
- [ ] Mostra "Diferença" com chip colorido
- [ ] Chip vermelho se abaixo de 200
- [ ] Chip verde se acima de 200

### Navegação entre Meses

1. Clique na seta ▶ (próximo mês)

**Resultado Esperado:**
- [ ] Muda para março 2024
- [ ] Mostra "Março 2024" no topo
- [ ] Carrega eventos de março
- [ ] Mostra Sexta-feira Santa (29/03)

2. Clique na seta ◀ (mês anterior)

**Resultado Esperado:**
- [ ] Volta para fevereiro 2024
- [ ] Mostra eventos de fevereiro novamente

### Clicar em um Dia

1. Clique no dia 13 (Carnaval)

**Resultado Esperado:**
- [ ] Card lateral muda para "Eventos de 13/02/2024"
- [ ] Mostra evento "Carnaval"
- [ ] Mostra chip "Feriado Nacional"
- [ ] Mostra descrição do evento

2. Clique no dia 05 (Início do Ano Letivo)

**Resultado Esperado:**
- [ ] Mostra evento "Início do Ano Letivo"
- [ ] Mostra chip "Evento Escolar"

3. Clique em um dia sem eventos

**Resultado Esperado:**
- [ ] Mostra "Nenhum evento neste dia"

## 4️⃣ Testes de Funcionalidades

### Criar Novo Evento

1. Clique no botão **"Novo Evento"**

**Resultado Esperado:**
- [ ] Dialog abre
- [ ] Mostra formulário de evento
- [ ] Campos: Título, Tipo, Data Início, Data Fim, Descrição, É dia letivo

2. Preencha:
   - Título: "Reunião Pedagógica"
   - Tipo: "Reunião Pedagógica"
   - Data Início: 15/03/2024
   - É dia letivo: Não

3. Clique em **"Salvar"**

**Resultado Esperado:**
- [ ] Dialog fecha
- [ ] Toast de sucesso aparece
- [ ] Evento aparece no calendário (março)
- [ ] Evento aparece em roxo (cor de reunião)

### Importar Feriados

1. Clique no ícone **⋮** (três pontos)
2. Clique em **"Importar Feriados Nacionais"**

**Resultado Esperado:**
- [ ] Toast de sucesso aparece
- [ ] Feriados são adicionados ao calendário
- [ ] Não duplica feriados já existentes

### Editar Evento

1. Clique em um dia com evento
2. Clique no evento no card lateral
3. Modifique o título
4. Clique em **"Salvar"**

**Resultado Esperado:**
- [ ] Dialog fecha
- [ ] Toast de sucesso aparece
- [ ] Evento atualizado no calendário

### Excluir Evento

1. Clique em um dia com evento
2. Clique no evento no card lateral
3. Clique em **"Excluir"**
4. Confirme a exclusão

**Resultado Esperado:**
- [ ] Dialog fecha
- [ ] Toast de sucesso aparece
- [ ] Evento removido do calendário

## 5️⃣ Testes de Validação

### Validação de Datas

1. Tente criar evento com data fim antes da data início

**Resultado Esperado:**
- [ ] Mostra erro de validação
- [ ] Não permite salvar

### Validação de Campos Obrigatórios

1. Tente criar evento sem título

**Resultado Esperado:**
- [ ] Mostra erro "Campo obrigatório"
- [ ] Não permite salvar

2. Tente criar evento sem tipo

**Resultado Esperado:**
- [ ] Mostra erro "Campo obrigatório"
- [ ] Não permite salvar

## 6️⃣ Testes de Performance

### Carregar Calendário

**Resultado Esperado:**
- [ ] Página carrega em menos de 2 segundos
- [ ] Não trava o navegador
- [ ] Não mostra erros no console

### Navegar entre Meses

**Resultado Esperado:**
- [ ] Mudança de mês é instantânea
- [ ] Não há delay perceptível
- [ ] Eventos carregam rapidamente

### Criar Múltiplos Eventos

1. Crie 10 eventos diferentes

**Resultado Esperado:**
- [ ] Todos os eventos são salvos
- [ ] Calendário atualiza corretamente
- [ ] Performance não degrada

## 7️⃣ Testes de Responsividade

### Desktop (1920x1080)

**Resultado Esperado:**
- [ ] Layout em 2 colunas (calendário + sidebar)
- [ ] Calendário ocupa 8/12 do espaço
- [ ] Sidebar ocupa 4/12 do espaço
- [ ] Todos os elementos visíveis

### Tablet (768x1024)

**Resultado Esperado:**
- [ ] Layout se adapta
- [ ] Calendário e sidebar empilham
- [ ] Botões acessíveis
- [ ] Texto legível

### Mobile (375x667)

**Resultado Esperado:**
- [ ] Layout em coluna única
- [ ] Calendário ocupa largura total
- [ ] Botões grandes o suficiente para toque
- [ ] Menu lateral funciona

## 8️⃣ Testes de Integração

### Com Sistema de Períodos

1. Vá em **Configurações > Períodos**
2. Verifique se os períodos do calendário aparecem

**Resultado Esperado:**
- [ ] Períodos do calendário são listados
- [ ] Datas coincidem com os bimestres

### Com Sistema de Cardápios

1. Tente criar um cardápio em um feriado

**Resultado Esperado (futuro):**
- [ ] Sistema alerta que é feriado
- [ ] Sugere criar em dia letivo

## 9️⃣ Testes de Segurança

### Autenticação

1. Tente acessar `/calendario-letivo` sem estar logado

**Resultado Esperado:**
- [ ] Redireciona para login
- [ ] Não mostra dados

### Autorização

1. Tente acessar API sem token

**Resultado Esperado:**
- [ ] Retorna 401 Unauthorized
- [ ] Não retorna dados

## 🔟 Testes de Erro

### Erro de Conexão

1. Desligue o backend
2. Tente carregar o calendário

**Resultado Esperado:**
- [ ] Mostra mensagem de erro amigável
- [ ] Não quebra a aplicação
- [ ] Permite tentar novamente

### Erro de Validação

1. Envie dados inválidos para a API

**Resultado Esperado:**
- [ ] Retorna erro 400
- [ ] Mensagem de erro clara
- [ ] Não salva dados inválidos

## ✅ Resultado Final

### Checklist Geral

- [ ] Todos os testes de backend passaram
- [ ] Todos os testes de frontend passaram
- [ ] Todas as funcionalidades funcionam
- [ ] Todas as validações funcionam
- [ ] Performance adequada
- [ ] Responsivo em todos os tamanhos
- [ ] Sem erros no console
- [ ] Sem warnings no console

### Problemas Encontrados

Liste aqui qualquer problema encontrado durante os testes:

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Observações

_______________________________________________
_______________________________________________
_______________________________________________

---

**Data do Teste**: ___/___/______  
**Testador**: _____________________  
**Versão**: 1.0.0  
**Status**: [ ] Aprovado [ ] Reprovado
