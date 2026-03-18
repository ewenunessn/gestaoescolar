# Implementação: Sistema de Usuários de Secretaria de Escola

## Resumo
Sistema para criar usuários associados a escolas específicas, com acesso limitado apenas aos dados da sua escola. Diferencia usuários de secretaria de educação (acesso total) e secretaria de escola (acesso limitado).

## Arquitetura

### 1. Banco de Dados

#### Migração: `20260317_add_escola_usuarios.sql`
```sql
-- Adicionar coluna escola_id para associar usuário a uma escola
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS escola_id INTEGER REFERENCES escolas(id) ON DELETE SET NULL;

-- Adicionar coluna tipo_secretaria
-- Valores: 'educacao' (acesso total), 'escola' (acesso limitado)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS tipo_secretaria VARCHAR(20) DEFAULT 'educacao';

-- Índice
CREATE INDEX IF NOT EXISTS idx_usuarios_escola ON usuarios(escola_id);
```

### 2. Backend

#### Controller: `adminUsuariosController.ts`

**Modificações necessárias:**

1. **listarUsuarios**: Adicionar JOIN com escolas
```typescript
SELECT u.id, u.nome, u.email, u.tipo, u.ativo, u.funcao_id,
       f.nome as funcao_nome, u.escola_id, e.nome as escola_nome,
       u.tipo_secretaria, u.created_at, u.updated_at
FROM usuarios u
LEFT JOIN funcoes f ON u.funcao_id = f.id
LEFT JOIN escolas e ON u.escola_id = e.id
```

2. **criarUsuario**: Adicionar campos escola_id e tipo_secretaria
- Validar tipo_secretaria ('educacao' ou 'escola')
- Se tipo_secretaria === 'escola', escola_id é obrigatório

3. **atualizarUsuario**: Adicionar suporte para escola_id e tipo_secretaria

#### Novo Controller: `escolaPortalController.ts`
```typescript
// GET /api/escola-portal/dashboard
// Retorna informações da escola do usuário logado

export const getDashboardEscola = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  
  if (!user.escola_id) {
    throw new ValidationError('Usuário não está associado a uma escola');
  }

  // Buscar dados da escola
  const escola = await db.query('SELECT * FROM escolas WHERE id = $1', [user.escola_id]);
  
  // Buscar estatísticas
  const stats = await db.query(`
    SELECT 
      COUNT(DISTINCT ge.id) as total_guias,
      COUNT(DISTINCT ge.produto_id) as total_produtos,
      SUM(CASE WHEN ge.status = 'pendente' THEN 1 ELSE 0 END) as pendentes,
      SUM(CASE WHEN ge.status = 'entregue' THEN 1 ELSE 0 END) as entregues
    FROM guia_escola ge
    WHERE ge.escola_id = $1
  `, [user.escola_id]);

  res.json({
    success: true,
    data: {
      escola: escola.rows[0],
      estatisticas: stats.rows[0]
    }
  });
});
```

### 3. Frontend

#### Service: `adminUsuarios.ts`

**Atualizar interface Usuario:**
```typescript
export interface Usuario {
  id: number;
  nome: string;
  email: string;
  tipo: string;
  ativo: boolean;
  funcao_id?: number;
  funcao_nome?: string;
  escola_id?: number;
  escola_nome?: string;
  tipo_secretaria: 'educacao' | 'escola';
  created_at: string;
  updated_at: string;
}
```

#### Página: `GerenciamentoUsuarios.tsx`

**Adicionar ao formulário:**
1. Select para tipo_secretaria:
   - "Secretaria de Educação" (educacao)
   - "Secretaria de Escola" (escola)

2. Autocomplete para escola (visível apenas se tipo_secretaria === 'escola')

3. Exibir escola na tabela de usuários

#### Nova Página: `PortalEscola.tsx`
```typescript
// Página específica para usuários de secretaria de escola
// Exibe:
// - Informações da escola
// - Guias de demanda da escola
// - Produtos pendentes de entrega
// - Histórico de entregas
// - Cardápios da escola
```

### 4. Rotas

