import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../../config/config';
import { AuthenticatedRequest } from '../../../middleware/authMiddleware';
import { subscribeToRealtimeEvents } from '../../../services/realtimeEvents';

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

const router = Router();

function authenticateRealtime(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const queryToken = typeof req.query.token === 'string' ? req.query.token : null;
  const token = headerToken || queryToken;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Token de autenticacao nao fornecido',
    });
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
      institution_id: decoded.institution_id,
    };
    next();
  } catch {
    return res.status(401).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Token invalido',
    });
  }
}

router.get('/events', authenticateRealtime, (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  if (!user) {
    return res.status(401).json({ success: false, message: 'Usuario nao autenticado' });
  }

  const unsubscribe = subscribeToRealtimeEvents(
    {
      id: Number(user.id),
      tipo: user.tipo,
      escola_id: user.escola_id,
      isSystemAdmin: user.isSystemAdmin,
    },
    res,
  );

  req.on('close', unsubscribe);
});

export default router;
