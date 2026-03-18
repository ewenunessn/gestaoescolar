# Guia: Como Criar Calendário de um Ano Novo

## 🎯 Opção 1: Pela Interface (Mais Fácil)

### Passo a Passo:

1. **Acesse o sistema**
   - Faça login no sistema
   - No menu lateral, vá em **Configurações** → **Calendário Letivo**

2. **Crie o calendário**
   - Se não houver calendário para o ano atual, você verá um alerta
   - Clique no botão **"Criar Calendário Letivo"**
   - Digite o ano (ex: 2025)
   - Clique em **"Criar"**

3. **Pronto!**
   - O sistema cria automaticamente o calendário de 01/02/2025 até 20/12/2025
   - Com 200 dias letivos obrigatórios
   - Dias da semana letivos: Segunda a Sexta

4. **Adicione eventos**
   - Clique em **"Novo Evento"**
   - Adicione feriados, recessos, eventos escolares, etc.
   - Ou use **"Importar Feriados Nacionais"** no menu ⋮

---

## 🖥️ Opção 2: Via Script (Para Administradores)

### Scripts Disponíveis:

#### 1. Criar Calendário de um Ano
```bash
# Criar calendário de 2025
node backend/migrations/criar-calendario-ano.js 2025

# Criar calendário de 2026
node backend/migrations/criar-calendario-ano.js 2026
```

#### 2. Listar Todos os Calendários
```bash
node backend/migrations/listar-calendarios.js
```

#### 3. Ativar um Calendário Específico
```bash
# Ativar calendário de 2025
node backend/migrations/ativar-calendario.js 2025
```

---

## 📋 O Que é Criado Automaticamente?

Quando você cria um calendário, o sistema configura:

- **Ano Letivo**: O ano informado (ex: 2025)
- **Data Início**: 01 de Fevereiro do ano
- **Data Fim**: 20 de Dezembro do ano
- **Dias Letivos Obrigatórios**: 200 dias (padrão LDB)
- **Divisão do Ano**: Bimestral (4 períodos)
- **Dias da Semana Letivos**: Segunda a Sexta
- **Status**: Inativo (você ativa quando quiser)

---

## 🎨 Adicionando Eventos ao Calendário

Após criar o calendário, adicione os eventos:

### Tipos de Eventos Disponíveis:

1. **Feriados**
   - Feriado Nacional
   - Feriado Estadual
   - Feriado Municipal
   - Feriado Escolar

2. **Períodos de Pausa**
   - Recesso
   - Férias

3. **Eventos Pedagógicos**
   - Reunião Pedagógica
   - Conselho de Classe
   - Formação

4. **Eventos Acadêmicos**
   - Avaliação
   - Entrega de Boletim
   - Matrícula

5. **Outros**
   - Evento Escolar
   - Outro

### Como Adicionar:

1. Clique em **"Novo Evento"**
2. Preencha:
   - Título (ex: "Carnaval")
   - Tipo de evento (ex: "Feriado Nacional")
   - Data início e fim
   - Descrição (opcional)
3. Clique em **"Salvar"**

---

## 🚀 Importar Feriados Automaticamente

O sistema pode importar feriados nacionais automaticamente:

1. No calendário, clique no menu **⋮** (três pontos)
2. Selecione **"Importar Feriados Nacionais"**
3. O sistema adiciona automaticamente:
   - Ano Novo (01/01)
   - Carnaval (data móvel)
   - Sexta-feira Santa (data móvel)
   - Tiradentes (21/04)
   - Dia do Trabalho (01/05)
   - Corpus Christi (data móvel)
   - Independência (07/09)
   - Nossa Senhora Aparecida (12/10)
   - Finados (02/11)
   - Proclamação da República (15/11)
   - Natal (25/12)

---

## 🔄 Integração com Períodos

O calendário é automaticamente vinculado ao período do ano:

- Se você tem um **Período 2025** no sistema
- E cria um **Calendário Letivo 2025**
- Quando selecionar o período 2025, o calendário 2025 será exibido automaticamente

### Como Funciona:

1. Usuário seleciona um período no seletor (ex: "2025 - Ano Letivo")
2. Sistema busca o calendário do ano daquele período
3. Exibe o calendário com todos os eventos

---

## 📊 Cálculo de Dias Letivos

O sistema calcula automaticamente:

### O que conta como dia letivo:
- Dias de segunda a sexta (padrão)
- Que não sejam feriados
- Que não sejam recessos ou férias
- Mais exceções marcadas como letivas

### O que NÃO conta:
- Sábados e domingos (padrão)
- Feriados (todos os tipos)
- Recessos
- Férias
- Exceções marcadas como não letivas

### Visualização:
- **Total de Dias Letivos**: Calculado automaticamente
- **Mínimo Obrigatório**: 200 dias (LDB)
- **Diferença**: Mostra se atende ou não o mínimo
- **Status**: ✅ Atende ou ❌ Não atende

---

## 🔧 Configurações Avançadas

### Alterar Dias da Semana Letivos:

Se sua escola tem aulas aos sábados, você pode editar o calendário:

```sql
UPDATE calendario_letivo 
SET dias_semana_letivos = '["seg", "ter", "qua", "qui", "sex", "sab"]'
WHERE ano_letivo = 2025;
```

### Alterar Divisão do Ano:

```sql
-- Para trimestral (3 períodos)
UPDATE calendario_letivo 
SET divisao_ano = 'trimestral'
WHERE ano_letivo = 2025;

-- Para semestral (2 períodos)
UPDATE calendario_letivo 
SET divisao_ano = 'semestral'
WHERE ano_letivo = 2025;
```

---

## ❓ Perguntas Frequentes

### 1. Posso ter mais de um calendário ativo?
Não. Apenas um calendário pode estar ativo por vez. Mas você pode ter vários calendários cadastrados (um para cada ano).

### 2. Como mudo o calendário ativo?
Use o script: `node backend/migrations/ativar-calendario.js 2025`
Ou edite manualmente no banco de dados.

### 3. Posso deletar um calendário?
Sim, mas cuidado! Isso deletará todos os eventos e períodos avaliativos vinculados.

### 4. Como adiciono feriados municipais?
Manualmente, criando eventos do tipo "Feriado Municipal" no calendário.

### 5. O calendário afeta os períodos do sistema?
Não diretamente. O calendário é vinculado ao ano do período, mas são sistemas independentes.

---

## 📝 Exemplo Completo

### Criar calendário 2025 completo:

```bash
# 1. Criar o calendário
node backend/migrations/criar-calendario-ano.js 2025

# 2. Verificar se foi criado
node backend/migrations/listar-calendarios.js

# 3. Ativar o calendário
node backend/migrations/ativar-calendario.js 2025

# 4. Acessar o sistema e adicionar eventos manualmente
# Ou importar feriados pelo menu
```

---

## 🎯 Resumo Rápido

**Para criar um calendário novo:**

1. **Via Interface**: Configurações → Calendário Letivo → Criar Calendário Letivo
2. **Via Script**: `node backend/migrations/criar-calendario-ano.js 2025`

**Depois:**
- Adicione eventos (feriados, recessos, etc.)
- Ou importe feriados nacionais automaticamente
- O sistema calcula os dias letivos automaticamente

**Pronto!** Seu calendário está configurado e integrado com o sistema de períodos.
