# 📋 Guia de Demanda - Versão Refatorada

## 🎯 Objetivo

Simplificar e organizar o módulo de Guia de Demanda com uma hierarquia clara baseada em **Competências** (períodos de planejamento).

## 🔄 Mudanças Principais

### Antes (Versão Antiga)
- Seletor de mês/ano em todas as telas
- Confusão entre "competência" e "data de entrega"
- Difícil visualizar o panorama geral
- Muitos campos e opções em cada tela

### Depois (Versão Nova)
- Hierarquia clara: **Competências → Escolas → Produtos**
- Competência definida uma vez no topo
- Visão geral de todas as competências
- Interface mais limpa e intuitiva

## 📐 Estrutura de Navegação

```
1. TELA DE COMPETÊNCIAS
   ├─ Cards com mês/ano (ex: "MARÇO 2026")
   ├─ Indicadores de status (pendente, programada, etc.)
   ├─ Botão "+ Nova Competência"
   └─ Ao clicar: vai para lista de escolas

2. TELA DE ESCOLAS (dentro da competência)
   ├─ Header fixo mostrando competência selecionada
   ├─ Cards das escolas agrupadas por rota
   ├─ Botão "Adicionar em Lote"
   └─ Ao clicar: vai para detalhes da escola

3. TELA DE DETALHES DA ESCOLA
   ├─ Header com escola e competência
   ├─ Tabela de produtos programados
   ├─ Cada linha: Produto, Qtd, Data Entrega, Status
   └─ Botões: Adicionar, Editar, Excluir
```

## 🎨 Cores e Indicadores

### Status das Competências/Escolas:
- 🔴 **Vermelho** (#f44336): Pendente (pronto para entrega)
- 🔵 **Azul** (#2196f3): Programada (aguardando)
- 🟠 **Laranja** (#ff9800): Parcial (entrega incompleta)
- 🟢 **Verde** (#4caf50): Concluído (tudo entregue)
- ⚪ **Cinza** (#9e9e9e): Vazio (sem itens)

## 🔧 Backend - Novos Endpoints

### GET /guias/competencias
Retorna lista de competências com resumo de status:

```json
[
  {
    "mes": 3,
    "ano": 2026,
    "guia_id": 15,
    "guia_nome": "Guia 3/2026",
    "guia_status": "aberta",
    "total_itens": 45,
    "total_escolas": 12,
    "qtd_pendente": 15,
    "qtd_programada": 10,
    "qtd_parcial": 5,
    "qtd_entregue": 15,
    "qtd_cancelado": 0
  }
]
```

## 📱 Frontend - Novo Componente

### GuiasDemandaRefatorado.tsx
Localização: `frontend/src/pages/GuiasDemandaRefatorado.tsx`

**Estados principais:**
- `view`: 'competencias' | 'escolas' | 'detalhes'
- `selectedCompetencia`: Competência selecionada
- `selectedSchool`: Escola selecionada

**Fluxo de dados:**
1. Carrega competências ao montar
2. Ao selecionar competência → carrega escolas
3. Ao selecionar escola → carrega produtos

## 🚀 Como Usar

### Acessar a Nova Versão
URL: `http://localhost:5173/guias-demanda-v2`

### Criar Nova Competência
1. Na tela inicial, clique em "+ Nova Competência"
2. Selecione mês e ano
3. Clique em "Criar"

### Excluir Competência
1. Na tela inicial, clique nos três pontinhos (⋮) no canto superior direito do card da competência
2. Clique em "Excluir Competência"
3. Confirme a exclusão (isso irá remover TODOS os itens cadastrados naquela competência)

### Adicionar Produtos
1. Selecione uma competência
2. Selecione uma escola
3. Clique em "Adicionar Produto"
4. Preencha: Produto, Quantidade, Data de Entrega, Status

### Adicionar em Lote
1. Na tela de escolas, clique em "Adicionar em Lote"
2. Selecione produto e data de entrega
3. Preencha quantidades para cada escola
4. Clique em "Salvar"

## 🔄 Migração

### Versão Antiga vs Nova

| Aspecto | Antiga | Nova |
|---------|--------|------|
| URL | `/guias-demanda` | `/guias-demanda-v2` |
| Componente | `GuiasDemanda.tsx` | `GuiasDemandaRefatorado.tsx` |
| Navegação | Plana | Hierárquica |
| Seletores | Em todas as telas | Apenas na criação |

### Dados Compatíveis
✅ Usa as mesmas tabelas do banco
✅ Usa os mesmos endpoints (+ 1 novo)
✅ Dados existentes funcionam normalmente

## 📊 Vantagens da Nova Versão

1. **Mais Intuitivo**: Fluxo natural de navegação
2. **Menos Confusão**: Competência definida uma vez
3. **Melhor Visão Geral**: Cards de competências mostram status
4. **Mais Rápido**: Menos cliques para chegar onde quer
5. **Mais Limpo**: Interface menos poluída

## 🐛 Troubleshooting

### Competência não aparece
- Verifique se foi criada corretamente
- Confira se há dados para o mês/ano

### Escolas sem itens
- Normal se ainda não foram cadastrados produtos
- Aparecerão em cinza com "Sem itens"

### Erro ao carregar
- Verifique console do navegador
- Confirme que backend está rodando
- Teste endpoint: `GET /guias/competencias`

## 🔮 Próximos Passos

- [ ] Adicionar filtros avançados na lista de escolas
- [ ] Implementar busca de produtos
- [ ] Adicionar exportação de relatórios
- [ ] Melhorar dialog de lote com mais opções
- [ ] Adicionar histórico de alterações

## 📝 Notas Técnicas

### Performance
- Carregamento lazy de dados
- Cache de produtos (carrega uma vez)
- Queries otimizadas no backend

### Compatibilidade
- React 18+
- Material-UI 5+
- TypeScript 4+

### Testes
```bash
# Frontend
cd frontend
npm run dev

# Backend
cd backend
npm run dev

# Acessar
http://localhost:5173/guias-demanda-v2
```

---

**Desenvolvido em:** Março 2026  
**Versão:** 2.0  
**Status:** ✅ Implementado
