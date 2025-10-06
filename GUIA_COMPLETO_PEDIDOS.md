# 📘 Guia Completo - Sistema de Pedidos de Compra

## 🎯 Visão Geral

Sistema completo de criação e gestão de pedidos de compra baseados em contratos, com backend em Node.js/PostgreSQL e frontend em React/TypeScript.

---

## 🚀 Instalação e Configuração

### 1. Backend

#### Pré-requisitos
- Node.js 18+
- PostgreSQL 14+
- npm ou yarn

#### Passos

```bash
# 1. Navegar para o backend
cd backend

# 2. Instalar dependências (se necessário)
npm install

# 3. Configurar variáveis de ambiente
# Editar .env com credenciais do PostgreSQL

# 4. Executar migration
node run-migration-pedidos.js

# 5. Iniciar servidor
npm run dev
```

**Saída esperada:**
```
🔄 Iniciando migration de pedidos...
✅ Migration de pedidos executada com sucesso!
📊 Tabelas criadas:
   - pedidos
   - pedido_itens
✅ Processo concluído!

🚀 Servidor PostgreSQL rodando em localhost:3000
```

### 2. Frontend

```bash
# 1. Navegar para o frontend
cd frontend

# 2. Instalar dependências (se necessário)
npm install

# 3. Iniciar servidor de desenvolvimento
npm run dev
```

**Saída esperada:**
```
VITE v5.x.x ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

## 📋 Usando o Sistema

### Passo 1: Acessar o Sistema

1. Abrir navegador em `http://localhost:5173`
2. Fazer login com suas credenciais
3. No menu lateral, ir em **Compras → Pedidos**

### Passo 2: Criar um Pedido

#### 2.1. Iniciar Criação
1. Clicar no botão **"Novo Pedido"** (canto superior direito)
2. Você será redirecionado para `/pedidos/novo`

#### 2.2. Preencher Informações
1. **Selecionar Contrato**
   - Escolher um contrato ativo da lista
   - Apenas contratos com status "ativo" aparecem
   - Ao selecionar, os produtos do contrato são carregados

2. **Selecionar Escola**
   - Escolher a escola de destino
   - Todas as escolas cadastradas aparecem

3. **Data de Entrega** (opcional)
   - Definir quando o pedido deve ser entregue
   - Se não informado, fica em aberto

4. **Observações** (opcional)
   - Adicionar informações relevantes
   - Ex: "Entrega urgente", "Produto para evento especial"

#### 2.3. Adicionar Itens
1. Clicar em **"Adicionar Item"**
2. Para cada item:
   - Selecionar o produto (da lista do contrato)
   - Definir a quantidade
   - Adicionar observações (opcional)
   - O valor é calculado automaticamente

3. Repetir para todos os produtos desejados

4. Verificar o **Resumo**:
   - Total de itens
   - Quantidade total
   - Valor total

#### 2.4. Salvar
1. Clicar em **"Criar Pedido"**
2. Aguardar confirmação
3. Você será redirecionado para os detalhes do pedido criado

**Número do pedido gerado automaticamente:**
```
Formato: PEDYYYYNNNNNN
Exemplo: PED2025000001
```

### Passo 3: Visualizar Pedidos

#### 3.1. Lista de Pedidos
Na página `/pedidos` você vê:
- Número do pedido
- Data
- Escola
- Fornecedor
- Status (com cor)
- Valor total
- Quantidade de itens

#### 3.2. Filtrar Pedidos
1. Clicar no ícone de **filtro** (funil)
2. Opções disponíveis:
   - **Status**: Pendente, Aprovado, Em Separação, etc.
   - **Data Início**: Pedidos a partir de
   - **Data Fim**: Pedidos até
3. Clicar em **"Aplicar"**
4. Para limpar: **"Limpar"**

#### 3.3. Paginação
- Escolher quantos itens por página (10, 25, 50)
- Navegar entre páginas

### Passo 4: Gerenciar Pedido

#### 4.1. Ver Detalhes
1. Na lista, clicar no ícone de **olho** (👁️)
2. Você verá:
   - Informações completas
   - Progresso visual (stepper)
   - Lista de itens
   - Botões de ação

#### 4.2. Aprovar Pedido
**Quando:** Status = Pendente

