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
    
    // Verificar se tenant existe
    const tenantCheck = await client.query('SELECT name FROM tenants WHERE id = $1', [tenantId]);
    if (tenantCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Tenant não encontrado'
      });
    }
    
    const tenantName = tenantCheck.rows[0].name;
    
    // Deletar dados relacionados (ignorar erros se tabela não existir)
    const tablesToDelete = [
      'estoque_escolas_historico',
      'estoque_lotes', 
      'estoque_escolas',
      'escola_modalidades',
      'escolas',
      'produtos',
      'contrato_produtos',
      'contratos',
      'fornecedores',
      'modalidades',
      'refeicoes',
      'pedidos',
      'tenant_users'
    ];
    
    for (const table of tablesToDelete) {
      try {
        // Para escola_modalidades e contrato_produtos, usar subquery
        if (table === 'escola_modalidades') {
          await client.query('DELETE FROM escola_modalidades WHERE escola_id IN (SELECT id FROM escolas WHERE tenant_id = $1)', [tenantId]);
        } else if (table === 'contrato_produtos') {
          await client.query('DELETE FROM contrato_produtos WHERE contrato_id IN (SELECT id FROM contratos WHERE tenant_id = $1)', [tenantId]);
        } else {
          await client.query(`DELETE FROM ${table} WHERE tenant_id = $1`, [tenantId]);
        }
        console.log(`✅ ${table} deletado`);
      } catch (err: any) {
        // Ignorar erro se tabela não existir
        if (err.code !== '42P01') { // 42P01 = undefined_table
          console.warn(`⚠️ Erro ao deletar ${table}:`, err.message);
        }
      }
    }
    
    // Deletar o tenant
    await client.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
    
    await client.query('COMMIT');
    console.log('✅ Tenant deletado com sucesso');
    
    res.json({
      success: true,
      message: `Tenant "${tenantName}" e todos os seus dados foram deletados com sucesso`
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
    
    // Verificar se instituição existe
    const instCheck = await client.query('SELECT name FROM institutions WHERE id = $1', [institutionId]);
    if (instCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Instituição não encontrada'
      });
    }
    
    const institutionName = instCheck.rows[0].name;
    
    // 1. Buscar todos os tenants da instituição
    const tenantsResult = await client.query(
      'SELECT id, name FROM tenants WHERE institution_id = $1',
      [institutionId]
    );
    
    const tenants = tenantsResult.rows;
    console.log(`📋 Encontrados ${tenants.length} tenants para deletar`);
    
    const tablesToDelete = [
      'estoque_escolas_historico',
      'estoque_lotes',
      'estoque_escolas',
      'escola_modalidades',
      'escolas',
      'produtos',
      'contrato_produtos',
      'contratos',
      'fornecedores',
      'modalidades',
      'refeicoes',
      'pedidos',
      'tenant_users'
    ];
    
    // 2. Deletar cada tenant e seus dados
    for (const tenant of tenants) {
      console.log(`🗑️ Deletando tenant: ${tenant.name}...`);
      
      for (const table of tablesToDelete) {
        try {
          if (table === 'escola_modalidades') {
            await client.query('DELETE FROM escola_modalidades WHERE escola_id IN (SELECT id FROM escolas WHERE tenant_id = $1)', [tenant.id]);
          } else if (table === 'contrato_produtos') {
            await client.query('DELETE FROM contrato_produtos WHERE contrato_id IN (SELECT id FROM contratos WHERE tenant_id = $1)', [tenant.id]);
          } else {
            await client.query(`DELETE FROM ${table} WHERE tenant_id = $1`, [tenant.id]);
          }
        } catch (err: any) {
          if (err.code !== '42P01') {
            console.warn(`⚠️ Erro ao deletar ${table}:`, err.message);
          }
        }
      }
      
      await client.query('DELETE FROM tenants WHERE id = $1', [tenant.id]);
      console.log(`✅ Tenant ${tenant.name} deletado`);
    }
    
    // 3. Deletar a instituição
    await client.query('DELETE FROM institutions WHERE id = $1', [institutionId]);
    
    await client.query('COMMIT');
    console.log('✅ Instituição deletada com sucesso');
    
    res.json({
      success: true,
      message: `Instituição "${institutionName}", ${tenants.length} tenants e todos os dados foram deletados com sucesso`
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
