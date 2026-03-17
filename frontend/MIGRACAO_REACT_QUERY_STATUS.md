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

### ⏳ ALTA PRIORIDADE - PENDENTE
1. ⏳ RefeicaoDetalhe.tsx - Usa chamadas diretas de refeicoes service
2. ⏳ Romaneio.tsx - Usa guiaService e rotaService
3. ⏳ SaldoContratosModalidades.tsx - Usa saldoContratosModalidadesService

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

1. Migrar RefeicaoDetalhe.tsx
2. Migrar Romaneio.tsx
3. Migrar SaldoContratosModalidades.tsx
4. Avaliar prioridade média e baixa
5. Documentar padrões e boas práticas
