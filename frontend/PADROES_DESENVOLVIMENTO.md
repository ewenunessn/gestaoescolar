# Padrões de Desenvolvimento - Frontend

Este documento define os padrões e convenções para desenvolvimento no frontend do sistema.

## 📋 Índice

- [Notificações](#notificações)
- [Formatação de Dados](#formatação-de-dados)
- [Tratamento de Erros](#tratamento-de-erros)
- [Estados de Loading](#estados-de-loading)
- [Chamadas de API](#chamadas-de-api)
- [Validação de Formulários](#validação-de-formulários)

## 🔔 Notificações

### ✅ Padrão Atual: react-toastify

**Use sempre:** `useToast()` hook

```tsx
import { useToast } from '../hooks/useToast';

const MyComponent = () => {
  const toast = useToast();

  const handleSave = async () => {
    try {
      await saveData();
      toast.successSave(); // ou toast.success('Dados salvos!')
    } catch (error) {
      toast.errorSave(); // ou toast.error('Erro ao salvar')
    }
  };
};
```

**Métodos disponíveis:**
- `toast.success(message)` - Sucesso genérico
- `toast.error(message)` - Erro genérico
- `toast.successSave()` - Sucesso ao salvar
- `toast.successDelete(item)` - Sucesso ao excluir
- `toast.errorLoad(item)` - Erro ao carregar
- `toast.errorSave()` - Erro ao salvar

### ❌ Evitar

```tsx
// ❌ Não usar mais
import { useNotification } from '../context/NotificationContext';
const { success, error } = useNotification();
```

## 📊 Formatação de Dados

### ✅ Padrão: Usar utilitários centralizados

```tsx
import { formatarQuantidade, formatarMoeda, formatarData } from '../utils/formatters';

// ✅ Correto
<Typography>{formatarQuantidade(produto.quantidade)}</Typography>
<Typography>{formatarMoeda(produto.preco)}</Typography>
<Typography>{formatarData(produto.data_criacao)}</Typography>
```

### ❌ Evitar formatação inline

```tsx
// ❌ Evitar
<Typography>{produto.quantidade.toLocaleString('pt-BR')}</Typography>
<Typography>R$ {produto.preco.toFixed(2)}</Typography>
<Typography>{new Date(produto.data).toLocaleDateString('pt-BR')}</Typography>
```

## 🚨 Tratamento de Erros

### ✅ Padrão: useErrorHandler

```tsx
import { useErrorHandler } from '../hooks/useErrorHandler';

const MyComponent = () => {
  const { handleApiError } = useErrorHandler();

  const handleSave = async () => {
    try {
      await saveData();
    } catch (error) {
      handleApiError(error, 'save'); // Tratamento padronizado
    }
  };
};
```

### ❌ Evitar tratamento manual repetitivo

```tsx
// ❌ Evitar
catch (error: any) {
  const message = error.response?.data?.message || 'Erro ao salvar';
  toast.error(message);
}
```

## ⏳ Estados de Loading

### ✅ Padrão: React Query para APIs

```tsx
import { useQuery, useMutation } from '@tanstack/react-query';

const MyComponent = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['produtos'],
    queryFn: listarProdutos
  });

  const mutation = useMutation({
    mutationFn: salvarProduto,
    onSuccess: () => toast.successSave()
  });

  return (
    <LoadingOverlay loading={mutation.isPending} message="Salvando...">
      {/* conteúdo */}
    </LoadingOverlay>
  );
};
```

### ✅ Para múltiplos estados: useLoadingStates

```tsx
import { useLoadingStates } from '../hooks/useLoadingStates';

const MyComponent = () => {
  const { isLoading, withLoading } = useLoadingStates();

  const handleExport = () => withLoading('export', async () => {
    await exportData();
  });

  return (
    <Button 
      disabled={isLoading('export')}
      onClick={handleExport}
    >
      {isLoading('export') ? 'Exportando...' : 'Exportar'}
    </Button>
  );
};
```

### ❌ Evitar estados manuais desnecessários

```tsx
// ❌ Evitar quando React Query pode ser usado
const [loading, setLoading] = useState(false);
const [data, setData] = useState([]);

useEffect(() => {
  const loadData = async () => {
    setLoading(true);
    try {
      const result = await fetchData();
      setData(result);
    } finally {
      setLoading(false);
    }
  };
  loadData();
}, []);
```

## 🌐 Chamadas de API

### ✅ Padrão: React Query + axios

```tsx
// services/produtoService.ts
import api from './api';

export const listarProdutos = async () => {
  const response = await api.get('/produtos');
  return response.data;
};

// hooks/queries/useProdutoQueries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listarProdutos, criarProduto } from '../services/produtoService';

export const useProdutoQueries = () => {
  const queryClient = useQueryClient();

  const produtosQuery = useQuery({
    queryKey: ['produtos'],
    queryFn: listarProdutos
  });

  const criarProdutoMutation = useMutation({
    mutationFn: criarProduto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
    }
  });

  return {
    produtos: produtosQuery.data || [],
    isLoading: produtosQuery.isLoading,
    criarProduto: criarProdutoMutation.mutate,
    isCreating: criarProdutoMutation.isPending
  };
};
```

### ❌ Evitar fetch() e estados manuais

```tsx
// ❌ Evitar
const [produtos, setProdutos] = useState([]);
const [loading, setLoading] = useState(false);

useEffect(() => {
  const loadProdutos = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/produtos');
      const data = await response.json();
      setProdutos(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  loadProdutos();
}, []);
```

## ✅ Validação de Formulários

### ✅ Padrão: Validação simples com feedback visual

```tsx
const [errors, setErrors] = useState<Record<string, string>>({});

const validateForm = () => {
  const newErrors: Record<string, string> = {};
  
  if (!formData.nome.trim()) {
    newErrors.nome = 'Nome é obrigatório';
  }
  
  if (!formData.email.includes('@')) {
    newErrors.email = 'Email inválido';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

return (
  <TextField
    label="Nome"
    value={formData.nome}
    onChange={(e) => setFormData({...formData, nome: e.target.value})}
    error={!!errors.nome}
    helperText={errors.nome}
    required
  />
);
```

## 🎯 Componentes Padronizados

### LoadingOverlay
```tsx
<LoadingOverlay loading={isLoading} message="Carregando dados...">
  {/* conteúdo */}
</LoadingOverlay>
```

### SafeButton (previne duplo clique)
```tsx
<SafeButton
  variant="contained"
  onClick={handleSave}
  loading={isSaving}
>
  Salvar
</SafeButton>
```

## 📝 Resumo das Migrações Realizadas

### ✅ Concluído
1. **LoadingOverlay**: Implementado em todos os menus Cadastros e Cardápios
2. **React Query**: Migração completa de 6 páginas principais
3. **react-toastify**: Padronização de notificações (3 arquivos migrados)

### 🔄 Em Andamento
- Migração gradual de outros componentes para React Query
- Padronização de formatação usando utilitários centralizados
- Implementação de tratamento de erros padronizado

### 📋 Próximos Passos
1. Migrar componentes restantes para React Query
2. Implementar useErrorHandler em componentes existentes
3. Padronizar formatação usando formatters.ts
4. Remover estados de loading manuais onde React Query pode ser usado
5. Implementar validação padronizada em formulários complexos

---

**Importante**: Sempre seguir estes padrões em novos desenvolvimentos e migrar código existente gradualmente durante manutenções.