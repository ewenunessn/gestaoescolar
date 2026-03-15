import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import db from "../../../database";
import { asyncHandler, NotFoundError, ConflictError, ValidationError } from "../../../utils/errorHandler";

// ─── Inicialização das tabelas ────────────────────────────────────────────────

export async function ensureAdminTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS funcoes (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(100) NOT NULL UNIQUE,
      descricao TEXT,
      ativo BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS funcao_permissoes (
      id SERIAL PRIMARY KEY,
      funcao_id INTEGER NOT NULL REFERENCES funcoes(id) ON DELETE CASCADE,
      modulo_id INTEGER NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
      nivel_permissao_id INTEGER NOT NULL REFERENCES niveis_permissao(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(funcao_id, modulo_id)
    )
  `);

  await db.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS funcao_id INTEGER REFERENCES funcoes(id) ON DELETE SET NULL`);
}

// ─── Middleware de verificação de admin ──────────────────────────────────────

export function requireAdmin(req: Request, res: Response, next: Function) {
  const user = (req as any).user;
  if (!user || (user.tipo !== 'admin' && !user.isSystemAdmin)) {
    return res.status(403).json({ success: false, message: 'Acesso restrito ao administrador' });
  }
  next();
}

// ─── Usuários ─────────────────────────────────────────────────────────────────

export const listarUsuarios = asyncHandler(async (req: Request, res: Response) => {
  const result = await db.query(`
    SELECT u.id, u.nome, u.email, u.tipo, u.ativo, u.funcao_id,
           f.nome as funcao_nome, u.created_at, u.updated_at
    FROM usuarios u
    LEFT JOIN funcoes f ON u.funcao_id = f.id
    ORDER BY u.nome
  `);
  res.json({ success: true, data: result.rows });
});

export const criarUsuario = asyncHandler(async (req: Request, res: Response) => {
  const { nome, email, senha, tipo = 'usuario', funcao_id, ativo = true } = req.body;

  if (!nome || !email || !senha) {
    throw new ValidationError('nome, email e senha são obrigatórios');
  }

  const existe = await db.query('SELECT id FROM usuarios WHERE email = $1', [email]);
  if (existe.rows.length > 0) throw new ConflictError('E-mail já cadastrado');

  const hash = await bcrypt.hash(senha, 10);
  const result = await db.query(`
    INSERT INTO usuarios (nome, email, senha, tipo, funcao_id, ativo)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, nome, email, tipo, funcao_id, ativo, created_at
  `, [nome, email, hash, tipo, funcao_id || null, ativo]);

  res.status(201).json({ success: true, data: result.rows[0], message: 'Usuário criado com sucesso' });
});

export const atualizarUsuario = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nome, email, senha, tipo, funcao_id, ativo } = req.body;

  const existe = await db.query('SELECT id FROM usuarios WHERE id = $1', [id]);
  if (existe.rows.length === 0) throw new NotFoundError('Usuário', id);

  // Verificar email duplicado em outro usuário
  if (email) {
    const emailCheck = await db.query('SELECT id FROM usuarios WHERE email = $1 AND id != $2', [email, id]);
    if (emailCheck.rows.length > 0) throw new ConflictError('E-mail já em uso por outro usuário');
  }

  const sets: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (nome !== undefined) { sets.push(`nome = $${idx++}`); values.push(nome); }
  if (email !== undefined) { sets.push(`email = $${idx++}`); values.push(email); }
  if (tipo !== undefined) { sets.push(`tipo = $${idx++}`); values.push(tipo); }
  if (funcao_id !== undefined) { sets.push(`funcao_id = $${idx++}`); values.push(funcao_id || null); }
  if (ativo !== undefined) { sets.push(`ativo = $${idx++}`); values.push(ativo); }
  if (senha) { sets.push(`senha = $${idx++}`); values.push(await bcrypt.hash(senha, 10)); }
  sets.push(`updated_at = CURRENT_TIMESTAMP`);

  values.push(id);
  const result = await db.query(`
    UPDATE usuarios SET ${sets.join(', ')} WHERE id = $${idx}
    RETURNING id, nome, email, tipo, funcao_id, ativo, updated_at
  `, values);

  res.json({ success: true, data: result.rows[0], message: 'Usuário atualizado com sucesso' });
});

export const excluirUsuario = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const currentUser = (req as any).user;

  if (String(currentUser?.id) === String(id)) {
    throw new ValidationError('Você não pode excluir sua própria conta');
  }

  const result = await db.query('DELETE FROM usuarios WHERE id = $1 RETURNING id', [id]);
  if (result.rows.length === 0) throw new NotFoundError('Usuário', id);

  res.json({ success: true, message: 'Usuário excluído com sucesso' });
});

