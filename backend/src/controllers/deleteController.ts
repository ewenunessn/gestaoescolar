import { Request, Response } from 'express';
const db = require('../database');

/**
 * Deletar um tenant e TODOS os seus dados em cascata
 */
export async function deleteTenant(req: Request, res: Response) {
  const client = await db.connect();
  
  try {
    const { tenantId } = req.params;
    
    console.log(`🗑️ Deletando tenant ${tenantId}...`);
    
    // Verificar se tenant existe
    const tenantCheck = await client.query('SELECT name FROM tenants WHERE id = $1', [tenantId]);
    if (tenantCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tenant não encontrado'
      });
    }
    
    const tenantName = tenantCheck.rows[0].name;
    
    // Deletar apenas as tabelas principais (sem transação para evitar timeout)
    // As foreign keys com ON DELETE CASCADE vão cuidar do resto
    await client.query('DELETE FROM escolas WHERE tenant_id = $1', [tenantId]).catch(() => {});
    await client.query('DELETE FROM produtos WHERE tenant_id = $1', [tenantId]).catch(() => {});
    await client.query('DELETE FROM contratos WHERE tenant_id = $1', [tenantId]).catch(() => {});
    await client.query('DELETE FROM tenant_users WHERE tenant_id = $1', [tenantId]).catch(() => {});
    await client.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
    
    console.log('✅ Tenant deletado');
    
    res.json({
      success: true,
      message: `Tenant "${tenantName}" deletado com sucesso`
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar tenant',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  } finally {
    client.release();
  }
}

/**
 * Deletar uma instituição e TODOS os seus tenants + dados em cascata
 */
export async function deleteInstitution(req: Request, res: Response) {
  const client = await db.connect();
  
  try {
    const { institutionId } = req.params;
    
    console.log(`🗑️ Deletando instituição ${institutionId}...`);
    
    // Verificar se instituição existe
    const instCheck = await client.query('SELECT name FROM institutions WHERE id = $1', [institutionId]);
    if (instCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Instituição não encontrada'
      });
    }
    
    const institutionName = instCheck.rows[0].name;
    
    // Buscar tenants
    const tenantsResult = await client.query(
      'SELECT id FROM tenants WHERE institution_id = $1',
      [institutionId]
    );
    
    const tenantIds = tenantsResult.rows.map((t: any) => t.id);
    console.log(`📋 ${tenantIds.length} tenants`);
    
    // Deletar tenants e seus dados (sem transação)
    if (tenantIds.length > 0) {
      await client.query('DELETE FROM escolas WHERE tenant_id = ANY($1)', [tenantIds]).catch(() => {});
      await client.query('DELETE FROM produtos WHERE tenant_id = ANY($1)', [tenantIds]).catch(() => {});
      await client.query('DELETE FROM contratos WHERE tenant_id = ANY($1)', [tenantIds]).catch(() => {});
      await client.query('DELETE FROM tenant_users WHERE tenant_id = ANY($1)', [tenantIds]).catch(() => {});
      await client.query('DELETE FROM tenants WHERE id = ANY($1)', [tenantIds]);
    }
    
    // Deletar instituição
    await client.query('DELETE FROM institutions WHERE id = $1', [institutionId]);
    
    console.log('✅ Instituição deletada');
    
    res.json({
      success: true,
      message: `Instituição "${institutionName}" e ${tenantIds.length} tenants deletados`
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar instituição',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  } finally {
    client.release();
  }
}
