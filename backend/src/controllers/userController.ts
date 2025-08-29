import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { findUserByEmail, createUser, User } from "../models/User";
import { config } from "../config/config";

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
    const token = jwt.sign(
      { id: user.id, tipo: user.tipo },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    console.log("✅ Login realizado com sucesso para:", email);
    res.json({ token, tipo: user.tipo, nome: user.nome });
  } catch (err) {
    console.error("💥 Erro crítico no login:", err);
    res.status(500).json({ message: "Erro ao fazer login." });
  }
}
