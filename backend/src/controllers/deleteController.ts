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
    
    // Deletar dados relacionados em ordem (mais rápido com menos queries)
    try {
      // Deletar relacionamentos primeiro
      await client.query('DELETE FROM escola_modalidades WHERE escola_id IN (SELECT id FROM escolas WHERE tenant_id = $1)', [tenantId]);
      await client.query('DELETE FROM contrato_produtos WHERE contrato_id IN (SELECT id FROM contratos WHERE tenant_id = $1)', [tenantId]);
      
      // Deletar dados principais (tabelas que podem não existir)
      const tables = [
        'estoque_escolas_historico', 'estoque_lotes', 'estoque_escolas',
        'escolas', 'produtos', 'contratos', 'fornecedores',
        'modalidades', 'refeicoes', 'pedidos', 'tenant_users'
      ];
      
      for (const table of tables) {
        try {
          await client.query(`DELETE FROM ${table} WHERE tenant_id = $1`, [tenantId]);
        } catch (e: any) {
          if (e.code !== '42P01') console.warn(`⚠️ ${table}:`, e.message);
        }
      }
      
      console.log('✅ Dados do tenant deletados');
    } catch (err: any) {
      console.warn(`⚠️ Erro ao deletar dados:`, err.message);
      // Continuar mesmo com erro
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
    

    // 2. Deletar todos os tenants e seus dados de uma vez
    if (tenants.length > 0) {
      const tenantIds = tenants.map(t => t.id);
      
      try {
        // Deletar relacionamentos
        await client.query('DELETE FROM escola_modalidades WHERE escola_id IN (SELECT id FROM escolas WHERE tenant_id = ANY($1))', [tenantIds]);
        await client.query('DELETE FROM contrato_produtos WHERE contrato_id IN (SELECT id FROM contratos WHERE tenant_id = ANY($1))', [tenantIds]);
        
        // Deletar dados principais de todos os tenants
        const tables = [
          'estoque_escolas_historico', 'estoque_lotes', 'estoque_escolas',
          'escolas', 'produtos', 'contratos', 'fornecedores',
          'modalidades', 'refeicoes', 'pedidos', 'tenant_users', 'tenants'
        ];
        
        for (const table of tables) {
          try {
            const col = table === 'tenants' ? 'id' : 'tenant_id';
            await client.query(`DELETE FROM ${table} WHERE ${col} = ANY($1)`, [tenantIds]);
          } catch (e: any) {
            if (e.code !== '42P01') console.warn(`⚠️ ${table}:`, e.message);
          }
        }
        
        console.log(`✅ ${tenants.length} tenants deletados`);
      } catch (err: any) {
        console.warn(`⚠️ Erro ao deletar tenants:`, err.message);
      }
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
