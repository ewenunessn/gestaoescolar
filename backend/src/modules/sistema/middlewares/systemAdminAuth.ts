import { Request, Response, NextFunction } from 'express';

export const authenticateSystemAdmin = (req: Request, res: Response, next: NextFunction) => {
  // Stub - implementar autenticação de admin do sistema
  next();
};
