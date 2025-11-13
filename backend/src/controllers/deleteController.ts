import { Request, Response } from 'express';
const db = require('../database');

/**
 * Deletar um tenant e TODOS os seus dados em cascata
 */
export async function deleteTenant(req: Request, res: Response) {
  const client = await db.connect();
  
  try {
    const { tenantId } = req.params;
    
    console.log(`🗑️ Iniciando deleção do tenant ${tenantId}...`);
    
    await client.query('BEGIN');
    
    // 1. Deletar estoque e histórico
    await client.query('DELETE FROM estoque_escolas_historico WHERE tenant_id = $1', [tenantId]);
    await client.query('DELETE FROM estoque_lotes WHERE tenant_id = $1', [tenantId]);
    await client.query('DELETE FROM estoque_escolas WHERE tenant_id = $1', [tenantId]);
    console.log('✅ Estoque deletado');
    
    // 2. Deletar escolas e dados relacionados
    await client.query('DELETE FROM escola_modalidades WHERE escola_id IN (SELECT id FROM escolas WHERE tenant_id = $1)', [tenantId]);
    await client.query('DELETE FROM escolas WHERE tenant_id = $1', [tenantId]);
    console.log('✅ Escolas deletadas');
    
    // 3. Deletar produtos
    await client.query('DELETE FROM produtos WHERE tenant_id = $1', [tenantId]);
    console.log('✅ Produtos deletados');
    
    // 4. Deletar contratos e dados relacionados
    await client.query('DELETE FROM contrato_produtos WHERE contrato_id IN (SELECT id FROM contratos WHERE tenant_id = $1)', [tenantId]);
    await client.query('DELETE FROM contratos WHERE tenant_id = $1', [tenantId]);
    console.log('✅ Contratos deletados');
    
    // 5. Deletar fornecedores
    await client.query('DELETE FROM fornecedores WHERE tenant_id = $1', [tenantId]);
    console.log('✅ Fornecedores deletados');
    
    // 6. Deletar modalidades
    await client.query('DELETE FROM modalidades WHERE tenant_id = $1', [tenantId]);
    console.log('✅ Modalidades deletadas');
    
    // 7. Deletar refeições
    await client.query('DELETE FROM refeicoes WHERE tenant_id = $1', [tenantId]);
    console.log('✅ Refeições deletadas');
    
    // 8. Deletar pedidos
    await client.query('DELETE FROM pedidos WHERE tenant_id = $1', [tenantId]);
    console.log('✅ Pedidos deletados');
    
    // 9. Deletar associações de usuários
    await client.query('DELETE FROM tenant_users WHERE tenant_id = $1', [tenantId]);
    console.log('✅ Associações de usuários deletadas');
    
    // 10. Finalmente, deletar o tenant
    const result = await client.query('DELETE FROM tenants WHERE id = $1 RETURNING *', [tenantId]);
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Tenant não encontrado'
      });
    }
    
    await client.query('COMMIT');
    console.log('✅ Tenant deletado com sucesso');
    
    res.json({
      success: true,
      message: `Tenant "${result.rows[0].name}" e todos os seus dados foram deletados com sucesso`
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao deletar tenant:', error);
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
    
    console.log(`🗑️ Iniciando deleção da instituição ${institutionId}...`);
    
    await client.query('BEGIN');
    
    // 1. Buscar todos os tenants da instituição
    const tenantsResult = await client.query(
      'SELECT id, name FROM tenants WHERE institution_id = $1',
      [institutionId]
    );
    
    const tenants = tenantsResult.rows;
    console.log(`📋 Encontrados ${tenants.length} tenants para deletar`);
    
    // 2. Deletar cada tenant e seus dados
    for (const tenant of tenants) {
      console.log(`🗑️ Deletando tenant: ${tenant.name}...`);
      
      // Deletar dados do tenant (ordem importa para foreign keys)
      await client.query('DELETE FROM estoque_escolas_historico WHERE tenant_id = $1', [tenant.id]);
      await client.query('DELETE FROM estoque_lotes WHERE tenant_id = $1', [tenant.id]);
      await client.query('DELETE FROM estoque_escolas WHERE tenant_id = $1', [tenant.id]);
      await client.query('DELETE FROM escola_modalidades WHERE escola_id IN (SELECT id FROM escolas WHERE tenant_id = $1)', [tenant.id]);
      await client.query('DELETE FROM escolas WHERE tenant_id = $1', [tenant.id]);
      await client.query('DELETE FROM produtos WHERE tenant_id = $1', [tenant.id]);
      await client.query('DELETE FROM contrato_produtos WHERE contrato_id IN (SELECT id FROM contratos WHERE tenant_id = $1)', [tenant.id]);
      await client.query('DELETE FROM contratos WHERE tenant_id = $1', [tenant.id]);
      await client.query('DELETE FROM fornecedores WHERE tenant_id = $1', [tenant.id]);
      await client.query('DELETE FROM modalidades WHERE tenant_id = $1', [tenant.id]);
      await client.query('DELETE FROM refeicoes WHERE tenant_id = $1', [tenant.id]);
      await client.query('DELETE FROM pedidos WHERE tenant_id = $1', [tenant.id]);
      await client.query('DELETE FROM tenant_users WHERE tenant_id = $1', [tenant.id]);
      await client.query('DELETE FROM tenants WHERE id = $1', [tenant.id]);
      
      console.log(`✅ Tenant ${tenant.name} deletado`);
    }
    
    // 3. Deletar a instituição
    const result = await client.query(
      'DELETE FROM institutions WHERE id = $1 RETURNING *',
      [institutionId]
    );
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Instituição não encontrada'
      });
    }
    
    await client.query('COMMIT');
    console.log('✅ Instituição deletada com sucesso');
    
    res.json({
      success: true,
      message: `Instituição "${result.rows[0].name}", ${tenants.length} tenants e todos os dados foram deletados com sucesso`
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao deletar instituição:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar instituição',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  } finally {
    client.release();
  }
}
