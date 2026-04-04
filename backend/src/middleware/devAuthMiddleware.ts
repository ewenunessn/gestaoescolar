import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/config";

/**
 * Middleware de autenticação para desenvolvimento
 * Valida token JWT se fornecido, caso contrário permite acesso com usuário fake
 */
export function devAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    const authHeader = req.headers.authorization;
    
    // Se há token, validar mesmo em desenvolvimento
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      
      try {
        const decoded = jwt.verify(token, config.jwtSecret) as any;
        (req as any).user = decoded;
        
        console.log('✅ [DEV] Token válido:', {
          userId: decoded.id,
          nome: decoded.nome,
          url: req.originalUrl
        });
        
        return next();
      } catch (jwtError) {
        console.error('❌ [DEV] Token inválido:', jwtError);
        
        // Em desenvolvimento, se o token é inválido, retornar erro
        return res.status(401).json({ 
          success: false,
          message: "Token inválido ou expirado" 
        });
      }
    }
    
    // Se não há token e estamos em desenvolvimento, permitir com usuário fake
    if (isDevelopment) {
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

    // Em produção sem token, retornar erro
    console.log('❌ [PROD] Token não fornecido:', req.originalUrl);
    return res.status(401).json({ 
      success: false,
      message: "Token de autorização necessário" 
    });

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