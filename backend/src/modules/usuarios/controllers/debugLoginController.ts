import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from "../../../database";
import { config } from "../../../config/config";

// Função auxiliar para buscar usuário
async function findUserByEmail(email: string) {
  const result = await db.query(
    'SELECT * FROM usuarios WHERE email = $1',
    [email]
  );
  return result.rows[0];
}

// Login com debug detalhado
export async function debugLogin(req: Request, res: Response) {
  const debugInfo: any = {
    step: '',
    error: null,
    data: {}
  };

  try {
    debugInfo.step = '1. Recebendo dados';
    const { email, senha } = req.body;
    debugInfo.data.email = email;
    debugInfo.data.senhaRecebida = !!senha;

    if (!email || !senha) {
      debugInfo.error = 'Email ou senha não fornecidos';
      return res.status(400).json(debugInfo);
    }

    debugInfo.step = '2. Buscando usuário';
    const user = await findUserByEmail(email);
    debugInfo.data.usuarioEncontrado = !!user;

    if (!user) {
      debugInfo.error = 'Usuário não encontrado';
      return res.status(404).json(debugInfo);
    }

    debugInfo.data.userId = user.id;
    debugInfo.data.userTipo = user.tipo;

    debugInfo.step = '3. Verificando senha';
    const match = await bcrypt.compare(senha, user.senha);
    debugInfo.data.senhaCorreta = match;

    if (!match) {
      debugInfo.error = 'Senha incorreta';
      return res.status(401).json(debugInfo);
    }

    debugInfo.step = '4. Sistema';
    debugInfo.data.sistemaSimplificado = true;

    debugInfo.step = '5. Gerando token';
    debugInfo.data.jwtSecretConfigured = !!process.env.JWT_SECRET;

    const tokenPayload = {
      id: user.id,
      tipo: user.tipo,
      email: user.email,
      nome: user.nome,
      isSystemAdmin: user.tipo === 'admin'
    };

    const token = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
    debugInfo.data.tokenGerado = !!token;
    debugInfo.data.tokenPreview = token.substring(0, 30) + '...';

    debugInfo.step = '6. Sucesso!';
    return res.json({
      success: true,
      debugInfo,
      loginData: {
        token,
        tipo: user.tipo,
        nome: user.nome
      }
    });

  } catch (err: any) {
    debugInfo.error = err.message;
    debugInfo.errorStack = err.stack;
    return res.status(500).json({
      success: false,
      debugInfo
    });
  }
}
