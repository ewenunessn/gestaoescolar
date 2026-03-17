# 🚨 PROBLEMA: Sistema de Permissões Não Está Funcionando

## 📋 DIAGNÓSTICO

O sistema possui toda a estrutura de permissões criada (tabelas, controllers, rotas), mas **as permissões NÃO estão sendo verificadas nas rotas da API**.

### O que está acontecendo:

1. ✅ **Banco de dados**: Tabelas de permissões existem e funcionam
   - `modulos`
   - `niveis_permissao`
   - `funcoes_usuarios`
   - `funcao_permissoes`
   - `usuario_permissoes`

2. ✅ **Backend - Controllers**: Funções para gerenciar permissões existem
   - `listarModulos()`
   - `obterPermissoesUsuario()`
   - `definirPermissoesUsuario()`
   - `verificarPermissao()`

3. ✅ **Frontend**: Interface para configurar permissões funciona
   - Tela de gerenciamento de usuários
   - Criação de funções com permissões
   - Atribuição de funções a usuários

4. ❌ **PROBLEMA**: Middleware de verificação de permissões NÃO EXISTE
   - As rotas da API usam apenas `authenticateToken`
   - `authenticateToken` só verifica se o usuário está logado
   - **Nenhuma rota verifica o nível de permissão do usuário**

### Exemplo do problema:

```typescript
// backend/src/modules/compras/routes/compraRoutes.ts
router.use(authenticateToken); // ← Só verifica se está logado

router.get('/', listarCompras);        // ← Qualquer usuário logado pode listar
router.post('/', criarCompra);         // ← Qualquer usuário logado pode criar
router.put('/:id', atualizarCompra);   // ← Qualquer usuário logado pode editar
router.delete('/:id', excluirCompra);  // ← Qualquer usuário logado pode excluir
```

**Resultado**: Mesmo que você configure um usuário com "apenas leitura" ou "nenhum acesso", ele consegue fazer tudo porque as rotas não verificam permissões.

---

## 🔧 SOLUÇÃO

Precisamos criar e aplicar um middleware de verificação de permissões em todas as rotas.

### Passo 1: Criar Middleware de Permissões

