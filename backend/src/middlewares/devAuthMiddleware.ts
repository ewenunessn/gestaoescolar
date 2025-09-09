import { Request, Response, NextFunction } from "express";

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

    // Em produção, usar autenticação normal
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ 
        success: false,
        message: "Token de autorização necessário em produção" 
      });
    }

    // Aqui você colocaria a lógica de validação JWT para produção
    // Por enquanto, vamos apenas passar adiante
    next();

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