# Plano de Migração React Query - Páginas Prioritárias

## 📊 **STATUS ATUAL**
- ✅ **Implementado**: 3/52 páginas (6%)
- ❌ **Pendente**: 49/52 páginas (94%)

## 🎯 **PÁGINAS PRIORITÁRIAS PARA MIGRAÇÃO**

### **FASE 1 - CRÍTICAS (5 páginas)**
1. **Produtos.tsx** - Gestão de produtos (alta frequência de uso)
2. **Fornecedores.tsx** - Gestão de fornecedores
3. **Pedidos.tsx** - Gestão de pedidos
4. **Dashboard.tsx** - Página principal com estatísticas
5. **GuiasDemanda.tsx** - Gestão de guias

### **FASE 2 - IMPORTANTES (10 páginas)**
6. **Modalidades.tsx** - Gestão de modalidades
7. **Refeicoes.tsx** - Gestão de refeições
8. **Cardapios.tsx** - Gestão de cardápios
9. **Contratos.tsx** - Gestão de contratos
10. **DemandasLista.tsx** - Lista de demandas
11. **GestaoRotas.tsx** - Gestão de rotas
12. **SaldoContratos.tsx** - Saldo de contratos
13. **EstoqueLotes.tsx** - Gestão de lotes
14. **EstoqueMovimentacoes.tsx** - Movimentações
15. **Entregas.tsx** - Gestão de entregas

### **FASE 3 - SECUNDÁRIAS (Restantes)**
- Páginas de detalhes específicos
- Páginas de configuração avançada
- Páginas de relatórios

## 🚀 **IMPLEMENTAÇÃO FASE 1**

### 1. **Produtos.tsx**
**Benefícios**: Cache de produtos, loading automático, sincronização
**Hooks necessários**: `useProdutos`, `useCriarProduto`, `useAtualizarProduto`, `useExcluirProduto`

### 2. **Fornecedores.tsx**
**Benefícios**: Cache de fornecedores, prefetch de contratos
**Hooks necessários**: `useFornecedores`, `useCriarFornecedor`, etc.

### 3. **Pedidos.tsx**
**Benefícios**: Sincronização em tempo real, cache inteligente
**Hooks necessários**: `usePedidos`, `useCriarPedido`, etc.

### 4. **Dashboard.tsx**
**Benefícios**: Cache de estatísticas, atualização automática
**Hooks necessários**: `useEstatisticas`, `useDashboard`

### 5. **GuiasDemanda.tsx**
**Benefícios**: Sincronização com outras páginas de demanda
**Hooks necessários**: `useGuias`, `useCriarGuia`, etc.

## 📈 **IMPACTO ESPERADO**

### **Após Fase 1 (8 páginas total)**
- **15% das páginas** migradas
- **80% do uso diário** coberto (páginas mais acessadas)
- **Performance significativamente melhorada**

### **Após Fase 2 (18 páginas total)**
- **35% das páginas** migradas  
- **95% do uso diário** coberto
- **Sistema altamente otimizado**

### **Após Fase 3 (52 páginas total)**
- **100% das páginas** migradas
- **Sistema completamente modernizado**

## ⏱️ **CRONOGRAMA ESTIMADO**

### **Fase 1**: 2-3 dias
- 1 página por meio dia
- Foco em qualidade e testes

### **Fase 2**: 5-7 dias  
- 2 páginas por dia
- Otimizações e refinamentos

### **Fase 3**: 10-15 dias
- 3-4 páginas por dia
- Páginas mais simples

## 🎯 **PRÓXIMO PASSO IMEDIATO**

Implementar migração da página **Produtos.tsx** como exemplo completo e template para as demais.