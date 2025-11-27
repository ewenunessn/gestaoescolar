import { Request, Response } from 'express';
const db = require('../database');

/**
 * Controller para visualização de dados no painel admin
 * Permite visualizar dados de qualquer tenant
 */

// Listar todos os tenants com estatísticas
export async function listTenantsWithStats(req: Request, res: Response) {
  try {
    const result = await db.query(`
      SELECT 
        t.id,
        t.slug,
        t.name,
        t.status,
        t.settings,
        t.limits,
        t.institution_id,
        t.created_at,
        t.updated_at,
        i.name as institution_name,
        i.slug as institution_subdomain,
        (SELECT COUNT(*) FROM escolas WHERE tenant_id = t.id) as total_escolas,
        (SELECT COUNT(*) FROM tenant_users WHERE tenant_id = t.id) as total_usuarios,
        (SELECT COUNT(*) FROM produtos WHERE tenant_id = t.id) as total_produtos,
        (SELECT COUNT(*) FROM contratos WHERE tenant_id = t.id) as total_contratos,
        (SELECT COUNT(*) FROM pedidos WHERE tenant_id = t.id) as total_pedidos
      FROM tenants t
      LEFT JOIN institutions i ON t.institution_id = i.id
      ORDER BY t.created_at DESC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Erro ao listar tenants:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar tenants',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Obter dados detalhados de um tenant específico
export async function getTenantData(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;

    // Buscar informações do tenant
    const tenantResult = await db.query(`
      SELECT 
        t.*,
        i.name as institution_name,
        i.slug as institution_subdomain,
        i.plan_id
      FROM tenants t
      LEFT JOIN institutions i ON t.institution_id = i.id
      WHERE t.id = $1
    `, [tenantId]);

    if (tenantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tenant não encontrado'
      });
    }

    const tenant = tenantResult.rows[0];

    // Buscar escolas
    const escolasResult = await db.query(`
      SELECT 
        e.*,
        COALESCE(SUM(em.quantidade_alunos), 0) as total_alunos
      FROM escolas e
      LEFT JOIN escola_modalidades em ON e.id = em.escola_id
      WHERE e.tenant_id = $1
      GROUP BY e.id
      ORDER BY e.nome
    `, [tenantId]);

    // Buscar modalidades
    const modalidadesResult = await db.query(`
      SELECT * FROM modalidades WHERE tenant_id = $1 ORDER BY nome
    `, [tenantId]);

    // Buscar produtos
    const produtosResult = await db.query(`
      SELECT * FROM produtos WHERE tenant_id = $1 ORDER BY nome LIMIT 100
    `, [tenantId]);

    // Buscar refeições
    const refeicoesResult = await db.query(`
      SELECT * FROM refeicoes WHERE tenant_id = $1 ORDER BY nome
    `, [tenantId]);

    // Buscar cardápios (últimos 10) - Desabilitado temporariamente
    const cardapiosResult = { rows: [] };

    // Buscar fornecedores
    const fornecedoresResult = await db.query(`
      SELECT * FROM fornecedores WHERE tenant_id = $1 ORDER BY nome
    `, [tenantId]);

    // Buscar contratos
    const contratosResult = await db.query(`
      SELECT 
        c.*,
        f.nome as fornecedor_nome
      FROM contratos c
      LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE c.tenant_id = $1
      ORDER BY c.data_inicio DESC
    `, [tenantId]);

    // Buscar pedidos (últimos 20)
    const pedidosResult = await db.query(`
      SELECT 
        p.*,
        e.nome as escola_nome
      FROM pedidos p
      LEFT JOIN escolas e ON p.escola_id = e.id
      WHERE p.tenant_id = $1
      ORDER BY p.created_at DESC
      LIMIT 20
    `, [tenantId]);

    // Buscar usuários
    const usuariosResult = await db.query(`
      SELECT 
        u.id,
        u.nome,
        u.email,
        u.tipo,
        tu.role as tenant_role,
        tu.status as tenant_status
      FROM usuarios u
      JOIN tenant_users tu ON u.id = tu.user_id
      WHERE tu.tenant_id = $1
      ORDER BY u.nome
    `, [tenantId]);

    res.json({
      success: true,
      data: {
        tenant,
        escolas: escolasResult.rows,
        modalidades: modalidadesResult.rows,
        produtos: produtosResult.rows,
        refeicoes: refeicoesResult.rows,
        cardapios: cardapiosResult.rows,
        fornecedores: fornecedoresResult.rows,
        contratos: contratosResult.rows,
        pedidos: pedidosResult.rows,
        usuarios: usuariosResult.rows,
        stats: {
          total_escolas: escolasResult.rows.length,
          total_modalidades: modalidadesResult.rows.length,
          total_produtos: produtosResult.rows.length,
          total_refeicoes: refeicoesResult.rows.length,
          total_cardapios: cardapiosResult.rows.length,
          total_fornecedores: fornecedoresResult.rows.length,
          total_contratos: contratosResult.rows.length,
          total_pedidos: pedidosResult.rows.length,
          total_usuarios: usuariosResult.rows.length,
          total_alunos: escolasResult.rows.reduce((sum, e) => sum + parseInt(e.total_alunos || 0), 0)
        }
      }
    });
  } catch (error) {
    console.error('Erro ao obter dados do tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter dados do tenant',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Atualizar status do tenant (ativar/desativar)
export async function updateTenantStatus(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status inválido. Use: active, inactive ou suspended'
      });
    }

    // Verificar se o tenant é padrão de alguma instituição
    if (status !== 'active') {
      const isDefault = await db.query(`
        SELECT i.id, i.name 
        FROM institutions i 
        WHERE i.default_tenant_id = $1
      `, [tenantId]);

      if (isDefault.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Não é possível desativar este tenant pois ele é o padrão da instituição "${isDefault.rows[0].name}". Primeiro defina outro tenant como padrão.`
        });
      }
    }

    const result = await db.query(`
      UPDATE tenants 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [status, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tenant não encontrado'
      });
    }

    res.json({
      success: true,
      message: `Tenant ${status === 'active' ? 'ativado' : status === 'inactive' ? 'desativado' : 'suspenso'} com sucesso`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao atualizar status do tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar status do tenant',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Obter estatísticas gerais do sistema
export async function getSystemStats(req: Request, res: Response) {
  try {
    const stats = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM institutions) as total_institutions,
        (SELECT COUNT(*) FROM tenants) as total_tenants,
        (SELECT COUNT(*) FROM tenants WHERE status = 'active') as active_tenants,
        (SELECT COUNT(*) FROM tenants WHERE status = 'inactive') as inactive_tenants,
        (SELECT COUNT(*) FROM escolas) as total_escolas,
        (SELECT COUNT(*) FROM usuarios) as total_usuarios,
        (SELECT COUNT(*) FROM produtos) as total_produtos,
        (SELECT COUNT(*) FROM contratos) as total_contratos,
        (SELECT COUNT(*) FROM pedidos) as total_pedidos,
        (SELECT COALESCE(SUM(quantidade_alunos), 0) FROM escola_modalidades) as total_alunos
    `);

    // Tenants criados nos últimos 30 dias
    const recentTenants = await db.query(`
      SELECT COUNT(*) as count
      FROM tenants
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);

    // Instituições por plano
    const institutionsByPlan = await db.query(`
      SELECT 
        p.name as plan_name,
        COUNT(i.id) as count
      FROM institutions i
      LEFT JOIN plans p ON i.plan_id = p.id
      GROUP BY p.name
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      data: {
        ...stats.rows[0],
        recent_tenants: parseInt(recentTenants.rows[0].count),
        institutions_by_plan: institutionsByPlan.rows
      }
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas do sistema:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter estatísticas do sistema',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
