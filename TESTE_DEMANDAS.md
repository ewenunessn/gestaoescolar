# 🧪 Guia de Teste - Módulo de Demandas

## ✅ Checklist de Instalação

- [x] Migration executada com sucesso
- [x] Tabela `demandas` criada
- [x] Backend configurado
- [x] Frontend configurado
- [x] Rotas registradas

## 🚀 Como Testar

### 1. Iniciar o Backend
```bash
cd backend
npm run dev
```

Aguarde a mensagem: `✅ Servidor rodando na porta 5000`

### 2. Iniciar o Frontend
```bash
cd frontend
npm run dev
```

Aguarde a mensagem: `Local: http://localhost:3000`

### 3. Fazer Login
1. Acesse: `http://localhost:3000`
2. Faça login com suas credenciais
3. Você será redirecionado para o Dashboard

### 4. Acessar Demandas
1. No menu lateral, procure por **"Demandas"** ou
2. Acesse diretamente: `http://localhost:3000/demandas`

### 5. Testar Funcionalidades

#### ✅ Teste 1: Listar Demandas
- A tela deve carregar mostrando uma tabela vazia (se for a primeira vez)
- Deve ter um botão "Nova Demanda" no canto superior direito
- Deve ter filtros: Escola, Status, Data Início, Data Fim

#### ✅ Teste 2: Criar Nova Demanda
1. Clique em **"Nova Demanda"**
2. Preencha os campos:
   - Escola: Selecione uma escola
   - Nº Ofício: `002/2025`
   - Data Solicitação: Escolha uma data
   - Data SEMEAD: Escolha uma data
   - Objeto: `Aquisição de móveis e eletrodomésticos`
   - Descrição: `Aquisição de Fogão Industrial 6 (seis) bocas`
   - Status: `Pendente`
3. Clique em **"Salvar"**
4. Você deve ser redirecionado para a lista
5. A nova demanda deve aparecer na tabela

#### ✅ Teste 3: Filtrar Demandas
1. Use o filtro de **Status**
2. Selecione "Pendente"
3. Clique em **"Filtrar"**
4. Apenas demandas pendentes devem aparecer

#### ✅ Teste 4: Editar Demanda
1. Clique no ícone de edição (✏️) de uma demanda
2. Altere o status para "Enviado à SEMEAD"
3. Adicione uma observação
4. Clique em **"Salvar"**
5. A demanda deve ser atualizada na lista

#### ✅ Teste 5: Visualizar Detalhes
1. Clique no ícone de visualização (👁️) de uma demanda
2. Todos os detalhes devem ser exibidos
3. O número de dias deve estar calculado automaticamente

#### ✅ Teste 6: Excluir Demanda
1. Clique no ícone de exclusão (🗑️) de uma demanda
2. Confirme a exclusão
3. A demanda deve ser removida da lista

## 🔍 Verificações de API

### Testar Endpoints Manualmente

#### Listar Demandas
```bash
curl http://localhost:5000/api/demandas \
  -H "Authorization: Bearer SEU_TOKEN"
```

#### Criar Demanda
```bash
curl -X POST http://localhost:5000/api/demandas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "escola_id": 1,
    "numero_oficio": "002/2025",
    "data_solicitacao": "2025-01-10",
    "data_semead": "2025-01-10",
    "objeto": "Aquisição de móveis",
    "descricao_itens": "Fogão Industrial",
    "dias_solicitacao": 0,
    "status": "pendente"
  }'
```

#### Buscar por ID
```bash
curl http://localhost:5000/api/demandas/1 \
  -H "Authorization: Bearer SEU_TOKEN"
```

#### Atualizar Status
```bash
curl -X PATCH http://localhost:5000/api/demandas/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "status": "enviado_semead",
    "observacoes": "Enviado para análise"
  }'
```

## 🐛 Problemas Comuns

### Erro: "Cannot find module"
**Solução:** Certifique-se de que executou `npm install` tanto no backend quanto no frontend

### Erro: "Unauthorized"
**Solução:** Faça login novamente para obter um token válido

### Erro: "Escola não encontrada"
**Solução:** Cadastre pelo menos uma escola antes de criar demandas

### Tabela vazia
**Solução:** Normal se for a primeira vez. Crie uma demanda de teste.

### Filtros não funcionam
**Solução:** Verifique se há demandas cadastradas que correspondam aos filtros

## ✅ Checklist de Funcionalidades

- [ ] Listar demandas
- [ ] Criar nova demanda
- [ ] Editar demanda existente
- [ ] Visualizar detalhes
- [ ] Excluir demanda
- [ ] Filtrar por escola
- [ ] Filtrar por status
- [ ] Filtrar por período
- [ ] Cálculo automático de dias
- [ ] Atualizar status
- [ ] Adicionar observações

## 📊 Dados de Teste

Use estes dados para criar demandas de teste:

### Demanda 1
- Escola: EMEF Barço da Liberdade
- Nº Ofício: 002/2025
- Data Solicitação: 10/10/2025
- Data SEMEAD: 10/10/2025
- Objeto: Aquisição de móveis e eletrodomésticos
- Descrição: Aquisição de Fogão Industrial 6 (seis) bocas
- Status: Pendente

### Demanda 2
- Escola: [Outra escola]
- Nº Ofício: 003/2025
- Data Solicitação: 15/10/2025
- Data SEMEAD: 15/10/2025
- Objeto: Material de limpeza
- Descrição: Produtos de higienização para cozinha
- Status: Enviado à SEMEAD

### Demanda 3
- Escola: [Outra escola]
- Nº Ofício: 004/2025
- Data Solicitação: 20/10/2025
- Data SEMEAD: 20/10/2025
- Objeto: Equipamentos de cozinha
- Descrição: Panelas industriais e utensílios
- Status: Atendido

## 🎉 Tudo Funcionando?

Se todos os testes passaram, o módulo está pronto para uso em produção!

**Próximos passos:**
1. Treinar usuários
2. Migrar dados da planilha antiga (se houver)
3. Desativar a planilha manual
4. Monitorar uso nos primeiros dias

---

**Dúvidas?** Consulte o arquivo `MODULO_DEMANDAS.md` para mais informações.
