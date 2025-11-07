import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
const db = require('../../../database');

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

    debugInfo.step = '4. Buscando tenants';
    const tenantQuery = `
      SELECT 
        tu.tenant_id,
        tu.role as tenant_role,
        tu.status as tenant_status,
        t.slug as tenant_slug,
        t.nome as tenant_name,
        t.status as tenant_active_status
      FROM tenant_users tu
      JOIN tenants t ON tu.tenant_id = t.id
      WHERE tu.user_id = $1 AND tu.status = 'active' AND t.status = 'active'
      ORDER BY tu.created_at ASC
    `;
    
    const tenantAssociations = await db.query(tenantQuery, [user.id]);
    debugInfo.data.tenantsEncontrados = tenantAssociations.rows.length;
    debugInfo.data.tenants = tenantAssociations.rows;

    debugInfo.step = '5. Determinando tenant principal';
    let primaryTenant = null;
    
    if (tenantAssociations.rows.length > 0) {
      const firstAssociation = tenantAssociations.rows[0];
      primaryTenant = {
        id: firstAssociation.tenant_id,
        slug: firstAssociation.tenant_slug,
        name: firstAssociation.tenant_name,
        role: firstAssociation.tenant_role
      };
    } else {
      debugInfo.step = '5b. Buscando tenant padrão';
      const defaultTenant = await db.query(`
        SELECT id, slug, nome FROM tenants WHERE id = '00000000-0000-0000-0000-000000000000'
      `);
      
      debugInfo.data.tenantPadraoEncontrado = defaultTenant.rows.length > 0;
      
      if (defaultTenant.rows.length > 0) {
        primaryTenant = {
          id: defaultTenant.rows[0].id,
          slug: defaultTenant.rows[0].slug,
          name: defaultTenant.rows[0].nome,
          role: 'user'
        };
      }
    }

    debugInfo.data.primaryTenant = primaryTenant;

    debugInfo.step = '6. Gerando token';
    const { config } = require('../../../config/config');
    debugInfo.data.jwtSecretConfigured = !!process.env.JWT_SECRET;

    const tokenPayload = {
      id: user.id,
      tipo: user.tipo,
      email: user.email,
      nome: user.nome,
      tenant: primaryTenant,
      tenantRole: primaryTenant?.role || 'user',
      isSystemAdmin: user.tipo === 'admin'
    };

    const token = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: '24h' });
    debugInfo.data.tokenGerado = !!token;
    debugInfo.data.tokenPreview = token.substring(0, 30) + '...';

    debugInfo.step = '7. Sucesso!';
    return res.json({
      success: true,
      debugInfo,
      loginData: {
        token,
        tipo: user.tipo,
        nome: user.nome,
        tenant: primaryTenant
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
