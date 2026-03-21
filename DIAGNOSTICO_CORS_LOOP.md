# Diagnóstico: Loop de Verificações CORS

## Análise do Problema

Você está vendo mensagens repetidas de:
```
🔍 CORS Check - Origin: http://192.168.18.12:5173
✅ CORS: Permitido (desenvolvimento)
```

## Causas Identificadas

### 1. **React Query - refetchOnWindowFocus (PRINCIPAL)**
**Localização**: `frontend/src/lib/queryClient.ts`

```typescript
queries: {
  refetchOnWindowFocus: true,  // ← CAUSA PRINCIPAL
  refetchOnReconnect: true,
  refetchOnMount: true,
}
```

**O que acontece**:
- Toda vez que você alterna entre janelas/abas, o React Query refaz TODAS as queries ativas
- Se você tem 5-10 queries ativas na página, cada alternância de janela gera 5-10 requisições
- Em desenvolvimento, isso é amplificado porque você alterna muito entre editor e navegador

### 2. **Configuração realtime (POTENCIAL)**
**Localização**: `frontend/src/lib/queryClient.ts`

```typescript
realtime: {
  staleTime: 0,
  gcTime: 0,
  refetchInterval: 30 * 1000, // ← Polling a cada 30 segundos
}
```

**Status**: Não está sendo usado atualmente, mas está disponível

### 3. **DashboardConsistencia - setInterval**
**Localização**: `frontend/src/components/DashboardConsistencia.tsx`

```typescript
const interval = setInterval(carregarDashboard, 5 * 60 * 1000); // A cada 5 minutos
```

**Status**: Intervalo longo (5 min), não é a causa do loop rápido

## Comportamento Normal vs Anormal

### ✅ NORMAL (Esperado em Desenvolvimento)
- Mensagens CORS aparecem quando:
  - Você carrega uma página (1-5 requisições)
  - Você alterna para o navegador (refetchOnWindowFocus)
  - Você faz uma ação que dispara uma mutation
  - A cada 5 minutos no dashboard de consistência

### ❌ ANORMAL (Problema Real)
- Mensagens CORS aparecem:
  - Continuamente sem parar (várias por segundo)
  - Mesmo sem você interagir com a aplicação
  - Dezenas de vezes seguidas sem motivo aparente

## Verificação

Para determinar se é normal ou um problema real:

1. **Abra o DevTools → Network**
2. **Filtre por XHR/Fetch**
3. **Observe o padrão**:
   - Se as requisições param após carregar a página: **NORMAL**
   - Se continuam indefinidamente: **PROBLEMA**

## Soluções

### Solução 1: Desabilitar refetchOnWindowFocus em Desenvolvimento
```typescript
// frontend/src/lib/queryClient.ts
queries: {
  refetchOnWindowFocus: process.env.NODE_ENV === 'production', // Só em produção
  refetchOnReconnect: true,
  refetchOnMount: true,
}
```

### Solução 2: Remover Logs CORS em Desenvolvimento
```typescript
// backend/src/index.ts
origin: (origin: string | undefined, callback) => {
  // Remover ou comentar os console.log em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    return callback(null, true);
  }
  // ... resto do código
}
```

### Solução 3: Aumentar staleTime para Reduzir Refetches
```typescript
// frontend/src/lib/queryClient.ts
queries: {
  staleTime: 5 * 60 * 1000, // Já está configurado (5 minutos)
  // Dados ficam "frescos" por 5 minutos, não refazem requisições
}
```

## Recomendação

**O comportamento que você está vendo é NORMAL em desenvolvimento** se:
- As mensagens aparecem quando você alterna entre editor e navegador
- Param após alguns segundos
- Não continuam indefinidamente

**É um problema REAL** se:
- As mensagens continuam aparecendo sem parar
- Acontecem mesmo sem você interagir
- Causam lentidão no sistema

## Ação Recomendada

1. **Se for normal**: Remover os logs CORS em desenvolvimento (Solução 2)
2. **Se for problema**: Desabilitar refetchOnWindowFocus em dev (Solução 1)

Qual das duas situações você está enfrentando?
