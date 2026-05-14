import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { config } from "../../../config/config";
import db from "../../../database";
import {
  asyncHandler,
  AuthenticationError,
  ConflictError,
  validateRequired,
} from "../../../utils/errorHandler";
import { createUser, findUserByEmail, resetUserSequence } from "../models/User";
import { tokenBlacklistService } from "../services/tokenBlacklistService";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { nome, email, senha, perfil } = req.body;

  validateRequired(req.body, ["nome", "email", "senha", "perfil"]);

  const existente = await findUserByEmail(email);
  if (existente) {
    throw new ConflictError("E-mail ja cadastrado no sistema");
  }

  const hash = await bcrypt.hash(senha, 10);

  await resetUserSequence();

  const usersCount = await db.query(`SELECT COUNT(*) as count FROM usuarios`);
  const isFirstUser = parseInt(usersCount.rows[0].count) === 0;
  const userType = isFirstUser ? "admin" : perfil;

  const novo = await createUser({
    nome,
    email,
    senha: hash,
    tipo: userType,
    ativo: true,
  });

  res.status(201).json({
    success: true,
    data: {
      id: novo.id,
      nome: novo.nome,
      email: novo.email,
      tipo: novo.tipo,
    },
    message: isFirstUser
      ? "Primeiro usuario criado com sucesso! Voce e o administrador do sistema."
      : "Usuario criado com sucesso!",
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, senha } = req.body;

  validateRequired(req.body, ["email", "senha"]);

  const user = await findUserByEmail(email);

  if (!user) {
    throw new AuthenticationError("Usuario ou senha invalidos");
  }

  const match = await bcrypt.compare(senha, user.senha);

  if (!match) {
    throw new AuthenticationError("Usuario ou senha invalidos");
  }

  const isSystemAdmin = user.tipo === "admin";

  const tokenPayload = {
    id: user.id,
    tipo: user.tipo,
    email: user.email,
    nome: user.nome,
    institution_id: user.institution_id,
    escola_id: user.escola_id,
    tipo_secretaria: user.tipo_secretaria || "educacao",
    isSystemAdmin,
  };

  const token = jwt.sign(tokenPayload, config.jwtSecret as string, { expiresIn: config.jwtExpiresIn as any });

  res.json({
    success: true,
    data: {
      token,
      tipo: user.tipo,
      nome: user.nome,
      escola_id: user.escola_id,
      tipo_secretaria: user.tipo_secretaria || "educacao",
      isSystemAdmin,
    },
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;

  if (token) {
    await tokenBlacklistService.blacklist(token);
  }

  res.json({
    success: true,
    message: "Logout realizado com sucesso",
  });
});

export const checkSystemStatus = asyncHandler(async (_req: Request, res: Response) => {
  const usersCount = await db.query(`SELECT COUNT(*) as count FROM usuarios`);
  const hasUsers = parseInt(usersCount.rows[0].count) > 0;

  res.json({
    success: true,
    data: {
      initialized: hasUsers,
      hasUsers,
      needsSetup: !hasUsers,
    },
  });
});