Arquivo: `backend/src/middleware/permissionMiddleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import db from '../database';
import { AuthenticatedRequest } from './authMiddleware';

/**
 * Níveis de permissão
 */
export enum NivelPermissao {
  NENHUM = 0,
  LEITURA = 1,
  ESCRITA = 2,
  TOTAL = 3
}

/**
 * Cache de permissões em memória (evita consultas repetidas)
 */
const permissoesCache = new Map<string, { nivel: number; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Buscar permissão do usuário para um módulo
 */
async function buscarPermissaoUsuario(
  usuarioId: number, 
  moduloSlug: string
): Promise<number> {
  const cacheKey = `${usuarioId}:${moduloSlug}`;
  const cached = permissoesCache.get(cacheKey);

  // Retornar do cache se ainda válido
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.nivel;
  }

  try {
    // Buscar permissão direta do usuário
    const result = await db.query(`
      SELECT np.nivel
      FROM usuario_permissoes up
      JOIN modulos m ON up.modulo_id = m.id
      JOIN niveis_permissao np ON up.nivel_permissao_id = np.id
      WHERE up.usuario_id = $1 AND m.slug = $2
    `, [usuarioId, moduloSlug]);

    let nivel = NivelPermissao.NENHUM;

    if (result.rows.length > 0) {
      nivel = result.rows[0].nivel;
    } else {
      // Se não tem permissão direta, buscar pela função
      const funcaoResult = await db.query(`
        SELECT np.nivel
        FROM usuarios u
        JOIN funcoes_usuarios fu ON u.funcao_id = fu.id
        JOIN funcao_permissoes fp ON fu.id = fp.funcao_id
        JOIN modulos m ON fp.modulo_id = m.id
        JOIN niveis_permissao np ON fp.nivel_permissao_id = np.id
        WHERE u.id = $1 AND m.slug = $2 AND fu.ativo = true
      `, [usuarioId, moduloSlug]);

      if (funcaoResult.rows.length > 0) {
        nivel = funcaoResult.rows[0].nivel;
      }
    }

    // Armazenar no cache
    permissoesCache.set(cacheKey, { nivel, timestamp: Date.now() });

    return nivel;
  } catch (error) {
    console.error('❌ Erro ao buscar permissão:', error);
    return NivelPermissao.NENHUM;
  }
}

/**
 * Limpar cache de permissões de um usuário
 */
export function limparCachePermissoes(usuarioId?: number) {
  if (usuarioId) {
    // Limpar apenas do usuário específico
    for (const key of permissoesCache.keys()) {
      if (key.startsWith(`${usuarioId}:`)) {
        permissoesCache.delete(key);
      }
    }
  } else {
    // Limpar todo o cache
    permissoesCache.clear();
  }
}

/**
 * Middleware para verificar permissão de leitura
 */
export function requireLeitura(moduloSlug: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    const usuario = authReq.user;

    if (!usuario) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Usuário não autenticado'
      });
    }

    // System admin tem acesso total
    if (usuario.isSystemAdmin || usuario.tipo === 'admin') {
      return next();
    }

    const nivel = await buscarPermissaoUsuario(usuario.id, moduloSlug);

    if (nivel < NivelPermissao.LEITURA) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: `Você não tem permissão para acessar o módulo ${moduloSlug}`,
        detalhes: {
          modulo: moduloSlug,
          nivel_necessario: 'leitura',
          nivel_atual: nivel
        }
      });
    }

    // Adicionar nível de permissão à requisição para uso posterior
    (authReq as any).permissao = { modulo: moduloSlug, nivel };

    next();
  };
}

/**
 * Middleware para verificar permissão de escrita
 */
export function requireEscrita(moduloSlug: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    const usuario = authReq.user;

    if (!usuario) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Usuário não autenticado'
      });
    }

    // System admin tem acesso total
    if (usuario.isSystemAdmin || usuario.tipo === 'admin') {
      return next();
    }

    const nivel = await buscarPermissaoUsuario(usuario.id, moduloSlug);

    if (nivel < NivelPermissao.ESCRITA) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: `Você não tem permissão para modificar dados no módulo ${moduloSlug}`,
        detalhes: {
          modulo: moduloSlug,
          nivel_necessario: 'escrita',
          nivel_atual: nivel
        }
      });
    }

    // Adicionar nível de permissão à requisição
    (authReq as any).permissao = { modulo: moduloSlug, nivel };

    next();
  };
}

/**
 * Middleware para verificar permissão total (admin do módulo)
 */
export function requireTotal(moduloSlug: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    const usuario = authReq.user;

    if (!usuario) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Usuário não autenticado'
      });
    }

    // System admin tem acesso total
    if (usuario.isSystemAdmin || usuario.tipo === 'admin') {
      return next();
    }

    const nivel = await buscarPermissaoUsuario(usuario.id, moduloSlug);

    if (nivel < NivelPermissao.TOTAL) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: `Você não tem permissão total no módulo ${moduloSlug}`,
        detalhes: {
          modulo: moduloSlug,
          nivel_necessario: 'total',
          nivel_atual: nivel
        }
      });
    }

    // Adicionar nível de permissão à requisição
    (authReq as any).permissao = { modulo: moduloSlug, nivel };

    next();
  };
}

/**
 * Middleware genérico que verifica nível mínimo
 */
export function requireNivel(moduloSlug: string, nivelMinimo: NivelPermissao) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    const usuario = authReq.user;

    if (!usuario) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Usuário não autenticado'
      });
    }

    // System admin tem acesso total
    if (usuario.isSystemAdmin || usuario.tipo === 'admin') {
      return next();
    }

    const nivel = await buscarPermissaoUsuario(usuario.id, moduloSlug);

    if (nivel < nivelMinimo) {
      const nivelNome = ['nenhum', 'leitura', 'escrita', 'total'][nivelMinimo];
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: `Você não tem permissão suficiente no módulo ${moduloSlug}`,
        detalhes: {
          modulo: moduloSlug,
          nivel_necessario: nivelNome,
          nivel_atual: nivel
        }
      });
    }

    // Adicionar nível de permissão à requisição
    (authReq as any).permissao = { modulo: moduloSlug, nivel };

    next();
  };
}
```

---

### Passo 2: Aplicar Middleware nas Rotas

Agora precisamos aplicar o middleware em TODAS as rotas que precisam de controle de acesso.

#### Exemplo: Rotas de Compras

```typescript
// backend/src/modules/compras/routes/compraRoutes.ts
import { Router } from 'express';
import { authenticateToken } from '../../../middleware/authMiddleware';
import { requireLeitura, requireEscrita } from '../../../middleware/permissionMiddleware';
import * as compraController from '../controllers/compraController';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Rotas de LEITURA (nível 1+)
router.get('/', requireLeitura('compras'), compraController.listarCompras);
router.get('/:id', requireLeitura('compras'), compraController.buscarCompra);
router.get('/estatisticas', requireLeitura('compras'), compraController.obterEstatisticasCompras);

// Rotas de ESCRITA (nível 2+)
router.post('/', requireEscrita('compras'), compraController.criarCompra);
router.put('/:id', requireEscrita('compras'), compraController.atualizarCompra);
router.patch('/:id/status', requireEscrita('compras'), compraController.atualizarStatusCompra);

// Rotas de EXCLUSÃO (nível 2+)
router.delete('/:id', requireEscrita('compras'), compraController.excluirCompra);

export default router;
```

#### Exemplo: Rotas de Guias

