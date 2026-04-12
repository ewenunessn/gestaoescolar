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
        JOIN funcoes f ON u.funcao_id = f.id
        JOIN funcao_permissoes fp ON f.id = fp.funcao_id
        JOIN modulos m ON fp.modulo_id = m.id
        JOIN niveis_permissao np ON fp.nivel_permissao_id = np.id
        WHERE u.id = $1 AND m.slug = $2 AND f.ativo = true
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
