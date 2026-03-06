# 🔒 Segurança e Performance

## ⚠️ SEGURANÇA CRÍTICA

### NUNCA compartilhe:
- ❌ Senhas
- ❌ Tokens de acesso
- ❌ Chaves de API
- ❌ Credenciais de banco de dados
- ❌ Variáveis de ambiente (.env)

### Se você compartilhou acidentalmente:
1. **TROQUE A SENHA IMEDIATAMENTE**
2. **Revogue tokens de acesso**
3. **Ative 2FA (autenticação de dois fatores)**
4. **Monitore atividades suspeitas**
5. **Considere trocar email se necessário**

---

## 📊 Como Testar Performance

### Opção 1: Suite Completa (Recomendado)
Execute todos os testes de uma vez:

```bash
cd backend/scripts

# Windows
run-all-tests.bat

# Linux/Mac
chmod +x run-all-tests.sh
./run-all-tests.sh
```

### Opção 2: Testes Individuais

```bash
cd backend/scripts

# 1. Popular dados de teste
node seed-test-data.js

# 2. Testar performance
node test-performance.js

# 3. Verificar estoque
node verificar-estoque-atual.js
```

### Interpretação dos Resultados
- 🟢 < 100ms: Excelente
- 🟡 100-300ms: Bom
- 🟠 300-1000ms: Regular
- 🔴 > 1000ms: Lento

### Frontend

1. **Abra o DevTools do navegador** (F12)

2. **Vá para a aba "Network"**

3. **Navegue pelo sistema** e observe:
   - Tempo de carregamento de cada requisição
   - Tamanho dos arquivos
   - Número de requisições

4. **Vá para a aba "Performance"**
   - Clique em "Record"
   - Use o sistema normalmente
   - Pare a gravação
   - Analise o flamegraph

5. **Vá para a aba "Lighthouse"**
   - Clique em "Generate report"
   - Analise as métricas:
     - Performance
     - Accessibility
     - Best Practices
     - SEO

---

## 🚀 Otimizações Recomendadas

### Backend

#### 1. Queries do Banco
```sql
-- ❌ Evite SELECT *
SELECT * FROM produtos;

-- ✅ Selecione apenas o necessário
SELECT id, nome, unidade FROM produtos;
```

#### 2. Índices
```sql
-- Adicione índices em colunas frequentemente consultadas
CREATE INDEX idx_guias_mes_ano ON guias(mes, ano);
CREATE INDEX idx_produtos_nome ON produtos(nome);
CREATE INDEX idx_escolas_rota ON escolas(rota_id);
```

#### 3. Cache
```javascript
// Use cache para dados que não mudam frequentemente
const cache = new Map();

async function listarProdutos() {
  if (cache.has('produtos')) {
    return cache.get('produtos');
  }
  
  const produtos = await db.query('SELECT * FROM produtos');
  cache.set('produtos', produtos);
  
  // Limpar cache após 5 minutos
  setTimeout(() => cache.delete('produtos'), 5 * 60 * 1000);
  
  return produtos;
}
```

#### 4. Paginação
```javascript
// ❌ Evite carregar tudo de uma vez
const produtos = await db.query('SELECT * FROM produtos');

// ✅ Use paginação
const produtos = await db.query(
  'SELECT * FROM produtos LIMIT $1 OFFSET $2',
  [limit, offset]
);
```

### Frontend

#### 1. Lazy Loading
```typescript
// ✅ Carregue componentes sob demanda
const GuiasDemanda = lazy(() => import('./pages/GuiasDemanda'));
```

#### 2. Memoização
```typescript
// ✅ Evite re-renderizações desnecessárias
const MemoizedComponent = React.memo(({ data }) => {
  return <div>{data}</div>;
});

// ✅ Use useMemo para cálculos pesados
const filteredData = useMemo(() => {
  return data.filter(item => item.active);
}, [data]);
```

#### 3. Debounce em Buscas
```typescript
// ✅ Evite requisições a cada tecla digitada
const debouncedSearch = useMemo(
  () => debounce((value) => {
    searchAPI(value);
  }, 300),
  []
);
```

#### 4. Virtualização de Listas
```typescript
// Para listas muito grandes, use virtualização
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={50}
>
  {Row}
</FixedSizeList>
```

---

## 📈 Métricas Importantes

### Backend
- **Tempo de resposta**: < 200ms ideal
- **Taxa de erro**: < 1%
- **Throughput**: Requisições por segundo
- **Uso de memória**: < 80%
- **Uso de CPU**: < 70%

### Frontend
- **First Contentful Paint (FCP)**: < 1.8s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Time to Interactive (TTI)**: < 3.8s
- **Cumulative Layout Shift (CLS)**: < 0.1
- **First Input Delay (FID)**: < 100ms

---

## 🔍 Monitoramento

### Ferramentas Recomendadas

1. **Backend:**
   - PM2 (monitoramento de processos Node.js)
   - New Relic / DataDog (APM)
   - Sentry (rastreamento de erros)

2. **Frontend:**
   - Google Analytics
   - Sentry (rastreamento de erros)
   - Lighthouse CI (testes automatizados)

3. **Banco de Dados:**
   - pg_stat_statements (PostgreSQL)
   - EXPLAIN ANALYZE (análise de queries)

---

## 🛡️ Checklist de Segurança

### Antes de Deploy

- [ ] Todas as senhas foram trocadas
- [ ] Variáveis de ambiente configuradas
- [ ] HTTPS habilitado
- [ ] CORS configurado corretamente
- [ ] Rate limiting implementado
- [ ] Validação de inputs
- [ ] Sanitização de dados
- [ ] Logs de auditoria
- [ ] Backup automático
- [ ] Plano de recuperação de desastres

### Manutenção Regular

- [ ] Atualizar dependências (npm audit)
- [ ] Revisar logs de erro
- [ ] Monitorar uso de recursos
- [ ] Testar backups
- [ ] Revisar permissões de usuários
- [ ] Verificar certificados SSL

---

## 📞 Suporte

Se encontrar problemas de performance:

1. **Identifique o gargalo** (frontend, backend, banco)
2. **Colete métricas** (tempos de resposta, logs)
3. **Teste isoladamente** (um componente por vez)
4. **Documente o problema** (passos para reproduzir)
5. **Implemente a solução** (uma otimização por vez)
6. **Meça o resultado** (compare antes/depois)

---

**Última atualização:** Março 2026  
**Versão:** 1.0
