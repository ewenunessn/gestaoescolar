import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import db from "../../../database";
import { asyncHandler, NotFoundError, ConflictError, ValidationError } from "../../../utils/errorHandler";
import { limparCachePermissoes } from "../../../middleware/permissionMiddleware";

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
  const user = req.user;
  if (!user || (user.tipo !== 'admin' && !user.isSystemAdmin)) {
    return res.status(403).json({ success: false, message: 'Acesso restrito ao administrador' });
  }
  next();
}

// ─── Usuários ─────────────────────────────────────────────────────────────────

export const listarUsuarios = asyncHandler(async (req: Request, res: Response) => {
  const result = await db.query(`
    SELECT u.id, u.nome, u.email, u.tipo, u.ativo, u.funcao_id,
           f.nome as funcao_nome, u.escola_id, e.nome as escola_nome,
           u.tipo_secretaria, u.created_at, u.updated_at
    FROM usuarios u
    LEFT JOIN funcoes f ON u.funcao_id = f.id
    LEFT JOIN escolas e ON u.escola_id = e.id
    ORDER BY u.nome
  `);
  res.json({ success: true, data: result.rows });
});

export const criarUsuario = asyncHandler(async (req: Request, res: Response) => {
  const { nome, email, senha, tipo = 'usuario', funcao_id, ativo = true, escola_id, tipo_secretaria = 'educacao' } = req.body;

  if (!nome || !email || !senha) {
    throw new ValidationError('nome, email e senha são obrigatórios');
  }

  // Validar tipo_secretaria
  if (tipo_secretaria && !['educacao', 'escola'].includes(tipo_secretaria)) {
    throw new ValidationError('tipo_secretaria deve ser "educacao" ou "escola"');
  }

  // Se tipo_secretaria é 'escola', escola_id é obrigatório
  if (tipo_secretaria === 'escola' && !escola_id) {
    throw new ValidationError('escola_id é obrigatório para usuários de secretaria de escola');
  }

  const existe = await db.query('SELECT id FROM usuarios WHERE email = $1', [email]);
  if (existe.rows.length > 0) throw new ConflictError('E-mail já cadastrado');

  const hash = await bcrypt.hash(senha, 10);
  const result = await db.query(`
    INSERT INTO usuarios (nome, email, senha, tipo, funcao_id, ativo, escola_id, tipo_secretaria)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, nome, email, tipo, funcao_id, ativo, escola_id, tipo_secretaria, created_at
  `, [nome, email, hash, tipo, funcao_id || null, ativo, escola_id || null, tipo_secretaria]);

  res.status(201).json({ success: true, data: result.rows[0], message: 'Usuário criado com sucesso' });
});

export const atualizarUsuario = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nome, email, senha, tipo, funcao_id, ativo, escola_id, tipo_secretaria } = req.body;

  const existe = await db.query('SELECT id FROM usuarios WHERE id = $1', [id]);
  if (existe.rows.length === 0) throw new NotFoundError('Usuário', id);

  // Verificar email duplicado em outro usuário
  if (email) {
    const emailCheck = await db.query('SELECT id FROM usuarios WHERE email = $1 AND id != $2', [email, id]);
    if (emailCheck.rows.length > 0) throw new ConflictError('E-mail já em uso por outro usuário');
  }

  // Validar tipo_secretaria
  if (tipo_secretaria && !['educacao', 'escola'].includes(tipo_secretaria)) {
    throw new ValidationError('tipo_secretaria deve ser "educacao" ou "escola"');
  }

  // Se tipo_secretaria é 'escola', escola_id é obrigatório
  if (tipo_secretaria === 'escola' && !escola_id) {
    throw new ValidationError('escola_id é obrigatório para usuários de secretaria de escola');
  }

  const sets: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (nome !== undefined) { sets.push(`nome = $${idx++}`); values.push(nome); }
  if (email !== undefined) { sets.push(`email = $${idx++}`); values.push(email); }
  if (tipo !== undefined) { sets.push(`tipo = $${idx++}`); values.push(tipo); }
  if (funcao_id !== undefined) { sets.push(`funcao_id = $${idx++}`); values.push(funcao_id || null); }
  if (ativo !== undefined) { sets.push(`ativo = $${idx++}`); values.push(ativo); }
  if (escola_id !== undefined) { sets.push(`escola_id = $${idx++}`); values.push(escola_id || null); }
  if (tipo_secretaria !== undefined) { sets.push(`tipo_secretaria = $${idx++}`); values.push(tipo_secretaria); }
  if (senha) { sets.push(`senha = $${idx++}`); values.push(await bcrypt.hash(senha, 10)); }
  sets.push(`updated_at = CURRENT_TIMESTAMP`);

  values.push(id);
  const result = await db.query(`
    UPDATE usuarios SET ${sets.join(', ')} WHERE id = $${idx}
    RETURNING id, nome, email, tipo, funcao_id, ativo, escola_id, tipo_secretaria, updated_at
  `, values);

  // Se funcao_id ou tipo mudou, limpar cache de permissões
  if (funcao_id !== undefined || tipo !== undefined) {
    limparCachePermissoes(parseInt(id));
  }

  res.json({ success: true, data: result.rows[0], message: 'Usuário atualizado com sucesso' });
});

