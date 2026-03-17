# Exemplo: Atualizando Página para Prevenir Duplo Clique

## Antes (Código Original)

```tsx
import { Button } from '@mui/material';
import { useDeletarPeriodo } from '../hooks/queries/usePeriodosQueries';

const GerenciamentoPeriodos = () => {
  const deletarMutation = useDeletarPeriodo();

  const handleExcluir = (id: number) => {
    if (confirm('Deseja excluir?')) {
      deletarMutation.mutate(id);
    }
  };

  return (
    <Button 
      onClick={() => handleExcluir(periodo.id)}
      color="error"
    >
      Excluir
    </Button>
  );
};
```

**Problemas:**
- ❌ Usuário pode clicar múltiplas vezes
- ❌ Envia várias requisições de exclusão
- ❌ Segunda requisição falha (item já foi excluído)
- ❌ Sem feedback visual durante operação

## Depois (Com Proteções)

### Opção 1: Usando SafeButton

```tsx
import { SafeButton } from '../components/SafeButton';
import { useDeletarPeriodo } from '../hooks/queries/usePeriodosQueries';

const GerenciamentoPeriodos = () => {
  const deletarMutation = useDeletarPeriodo();

  const handleExcluir = async (id: number) => {
    if (confirm('Deseja excluir?')) {
      await deletarMutation.mutateAsync(id);
    }
  };

  return (
    <SafeButton 
      onClick={() => handleExcluir(periodo.id)}
      color="error"
      loadingText="Excluindo..."
      debounceMs={1000}
    >
      Excluir
    </SafeButton>
  );
};
```

### Opção 2: Usando useSafeMutation

```tsx
import { Button } from '@mui/material';
import { useSafeMutation } from '../hooks/useSafeMutation';
import { useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const GerenciamentoPeriodos = () => {
  const queryClient = useQueryClient();

  const deletarMutation = useSafeMutation({
    mutationFn: (id: number) => api.delete(`/periodos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos'] });
    },
    onError: (error: any) => {
      // Ignora erros de duplo clique
      if (error.message === 'DUPLICATE_CLICK' || error.message === 'REQUEST_IN_PROGRESS') {
        return;
      }
      alert('Erro ao excluir período');
    },
  });

  const handleExcluir = (id: number) => {
    if (confirm('Deseja excluir?')) {
      deletarMutation.mutate(id);
    }
  };

  return (
    <Button 
      onClick={() => handleExcluir(periodo.id)}
      disabled={deletarMutation.isPending}
      color="error"
    >
      {deletarMutation.isPending ? 'Excluindo...' : 'Excluir'}
    </Button>
  );
};
```

### Opção 3: Desabilitar Botão Manualmente

```tsx
import { Button, CircularProgress } from '@mui/material';
import { useDeletarPeriodo } from '../hooks/queries/usePeriodosQueries';

const GerenciamentoPeriodos = () => {
  const deletarMutation = useDeletarPeriodo();

  const handleExcluir = (id: number) => {
    if (confirm('Deseja excluir?')) {
      deletarMutation.mutate(id);
    }
  };

  return (
    <Button 
      onClick={() => handleExcluir(periodo.id)}
      disabled={deletarMutation.isPending}
      color="error"
      startIcon={deletarMutation.isPending ? <CircularProgress size={16} /> : null}
    >
      {deletarMutation.isPending ? 'Excluindo...' : 'Excluir'}
    </Button>
  );
};
```

## Comparação de Soluções

| Solução | Facilidade | Proteção | Feedback Visual |
|---------|-----------|----------|-----------------|
| SafeButton | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| useSafeMutation | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Desabilitar Manual | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

## Recomendação

**Use SafeButton** - É a solução mais simples e completa:
- ✅ Proteção automática contra duplo clique
- ✅ Debounce configurável
- ✅ Feedback visual automático
- ✅ Menos código para escrever
- ✅ Consistência em toda aplicação

## Exemplo Completo - Página Atualizada

```tsx
import React, { useState } from 'react';
import { SafeButton } from '../components/SafeButton';
import { usePeriodos, useDeletarPeriodo, useAtivarPeriodo } from '../hooks/queries/usePeriodosQueries';

const GerenciamentoPeriodos = () => {
  const { data: periodos } = usePeriodos();
  const deletarMutation = useDeletarPeriodo();
  const ativarMutation = useAtivarPeriodo();

  const handleExcluir = async (id: number) => {
    if (confirm('Deseja realmente excluir este período?')) {
      await deletarMutation.mutateAsync(id);
    }
  };

  const handleAtivar = async (id: number) => {
    await ativarMutation.mutateAsync(id);
  };

  return (
    <div>
      {periodos?.map((periodo) => (
        <div key={periodo.id}>
          <span>{periodo.ano}</span>
          
          <SafeButton
            onClick={() => handleAtivar(periodo.id)}
            variant="contained"
            color="primary"
            size="small"
            loadingText="Ativando..."
          >
            Ativar
          </SafeButton>

          <SafeButton
            onClick={() => handleExcluir(periodo.id)}
            variant="contained"
            color="error"
            size="small"
            loadingText="Excluindo..."
            debounceMs={1000}
          >
            Excluir
          </SafeButton>
        </div>
      ))}
    </div>
  );
};
```

## Checklist de Atualização

- [ ] Substituir `Button` por `SafeButton` em ações críticas
- [ ] Adicionar `loadingText` apropriado
- [ ] Configurar `debounceMs` para ações destrutivas (1000ms)
- [ ] Testar com internet lenta (DevTools > Network > Slow 3G)
- [ ] Verificar que duplo clique é ignorado
- [ ] Confirmar feedback visual durante operação
