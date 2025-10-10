# 📋 Módulo de Demandas das Escolas

## ✅ Sistema Instalado e Pronto!

O módulo de **Demandas das Escolas** foi criado com sucesso e substitui completamente a planilha manual.

---

## 🎯 O que foi criado

### Backend
- ✅ Tabela `demandas` no banco de dados
- ✅ API REST completa (`/api/demandas`)
- ✅ Validações e controle de status
- ✅ Cálculo automático de dias

### Frontend
- ✅ Tela de listagem com filtros
- ✅ Formulário de cadastro/edição
- ✅ Visualização detalhada
- ✅ Interface moderna e responsiva

---

## 🚀 Como Usar

### 1. Acessar o Sistema
```
http://localhost:3000/demandas
```

### 2. Criar Nova Demanda
1. Clique em **"Nova Demanda"**
2. Preencha os campos:
   - **Escola Solicitante**: Selecione a escola
   - **Número do Ofício**: Ex: 002/2025
   - **Data da Solicitação**: Data em que a escola solicitou
   - **Data de Envio à SEMEAD**: Data de envio
   - **Objeto**: Ex: "Aquisição de móveis e eletrodomésticos"
   - **Descrição de Itens**: Detalhe os itens solicitados
   - **Status**: Pendente, Enviado à SEMEAD, Atendido, Não Atendido
3. Clique em **"Salvar"**

### 3. Filtrar Demandas
Use os filtros para encontrar demandas específicas:
- Por escola
- Por status
- Por período (data início/fim)

### 4. Atualizar Status
1. Clique no ícone de edição (✏️)
2. Altere o status conforme o andamento
3. Adicione a data de resposta da SEMEAD (se houver)
4. Adicione observações
5. Salve

---

## 📊 Campos da Demanda

| Campo | Descrição | Obrigatório |
|-------|-----------|-------------|
| Escola Solicitante | Escola que fez a solicitação | ✅ Sim |
| Nº Ofício | Número do ofício solicitante | ✅ Sim |
| Data Solicitação | Data da solicitação | ✅ Sim |
| Data SEMEAD | Data de envio à SEMEAD | ✅ Sim |
| Objeto | Objeto da solicitação | ✅ Sim |
| Descrição de Itens | Descrição detalhada | ✅ Sim |
| Data Resposta SEMEAD | Data da resposta | ❌ Não |
| Dias | Calculado automaticamente | 🤖 Auto |
| Status | Status atual | ✅ Sim |
| Observações | Observações adicionais | ❌ Não |

---

## 🎨 Status Disponíveis

| Status | Cor | Quando Usar |
|--------|-----|-------------|
| 🟡 Pendente | Amarelo | Demanda criada, aguardando envio |
| 🔵 Enviado à SEMEAD | Azul | Já foi enviado para a SEMEAD |
| 🟢 Atendido | Verde | Demanda foi atendida |
| 🔴 Não Atendido | Vermelho | Demanda não foi atendida |

---

## 🔄 Fluxo de Trabalho

```
1. Escola faz solicitação
   ↓
2. Secretaria registra no sistema
   ↓
3. Define data de envio à SEMEAD
   ↓
4. Sistema calcula dias automaticamente
   ↓
5. Quando houver resposta:
   - Atualiza status
   - Adiciona data de resposta
   - Adiciona observações
```

---

## 💡 Vantagens sobre a Planilha

### ✅ Automação
- Cálculo automático de dias
- Validação de dados
- Histórico completo

### ✅ Segurança
- Dados centralizados
- Backup automático
- Controle de acesso

### ✅ Produtividade
- Filtros avançados
- Busca rápida
- Múltiplos usuários simultâneos

### ✅ Organização
- Dados estruturados
- Relatórios fáceis
- Exportação de dados

---

## 🛠️ Manutenção

### Adicionar Nova Escola
1. Vá em **Escolas**
2. Cadastre a nova escola
3. Ela aparecerá automaticamente no formulário de demandas

### Backup dos Dados
Os dados estão no banco de dados PostgreSQL e são incluídos no backup regular do sistema.

### Exportar Dados
Use os filtros para selecionar as demandas desejadas e exporte conforme necessário.

---

## 📞 Suporte

Se precisar de ajuda ou tiver sugestões de melhorias:
1. Documente o problema/sugestão
2. Entre em contato com o suporte técnico
3. Ou abra uma issue no repositório

---

## 🎉 Pronto para Usar!

O sistema está 100% funcional e pronto para substituir a planilha manual.

**Acesse agora:** http://localhost:3000/demandas

---

**Desenvolvido para:** Secretaria Municipal de Educação  
**Data:** Janeiro 2025  
**Versão:** 1.0.0
