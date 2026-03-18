# 📅 Calendário Letivo Simplificado

## ✅ Sistema Implementado

O calendário letivo agora funciona de forma **simples e direta**:

- **Não precisa criar "calendário letivo"** como entidade
- **Apenas crie eventos** (feriados, recessos, reuniões, etc.)
- **O calendário visual exibe os eventos** automaticamente

---

## 🎯 Como Usar

### 1. Acesse o Calendário
```
Menu Lateral → Configurações → Calendário Letivo
```

### 2. Visualize o Calendário
- O calendário é exibido automaticamente
- Mostra o ano do período ativo selecionado
- Navegue pelos meses usando as setas

### 3. Adicione Eventos
- Clique em **"Novo Evento"**
- Preencha:
  - Título (ex: "Carnaval")
  - Tipo de evento (ex: "Feriado Nacional")
  - Data início e fim
  - Descrição (opcional)
- Clique em **"Salvar"**

### 4. Ou Importe Feriados
- Clique no menu **⋮** (três pontos)
- Selecione **"Importar Feriados Nacionais"**
- Pronto! Todos os feriados do ano são adicionados

---

## 📌 Tipos de Eventos

Você pode criar eventos de vários tipos:

### Feriados
- Feriado Nacional
- Feriado Estadual
- Feriado Municipal
- Feriado Escolar

### Pausas
- Recesso
- Férias

### Eventos Pedagógicos
- Reunião Pedagógica
- Conselho de Classe
- Formação

### Eventos Acadêmicos
- Avaliação
- Entrega de Boletim
- Matrícula

### Outros
- Evento Escolar
- Outro

---

## 🔄 Integração com Períodos

O calendário se adapta automaticamente ao período selecionado:

- **Período 2024** → Mostra eventos de 2024
- **Período 2025** → Mostra eventos de 2025
- **Período 2026** → Mostra eventos de 2026

Basta selecionar o período no topo da página e o calendário atualiza automaticamente!

---

## 💡 Vantagens do Sistema Simplificado

### Antes (Complicado)
1. Criar calendário letivo
2. Configurar datas início/fim
3. Configurar dias letivos
4. Depois criar eventos

### Agora (Simples)
1. Criar eventos
2. Pronto!

---

## 🎨 Interface

```
┌─────────────────────────────────────────────────────────────┐
│ Calendário Letivo - Ano 2025                                │
│                                                              │
│ [+ Novo Evento]                                        [⋮]  │
│                                                              │
│                    Fevereiro 2025                            │
│  D  S  T  Q  Q  S  S                                        │
│              1  2  3                                         │
│  4  5  6  7  8  9 10                                        │
│ 11 12 13 14 15 16 17  ← Carnaval (feriado)                 │
│ 18 19 20 21 22 23 24                                        │
│ 25 26 27 28                                                  │
│                                                              │
│ ┌─────────────────────┐                                     │
│ │ Eventos do Ano 2025 │                                     │
│ │ Total: 15 eventos   │                                     │
│ └─────────────────────┘                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Exemplo de Uso

### Cenário: Configurar calendário de 2025

1. **Selecione o período 2025** no seletor de períodos
2. **Acesse Calendário Letivo**
3. **Importe feriados nacionais** (menu ⋮)
4. **Adicione eventos específicos**:
   - Recesso escolar (01/07 a 15/07)
   - Férias (20/12 a 31/01)
   - Reunião pedagógica (15/02)
   - Conselho de classe (30/06)
5. **Pronto!** Calendário configurado

---

## 🔧 Mudanças Técnicas

### Backend
- `calendario_letivo_id` agora é **opcional** na tabela `eventos_calendario`
- Eventos podem ser criados sem calendário letivo
- Busca de eventos por ano/mês funciona sem calendário

### Frontend
- Removida dependência de "calendário letivo"
- Calendário exibe eventos diretamente
- Ano baseado no período ativo do usuário

### Banco de Dados
```sql
-- Antes
calendario_letivo_id INTEGER NOT NULL

-- Agora
calendario_letivo_id INTEGER NULL
```

---

## ❓ Perguntas Frequentes

**P: E se eu quiser usar o sistema antigo com calendários letivos?**
R: Ainda funciona! Você pode criar calendários letivos e vincular eventos a eles. Mas não é mais obrigatório.

**P: Os eventos aparecem em todos os anos?**
R: Não. Os eventos são filtrados pelo ano do período selecionado.

**P: Posso criar eventos de anos futuros?**
R: Sim! Basta selecionar o período do ano futuro e criar os eventos.

**P: Como vejo eventos de anos anteriores?**
R: Selecione o período do ano anterior no seletor de períodos.

**P: Preciso criar período para cada ano?**
R: Sim. O período define o ano que você está visualizando.

---

## 🚀 Resumo Ultra Rápido

1. **Acesse**: Configurações → Calendário Letivo
2. **Crie eventos**: Clique em "Novo Evento"
3. **Ou importe**: Menu ⋮ → Importar Feriados
4. **Pronto!** Calendário configurado

Simples assim! Sem complicação, sem precisar criar "calendário letivo" antes.
