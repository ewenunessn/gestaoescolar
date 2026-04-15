import { Request } from 'express';

export interface AuthUser {
  id: number;
  nome: string;
  email: string;
  tipo: string;
  isSystemAdmin?: boolean;
  escola_id?: number;
  tipo_secretaria?: string;
  institution_id?: string;
}

export interface SystemAdmin {
  id: number;
  nome: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      usuario?: AuthUser;
      systemAdmin?: SystemAdmin;
      produtoContrato?: any;
      itemAtual?: any;
    }
  }
}

/** Extrai o usuário autenticado do request (suporta req.user e req.usuario) */
export function getUser(req: Request): AuthUser | undefined {
  return req.user ?? req.usuario;
}

/** Extrai o ID do usuário autenticado do request */
export function getUserId(req: Request): number | undefined {
  return (req.user ?? req.usuario)?.id;
}
