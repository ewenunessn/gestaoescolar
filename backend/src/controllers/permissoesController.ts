import { Request, Response } from 'express';
const db = require('../database');

// Listar todos os módulos disponíveis
export async function listarModulos(req: Request, res: Response) {
  try {
    const result = await db.query(`
      SELECT * FROM modulos 
      WHERE ativo = true 
      ORDER BY ordem
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Erro ao listar módulos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar módulos',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Listar níveis de permissão disponíveis
export async function listarNiveisPermissao(req: Request, res: Response) {
  try {
    const result = await db.query(`
      SELECT * FROM niveis_permissao 
      ORDER BY nivel
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Erro ao listar níveis de permissão:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar níveis de permissão',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Obter permissões de um usuário
export async function obterPermissoesUsuario(req: Request, res: Response) {
  try {
    const { usuario_id } = req.params;
    
    const tenantId = req.tenant?.id || req.get('X-Tenant-ID') || req.headers['x-tenant-id'];
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Contexto de tenant não encontrado'
      });
    }

    const result = await db.query(`
      SELECT 
        up.id,
        up.usuario_id,
        up.modulo_id,
        m.nome as modulo_nome,
        m.slug as modulo_slug,
        m.icone as modulo_icone,
        up.nivel_permissao_id,
        np.nome as nivel_nome,
        np.slug as nivel_slug,
        np.nivel as nivel_valor
      FROM usuario_permissoes up
      JOIN modulos m ON up.modulo_id = m.id
      JOIN niveis_permissao np ON up.nivel_permissao_id = np.id
      WHERE up.usuario_id = $1 AND up.tenant_id = $2
      ORDER BY m.ordem
    `, [usuario_id]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Erro ao obter permissões:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter permissões do usuário',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Definir permissões de um usuário (substitui todas)
export async function definirPermissoesUsuario(req: Request, res: Response) {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { usuario_id } = req.params;
    const { permissoes } = req.body; // Array de { modulo_id, nivel_permissao_id }
    
    const tenantId = req.tenant?.id || req.get('X-Tenant-ID') || req.headers['x-tenant-id'];
    
    if (!tenantId) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Contexto de tenant não encontrado'
      });
    }

    // Verificar se usuário existe
    const usuarioCheck = await client.query(
      'SELECT id FROM usuarios WHERE id = $1',
      [usuario_id]
    );

    if (usuarioCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Remover permissões antigas
    await client.query(
      'DELETE FROM usuario_permissoes WHERE usuario_id = $1 AND tenant_id = $2',
      [usuario_id]
    );

    // Inserir novas permissões
    for (const perm of permissoes) {
      // Só inserir se não for nível "nenhum" (0)
      if (perm.nivel_permissao_id !== 1) { // 1 é o ID de "nenhum"
        await client.query(`
          INSERT INTO usuario_permissoes (usuario_id, modulo_id, nivel_permissao_id)
          VALUES ($1, $2, $3, $4)
        `, [usuario_id, perm.modulo_id, perm.nivel_permissao_id]);
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Permissões atualizadas com sucesso'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao definir permissões:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao definir permissões',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  } finally {
    client.release();
  }
}

// Verificar se usuário tem permissão em um módulo
export async function verificarPermissao(req: Request, res: Response) {
  try {
    const { usuario_id, modulo_slug } = req.params;
    
    const tenantId = req.tenant?.id || req.get('X-Tenant-ID') || req.headers['x-tenant-id'];
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Contexto de tenant não encontrado'
      });
    }

    const result = await db.query(`
      SELECT 
        np.nivel,
        np.slug as nivel_slug
      FROM usuario_permissoes up
      JOIN modulos m ON up.modulo_id = m.id
      JOIN niveis_permissao np ON up.nivel_permissao_id = np.id
      WHERE up.usuario_id = $1 
        AND m.slug = $2 
        AND up.tenant_id = $3
    `, [usuario_id, modulo_slug]);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          tem_acesso: false,
          nivel: 0,
          nivel_slug: 'nenhum'
        }
      });
    }

    res.json({
      success: true,
      data: {
        tem_acesso: result.rows[0].nivel > 0,
        nivel: result.rows[0].nivel,
        nivel_slug: result.rows[0].nivel_slug
      }
    });
  } catch (error) {
    console.error('❌ Erro ao verificar permissão:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar permissão',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