```typescript
// backend/src/modules/guias/routes/guiaRoutes.ts
import { Router } from 'express';
import { authenticateToken } from '../../../middleware/authMiddleware';
import { requireLeitura, requireEscrita } from '../../../middleware/permissionMiddleware';
import { guiaController } from '../controllers/guiaController';

const router = Router();

router.use(authenticateToken);

// LEITURA
router.get('/', requireLeitura('guias'), guiaController.listarGuias);
router.get('/:guiaId', requireLeitura('guias'), guiaController.buscarGuia);
router.get('/:guiaId/produtos', requireLeitura('guias'), guiaController.listarProdutosGuia);
router.get('/competencias', requireLeitura('guias'), guiaController.listarCompetencias);

// ESCRITA
router.post('/', requireEscrita('guias'), guiaController.criarGuia);
router.put('/:id', requireEscrita('guias'), guiaController.atualizarGuia);
router.post('/:guiaId/produtos', requireEscrita('guias'), guiaController.adicionarProdutoGuia);
router.delete('/:guiaId/produtos/:itemId', requireEscrita('guias'), guiaController.removerItemGuia);
router.delete('/:id', requireEscrita('guias'), guiaController.deletarGuia);

export default router;
```

---

### Passo 3: Atualizar Controller de Permissões

Adicionar função para limpar cache quando permissões forem alteradas:

```typescript
// backend/src/controllers/permissoesController.ts
import { limparCachePermissoes } from '../middleware/permissionMiddleware';

export async function definirPermissoesUsuario(req: Request, res: Response) {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { usuario_id } = req.params;
    const { permissoes } = req.body;
    
    // ... código existente ...

    await client.query('COMMIT');

    // ✅ IMPORTANTE: Limpar cache de permissões do usuário
    limparCachePermissoes(parseInt(usuario_id));

    res.json({
      success: true,
      message: 'Permissões atualizadas com sucesso'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    // ... tratamento de erro ...
  } finally {
    client.release();
  }
}
```

---

### Passo 4: Atualizar Frontend para Mostrar Erros de Permissão

```typescript
// frontend/src/services/api.ts
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      const message = error.response.data?.message || 'Você não tem permissão para esta ação';
      
      toast.error(message, {
        duration: 5000,
        icon: '🔒'
      });

      // Opcional: redirecionar para página de acesso negado
      // window.location.href = '/acesso-negado';
    }

    return Promise.reject(error);
  }
);
```

---

## 📝 CHECKLIST DE IMPLEMENTAÇÃO

### Backend
- [ ] Criar `backend/src/middleware/permissionMiddleware.ts`
- [ ] Aplicar middleware em rotas de Compras
- [ ] Aplicar middleware em rotas de Guias
- [ ] Aplicar middleware em rotas de Produtos
- [ ] Aplicar middleware em rotas de Contratos
- [ ] Aplicar middleware em rotas de Fornecedores
- [ ] Aplicar middleware em rotas de Escolas
- [ ] Aplicar middleware em rotas de Cardápios
- [ ] Aplicar middleware em rotas de Refeições
- [ ] Aplicar middleware em rotas de Estoque
- [ ] Aplicar middleware em rotas de Entregas
- [ ] Aplicar middleware em rotas de Faturamentos
- [ ] Aplicar middleware em rotas de Recebimentos
- [ ] Aplicar middleware em rotas de PNAE
- [ ] Atualizar controller de permissões para limpar cache

### Frontend
- [ ] Atualizar interceptor de API para tratar erro 403
- [ ] Criar página de "Acesso Negado" (opcional)
- [ ] Adicionar indicadores visuais de permissões nas telas
- [ ] Ocultar botões/ações que o usuário não tem permissão

### Testes
- [ ] Testar usuário com "nenhum" acesso
- [ ] Testar usuário com "leitura" (deve listar mas não editar)
- [ ] Testar usuário com "escrita" (deve listar e editar)
- [ ] Testar usuário com "total" (deve ter acesso completo)
- [ ] Testar admin (deve ter acesso a tudo)
- [ ] Testar cache de permissões
- [ ] Testar limpeza de cache ao alterar permissões

---

## 🎯 RESULTADO ESPERADO

Após implementação:

1. ✅ Usuário com "nenhum" acesso → Erro 403 ao tentar acessar módulo
2. ✅ Usuário com "leitura" → Pode listar, mas erro 403 ao tentar criar/editar/excluir
3. ✅ Usuário com "escrita" → Pode listar, criar e editar, mas não excluir configurações críticas
4. ✅ Usuário com "total" → Acesso completo ao módulo
5. ✅ Admin → Acesso completo a todos os módulos

---

## ⚡ IMPLEMENTAÇÃO RÁPIDA

Se você quiser implementar rapidamente em um módulo específico para testar:

```bash
# 1. Criar o middleware
# Copiar o código do Passo 1 para backend/src/middleware/permissionMiddleware.ts

# 2. Aplicar em uma rota de teste (ex: compras)
# Editar backend/src/modules/compras/routes/compraRoutes.ts

# 3. Reiniciar o backend
npm run dev

# 4. Testar no frontend
# Criar um usuário com apenas "leitura" em compras
# Tentar criar uma compra → Deve dar erro 403
```

---

## 📚 DOCUMENTAÇÃO ADICIONAL

- [Express Middleware](https://expressjs.com/en/guide/using-middleware.html)
- [JWT Authentication](https://jwt.io/introduction)
- [Role-Based Access Control (RBAC)](https://en.wikipedia.org/wiki/Role-based_access_control)

---

**Criado em**: 17/03/2026  
**Versão**: 1.0  
**Status**: Aguardando Implementação
