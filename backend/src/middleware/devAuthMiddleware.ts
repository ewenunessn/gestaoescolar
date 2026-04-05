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
    const isDevelopment = process.env.NODE_ENV === 'development';
    const allowDevBypass = process.env.ALLOW_DEV_BYPASS === 'true';
    const authHeader = req.headers.authorization;

    // Se há token, validar sempre
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

        return res.status(401).json({
          success: false,
          message: "Token inválido ou expirado"
        });
      }
    }

    // Bypass apenas se NODE_ENV=development E ALLOW_DEV_BYPASS=true
    if (isDevelopment && allowDevBypass) {
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

    // Sem token = exigir autenticação
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
 * allowAllMiddleware REMOVIDO — brecha de segurança que concedia acesso total como admin.
 * Se algum código ainda referencia essa função, substitua pela lógica de autenticação adequada.
 */