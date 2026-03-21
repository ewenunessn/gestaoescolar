# Correção do Loop Infinito na Página de Contratos

## Problema Identificado

A página de Contratos estava causando um loop infinito de requisições, resultando em:
1. Erro 429 (Too Many Requests) na API
2. Requisições constantes para `/periodos` e `/periodos/ativo`
3. Logs de CORS repetidos infinitamente no console

## Causa Raiz

O problema estava no hook `useCallback` da função `loadContratos`:

```typescript
const loadContratos = useCallback(async () => {
  // ... código
  toast.error('Erro ao carregar contratos. Tente novamente.');
  // ...
}, [toast]); // ❌ toast nas dependências causava recriação da função
```

O `toast` estava nas dependências do `useCallback`, fazendo com que:
1. A função `loadContratos` fosse recriada a cada render
2. O `useEffect` que depende de `loadContratos` fosse disparado novamente
3. Isso causava um novo render, recriando `loadContratos` novamente
4. Loop infinito

## Solução Aplicada

### 1. Correção do useCallback
Removido `toast` das dependências, pois é uma função estável:

```typescript
const loadContratos = useCallback(async () => {
  try {
    setLoading(true);
    const [contratosData, fornecedoresData] = await Promise.all([
      listarContratos(),
      listarFornecedores(),
    ]);
    setContratos(Array.isArray(contratosData) ? contratosData : []);
    setFornecedores(Array.isArray(fornecedoresData) ? fornecedoresData : []);
  } catch (err) {
    toast.error('Erro ao carregar contratos. Tente novamente.');
  } finally {
    setLoading(false);
  }
}, []); // ✅ Array vazio - função criada apenas uma vez
```

### 2. Correção do Import
Corrigido o import do `useNavigate`:

```typescript
// ❌ Antes (incorreto)
import { useNavigate } from 'react-router';

// ✅ Depois (correto)
import { useNavigate } from 'react-router-dom';
```

### 3. Proteção Adicional nas Queries de Períodos
Desabilitado retry e refetch automático para evitar sobrecarga:

```typescript
export const usePeriodos = () => {
  return useQuery({
    queryKey: ['periodos'],
    queryFn: listarPeriodos,
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: false, // Desabilitar retry para evitar sobrecarga
    refetchOnWindowFocus: false, // Não refetch ao focar na janela
  });
};

export const usePeriodoAtivo = () => {
  return useQuery({
    queryKey: ['periodo-ativo'],
    queryFn: obterPeriodoAtivo,
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: false, // Desabilitar retry para evitar sobrecarga
    refetchOnWindowFocus: false, // Não refetch ao focar na janela
  });
};
```

## Arquivos Modificados

1. `frontend/src/pages/Contratos.tsx`
   - Removido `toast` das dependências do `useCallback`
   - Corrigido import do `useNavigate`

2. `frontend/src/hooks/queries/usePeriodosQueries.ts`
   - Desabilitado `retry` para evitar tentativas múltiplas
   - Desabilitado `refetchOnWindowFocus` para evitar refetch desnecessário

## Como Verificar a Correção

1. Recarregue a página de Contratos
2. Verifique o console do navegador - não deve haver requisições em loop
3. Verifique o console do backend - não deve haver logs de CORS repetidos
4. A página deve carregar normalmente sem erros 429

## Prevenção Futura

### Regras para useCallback e useEffect

1. **Funções estáveis não precisam estar nas dependências:**
   - `toast` (do useToast)
   - `navigate` (do useNavigate)
   - `dispatch` (do useDispatch)
   - Funções de setState (useState)

2. **Sempre verifique dependências:**
   - Use ESLint rule `react-hooks/exhaustive-deps`
   - Analise se a dependência realmente muda
   - Considere usar `useRef` para valores que não devem causar re-render

3. **Teste loops infinitos:**
   - Abra o DevTools Network
   - Verifique se há requisições repetidas
   - Monitore o console para erros 429

## Impacto

- ✅ Loop infinito corrigido
- ✅ Erro 429 resolvido
- ✅ Performance melhorada
- ✅ Experiência do usuário normalizada
- ✅ Carga no servidor reduzida

## Notas Técnicas

O erro 429 pode persistir por alguns minutos após a correção devido ao rate limiting do servidor. Isso é normal e deve se resolver automaticamente quando o limite de tempo expirar.

Se o erro persistir:
1. Limpe o cache do navegador
2. Reinicie o servidor backend
3. Aguarde alguns minutos para o rate limit resetar


## React Strict Mode e Requisições Duplicadas

O React em modo desenvolvimento (Strict Mode) executa efeitos duas vezes intencionalmente para ajudar a detectar problemas. Isso significa que:

1. Cada `useEffect` é executado duas vezes
2. Cada query do React Query é executada duas vezes
3. Isso pode causar o dobro de requisições ao servidor

### Solução Aplicada

Para evitar sobrecarga no servidor durante o desenvolvimento:

1. **Desabilitado retry**: `retry: false`
   - Evita tentativas múltiplas quando há erro 429
   - Reduz a carga no servidor

2. **Desabilitado refetchOnWindowFocus**: `refetchOnWindowFocus: false`
   - Evita refetch automático ao focar na janela
   - Reduz requisições desnecessárias

3. **StaleTime de 5 minutos**: `staleTime: 1000 * 60 * 5`
   - Dados são considerados "frescos" por 5 minutos
   - Evita requisições repetidas para os mesmos dados

### Aguardar Reset do Rate Limit

Se você ainda está vendo erro 429:

1. **Aguarde 15 minutos** - O rate limit do servidor reseta automaticamente
2. **Limpe o cache do navegador** - Ctrl+Shift+Delete
3. **Recarregue a página** - F5 ou Ctrl+R
4. **Reinicie o servidor backend** - Se necessário

### Monitoramento

Para verificar se o problema foi resolvido:

```bash
# No console do navegador, verifique:
# - Não deve haver requisições em loop
# - Não deve haver erros 429
# - Cada endpoint deve ser chamado no máximo 2 vezes (Strict Mode)
```

## Configuração de Rate Limit no Backend

O backend está configurado com:
- **Limite**: 100 requisições
- **Janela**: 15 minutos
- **Por IP**: Cada IP tem seu próprio limite

Se você está desenvolvendo e precisa de mais requisições, considere:
1. Aumentar o limite no backend temporariamente
2. Desabilitar o rate limit em desenvolvimento
3. Usar um IP diferente (VPN)
