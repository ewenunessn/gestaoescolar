# Correção de Duplicação de Entregas Offline

## Problema Identificado

Quando entregas eram realizadas offline e o dispositivo voltava online, as entregas estavam sendo enviadas em duplicata ao servidor, causando:
- Quantidades entregues duplicadas no histórico
- Saldo pendente incorreto
- Dados inconsistentes entre cache local e servidor

## Causas Raiz

1. **Múltiplas chamadas de sincronização**: O `useEffect` com `isOnline` como dependência causava loops de re-execução
2. **Falta de debounce robusto**: NetInfo pode disparar múltiplos eventos de "volta online"
3. **Detecção de duplicata insuficiente**: Verificava apenas `itemId` e `status`, não os dados completos da operação
4. **Race condition**: Múltiplas sincronizações podiam iniciar antes de atualizar o status das operações

## Soluções Implementadas

### 1. Debounce e Controle de Timestamp
```typescript
const [lastSyncTimestamp, setLastSyncTimestamp] = useState(0);
const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
```

- Adicionado timestamp da última sincronização
- Sincronização só ocorre se passou pelo menos 5 segundos desde a última
- Timeout de 3 segundos antes de iniciar sincronização
- Limpeza de timeouts anteriores para evitar múltiplas agendas

### 2. Remoção de Dependência Circular
```typescript
useEffect(() => {
  // ...
}, []); // Removido isOnline da dependência
```

- `useEffect` agora só executa uma vez na montagem
- Usa `setIsOnline(prevOnline => ...)` para acessar valor anterior
- Evita loops infinitos de re-execução

### 3. Detecção de Duplicata por Hash
```typescript
const operationHash = `${itemId}_${data.quantidade_entregue}_${data.nome_quem_recebeu}_${data.nome_quem_entregou}`;
```

- Hash único baseado em todos os dados relevantes da operação
- Verifica duplicatas tanto em status `pending` quanto `syncing`
- Previne adição de operações idênticas à fila

### 4. Atualização Atômica de Status
```typescript
// Atualizar status de TODAS as operações pendentes para 'syncing' ANTES de começar
const updatedOps = operations.map(op => {
  if (op.status === 'pending' || !op.status) {
    return { ...op, status: 'syncing' as const };
  }
  return op;
});
await AsyncStorage.setItem('offline_queue', JSON.stringify(updatedOps));
```

- Marca todas as operações como `syncing` ANTES de processar
- Previne que outra sincronização processe as mesmas operações
- Atualização atômica no AsyncStorage

### 5. Logs Detalhados
```typescript
console.log('📡 Status de conexão:', online ? 'ONLINE ✅' : 'OFFLINE ❌');
console.log('🔄 Transição detectada: OFFLINE → ONLINE');
console.log(`⏸️ Sincronização ignorada (última há ${Math.round(timeSinceLastSync / 1000)}s)`);
```

- Emojis para facilitar identificação visual
- Informações detalhadas sobre cada etapa
- Facilita debugging e monitoramento

## Como Testar

### Teste 1: Entrega Offline Simples
1. Desative a conexão (modo avião)
2. Entre em uma escola e entregue 5 unidades de um produto
3. Finalize a entrega
4. Volte para a lista de escolas
5. Ative a conexão
6. Aguarde 3-5 segundos
7. Verifique os logs no console
8. Entre novamente na escola
9. **Esperado**: Deve mostrar que 5 unidades foram entregues (não 10)

### Teste 2: Múltiplas Entregas Offline
1. Desative a conexão
2. Entregue em 3 escolas diferentes
3. Ative a conexão
4. Aguarde a sincronização
5. **Esperado**: Todas as 3 entregas devem ser sincronizadas uma única vez

### Teste 3: Reconexão Rápida
1. Desative a conexão
2. Faça uma entrega
3. Ative e desative a conexão rapidamente várias vezes
4. **Esperado**: Sincronização deve ocorrer apenas uma vez, ignorando tentativas duplicadas

### Teste 4: Entrega Duplicada Intencional
1. Desative a conexão
2. Tente fazer a mesma entrega duas vezes (mesma quantidade, mesmo recebedor)
3. **Esperado**: Segunda tentativa deve ser bloqueada com log de duplicata

## Logs Esperados

### Sincronização Normal
```
📡 Status de conexão: ONLINE ✅
🔄 Transição detectada: OFFLINE → ONLINE
⏰ Iniciando sincronização agendada...
🔄 Iniciando sincronização...
📋 Total de operações na fila: 1
📋 Operações pendentes para sincronizar: 1
🔄 Sincronizando operação 1234567890_123_abc (item 123)...
✅ Operação 1234567890_123_abc sincronizada com sucesso
📊 Resultado: 1 sucesso, 0 falhas, 0 restantes
✓ Sincronização finalizada
```

### Duplicata Bloqueada
```
⚠️ Operação duplicada detectada para item 123, ignorando...
   Hash: 123_5_João Silva_Maria Santos
   Status existente: pending
```

### Sincronização Ignorada (muito recente)
```
⏸️ Sincronização ignorada (última há 2s)
```

## Verificação no Backend

Para verificar se não há duplicatas no banco:

```sql
-- Ver histórico de entregas de um item
SELECT 
  id,
  quantidade_entregue,
  data_entrega,
  nome_quem_entregou,
  nome_quem_recebeu
FROM historico_entregas
WHERE guia_produto_escola_id = [ID_DO_ITEM]
ORDER BY data_entrega DESC;

-- Ver total entregue vs programado
SELECT 
  id,
  quantidade as programado,
  quantidade_total_entregue as entregue,
  (quantidade - quantidade_total_entregue) as saldo
FROM guia_produto_escola
WHERE id = [ID_DO_ITEM];
```

## Próximos Passos (se ainda houver problemas)

Se ainda houver duplicação após essas correções, investigar:

1. **Backend**: Adicionar constraint UNIQUE ou verificação de duplicata no servidor
2. **Idempotência**: Adicionar ID único da operação no payload para o backend verificar
3. **Lock distribuído**: Usar Redis ou similar para garantir que apenas uma sincronização ocorra por vez
4. **Retry com backoff**: Implementar retry exponencial em caso de falha

## Arquivos Modificados

- `apps/entregador-native/src/contexts/OfflineContext.tsx`: Todas as correções principais
