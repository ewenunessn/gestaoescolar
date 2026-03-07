# Padronização de Tratamento de Erros

## Objetivo

Implementar tratamento de erros consistente em todos os controllers do backend usando classes de erro customizadas e helpers padronizados.

---

## Sistema de Erros

### Classes de Erro Disponíveis

```typescript
import {
  ValidationError,      // 400 - Dados inválidos
  AuthenticationError,  // 401 - Não autenticado
  AuthorizationError,   // 403 - Sem permissão
  NotFoundError,        // 404 - Recurso não encontrado
  ConflictError,        // 409 - Duplicação/conflito
  BusinessError,        // 422 - Regra de negócio
  DatabaseError,        // 500 - Erro de banco
  asyncHandler,         // Wrapper para async functions
  validateRequired,     // Validação de campos obrigatórios
  handleDatabaseError   // Converte erros do PostgreSQL
} from '../utils/errorHandler';
```

---

## Padrão Antigo vs Novo

### ❌ Antes (Inconsistente)

```typescript
export async function listarProdutos(req: Request, res: Response) {
  try {
    const result = await db.query('SELECT * FROM produtos');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function buscarProduto(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM produtos WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }
    
    res.json({ data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ message: 'Erro ao buscar produto' });
  }
}
```

### ✅ Depois (Padronizado)

```typescript
import { 
  asyncHandler, 
  NotFoundError, 
  validateRequired,
  handleDatabaseError 
} from '../../../utils/errorHandler';
import db from '../../../database';

export const listarProdutos = asyncHandler(async (req, res) => {
  const result = await db.query('SELECT * FROM produtos');
  
  res.json({ 
    success: true, 
    data: result.rows 
  });
});

export const buscarProduto = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await db.query(
    'SELECT * FROM produtos WHERE id = $1', 
    [id]
  );
  
  if (result.rows.length === 0) {
    throw new NotFoundError('Produto', id);
  }
  
  res.json({ 
    success: true, 
    data: result.rows[0] 
  });
});

export const criarProduto = asyncHandler(async (req, res) => {
  const { nome, unidade_id, categoria } = req.body;
  
  // Validação automática
  validateRequired(req.body, ['nome', 'unidade_id']);
  
  try {
    const result = await db.query(
      'INSERT INTO produtos (nome, unidade_id, categoria) VALUES ($1, $2, $3) RETURNING *',
      [nome, unidade_id, categoria]
    );
    
    res.status(201).json({ 
      success: true, 
      data: result.rows[0] 
    });
  } catch (error) {
    handleDatabaseError(error);
  }
});
```

---

## Benefícios

### 1. Consistência
- Todas as respostas de erro seguem o mesmo formato
- Códigos HTTP corretos automaticamente
- Mensagens de erro padronizadas

### 2. Menos Código
- `asyncHandler` elimina try/catch repetitivo
- Validações reutilizáveis
- Conversão automática de erros do PostgreSQL

### 3. Melhor Debug
- Logs estruturados
- Stack trace em desenvolvimento
- Contexto adicional nos erros

### 4. Type Safety
- Classes tipadas
- Autocomplete no IDE
- Menos erros em runtime

---

## Formato de Resposta Padronizado

### Sucesso
```json
{
  "success": true,
  "data": { ... }
}
```

### Erro
```json
{
  "success": false,
  "error": "ValidationError",
  "message": "Campos obrigatórios ausentes: nome, email",
  "code": "VALIDATION_ERROR",
  "details": {
    "missingFields": ["nome", "email"]
  },
  "stack": "..." // apenas em desenvolvimento
}
```

---

## Exemplos por Tipo de Erro

### 1. Validação (400)

```typescript
import { ValidationError, validateRequired } from '../../../utils/errorHandler';

// Opção 1: Validação manual
if (!email || !senha) {
  throw new ValidationError('Email e senha são obrigatórios');
}

// Opção 2: Helper de validação
validateRequired(req.body, ['email', 'senha', 'nome']);

// Opção 3: Com detalhes
if (senha.length < 6) {
  throw new ValidationError('Senha muito curta', {
    minLength: 6,
    currentLength: senha.length
  });
}
```

### 2. Não Encontrado (404)

```typescript
import { NotFoundError } from '../../../utils/errorHandler';

// Com ID
if (!produto) {
  throw new NotFoundError('Produto', id);
}
// Resposta: "Produto com ID 123 não encontrado"

// Sem ID
if (result.rows.length === 0) {
  throw new NotFoundError('Produtos');
}
// Resposta: "Produtos não encontrado"
```

### 3. Conflito/Duplicação (409)

```typescript
import { ConflictError } from '../../../utils/errorHandler';

const existe = await db.get(
  'SELECT id FROM usuarios WHERE email = $1',
  [email]
);

if (existe) {
  throw new ConflictError('Email já cadastrado no sistema');
}
```

