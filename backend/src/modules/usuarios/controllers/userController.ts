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

  console.log(`✅ Usuário criado: ${novo.nome} (${novo.email}) - Tipo: ${userType}`);
  if (isFirstUser) {
    console.log('🎉 Primeiro usuário do sistema criado com privilégios de administrador!');
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
  console.log("🔐 Tentativa de login:", { email: req.body.email });

  const { email, senha } = req.body;

  // Validar campos obrigatórios
  validateRequired(req.body, ['email', 'senha']);

  console.log("🔍 Buscando usuário no banco...");
  const user = await findUserByEmail(email);

  if (!user) {
    console.log("❌ Usuário não encontrado:", email);
    throw new AuthenticationError('Usuário ou senha inválidos');
  }

  console.log("✅ Usuário encontrado, verificando senha...");
  const match = await bcrypt.compare(senha, user.senha);

  if (!match) {
    console.log("❌ Senha incorreta para:", email);
    throw new AuthenticationError('Usuário ou senha inválidos');
  }

  console.log("✅ Senha correta, gerando token...");
  console.log("🔐 [LOGIN] NODE_ENV:", process.env.NODE_ENV);
  console.log("🔐 [LOGIN] JWT_SECRET configurado:", config.jwtSecret ? 'Sim' : 'Não');
  
  // Verificar se é administrador do sistema (tipo 'admin')
  const isSystemAdmin = user.tipo === 'admin';

  const tokenPayload = {
    id: user.id,
    tipo: user.tipo,
    email: user.email,
    nome: user.nome,
    institution_id: user.institution_id,
    isSystemAdmin
  };

  const token = jwt.sign(tokenPayload, config.jwtSecret as string, { expiresIn: config.jwtExpiresIn as any });
  
  if (!token) {
    throw new Error("Falha ao gerar token");
  }

  console.log("🔐 [LOGIN] Token gerado:", token.substring(0, 20) + '...');
  console.log("✅ Login realizado com sucesso para:", email);
  
  res.json({ 
    success: true,
    data: {
      token, 
      tipo: user.tipo, 
      nome: user.nome,
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
  const userId = (req as any).user?.id;
  
  if (!userId) {
    throw new AuthenticationError('Token inválido');
  }

  const result = await db.query(`
    SELECT id, nome, email, tipo, ativo, institution_id, created_at, updated_at
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
