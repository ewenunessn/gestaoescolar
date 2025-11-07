import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/config";

/**
 * Middleware de autenticação para desenvolvimento
 * Permite acesso sem token em ambiente de desenvolvimento
 */
export function devAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    
    if (isDevelopment) {
      // Em desenvolvimento, sempre permitir acesso com usuário padrão
      // Usar ID 1 que deve existir no banco de dados
      (req as any).user = { 
        id: 1, 
        nome: 'Usuário Desenvolvimento',
        email: 'dev@sistema.com',
        role: 'admin'
      };
      
      console.log('🔓 [DEV] Acesso permitido sem autenticação:', {
        method: req.method,
        url: req.originalUrl,
        user: (req as any).user
      });
      
      return next();
    }

    // Em produção, validar token JWT
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log('❌ [PROD] Token não fornecido:', req.originalUrl);
      return res.status(401).json({ 
        success: false,
        message: "Token de autorização necessário" 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      (req as any).user = decoded;
      
      console.log('✅ [PROD] Token válido:', {
        userId: decoded.id,
        url: req.originalUrl
      });
      
      next();
    } catch (jwtError) {
      console.error('❌ [PROD] Token inválido:', jwtError);
      return res.status(401).json({ 
        success: false,
        message: "Token inválido ou expirado" 
      });
    }

  } catch (error) {
    console.error('❌ Erro no middleware de desenvolvimento:', error);
    return res.status(500).json({ 
      success: false,
      message: "Erro interno de autenticação" 
    });
  }
}

/**
 * Middleware que sempre permite acesso (apenas para desenvolvimento)
 */
export function allowAllMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  (req as any).user = { 
    id: 1, 
    nome: 'Usuário Teste',
    email: 'test@sistema.com',
    role: 'admin'
  };
  next();
}