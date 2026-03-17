# Prevenção de Duplo Clique e Requisições Duplicadas

## Problema

Quando há demora no backend (servidor lento ou internet lenta), usuários podem clicar múltiplas vezes em botões de salvar/excluir, causando:
- Requisições duplicadas
- Erros ao tentar excluir item já excluído
- Salvamento duplicado de dados
- Má experiência do usuário

## Soluções Implementadas

### 1. SafeButton - Botão com Proteção Automática

Componente que desabilita automaticamente durante execução e aplica debounce.

```tsx
import { SafeButton } from '../components/SafeButton';

// Uso básico
<SafeButton 
  onClick={handleSalvar}
  variant="contained"
  color="primary"
>
  Salvar
</SafeButton>

// Com texto de loading customizado
<SafeButton 
  onClick={handleExcluir}
  variant="contained"
  color="error"
  loadingText="Excluindo..."
  debounceMs={1000}
>
  Excluir
</SafeButton>
```

### 2. useSafeMutation - Wrapper para React Query

Previne requisições duplicadas automaticamente em mutations.

```tsx
import { useSafeMutation } from '../hooks/useSafeMutation';
import { useQueryClient } from '@tanstack/react-query';

export const useExcluirProduto = () => {
  const queryClient = useQueryClient();

  return useSafeMutation({
    mutationFn: (id: number) => api.delete(`/produtos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
    },
  });
};

// Uso no componente
const excluirMutation = useExcluirProduto();

const handleExcluir = (id: number) => {
  excluirMutation.mutate(id);
};
```

### 3. usePreventDoubleClick - Hook para Funções Assíncronas

Para funções que não usam React Query.

```tsx
import { usePreventDoubleClick } from '../hooks/usePreventDoubleClick';

const MyComponent = () => {
  const salvarDados = async (dados: any) => {
    await api.post('/endpoint', dados);
  };

  const [salvarProtegido, isLoading] = usePreventDoubleClick(salvarDados);

  return (
    <Button 
      onClick={() => salvarProtegido(dados)}
      disabled={isLoading}
    >
      {isLoading ? 'Salvando...' : 'Salvar'}
    </Button>
  );
};
```

### 4. useDebounce - Para Inputs de Busca

Evita requisições excessivas em campos de busca.

```tsx
import { useDebounce } from '../hooks/useDebounce';
import { useState, useEffect } from 'react';

const SearchComponent = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => {
    if (debouncedSearch) {
      // Faz a busca apenas após 500ms sem digitar
      buscarProdutos(debouncedSearch);
    }
  }, [debouncedSearch]);

  return (
    <TextField
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Buscar..."
    />
  );
};
```

## Estratégias de Proteção

### 1. Desabilitar Botão Durante Execução

```tsx
<Button 
  onClick={handleAction}
  disabled={mutation.isPending}
>
  {mutation.isPending ? 'Processando...' : 'Salvar'}
</Button>
```

### 2. Debounce (Atraso)

Ignora cliques que acontecem muito rápido (< 500ms).

### 3. Flag de Execução

Verifica se já há uma requisição em andamento antes de iniciar outra.

### 4. Timestamp do Último Clique

Compara o tempo desde o último clique para evitar duplicatas.

## Exemplo Completo - Página com CRUD

```tsx
import React from 'react';
import { SafeButton } from '../components/SafeButton';
import { useSafeMutation } from '../hooks/useSafeMutation';
import { useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const ProdutosPage = () => {
  const queryClient = useQueryClient();

  // Mutation para criar
  const criarMutation = useSafeMutation({
    mutationFn: (dados: any) => api.post('/produtos', dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
    },
  });

  // Mutation para excluir
  const excluirMutation = useSafeMutation({
    mutationFn: (id: number) => api.delete(`/produtos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
    },
  });

  const handleSalvar = async () => {
    criarMutation.mutate({ nome: 'Produto Teste' });
  };

  const handleExcluir = async (id: number) => {
    if (confirm('Deseja realmente excluir?')) {
      excluirMutation.mutate(id);
    }
  };

  return (
    <div>
      <SafeButton 
        onClick={handleSalvar}
        variant="contained"
        color="primary"
        loadingText="Salvando..."
      >
        Salvar Produto
      </SafeButton>

      <SafeButton 
        onClick={() => handleExcluir(1)}
        variant="contained"
        color="error"
        loadingText="Excluindo..."
      >
        Excluir Produto
      </SafeButton>
    </div>
  );
};
```

## Recomendações

1. **Use SafeButton** para todos os botões de ação (salvar, excluir, enviar)
2. **Use useSafeMutation** para todas as mutations do React Query
3. **Use useDebounce** para campos de busca e filtros
4. **Sempre mostre feedback visual** (loading, disabled) durante operações
5. **Adicione confirmação** para ações destrutivas (excluir)

## Benefícios

- ✅ Previne requisições duplicadas
- ✅ Melhora experiência do usuário
- ✅ Reduz erros no backend
- ✅ Economiza recursos (menos requisições)
- ✅ Interface mais responsiva e profissional
