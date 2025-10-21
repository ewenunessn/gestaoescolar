import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { findUserByEmail, createUser, User, resetUserSequence } from "../models/User";
import { config } from "../../../config/config";
const db = require("../../../database");

// Registro de novo usuário
export async function register(req: Request, res: Response) {
  try {
    const { nome, email, senha, perfil, telefone, cargo, departamento } = req.body;
    
    // Validar campos obrigatórios
    if (!nome || !email || !senha || !perfil) {
      return res
        .status(400)
        .json({ message: "Dados obrigatórios não informados." });
    }

    // Verificar se e-mail já existe
    const existente = await findUserByEmail(email);
    if (existente) {
      return res.status(409).json({ message: "E-mail já cadastrado." });
    }

    // Hash da senha
    const hash = await bcrypt.hash(senha, 10);
    
    // Resetar sequência para evitar conflitos de ID
    await resetUserSequence();
    
    // Criar usuário com campos básicos (usando 'tipo' em vez de 'perfil')
    const novo = await createUser({ 
      nome, 
      email, 
      senha: hash, 
      tipo: perfil,  // Mapear perfil para tipo
      ativo: true    // Campo obrigatório
    });

    res.status(201).json({
      id: novo.id,
      nome: novo.nome,
      email: novo.email,
      tipo: novo.tipo
    });
  } catch (err) {
    console.error('Erro no registro:', err);
    res.status(500).json({ message: "Erro ao registrar usuário." });
  }
}

// Login de usuário
export async function login(req: Request, res: Response) {
  try {
    console.log("🔐 Tentativa de login:", { email: req.body.email });

    const { email, senha } = req.body;

    if (!email || !senha) {
      console.log("❌ Email ou senha não fornecidos");
      return res.status(400).json({ message: "Email e senha são obrigatórios." });
    }

    console.log("🔍 Buscando usuário no banco...");
    const user = await findUserByEmail(email);

    if (!user) {
      console.log("❌ Usuário não encontrado:", email);
      return res.status(401).json({ message: "Usuário ou senha inválidos." });
    }

    console.log("✅ Usuário encontrado, verificando senha...");
    const match = await bcrypt.compare(senha, user.senha);

    if (!match) {
      console.log("❌ Senha incorreta para:", email);
      return res.status(401).json({ message: "Usuário ou senha inválidos." });
    }

    console.log("✅ Senha correta, gerando token...");
    const jwtSecret = process.env.JWT_SECRET || 'sua_chave_jwt_super_secreta_minimo_32_caracteres_producao_2024';
    console.log("🔐 [LOGIN] NODE_ENV:", process.env.NODE_ENV);
    console.log("🔐 [LOGIN] JWT_SECRET configurado:", jwtSecret ? 'Sim' : 'Não');
    const token = jwt.sign(
      { id: user.id, tipo: user.tipo, email: user.email, nome: user.nome },
      jwtSecret,
      { expiresIn: '24h' }
    );
    console.log("🔐 [LOGIN] Token gerado:", token.substring(0, 20) + '...');

    console.log("✅ Login realizado com sucesso para:", email);
    res.json({ token, tipo: user.tipo, nome: user.nome });
  } catch (err) {
    console.error("💥 Erro crítico no login:", err);
    res.status(500).json({ message: "Erro ao fazer login." });
  }
}

// Listar todos os usuários
export const getUsers = async (req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT id, nome, email, tipo, ativo, created_at, updated_at
      FROM usuarios 
      ORDER BY nome
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar usuários',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

// Obter perfil do usuário logado
export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }

    const result = await db.query(`
      SELECT id, nome, email, tipo, ativo, created_at, updated_at
      FROM usuarios 
      WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao obter perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter perfil do usuário',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};
