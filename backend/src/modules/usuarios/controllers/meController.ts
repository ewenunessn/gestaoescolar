import { Request, Response } from "express";

import db from "../../../database";
import {
  asyncHandler,
  AuthenticationError,
  NotFoundError,
} from "../../../utils/errorHandler";

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new AuthenticationError("Token invalido");
  }

  const result = await db.query(`
    SELECT id, nome, email, tipo, ativo, institution_id,
           escola_id, tipo_secretaria, funcao_id, created_at, updated_at
    FROM usuarios
    WHERE id = $1
  `, [userId]);

  if (result.rows.length === 0) {
    throw new NotFoundError("Usuario", userId);
  }

  res.json({
    success: true,
    data: result.rows[0],
  });
});

export const getMePermissoes = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const diretas = await db.query(`
    SELECT up.modulo_id, m.nome as modulo_nome, m.slug as modulo_slug,
           up.nivel_permissao_id, np.nome as nivel_nome, np.slug as nivel_slug, np.nivel
    FROM usuario_permissoes up
    JOIN modulos m ON up.modulo_id = m.id
    JOIN niveis_permissao np ON up.nivel_permissao_id = np.id
    WHERE up.usuario_id = $1
    ORDER BY m.ordem
  `, [userId]);

  const viaFuncao = await db.query(`
    SELECT fp.modulo_id, m.nome as modulo_nome, m.slug as modulo_slug,
           fp.nivel_permissao_id, np.nome as nivel_nome, np.slug as nivel_slug, np.nivel,
           f.nome as funcao_nome
    FROM usuarios u
    LEFT JOIN funcoes f ON u.funcao_id = f.id
    LEFT JOIN funcao_permissoes fp ON f.id = fp.funcao_id
    LEFT JOIN modulos m ON fp.modulo_id = m.id
    LEFT JOIN niveis_permissao np ON fp.nivel_permissao_id = np.id
    WHERE u.id = $1 AND fp.modulo_id IS NOT NULL
    ORDER BY m.ordem
  `, [userId]);

  res.json({
    success: true,
    data: {
      permissoes_diretas: diretas.rows,
      permissoes_funcao: viaFuncao.rows,
    },
  });
});
