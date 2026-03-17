# Status da Migração para React Query

## Objetivo
Migrar todas as chamadas de API para React Query, eliminando:
- Estados manuais de loading (useState)
- Chamadas diretas de funções de services
- Uso de fetch() nativo (substituir por axios)

## Prioridades

### ✅ ALTA PRIORIDADE - CONCLUÍDO
1. ✅ Refeicoes.tsx - Migrado para React Query
2. ✅ CardapiosModalidade.tsx - Migrado para React Query
3. ✅ CardapioCalendario.tsx - Substituído fetch() por axios

### ⏳ ALTA PRIORIDADE - PENDENTE (Complexidade Alta)

Estas 3 páginas são significativamente mais complexas e requerem análise detalhada:

1. **RefeicaoDetalhe.tsx** (Complexidade: ALTA)
   - Usa 7 funções diferentes do refeicoes service
   - Gerencia produtos da refeição com drag-and-drop
   - Integra com hooks de cálculos nutricionais
   - Gera PDF com dados complexos
   - Requer hook dedicado: `useRefeicaoDetalheQueries.ts`

2. **Romaneio.tsx** (Complexidade: ALTA)
   - Usa guiaService e rotaService
   - Gerencia QR codes e impressão
   - Múltiplos agrupamentos de dados
   - Navegação por teclado complexa
   - Requer hooks: `useRomaneioQueries.ts` e `useRotaQueries.ts`

3. **SaldoContratosModalidades.tsx** (Complexidade: MUITO ALTA)
   - 1662 linhas de código
   - Gerencia saldos, consumos e histórico
   - Múltiplos diálogos e estados
   - Navegação por teclado avançada
   - Requer hook: `useSaldoContratosQueries.ts`

**Estimativa:** Cada página requer 2-3 horas de trabalho cuidadoso para migração completa.

## Hooks Criados

### ✅ Implementados
- `useRefeicaoQueries.ts` - Queries e mutations para refeições
- `useCardapioModalidadeQueries.ts` - Queries e mutations para cardápios
- `useNutricionistaQueries.ts` - Queries e mutations para nutricionistas (já existia)
- `usePnaeQueries.ts` - Queries para PNAE (já existia)
- `useFornecedorQueries.ts` - Queries para fornecedores (já existia)
- `usePeriodosQueries.ts` - Queries para períodos (já existia)

### ⏳ A Criar
- `useRefeicaoDetalheQueries.ts` - Para RefeicaoDetalhe
- `useRomaneioQueries.ts` - Para Romaneio
- `useSaldoContratosQueries.ts` - Para SaldoContratosModalidades

## Padrão de Migração

### Antes (Padrão Antigo)
```typescript
const [loading, setLoading] = useState(false);
const [salvando, setSalvando] = useState(false);
const [dados, setDados] = useState([]);

const loadData = async () => {
  setLoading(true);
  try {
    const data = await listarRefeicoes();
    setDados(data);
  } catch (err) {
    error('Erro ao carregar');
  } finally {
    setLoading(false);
  }
};

const handleSubmit = async () => {
  setSalvando(true);
  try {
    await criarRefeicao(data);
    success('Criado!');
    loadData();
  } catch (err) {
    error('Erro ao criar');
  } finally {
    setSalvando(false);
  }
};
```

### Depois (React Query)
```typescript
const { data: dados = [], isLoading: loading } = useRefeicoes();
const criarRefeicaoMutation = useCriarRefeicao();

const handleSubmit = async () => {
  try {
    await criarRefeicaoMutation.mutateAsync(data);
    success('Criado!');
  } catch (err) {
    error('Erro ao criar');
  }
};

// LoadingOverlay
<LoadingOverlay 
  open={criarRefeicaoMutation.isPending}
  message="Salvando..."
/>
```

## Benefícios da Migração

1. **Cache Automático**: React Query gerencia cache automaticamente
2. **Invalidação Inteligente**: Queries são invalidadas após mutations
3. **Estados Simplificados**: Menos useState para gerenciar
4. **Retry Automático**: Tentativas automáticas em caso de falha
5. **Loading States**: isPending, isError, isSuccess automáticos
6. **Otimistic Updates**: Suporte nativo para atualizações otimistas

## Próximos Passos

### Fase 1: Completar Alta Prioridade (Estimativa: 6-9 horas)
1. Criar `useRefeicaoDetalheQueries.ts` e migrar RefeicaoDetalhe.tsx
2. Criar `useRomaneioQueries.ts` + `useRotaQueries.ts` e migrar Romaneio.tsx
3. Criar `useSaldoContratosQueries.ts` e migrar SaldoContratosModalidades.tsx

### Fase 2: Prioridade Média
- Avaliar outras páginas com chamadas diretas
- Migrar páginas de relatórios
- Migrar páginas de gestão

### Fase 3: Documentação
- Documentar padrões e boas práticas
- Criar guia de migração para desenvolvedores
- Atualizar README com informações sobre React Query

## Progresso Atual

**Alta Prioridade:** 50% completo (3/6 páginas)
- ✅ Refeicoes.tsx
- ✅ CardapiosModalidade.tsx  
- ✅ CardapioCalendario.tsx
- ⏳ RefeicaoDetalhe.tsx
- ⏳ Romaneio.tsx
- ⏳ SaldoContratosModalidades.tsx
