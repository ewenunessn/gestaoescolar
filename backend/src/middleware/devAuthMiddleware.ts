import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/config";

/**
 * Middleware de autenticação JWT
 * Valida token JWT — se fornecido, deve ser válido.
 * Sem token = 401 (exceção: rotas públicas como /auth/login).
 */
export function devAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Token de autorização necessário"
      });
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      (req as any).user = decoded;
      return next();
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: "Token inválido ou expirado"
      });
    }
  } catch (error) {
    console.error('❌ Erro no middleware de autenticação:', error);
    return res.status(500).json({
      success: false,
      message: "Erro interno de autenticação"
    });
  }
}