### 4. Regra de Negócio (422)

```typescript
import { BusinessError } from '../../../utils/errorHandler';

if (saldo < valorPedido) {
  throw new BusinessError('Saldo insuficiente no contrato', {
    saldoDisponivel: saldo,
    valorSolicitado: valorPedido
  });
}
```

### 5. Autenticação (401)

```typescript
import { AuthenticationError } from '../../../utils/errorHandler';

if (!token) {
  throw new AuthenticationError('Token não fornecido');
}

if (!tokenValido) {
  throw new AuthenticationError('Token inválido ou expirado');
}
```

### 6. Autorização (403)

```typescript
import { AuthorizationError } from '../../../utils/errorHandler';

if (usuario.role !== 'admin') {
  throw new AuthorizationError('Apenas administradores podem acessar');
}
```

### 7. Erro de Banco (500)

```typescript
import { handleDatabaseError } from '../../../utils/errorHandler';

try {
  await db.query('INSERT INTO produtos ...');
} catch (error) {
  // Converte automaticamente erros do PostgreSQL
  handleDatabaseError(error);
  // - 23505 → ConflictError (unique violation)
  // - 23503 → BusinessError (foreign key)
  // - 23502 → ValidationError (not null)
  // - outros → DatabaseError
}
```

---

## Migração Passo a Passo

### Passo 1: Importar Utilities

```typescript
import { 
  asyncHandler, 
  NotFoundError,
  ValidationError,
  validateRequired,
  handleDatabaseError 
} from '../../../utils/errorHandler';
```

### Passo 2: Envolver Função com asyncHandler

```typescript
// Antes
export async function listarProdutos(req: Request, res: Response) {
  try {
    // ...
  } catch (error) {
    // ...
  }
}

// Depois
export const listarProdutos = asyncHandler(async (req, res) => {
  // ... sem try/catch
});
```

### Passo 3: Substituir Validações

```typescript
// Antes
if (!nome || !email) {
  return res.status(400).json({ error: 'Campos obrigatórios' });
}

// Depois
validateRequired(req.body, ['nome', 'email']);
```

### Passo 4: Substituir 404s

```typescript
// Antes
if (!result.rows[0]) {
  return res.status(404).json({ error: 'Não encontrado' });
}

// Depois
if (!result.rows[0]) {
  throw new NotFoundError('Produto', id);
}
```

### Passo 5: Tratar Erros de Banco

```typescript
// Antes
catch (error) {
  res.status(500).json({ error: error.message });
}

// Depois
catch (error) {
  handleDatabaseError(error);
}
```

---

## Checklist de Migração

Para cada controller:

- [ ] Importar utilities necessárias
- [ ] Envolver funções com `asyncHandler`
- [ ] Remover try/catch desnecessários
- [ ] Substituir validações manuais por `validateRequired`
- [ ] Substituir `res.status(404)` por `NotFoundError`
- [ ] Substituir `res.status(400)` por `ValidationError`
- [ ] Substituir `res.status(409)` por `ConflictError`
- [ ] Usar `handleDatabaseError` para erros de banco
- [ ] Testar endpoints após migração

---

## Prioridade de Migração

### Alta Prioridade (APIs críticas)
1. ✅ usuarios (autenticação) - MIGRADO
2. ✅ produtos - MIGRADO
3. ✅ pedidos - MIGRADO
4. ✅ contratos - MIGRADO

### Média Prioridade
5. ✅ cardapios - MIGRADO
6. ✅ entregas - MIGRADO
7. ⏳ estoque (arquivo não encontrado)
8. ✅ faturamentos - MIGRADO

### Baixa Prioridade
9. ✅ guias - MIGRADO
10. ✅ demandas - MIGRADO
11. ✅ recebimentos - MIGRADO
12. ✅ escolas - MIGRADO

---

## Testes

### Teste Manual

```bash
# Erro de validação (400)
curl -X POST http://localhost:3000/api/produtos \
  -H "Content-Type: application/json" \
  -d '{}'

# Esperado:
{
  "success": false,
  "error": "ValidationError",
  "message": "Campos obrigatórios ausentes: nome, unidade_id",
  "code": "VALIDATION_ERROR"
}

# Não encontrado (404)
curl http://localhost:3000/api/produtos/99999

# Esperado:
{
  "success": false,
  "error": "NotFoundError",
  "message": "Produto com ID 99999 não encontrado",
  "code": "NOT_FOUND"
}
```

---

## Próximos Passos

1. ✅ Criar sistema de erros padronizado
2. ⏳ Migrar módulo de usuários (exemplo)
3. ⏳ Migrar módulos críticos
4. ⏳ Adicionar testes automatizados
5. ⏳ Documentar APIs com novos formatos

---

**Status**: 🚧 Em Progresso  
**Prioridade**: Alta  
**Impacto**: Todos os módulos (13)  
**Breaking Changes**: Formato de resposta de erro
