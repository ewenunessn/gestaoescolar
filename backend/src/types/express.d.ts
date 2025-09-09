import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        nome: string;
        email: string;
        tipo: string;
      };
      produtoContrato?: any;
      itemAtual?: any;
    }
  }
}