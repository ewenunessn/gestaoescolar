# Patch: Atualizar Controller de Usuários

## Arquivo: `backend/src/modules/usuarios/controllers/adminUsuariosController.ts`

### 1. Atualizar função `atualizarUsuario` (linha ~89)

Substituir a linha:
```typescript
const { nome, email, senha, tipo, funcao_id, ativo } = req.body;
```

Por:
```typescript
const { nome, email, senha, tipo, funcao_id, ativo, escola_id, tipo_secretaria } = req.body;
```

Adicionar validações após o check de email (linha ~101):
```typescript
  // Validar tipo_secretaria
  if (tipo_secretaria && !['educacao', 'escola'].includes(tipo_secretaria)) {
    throw new ValidationError('tipo_secretaria deve ser "educacao" ou "escola"');
  }

  // Se tipo_secretaria é 'escola', escola_id é obrigatório
  if (tipo_secretaria === 'escola' && !escola_id) {
    throw new ValidationError('escola_id é obrigatório para usuários de secretaria de escola');
  }
```

Adicionar após a linha `if (ativo !== undefined)` (linha ~111):
```typescript
  if (escola_id !== undefined) { sets.push(`escola_id = $${idx++}`); values.push(escola_id || null); }
  if (tipo_secretaria !== undefined) { sets.push(`tipo_secretaria = $${idx++}`); values.push(tipo_secretaria); }
```

Atualizar o RETURNING (linha ~117):
```typescript
    RETURNING id, nome, email, tipo, funcao_id, ativo, escola_id, tipo_secretaria, updated_at
```

## Aplicação Manual

1. Abra o arquivo `backend/src/modules/usuarios/controllers/adminUsuariosController.ts`
2. Localize a função `atualizarUsuario` (linha 89)
3. Aplique as mudanças acima
4. Salve o arquivo
5. Reinicie o servidor backend

## Verificação

Após aplicar as mudanças, teste:
```bash
# Testar atualização de usuário com escola
curl -X PUT http://localhost:3001/api/admin/usuarios/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "tipo_secretaria": "escola",
    "escola_id": 1
  }'
```

Deve retornar sucesso com os novos campos.
