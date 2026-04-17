import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { findUserByEmail, createUser, User, resetUserSequence } from "../models/User";
import { config } from "../../../config/config";
import db from "../../../database";
import {
  asyncHandler,
  ValidationError,
  AuthenticationError,
  ConflictError,
  NotFoundError,
  validateRequired
} from "../../../utils/errorHandler";

// Registro de novo usuário
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { nome, email, senha, perfil, telefone, cargo, departamento } = req.body;
  
  // Validar campos obrigatórios
  validateRequired(req.body, ['nome', 'email', 'senha', 'perfil']);

  // Verificar se e-mail já existe
  const existente = await findUserByEmail(email);
  if (existente) {
    throw new ConflictError('E-mail já cadastrado no sistema');
  }

  // Hash da senha
  const hash = await bcrypt.hash(senha, 10);
  
  // Resetar sequência para evitar conflitos de ID
  await resetUserSequence();
  
  // Verificar se é o primeiro usuário do sistema
  const usersCount = await db.query(`SELECT COUNT(*) as count FROM usuarios`);
  const isFirstUser = parseInt(usersCount.rows[0].count) === 0;
  
  // Se for o primeiro usuário, torná-lo admin do sistema
  const userType = isFirstUser ? 'admin' : perfil;
  
  const novo = await createUser({ 
    nome, 
    email, 
    senha: hash, 
    tipo: userType,
    ativo: true
  });

  if (isFirstUser) {
  }

  res.status(201).json({
    success: true,
    data: {
      id: novo.id,
      nome: novo.nome,
      email: novo.email,
      tipo: novo.tipo
    },
    message: isFirstUser ? 'Primeiro usuário criado com sucesso! Você é o administrador do sistema.' : 'Usuário criado com sucesso!'
  });
});

// Login de usuário
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, senha } = req.body;

  // Validar campos obrigatórios
  validateRequired(req.body, ['email', 'senha']);

  const user = await findUserByEmail(email);

  if (!user) {
    throw new AuthenticationError('Usuário ou senha inválidos');
  }

  const match = await bcrypt.compare(senha, user.senha);

  if (!match) {
    throw new AuthenticationError('Usuário ou senha inválidos');
  }

  // Verificar se é administrador do sistema (tipo 'admin')
  const isSystemAdmin = user.tipo === 'admin';

  const tokenPayload = {
    id: user.id,
    tipo: user.tipo,
    email: user.email,
    nome: user.nome,
    institution_id: user.institution_id,
    escola_id: user.escola_id,
    tipo_secretaria: user.tipo_secretaria || 'educacao',
    isSystemAdmin
  };

  const token = jwt.sign(tokenPayload, config.jwtSecret as string, { expiresIn: config.jwtExpiresIn as any });

  res.json({
    success: true,
    data: {
      token,
      tipo: user.tipo,
      nome: user.nome,
      escola_id: user.escola_id,
      tipo_secretaria: user.tipo_secretaria || 'educacao',
      isSystemAdmin
    }
  });
});

// Listar todos os usuários
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const result = await db.query(`
    SELECT id, nome, email, tipo, ativo, created_at, updated_at
    FROM usuarios 
    ORDER BY nome
  `);
  
  res.json({
    success: true,
    data: result.rows
  });
});

// Obter perfil do usuário logado
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    throw new AuthenticationError('Token inválido');
  }

  const result = await db.query(`
    SELECT id, nome, email, tipo, ativo, institution_id,
           escola_id, tipo_secretaria, funcao_id, created_at, updated_at
    FROM usuarios 
    WHERE id = $1
  `, [userId]);

  if (result.rows.length === 0) {
    throw new NotFoundError('Usuário', userId);
  }

  res.json({
    success: true,
    data: result.rows[0]
  });
});

// Verificar status de inicialização do sistema
export const checkSystemStatus = asyncHandler(async (req: Request, res: Response) => {
  // Verificar se existem usuários
  const usersCount = await db.query(`SELECT COUNT(*) as count FROM usuarios`);
  const hasUsers = parseInt(usersCount.rows[0].count) > 0;

  res.json({
    success: true,
    data: {
      initialized: hasUsers,
      hasUsers,
      needsSetup: !hasUsers
    }
  });
});

// Permissões do usuário atual (qualquer usuário pode ver as próprias)
export const getMePermissoes = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  // Buscar permissões diretas
  const diretas = await db.query(`
    SELECT up.modulo_id, m.nome as modulo_nome, m.slug as modulo_slug,
           up.nivel_permissao_id, np.nome as nivel_nome, np.slug as nivel_slug, np.nivel
    FROM usuario_permissoes up
    JOIN modulos m ON up.modulo_id = m.id
    JOIN niveis_permissao np ON up.nivel_permissao_id = np.id
    WHERE up.usuario_id = $1
    ORDER BY m.ordem
  `, [userId]);

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
    WHERE u.id = $1 AND fp.modulo_id IS NOT NULL
    ORDER BY m.ordem
  `, [userId]);

  res.json({
    success: true,
    data: {
      permissoes_diretas: diretas.rows,
      permissoes_funcao: viaFuncao.rows
    }
  });
});