export const excluirUsuario = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const currentUser = req.user;

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

      // Limpar cache de todos os usuários que usam essa função
      const usuariosResult = await client.query('SELECT id FROM usuarios WHERE funcao_id = $1', [id]);
      for (const row of usuariosResult.rows) {
        limparCachePermissoes(parseInt(row.id));
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

// ─── Permissões Diretas do Usuário ───────────────────────────────────────────

export const getPermissoesUsuario = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Buscar permissões diretas
  const diretas = await db.query(`
    SELECT up.modulo_id, m.nome as modulo_nome, m.slug as modulo_slug,
           up.nivel_permissao_id, np.nome as nivel_nome, np.slug as nivel_slug, np.nivel
    FROM usuario_permissoes up
    JOIN modulos m ON up.modulo_id = m.id
    JOIN niveis_permissao np ON up.nivel_permissao_id = np.id
    WHERE up.usuario_id = $1
    ORDER BY m.ordem
  `, [id]);

  // Buscar permissões via função
  const viaFuncao = await db.query(`
    SELECT fp.modulo_id, m.nome as modulo_nome, m.slug as modulo_slug,
           fp.nivel_permissao_id, np.nome as nivel_nome, np.slug as nivel_slug, np.nivel,
           f.nome as funcao_nome
    FROM usuarios u
    LEFT JOIN funcoes f ON u.funcao_id = f.id
    LEFT JOIN funcao_permissoes fp ON f.id = fp.funcao_id
    LEFT JOIN modulos m ON fp.modulo_id = m.id
    LEFT JOIN niveis_permissao np ON fp.nivel_permissao_id = np.id
    WHERE u.id = $1
    ORDER BY m.ordem
  `, [id]);

  res.json({
    success: true,
    data: {
      permissoes_diretas: diretas.rows,
      permissoes_funcao: viaFuncao.rows.filter((r: any) => r.modulo_id !== null)
    }
  });
});

export const setPermissoesUsuario = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { permissoes } = req.body; // Array de { modulo_id, nivel_permissao_id }

  const existe = await db.query('SELECT id FROM usuarios WHERE id = $1', [id]);
  if (existe.rows.length === 0) throw new NotFoundError('Usuário', id);

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Deletar permissões diretas existentes
    await client.query('DELETE FROM usuario_permissoes WHERE usuario_id = $1', [id]);

    // Inserir novas permissões
    for (const perm of (permissoes || [])) {
      if (perm.nivel_permissao_id && perm.modulo_id) {
        await client.query(`
          INSERT INTO usuario_permissoes (usuario_id, modulo_id, nivel_permissao_id)
          VALUES ($1, $2, $3)
          ON CONFLICT (usuario_id, modulo_id) DO UPDATE SET nivel_permissao_id = $3
        `, [id, perm.modulo_id, perm.nivel_permissao_id]);
      }
    }

    await client.query('COMMIT');

    // Limpar cache de permissões do usuário
    limparCachePermissoes(parseInt(id));

    res.json({ success: true, message: 'Permissões atualizadas com sucesso' });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

// ─── Verificação de Conflitos ────────────────────────────────────────────────

