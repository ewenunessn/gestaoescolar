# Padronização de Imports do Database

## Objetivo

Padronizar todos os imports do módulo `database.ts` para usar ES6 imports em vez de CommonJS `require()`.

## Mudança Realizada

### Antes (CommonJS)
```typescript
const db = require("../../../database");
const db = require('../../../database');
const db = require("../database");
```

### Depois (ES6)
```typescript
import db from "../../../database";
```

## Arquivos Convertidos

Total: **36 arquivos**

### Módulos
- ✅ cardapios (4 arquivos)
- ✅ contratos (5 arquivos)
- ✅ demandas (1 arquivo)
- ✅ entregas (2 arquivos)
- ✅ escolas (1 arquivo)
- ✅ estoque (4 arquivos)
- ✅ guias (3 arquivos)
- ✅ pedidos (3 arquivos)
- ✅ produtos (2 arquivos)
- ✅ usuarios (3 arquivos)

### Utilitários
- ✅ utils (3 arquivos)
- ✅ routes (1 arquivo)
- ✅ controllers (3 arquivos)

## Benefícios

1. **Consistência**: Todos os módulos agora usam o mesmo padrão
2. **Type Safety**: Melhor suporte do TypeScript
3. **Tree Shaking**: Possibilidade de otimização de bundle
4. **Modernidade**: Segue padrões ES6+ atuais
5. **Manutenibilidade**: Código mais fácil de entender

## Exceções

### index.ts
O arquivo `src/index.ts` mantém o require condicional por necessidade:

```typescript
const db = process.env.VERCEL === '1' 
  ? require("./database-vercel") 
  : require("./database");
```

Isso é necessário para suportar diferentes configurações de banco entre desenvolvimento e produção.

## Padrão Oficial

A partir de agora, **TODOS** os novos arquivos devem usar:

```typescript
// ✅ CORRETO
import db from "../../../database";

// ❌ EVITAR
const db = require("../../../database");
```

## Verificação

Para verificar se há algum require não padronizado:

```bash
cd backend
grep -r "require.*database" src/ --include="*.ts" | grep -v "index.ts"
```

Resultado esperado: **nenhuma ocorrência** (exceto index.ts)

## Script de Padronização

Criado script automatizado em `backend/scripts/padronizar-imports-database.js` que:
- Identifica todos os arquivos com require
- Converte para import ES6
- Mantém o caminho relativo correto
- Gera relatório de conversão

## Testes Realizados

✅ Compilação TypeScript sem erros  
✅ Imports funcionando corretamente  
✅ Nenhuma quebra de funcionalidade  
✅ 36 arquivos convertidos com sucesso  

## Próximos Passos

1. ✅ Padronizar imports do database (CONCLUÍDO)
2. ⏳ Padronizar tratamento de erros
3. ⏳ Adicionar testes de integração

---

**Data**: 2026-03-07  
**Arquivos Modificados**: 36  
**Status**: ✅ Concluído  
**Breaking Changes**: Nenhum