1. Abrir detalhes do pedido
2. Clicar em **"Aprovar Pedido"** (botão verde)
3. Status muda para **"Aprovado"**
4. Seu nome e data ficam registrados

#### 4.3. Iniciar Separação
**Quando:** Status = Aprovado

1. Abrir detalhes do pedido
2. Clicar em **"Iniciar Separação"**
3. Status muda para **"Em Separação"**
4. Indica que o fornecedor está separando os produtos

#### 4.4. Marcar como Enviado
**Quando:** Status = Em Separação

1. Abrir detalhes do pedido
2. Clicar em **"Marcar como Enviado"**
3. Status muda para **"Enviado"**
4. Indica que o pedido está em transporte

#### 4.5. Confirmar Entrega
**Quando:** Status = Enviado

1. Abrir detalhes do pedido
2. Clicar em **"Confirmar Entrega"** (botão verde)
3. Status muda para **"Entregue"**
4. Pedido finalizado ✓

#### 4.6. Cancelar Pedido
**Quando:** Qualquer status (exceto Entregue ou Cancelado)

1. Abrir detalhes do pedido
2. Clicar em **"Cancelar Pedido"** (botão vermelho)
3. Informar o motivo do cancelamento
4. Confirmar
5. Status muda para **"Cancelado"**

---

## 🎨 Entendendo os Status

### Fluxo Normal

```
┌─────────────┐
│  Pendente   │ ← Criação do pedido
└──────┬──────┘
       │ Aprovar
       ▼
┌─────────────┐
│  Aprovado   │ ← Pedido aprovado
└──────┬──────┘
       │ Iniciar Separação
       ▼
┌─────────────┐
│Em Separação │ ← Separando produtos
└──────┬──────┘
       │ Marcar como Enviado
       ▼
┌─────────────┐
│   Enviado   │ ← Em transporte
└──────┬──────┘
       │ Confirmar Entrega
       ▼
┌─────────────┐
│  Entregue   │ ← Finalizado ✓
└─────────────┘
```

### Cancelamento

```
Qualquer status (exceto Entregue)
       │
       │ Cancelar
       ▼
┌─────────────┐
│ Cancelado   │ ← Pedido cancelado
└─────────────┘
```

### Cores dos Status

| Status | Cor | Significado |
|--------|-----|-------------|
| Rascunho | Cinza | Em elaboração |
| Pendente | Laranja | Aguardando aprovação |
| Aprovado | Azul | Aprovado para processamento |
| Em Separação | Azul Escuro | Separando produtos |
| Enviado | Roxo | Em transporte |
| Entregue | Verde | Finalizado com sucesso |
| Cancelado | Vermelho | Cancelado |

---

## 📊 Exemplos Práticos

### Exemplo 1: Pedido Mensal de Merenda

**Cenário:** Escola precisa de produtos para o mês

```
1. Criar Pedido
   - Contrato: CONT2025001 (Fornecedor ABC)
   - Escola: Escola Municipal Centro
   - Data Entrega: 05/02/2025
   - Observações: "Pedido mensal de fevereiro"

2. Adicionar Itens
   - Arroz Tipo 1: 500 kg
   - Feijão Preto: 300 kg
   - Óleo de Soja: 100 L
   - Açúcar: 200 kg

3. Salvar
   - Número gerado: PED2025000015
   - Valor total: R$ 8.450,00
   - Status: Pendente

4. Aprovar
   - Gestor aprova o pedido
   - Status: Aprovado

5. Acompanhar
   - Fornecedor separa: Em Separação
   - Fornecedor envia: Enviado
   - Escola recebe: Entregue ✓
```

### Exemplo 2: Pedido Urgente

**Cenário:** Falta de produto específico

```
1. Criar Pedido
   - Contrato: CONT2025002
   - Escola: Escola Rural Norte
   - Data Entrega: Hoje + 2 dias
   - Observações: "URGENTE - Falta de leite"

2. Adicionar Item
   - Leite Integral: 100 L

3. Salvar e Aprovar Imediatamente
   - Número: PED2025000016
   - Status: Aprovado

4. Acompanhamento Rápido
   - Fornecedor prioriza
   - Entrega em 2 dias
```

