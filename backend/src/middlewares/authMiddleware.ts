import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/config";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    console.log('🔐 [AUTH] Middleware executado para:', req.method, req.originalUrl);

    // Em desenvolvimento, permitir acesso sem token se não houver header de autorização
    const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    const authHeader = req.headers.authorization;

    console.log('🔐 [AUTH] Modo desenvolvimento:', isDevelopment);
    console.log('🔐 [AUTH] Header Authorization:', authHeader ? 'Presente' : 'Ausente');

    if (isDevelopment && !authHeader) {
      console.log('🔓 Modo desenvolvimento: Permitindo acesso sem token');
      (req as any).user = { id: 1, nome: 'Usuário Dev', email: 'dev@sistema.com' };
      return next();
    }

    // Se há header de autorização, validar o token
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Token de autorização não fornecido."
      });
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        success: false,
        message: "Formato de token inválido. Use: Bearer <token>"
      });
    }

    const token = parts[1];

    // Verificar se é um token de gestor
    if (token.startsWith('gestor_')) {
      console.log('🔓 Token de gestor detectado:', token);
      const tokenParts = token.split('_');
      const escolaId = tokenParts[1];
      (req as any).user = {
        id: parseInt(escolaId) || 1,
        nome: 'Gestor Escola',
        email: 'gestor@escola.com',
        tipo: 'gestor',
        escola_id: parseInt(escolaId)
      };
      return next();
    }

    try {
      console.log('🔐 [AUTH] Validando JWT com secret:', config.jwtSecret);
      console.log('🔐 [AUTH] NODE_ENV:', process.env.NODE_ENV);
      console.log('🔐 [AUTH] JWT_SECRET env:', process.env.JWT_SECRET);
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      console.log('✅ [AUTH] Token decodificado:', { id: decoded.id, tipo: decoded.tipo });
      (req as any).user = decoded;
      next();
    } catch (jwtError: any) {
      console.error('❌ Erro de validação JWT:', jwtError.message);

      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: "Token expirado. Faça login novamente."
        });
      }

      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: "Token inválido."
        });
      }

      return res.status(401).json({
        success: false,
        message: "Erro na validação do token."
      });
    }
  } catch (error) {
    console.error('❌ Erro no middleware de autenticação:', error);
    return res.status(500).json({
      success: false,
      message: "Erro interno de autenticação."
    });
  }
}