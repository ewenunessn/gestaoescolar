# 🥗 Módulo de Nutrição

Módulo adicionado ao app entregador-native para gerenciar refeições e cardápios escolares.

## 📱 Funcionalidades

### Refeições
- Listar todas as refeições
- Criar nova refeição (nome, descrição)
- Editar refeição existente
- Excluir refeição
- Busca por nome
- Ícones automáticos (☕🍽️🥪🌙)
- **Adicionar produtos/ingredientes às refeições** ✅
- **Editar quantidade per capita (gramas ou unidades)** ✅
- **Remover produtos das refeições** ✅

### Cardápios
- Listar todos os cardápios
- Criar novo cardápio (data, refeição, modalidade, observações)
- Editar cardápio existente
- Excluir cardápio
- Busca por data/refeição/modalidade
- Formatação de data em pt-BR

## 🎨 Telas

1. **NutricaoScreen** - Menu principal com cards
2. **RefeicoesScreen** - Lista de refeições
3. **RefeicaoFormScreen** - Criar/editar refeição
4. **RefeicaoDetalheScreen** - Adicionar produtos/ingredientes ✅ NOVO
5. **CardapiosScreen** - Lista de cardápios
6. **CardapioFormScreen** - Criar/editar cardápio

## 🚀 Acesso

Na tela Home, clique no card verde "🥗 Nutrição".

### Fluxo de Uso
1. Clique em "🥗 Nutrição" na Home
2. Escolha "Refeições"
3. Clique em uma refeição → abre tela de detalhes com produtos
4. Adicione produtos usando o botão +
5. Edite quantidade per capita clicando no ícone de lápis
6. Remova produtos clicando no ícone de lixeira

## 📦 Arquivos Criados

- `src/api/nutricao.ts` - API client completo
- `src/screens/NutricaoScreen.tsx` - Menu principal
- `src/screens/RefeicoesScreen.tsx` - Lista de refeições
- `src/screens/RefeicaoFormScreen.tsx` - Formulário de refeição
- `src/screens/RefeicaoDetalheScreen.tsx` - Gerenciar produtos ✅ NOVO
- `src/screens/CardapiosScreen.tsx` - Lista de cardápios
- `src/screens/CardapioFormScreen.tsx` - Formulário de cardápio

## 🔌 API Endpoints Utilizados

### Refeições
- `GET /refeicoes` - Listar refeições
- `POST /refeicoes` - Criar refeição
- `PUT /refeicoes/:id` - Atualizar refeição
- `DELETE /refeicoes/:id` - Deletar refeição

### Produtos da Refeição ✅ CORRIGIDO
- `GET /refeicoes/:id/produtos` - Listar produtos de uma refeição
- `POST /refeicoes/:id/produtos` - Adicionar produto à refeição
- `PUT /refeicoes/produtos/:id` - Editar quantidade per capita
- `DELETE /refeicoes/produtos/:id` - Remover produto da refeição

**Nota**: As rotas foram corrigidas para seguir o padrão RESTful `/api/refeicoes/:id/produtos` ao invés de `/api/refeicao-produtos/:id/produtos`.

### Cardápios
- `GET /cardapios` - Listar cardápios
- `POST /cardapios` - Criar cardápio
- `PUT /cardapios/:id` - Atualizar cardápio
- `DELETE /cardapios/:id` - Deletar cardápio

### Produtos
- `GET /produtos` - Listar todos os produtos disponíveis

## 🎨 Cores

- Card: Verde (#4caf50)
- FAB: Verde escuro (#388e3c)
- Ícones: Material Design

## ✅ Status

**Completo e totalmente funcional!**

Todas as funcionalidades do módulo web foram replicadas no app mobile.
