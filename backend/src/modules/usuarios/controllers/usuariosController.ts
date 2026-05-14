import { Request, Response } from "express";

import db from "../../../database";
import { asyncHandler } from "../../../utils/errorHandler";

export const getUsers = asyncHandler(async (_req: Request, res: Response) => {
  const result = await db.query(`
    SELECT id, nome, email, tipo, ativo, created_at, updated_at
    FROM usuarios
    ORDER BY nome
  `);

  res.json({
    success: true,
    data: result.rows,
  });
});
