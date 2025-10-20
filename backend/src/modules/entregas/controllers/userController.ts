import { Request, Response } from 'express';
const db = require('../../../database');

class UserController {
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
      }

      // Por enquanto, vamos simular um login simples
      // Em produção, você deve verificar a senha com hash
      const query = `
        SELECT id, nome, email, tipo 
        FROM usuarios 
        WHERE email = $1 AND ativo = true
      `;
      
      const result = await db.query(query, [email]);
      
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const user = result.rows[0];
      
      // Remover senha da resposta
      delete user.password;

      res.json({
        message: 'Login realizado com sucesso',
        user
      });
    } catch (error) {
      console.error('Erro no login:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async buscarUsuario(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      if (!userId || isNaN(Number(userId))) {
        return res.status(400).json({ error: 'ID do usuário é obrigatório e deve ser um número' });
      }

      const query = `
        SELECT id, nome, email, tipo, created_at, updated_at
        FROM usuarios 
        WHERE id = $1 AND ativo = true
      `;
      
      const result = await db.query(query, [Number(userId)]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const user = result.rows[0];

      res.json(user);
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async listarUsuarios(req: Request, res: Response) {
    try {
      const { tipo } = req.query;

      let query = `
        SELECT id, nome, email, tipo, created_at, updated_at
        FROM usuarios 
        WHERE ativo = true
      `;
      
      const params: any[] = [];
      
      if (tipo) {
        query += ` AND tipo = $1`;
        params.push(tipo);
      }
      
      query += ` ORDER BY nome`;
      
      const result = await db.query(query, params);

      res.json(result.rows);
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
}

export default new UserController();