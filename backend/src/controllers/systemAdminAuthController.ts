import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export class SystemAdminAuthController {
  // Login
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email e senha são obrigatórios'
        });
      }

      // Buscar admin
      const result = await db.query(
        'SELECT * FROM system_admins WHERE email = $1 AND status = $2',
        [email, 'active']
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Credenciais inválidas'
        });
      }

      const admin = result.rows[0];

      // Verificar senha
      const isValidPassword = await bcrypt.compare(password, admin.password);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Credenciais inválidas'
        });
      }

      // Atualizar último login
      await db.query(
        'UPDATE system_admins SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [admin.id]
      );

      // Gerar token
      const token = jwt.sign(
        {
          id: admin.id,
          email: admin.email,
          role: admin.role,
          permissions: admin.permissions,
          type: 'system_admin'
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Log de auditoria
      await db.query(`
        INSERT INTO system_admin_audit_log (admin_id, action, details, ip_address)
        VALUES ($1, $2, $3, $4)
      `, [
        admin.id,
        'LOGIN',
        JSON.stringify({ email: admin.email }),
        req.ip
      ]);

      res.json({
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          token,
          admin: {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            permissions: admin.permissions
          }
        }
      });
    } catch (error) {
      console.error('Erro no login:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao fazer login',
        error: error.message
      });
    }
  }

  // Get current admin
  async me(req: Request, res: Response) {
    try {
      const adminId = (req as any).systemAdmin?.id;

      if (!adminId) {
        return res.status(401).json({
          success: false,
          message: 'Não autenticado'
        });
      }

      const result = await db.query(
        'SELECT id, name, email, role, permissions, last_login, created_at FROM system_admins WHERE id = $1',
        [adminId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Administrador não encontrado'
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Erro ao buscar admin:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar dados do administrador',
        error: error.message
      });
    }
  }

  // Logout
  async logout(req: Request, res: Response) {
    try {
      const adminId = (req as any).systemAdmin?.id;

      if (adminId) {
        // Log de auditoria
        await db.query(`
          INSERT INTO system_admin_audit_log (admin_id, action, ip_address)
          VALUES ($1, $2, $3)
        `, [adminId, 'LOGOUT', req.ip]);
      }

      res.json({
        success: true,
        message: 'Logout realizado com sucesso'
      });
    } catch (error) {
      console.error('Erro no logout:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao fazer logout',
        error: error.message
      });
    }
  }
}

export default new SystemAdminAuthController();