export const verificarConflitos = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Dados do usuário
  const userResult = await db.query(`
    SELECT u.id, u.nome, u.email, u.tipo, u.escola_id, u.funcao_id,
           e.nome as escola_nome, f.nome as funcao_nome
    FROM usuarios u
    LEFT JOIN escolas e ON u.escola_id = e.id
    LEFT JOIN funcoes f ON u.funcao_id = f.id
    WHERE u.id = $1
  `, [id]);

  if (userResult.rows.length === 0) throw new NotFoundError('Usuário', id);

  const usuario = userResult.rows[0];
  const conflitos: any[] = [];

  // Buscar todas as permissões (diretas + via função)
  const permsResult = await db.query(`
    SELECT modulo_id, m.slug as modulo_slug, m.nome as modulo_nome,
           np.nivel, np.nome as nivel_nome, 'direta' as origem
    FROM usuario_permissoes up
    JOIN modulos m ON up.modulo_id = m.id
    JOIN niveis_permissao np ON up.nivel_permissao_id = np.id
    WHERE up.usuario_id = $1

    UNION ALL

    SELECT fp.modulo_id, m.slug as modulo_slug, m.nome as modulo_nome,
           np.nivel, np.nome as nivel_nome, 'funcao' as origem
    FROM usuarios u
    LEFT JOIN funcoes f ON u.funcao_id = f.id
    LEFT JOIN funcao_permissoes fp ON f.id = fp.funcao_id
    LEFT JOIN modulos m ON fp.modulo_id = m.id
    LEFT JOIN niveis_permissao np ON fp.nivel_permissao_id = np.id
    WHERE u.id = $1 AND fp.modulo_id IS NOT NULL
  `, [id]);

  // Criar mapa de permissões (direta tem prioridade sobre função)
  const permMap = new Map<string, { nivel: number; origem: string }>();
  for (const perm of permsResult.rows) {
    const slug = perm.modulo_slug;
    if (!permMap.has(slug) || perm.origem === 'direta') {
      permMap.set(slug, { nivel: perm.nivel, origem: perm.origem });
    }
  }

  // Regra 1: Usuário vinculado a escola precisa de leitura em 'escolas'
  if (usuario.escola_id) {
    const escolasPerm = permMap.get('escolas');
    if (!escolasPerm || escolasPerm.nivel < 1) {
      conflitos.push({
        tipo: 'MISSING_PERMISSION',
        severidade: 'error',
        modulo: 'escolas',
        modulo_nome: 'Escolas',
        mensagem: `Usuário vinculado à escola "${usuario.escola_nome}" mas não tem permissão de leitura em Escolas`,
        sugestedao: 'Adicionar permissão "Leitura" no módulo Escolas'
      });
    }
  }

  // Regra 2: Nutricionista precisa de leitura em 'preparacoes' e 'cardapios'
  const usuarioPerfil = usuario.funcao_nome?.toLowerCase() || '';
  if (usuarioPerfil.includes('nutricionista') || usuario.tipo === 'nutricionista') {
    for (const [modulo, nome] of [['preparacoes', 'Preparações'], ['cardapios', 'Cardápios'], ['produtos', 'Produtos']]) {
      const perm = permMap.get(modulo);
      if (!perm || perm.nivel < 1) {
        conflitos.push({
          tipo: 'MISSING_PERMISSION',
          severidade: 'warning',
          modulo,
          modulo_nome: nome,
          mensagem: `Perfil "Nutricionista" requer acesso a ${nome}`,
          sugestedao: `Adicionar permissão "Leitura" no módulo ${nome}`
        });
      }
    }
  }

  // Regra 3: Almoxarife precisa de leitura em 'estoque' e 'produtos'
  if (usuarioPerfil.includes('almoxarife')) {
    for (const [modulo, nome] of [['estoque', 'Estoque'], ['produtos', 'Produtos']]) {
      const perm = permMap.get(modulo);
      if (!perm || perm.nivel < 1) {
        conflitos.push({
          tipo: 'MISSING_PERMISSION',
          severidade: 'warning',
          modulo,
          modulo_nome: nome,
          mensagem: `Perfil "Almoxarife" requer acesso a ${nome}`,
          sugestedao: `Adicionar permissão "Leitura" no módulo ${nome}`
        });
      }
    }
  }

  // Regra 4: Se tem permissão de escrita em 'pedidos', precisa de leitura em 'fornecedores' e 'contratos'
  const pedidosPerm = permMap.get('pedidos');
  if (pedidosPerm && pedidosPerm.nivel >= 2) {
    for (const [modulo, nome] of [['fornecedores', 'Fornecedores'], ['contratos', 'Contratos']]) {
      const perm = permMap.get(modulo);
      if (!perm || perm.nivel < 1) {
        conflitos.push({
          tipo: 'DEPENDENCY_PERMISSION',
          severidade: 'warning',
          modulo,
          modulo_nome: nome,
          mensagem: `Permissão de escrita em Pedidos requer leitura em ${nome}`,
          sugestedao: `Adicionar permissão "Leitura" no módulo ${nome}`
        });
      }
    }
  }

  // Regra 5: Se tem permissão de escrita em 'faturamento', precisa de leitura em 'pedidos'
  const faturamentoPerm = permMap.get('faturamento');
  if (faturamentoPerm && faturamentoPerm.nivel >= 2) {
    const pedidosP = permMap.get('pedidos');
    if (!pedidosP || pedidosP.nivel < 1) {
      conflitos.push({
        tipo: 'DEPENDENCY_PERMISSION',
        severidade: 'warning',
        modulo: 'pedidos',
        modulo_nome: 'Pedidos',
        mensagem: 'Permissão de escrita em Faturamento requer leitura em Pedidos',
        sugestedao: 'Adicionar permissão "Leitura" no módulo Pedidos'
      });
    }
  }

  // Regra 6: Se tem permissão em 'demandas', precisa de leitura em 'escolas'
  const demandasPerm = permMap.get('demandas');
  if (demandasPerm && demandasPerm.nivel >= 1) {
    const escolasP = permMap.get('escolas');
    if (!escolasP || escolasP.nivel < 1) {
      conflitos.push({
        tipo: 'DEPENDENCY_PERMISSION',
        severidade: 'warning',
        modulo: 'escolas',
        modulo_nome: 'Escolas',
        mensagem: 'Acesso a Demandas requer leitura em Escolas',
        sugestedao: 'Adicionar permissão "Leitura" no módulo Escolas'
      });
    }
  }

  // Regra 7: Se tem permissão em 'cardapios', precisa de leitura em 'produtos'
  const cardapiosPerm = permMap.get('cardapios');
  if (cardapiosPerm && cardapiosPerm.nivel >= 1) {
    const produtosP = permMap.get('produtos');
    if (!produtosP || produtosP.nivel < 1) {
      conflitos.push({
        tipo: 'DEPENDENCY_PERMISSION',
        severidade: 'warning',
        modulo: 'produtos',
        modulo_nome: 'Produtos',
        mensagem: 'Acesso a Cardápios requer leitura em Produtos',
        sugestedao: 'Adicionar permissão "Leitura" no módulo Produtos'
      });
    }
  }

  // Regra 8: Admin não pode ter permissão 'nenhum' em módulos críticos
  if (usuario.tipo === 'admin') {
    const modulosCriticos = ['dashboard', 'escolas', 'produtos'];
    for (const modulo of modulosCriticos) {
      const perm = permMap.get(modulo);
      if (perm && perm.nivel === 0) {
        conflitos.push({
          tipo: 'ADMIN_RESTRICTION',
          severidade: 'info',
          modulo,
          modulo_nome: modulo,
          mensagem: `Administrador com acesso negado a ${modulo} — permissão será ignorada`,
          sugestedao: 'Administradores têm acesso total por padrão'
        });
      }
    }
  }

  res.json({
    success: true,
    data: {
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo,
        escola_id: usuario.escola_id,
        escola_nome: usuario.escola_nome,
        funcao_id: usuario.funcao_id,
        funcao_nome: usuario.funcao_nome
      },
      permissoes_efetivas: Array.from(permMap.entries()).map(([slug, data]) => ({
        modulo_slug: slug,
        nivel: data.nivel,
        origem: data.origem
      })),
      conflitos,
      total_conflitos: conflitos.length,
      erros: conflitos.filter(c => c.severidade === 'error').length,
      avisos: conflitos.filter(c => c.severidade === 'warning').length
    }
  });
});