#### Backend Routes
```typescript
// routes/escolaPortalRoutes.ts
router.get('/dashboard', authMiddleware, escolaPortalController.getDashboardEscola);
router.get('/guias', authMiddleware, escolaPortalController.getGuiasEscola);
router.get('/entregas', authMiddleware, escolaPortalController.getEntregasEscola);
router.get('/cardapios', authMiddleware, escolaPortalController.getCardapiosEscola);
```

#### Frontend Routes
```typescript
// App.tsx
<Route path="/portal-escola" element={<PortalEscola />} />
```

### 5. Middleware de Autorização

#### `escolaAuthMiddleware.ts`
```typescript
// Middleware para verificar se usuário tem acesso aos dados da escola
export function requireEscolaAccess(req: Request, res: Response, next: Function) {
  const user = (req as any).user;
  const escolaId = req.params.escolaId || req.body.escola_id;

  // Admin e secretaria de educação têm acesso total
  if (user.tipo === 'admin' || user.tipo_secretaria === 'educacao') {
    return next();
  }

  // Secretaria de escola só acessa sua própria escola
  if (user.tipo_secretaria === 'escola' && user.escola_id === Number(escolaId)) {
    return next();
  }

  return res.status(403).json({ 
    success: false, 
    message: 'Acesso negado: você não tem permissão para acessar dados desta escola' 
  });
}
```

### 6. Filtros Automáticos

#### Modificar queries existentes para filtrar por escola
```typescript
// Exemplo: listarGuias
export const listarGuias = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  
  let whereClause = '';
  const params: any[] = [];
  
  // Se usuário é de secretaria de escola, filtrar por escola
  if (user.tipo_secretaria === 'escola' && user.escola_id) {
    whereClause = 'WHERE ge.escola_id = $1';
    params.push(user.escola_id);
  }
  
  const result = await db.query(`
    SELECT * FROM guia_escola ge
    ${whereClause}
    ORDER BY ge.created_at DESC
  `, params);
  
  res.json({ success: true, data: result.rows });
});
```

## Fluxo de Uso

### 1. Cadastro de Usuário de Secretaria de Escola
1. Admin acessa "Gerenciamento de Usuários"
2. Clica em "Novo Usuário"
3. Preenche nome, email, senha
4. Seleciona "Secretaria de Escola" em tipo_secretaria
5. Seleciona a escola no autocomplete
6. Salva

### 2. Login e Acesso
1. Usuário faz login
2. Sistema identifica tipo_secretaria === 'escola'
3. Redireciona para `/portal-escola`
4. Exibe dashboard com dados apenas da escola associada

### 3. Navegação
- Usuário de secretaria de escola vê apenas:
  - Dashboard da escola
  - Guias de demanda da escola
  - Entregas da escola
  - Cardápios da escola
  - Não vê outras escolas
  - Não vê módulos administrativos

## Benefícios

1. **Segurança**: Dados isolados por escola
2. **Simplicidade**: Interface focada apenas no necessário
3. **Autonomia**: Escolas gerenciam seus próprios dados
4. **Rastreabilidade**: Ações registradas por usuário e escola
5. **Escalabilidade**: Suporta múltiplas escolas facilmente

## Próximos Passos

1. ✅ Criar migração do banco
2. ⏳ Atualizar controller de usuários
3. ⏳ Atualizar página de gerenciamento
4. ⏳ Criar controller do portal da escola
5. ⏳ Criar página do portal da escola
6. ⏳ Implementar middleware de autorização
7. ⏳ Adicionar filtros automáticos nas queries
8. ⏳ Testar fluxo completo

## Telas do Portal da Escola

### Dashboard
- Nome e informações da escola
- Total de guias de demanda
- Produtos pendentes
- Próximas entregas
- Gráfico de entregas do mês

### Guias de Demanda
- Lista de guias da escola
- Filtro por período
- Status de cada item
- Botão para ajustar quantidades

### Entregas
- Histórico de entregas
- Filtro por data e produto
- Status de cada entrega
- Comprovantes

### Cardápios
- Cardápios da escola
- Visualização por período
- Refeições planejadas
