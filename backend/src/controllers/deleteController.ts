import { Request, Response } from 'express';
import db from "../database";

/**
 * Deletar uma instituição
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
    
    // Deletar instituição
    await client.query('DELETE FROM institutions WHERE id = $1', [institutionId]);
    
    console.log('✅ Instituição deletada');
    
    res.json({
      success: true,
      message: `Instituição "${institutionName}" deletada`
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
