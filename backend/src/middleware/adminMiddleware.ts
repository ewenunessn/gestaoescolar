import type { NextFunction, Request, Response } from "express";

import type { AuthenticatedRequest } from "./authMiddleware";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as AuthenticatedRequest).user;
  if (!user || (user.tipo !== "admin" && !user.isSystemAdmin)) {
    return res.status(403).json({ success: false, message: "Acesso restrito ao administrador" });
  }
  next();
}
