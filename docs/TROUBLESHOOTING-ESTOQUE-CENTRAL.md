# 🔧 Troubleshooting: Estoque Central 404

## Problema

```
ERROR  Erro ao carregar estoque: [AxiosError: Request failed with status code 404]
```

## Causa

A rota `/api/estoque-central` retorna 404, indicando que:
1. O backend não está rodando
2. O backend não foi recompilado após as mudanças
3. As rotas não foram registradas corretamente

## ✅ Solução

### 1. Verificar se o Backend está Rodando

```bash
# Verificar processos Node
ps aux | grep node

# Ou no Windows
tasklist | findstr node
```

### 2. Recompilar e Reiniciar o Backend

```bash
cd backend

# Recompilar TypeScript
npm run build

# Reiniciar o servidor
npm run dev
# ou
npm start
```

### 3. Verificar Logs do Backend

Ao iniciar, deve aparecer:
```
✅ Rotas registradas:
   - /api/estoque-central
```

### 4. Testar a Rota Diretamente

```bash
# Testar se a rota existe
curl http://localhost:3000/api/estoque-central

# Ou com autenticação
curl -H "Authorization: Bearer SEU_TOKEN" \
     http://localhost:3000/api/estoque-central
```

### 5. Verificar URL no App Mobile

No arquivo `apps/entregador-native/src/api/client.ts`:

```typescript
// Produção (Vercel)
export const API_URL = 'https://gestaoescolar-backend.vercel.app/api';

// Desenvolvimento local
export const API_URL = 'http://SEU_IP_LOCAL:3000/api';
```

**IMPORTANTE**: Se estiver testando localmente, use o IP da sua máquina, não `localhost`!

### 6. Verificar se as Tabelas Existem

```sql
-- Verificar tabelas do estoque central
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'estoque_central%';

-- Deve retornar:
-- estoque_central
-- estoque_central_lotes
-- estoque_central_movimentacoes
```

### 7. Aplicar Migrations (se necessário)

```bash
cd backend

# Aplicar migration do estoque central
node scripts/apply-estoque-central.js

# Ou executar SQL diretamente
psql -U postgres -d alimentacao_escolar -f src/migrations/20260303_create_estoque_central.sql
```

## 🔍 Diagnóstico Completo

Execute este script para diagnóstico:

```bash
cd backend

# Criar arquivo de teste
cat > test-estoque-central-route.js << 'EOF'
const axios = require('axios');

async function testarRota() {
  const baseURL = 'http://localhost:3000/api';
  
  console.log('🔍 Testando rota do Estoque Central...\n');
  
  try {
    // Teste 1: Verificar se servidor está rodando
    console.log('1. Testando conexão com servidor...');
    const healthCheck = await axios.get(`${baseURL}/health`).catch(() => null);
    if (!healthCheck) {
      console.log('❌ Servidor não está respondendo');
      console.log('   Execute: npm run dev\n');
      return;
    }
    console.log('✅ Servidor está rodando\n');
    
    // Teste 2: Testar rota do estoque central
    console.log('2. Testando rota /api/estoque-central...');
    const response = await axios.get(`${baseURL}/estoque-central`);
    console.log('✅ Rota funcionando!');
    console.log(`   Registros encontrados: ${response.data.estoque?.length || 0}\n`);
    
  } catch (error) {
    if (error.response) {
      console.log(`❌ Erro ${error.response.status}: ${error.response.statusText}`);
      console.log(`   Mensagem: ${error.response.data?.error || error.response.data?.message}\n`);
    } else if (error.request) {
      console.log('❌ Sem resposta do servidor');
      console.log('   Verifique se o backend está rodando\n');
    } else {
      console.log(`❌ Erro: ${error.message}\n`);
    }
  }
}

testarRota();
EOF

# Executar teste
node test-estoque-central-route.js
```

## 📱 Configuração do App Mobile

### Para Desenvolvimento Local

1. Descubra seu IP local:
```bash
# Windows
ipconfig

# Linux/Mac
ifconfig
```

2. Atualize `apps/entregador-native/src/api/client.ts`:
```typescript
export const API_URL = 'http://192.168.1.XXX:3000/api'; // Seu IP
```

3. Certifique-se de que o firewall permite conexões na porta 3000

### Para Produção (Vercel)

1. Verifique se o backend está deployado:
```bash
curl https://gestaoescolar-backend.vercel.app/api/health
```

2. Se não estiver, faça o deploy:
```bash
cd backend
vercel --prod
```

## ✅ Checklist de Verificação

- [ ] Backend está rodando (`npm run dev`)
- [ ] Backend foi recompilado (`npm run build`)
- [ ] Migrations foram aplicadas
- [ ] Tabelas existem no banco de dados
- [ ] Rota `/api/estoque-central` responde
- [ ] URL no app mobile está correta
- [ ] Token de autenticação é válido
- [ ] Firewall permite conexões (desenvolvimento local)

## 🚀 Solução Rápida

```bash
# 1. Parar tudo
pkill -f node

# 2. Recompilar backend
cd backend
npm run build

# 3. Aplicar migrations
node scripts/apply-estoque-central.js

# 4. Iniciar backend
npm run dev

# 5. Testar rota
curl http://localhost:3000/api/estoque-central

# 6. Reiniciar app mobile
# No terminal do Expo, pressione 'r' para reload
```

## 📞 Ainda com Problemas?

Se o erro persistir, verifique:

1. **Logs do Backend**: Procure por erros ao iniciar
2. **Logs do App**: Verifique a URL exata que está sendo chamada
3. **Network**: Use ferramentas como Postman ou curl para testar
4. **Autenticação**: Verifique se o token está sendo enviado corretamente

---

**Última atualização**: 03/03/2026