// ─── Funções (Roles) ──────────────────────────────────────────────────────────

export const listarFuncoes = asyncHandler(async (req: Request, res: Response) => {
  const funcoes = await db.query(`SELECT * FROM funcoes ORDER BY nome`);

  // Para cada função, buscar suas permissões
  const result = await Promise.all(funcoes.rows.map(async (f: any) => {
    const perms = await db.query(`
      SELECT fp.modulo_id, m.nome as modulo_nome, m.slug as modulo_slug,
             fp.nivel_permissao_id, np.nome as nivel_nome, np.slug as nivel_slug, np.nivel
      FROM funcao_permissoes fp
      JOIN modulos m ON fp.modulo_id = m.id
      JOIN niveis_permissao np ON fp.nivel_permissao_id = np.id
      WHERE fp.funcao_id = $1
      ORDER BY m.ordem
    `, [f.id]);
    return { ...f, permissoes: perms.rows };
  }));

  res.json({ success: true, data: result });
});

export const criarFuncao = asyncHandler(async (req: Request, res: Response) => {
  const { nome, descricao, permissoes = [] } = req.body;

  if (!nome) throw new ValidationError('Nome da função é obrigatório');

  const existe = await db.query('SELECT id FROM funcoes WHERE nome = $1', [nome]);
  if (existe.rows.length > 0) throw new ConflictError('Já existe uma função com esse nome');

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const funcaoResult = await client.query(
      `INSERT INTO funcoes (nome, descricao) VALUES ($1, $2) RETURNING *`,
      [nome, descricao || null]
    );
    const funcao = funcaoResult.rows[0];

    for (const perm of permissoes) {
      if (perm.nivel_permissao_id && perm.modulo_id) {
        await client.query(`
          INSERT INTO funcao_permissoes (funcao_id, modulo_id, nivel_permissao_id)
          VALUES ($1, $2, $3)
          ON CONFLICT (funcao_id, modulo_id) DO UPDATE SET nivel_permissao_id = $3
        `, [funcao.id, perm.modulo_id, perm.nivel_permissao_id]);
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: funcao, message: 'Função criada com sucesso' });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

export const atualizarFuncao = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nome, descricao, ativo, permissoes } = req.body;

  const existe = await db.query('SELECT id FROM funcoes WHERE id = $1', [id]);
  if (existe.rows.length === 0) throw new NotFoundError('Função', id);

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const sets: string[] = [];
    const values: any[] = [];
    let idx = 1;
    if (nome !== undefined) { sets.push(`nome = $${idx++}`); values.push(nome); }
    if (descricao !== undefined) { sets.push(`descricao = $${idx++}`); values.push(descricao); }
    if (ativo !== undefined) { sets.push(`ativo = $${idx++}`); values.push(ativo); }
    sets.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await client.query(
      `UPDATE funcoes SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (permissoes !== undefined) {
      await client.query('DELETE FROM funcao_permissoes WHERE funcao_id = $1', [id]);
      for (const perm of permissoes) {
        if (perm.nivel_permissao_id && perm.modulo_id) {
          await client.query(`
            INSERT INTO funcao_permissoes (funcao_id, modulo_id, nivel_permissao_id)
            VALUES ($1, $2, $3)
          `, [id, perm.modulo_id, perm.nivel_permissao_id]);
        }
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, data: result.rows[0], message: 'Função atualizada com sucesso' });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

export const excluirFuncao = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Verificar se há usuários usando essa função
  const emUso = await db.query('SELECT COUNT(*) as total FROM usuarios WHERE funcao_id = $1', [id]);
  if (parseInt(emUso.rows[0].total) > 0) {
    throw new ValidationError('Não é possível excluir uma função que está em uso por usuários');
  }

  const result = await db.query('DELETE FROM funcoes WHERE id = $1 RETURNING id', [id]);
  if (result.rows.length === 0) throw new NotFoundError('Função', id);

  res.json({ success: true, message: 'Função excluída com sucesso' });
});

// ─── Módulos e Níveis ─────────────────────────────────────────────────────────

export const listarModulos = asyncHandler(async (req: Request, res: Response) => {
  const result = await db.query(`SELECT * FROM modulos WHERE ativo = true ORDER BY ordem`);
  res.json({ success: true, data: result.rows });
});

export const listarNiveis = asyncHandler(async (req: Request, res: Response) => {
  const result = await db.query(`SELECT * FROM niveis_permissao ORDER BY nivel`);
  res.json({ success: true, data: result.rows });
});
