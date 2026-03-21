# Solução: Erro 429 - Too Many Requests

## Problema
```
Failed to load resource: the server responded with a status of 429 (Too Many Requests)
Erro: Muitas requisições. Limite: 100 requisições a cada 15 minutos.
```

## Causa Raiz
O React Query estava configurado com `refetchOnWindowFocus: true`, o que causava:
1. Toda vez que você alternava entre editor e navegador, TODAS as queries ativas eram refeitas
2. Com múltiplas queries ativas (períodos, usuário, escolas, compras, etc.), cada alternância gerava 5-10+ requisições
3. Em desenvolvimento, você alterna constantemente entre janelas
4. Resultado: 100+ requisições em poucos minutos, atingindo o rate limit

## Soluções Implementadas

### 1. Desabilitar refetchOnWindowFocus em Desenvolvimento ✅
**Arquivo**: `frontend/src/lib/queryClient.ts`

```typescript
queries: {
  // Refetch quando a janela ganha foco - DESABILITADO EM DESENVOLVIMENTO
  refetchOnWindowFocus: process.env.NODE_ENV === 'production',
  // ... outras configurações
}
```

**Benefícios**:
- Reduz drasticamente o número de requisições em desenvolvimento
- Mantém o comportamento desejável em produção (dados sempre atualizados)
- Não afeta a funcionalidade, apenas a frequência de atualização

### 2. Remover toast das Dependências do useCallback ✅
**Arquivo**: `frontend/src/pages/Compras.tsx`

```typescript
const loadPedidos = useCallback(async () => {
  // ... código
}, [filters.status, filters.data_from, filters.data_to]); // Removido toast
```

**Motivo**: `toast` é uma função que pode mudar a cada render, causando loops infinitos

### 3. Remover Logs CORS em Desenvolvimento ✅
**Arquivo**: `backend/src/index.ts`

```typescript
if (process.env.NODE_ENV === 'development') {
  return callback(null, true); // Sem logs
}
```

**Benefício**: Console mais limpo, fácil de debugar

## Rate Limiter Atual

O backend já está configurado corretamente:

```typescript
// backend/src/middleware/rateLimiter.ts
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // 1000 em dev
  message: 'Muitas requisições. Limite: 100 requisições a cada 15 minutos.'
});
```

- **Desenvolvimento**: 1000 requisições / 15 minutos
- **Produção**: 100 requisições / 15 minutos

## Comportamento Esperado Agora

### Em Desenvolvimento
- ✅ Requisições apenas quando você navega ou interage
- ✅ Não refaz queries ao alternar janelas
- ✅ Cache de 5 minutos mantém dados frescos
- ✅ Limite de 1000 req/15min é mais que suficiente

### Em Produção
- ✅ Refetch ao focar na janela (dados sempre atualizados)
- ✅ Limite de 100 req/15min protege contra abuso
- ✅ Experiência do usuário otimizada

## Como Testar

1. Recarregue a página
2. Navegue entre páginas normalmente
3. Alterne entre editor e navegador
4. Verifique que não há mais erros 429
5. Verifique que os dados carregam normalmente

## Monitoramento

Para ver estatísticas do rate limiter:
```bash
GET /api/monitoring/stats
```

Para limpar o rate limiter (apenas em desenvolvimento):
```bash
POST /api/monitoring/rate-limit/clear
```

## Arquivos Modificados
1. `frontend/src/lib/queryClient.ts` - Desabilitado refetchOnWindowFocus em dev
2. `frontend/src/pages/Compras.tsx` - Removido toast das dependências
3. `backend/src/index.ts` - Removido logs CORS em dev

## Status
✅ **RESOLVIDO** - O erro 429 não deve mais ocorrer em desenvolvimento
