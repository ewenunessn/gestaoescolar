import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';

interface JwtPayload {
  id: number;
  email: string;
  nome: string;
  tipo: string;
  isSystemAdmin?: boolean;
  escola_id?: number;
  tipo_secretaria?: string;
  institution_id?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    nome: string;
    tipo: string;
    isSystemAdmin?: boolean;
    escola_id?: number;
    tipo_secretaria?: string;
    institution_id?: string;
  };
}

/**
 * Middleware para verificar autenticação JWT
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Token de autenticação não fornecido'
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    
    // Adicionar informações do usuário à requisição
    (req as AuthenticatedRequest).user = {
      id: decoded.id,
      email: decoded.email,
      nome: decoded.nome,
      tipo: decoded.tipo,
      isSystemAdmin: decoded.isSystemAdmin,
      escola_id: decoded.escola_id,
      tipo_secretaria: decoded.tipo_secretaria,
      institution_id: decoded.institution_id
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: 'TOKEN_EXPIRED',
        message: 'Token expirado. Faça login novamente.'
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Token inválido'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'AUTH_ERROR',
      message: 'Erro ao verificar autenticação'
    });
  }
}

/**
 * Middleware opcional de autenticação (não bloqueia se não houver token)
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    
    (req as AuthenticatedRequest).user = {
      id: decoded.id,
      email: decoded.email,
      nome: decoded.nome,
      tipo: decoded.tipo,
      isSystemAdmin: decoded.isSystemAdmin,
      escola_id: decoded.escola_id,
      tipo_secretaria: decoded.tipo_secretaria,
      institution_id: decoded.institution_id
    };
  } catch (error) {
    // Ignora erros de token em autenticação opcional
  }

  next();
}