### Exemplo 3: Cancelamento

**Cenário:** Produto indisponível

```
1. Pedido Criado
   - PED2025000017
   - Status: Aprovado

2. Fornecedor Informa Problema
   - Produto em falta no estoque

3. Cancelar Pedido
   - Abrir detalhes
   - Clicar em "Cancelar"
   - Motivo: "Produto indisponível no estoque do fornecedor"
   - Confirmar

4. Criar Novo Pedido
   - Com produto alternativo
```

---

## 🔍 Dicas e Boas Práticas

### Criação de Pedidos

✅ **Faça:**
- Verificar saldo do contrato antes
- Conferir quantidades necessárias
- Adicionar observações relevantes
- Definir data de entrega realista

❌ **Evite:**
- Pedidos muito grandes (dividir se necessário)
- Quantidades incorretas
- Esquecer de adicionar itens importantes

### Aprovação

✅ **Faça:**
- Revisar todos os itens
- Verificar valores
- Confirmar escola correta
- Aprovar apenas se tudo estiver correto

❌ **Evite:**
- Aprovar sem revisar
- Aprovar pedidos com erros

### Acompanhamento

✅ **Faça:**
- Atualizar status conforme progresso
- Comunicar com fornecedor
- Confirmar entrega com escola
- Registrar problemas nas observações

❌ **Evite:**
- Deixar status desatualizado
- Marcar como entregue sem confirmação

---

## 🐛 Solução de Problemas

### Problema: Não consigo criar pedido

**Possíveis causas:**
1. Nenhum contrato ativo
2. Nenhum produto no contrato
3. Erro de conexão

**Solução:**
1. Verificar se há contratos ativos em `/contratos`
2. Verificar se o contrato tem produtos cadastrados
3. Verificar conexão com backend

### Problema: Produtos não aparecem

**Causa:** Contrato não selecionado ou sem produtos

**Solução:**
1. Selecionar um contrato
2. Verificar se o contrato tem produtos em `/contratos/:id`

### Problema: Não consigo aprovar

**Causa:** Status não é "Pendente"

**Solução:**
- Apenas pedidos pendentes podem ser aprovados
- Verificar status atual do pedido

### Problema: Erro ao salvar

**Possíveis causas:**
1. Campos obrigatórios não preenchidos
2. Quantidade inválida
3. Erro no servidor

**Solução:**
1. Verificar mensagem de erro
2. Conferir todos os campos
3. Verificar se backend está rodando

---

## 📞 Suporte

### Documentação
- **Implementação Completa:** `PEDIDOS_IMPLEMENTACAO.md`
- **Frontend:** `FRONTEND_PEDIDOS.md`
- **Comandos:** `COMANDOS_PEDIDOS.md`
- **Checklist:** `CHECKLIST_PEDIDOS.md`

### Exemplos
- **Requisições HTTP:** `backend/src/modules/pedidos/pedidos.http`
- **Testes:** `backend/src/modules/pedidos/pedidos.test.example.ts`

### Logs
- Backend: Console do servidor
- Frontend: Console do navegador (F12)

---

## ✅ Checklist de Uso

### Antes de Começar
- [ ] Backend rodando
- [ ] Frontend rodando
- [ ] Migration executada
- [ ] Contratos cadastrados
- [ ] Escolas cadastradas
- [ ] Produtos nos contratos

### Criar Pedido
- [ ] Selecionar contrato
- [ ] Selecionar escola
- [ ] Adicionar itens
- [ ] Definir quantidades
- [ ] Revisar valores
- [ ] Salvar

### Aprovar e Acompanhar
- [ ] Revisar pedido
- [ ] Aprovar
- [ ] Atualizar status conforme progresso
- [ ] Confirmar entrega

---

## 🎉 Conclusão

Sistema completo e funcional de pedidos de compra!

**Recursos:**
- ✅ Criação intuitiva
- ✅ Aprovação controlada
- ✅ Acompanhamento visual
- ✅ Cancelamento com motivo
- ✅ Integração completa
- ✅ Interface moderna
- ✅ Validações robustas

**Pronto para uso em produção!** 🚀

---

**Sistema de Pedidos de Compra v1.0**  
Guia Completo - Atualizado em 04/10/2025
