import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface SystemAdminRequest extends Request {
  systemAdmin?: {
    id: number;
    email: string;
    role: string;
    permissions: any;
  };
}

export function authenticateSystemAdmin(
  req: SystemAdminRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Token de autorização não fornecido'
      });
    }

    const token = authHeader.replace('Bearer ', '');

    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Verificar se é um token de system admin
    if (decoded.type !== 'system_admin') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Token inválido para admin.'
      });
    }

    req.systemAdmin = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido ou expirado'
    });
  }
}

export function requirePermission(entity: string, action: string) {
  return (req: SystemAdminRequest, res: Response, next: NextFunction) => {
    const admin = req.systemAdmin;

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Não autenticado'
      });
    }

    // Super admin tem todas as permissões
    if (admin.role === 'super_admin') {
      return next();
    }

    // Verificar permissão específica
    const hasPermission = admin.permissions?.[entity]?.[action];

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Sem permissão para ${action} ${entity}`
      });
    }

    next();
  };
}
