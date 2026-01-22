// Controller de modalidades para PostgreSQL
import { Request, Response } from "express";
import { setTenantContextFromRequest } from "../../../utils/tenantContext";
const db = require("../../../database");

export async function listarModalidades(req: Request, res: Response) {
  try {
    // Configurar contexto de tenant
    await setTenantContextFromRequest(req);

    const modalidades = await db.all(`
      SELECT 
        m.id,
        m.nome,
        m.descricao,
        m.codigo_financeiro,
        m.ativo,
        COALESCE(m.valor_repasse, 0.00) as valor_repasse,
        m.created_at,
        m.updated_at,
        COALESCE(SUM(em.quantidade_alunos), 0) as total_alunos
      FROM modalidades m
      LEFT JOIN escola_modalidades em ON m.id = em.modalidade_id
      LEFT JOIN escolas e ON em.escola_id = e.id AND e.tenant_id = current_setting('app.current_tenant_id')::uuid
      WHERE m.tenant_id = current_setting('app.current_tenant_id')::uuid
      GROUP BY m.id, m.nome, m.descricao, m.codigo_financeiro, m.ativo, m.valor_repasse, m.created_at, m.updated_at
      ORDER BY m.nome
    `);

    res.json({
      success: true,
      data: modalidades,
      total: modalidades.length
    });
  } catch (error) {
    console.error("❌ Erro ao listar modalidades:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar modalidades",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function desativarModalidade(req: Request, res: Response) {
  try {
    // Configurar contexto de tenant
    await setTenantContextFromRequest(req);

    const { id } = req.params;

    const result = await db.query(`
      UPDATE modalidades SET
        ativo = false,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = current_setting('app.current_tenant_id')::uuid
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Modalidade não encontrada"
      });
    }

    res.json({
      success: true,
      message: "Modalidade desativada com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao desativar modalidade:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao desativar modalidade",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function reativarModalidade(req: Request, res: Response) {
  try {
    // Configurar contexto de tenant
    await setTenantContextFromRequest(req);

    const { id } = req.params;

    const result = await db.query(`
      UPDATE modalidades SET
        ativo = true,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = current_setting('app.current_tenant_id')::uuid
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Modalidade não encontrada"
      });
    }

    res.json({
      success: true,
      message: "Modalidade reativada com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao reativar modalidade:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao reativar modalidade",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function buscarModalidade(req: Request, res: Response) {
  try {
    // Configurar contexto de tenant
    await setTenantContextFromRequest(req);

    const { id } = req.params;
    
    const modalidade = await db.get(`
      SELECT * FROM modalidades 
      WHERE id = $1 AND tenant_id = current_setting('app.current_tenant_id')::uuid
    `, [id]);

    if (!modalidade) {
      return res.status(404).json({
        success: false,
        message: "Modalidade não encontrada"
      });
    }

    res.json({
      success: true,
      data: modalidade
    });
  } catch (error) {
    console.error("❌ Erro ao buscar modalidade:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar modalidade",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function criarModalidade(req: Request, res: Response) {
  try {
    // Configurar contexto de tenant
    await setTenantContextFromRequest(req);

    const { nome, descricao, codigo_financeiro, ativo = true, valor_repasse = 0.00 } = req.body;

    const result = await db.query(`
      INSERT INTO modalidades (nome, descricao, codigo_financeiro, ativo, valor_repasse, tenant_id)
      VALUES ($1, $2, $3, $4, $5, current_setting('app.current_tenant_id')::uuid)
      RETURNING *
    `, [nome, descricao, codigo_financeiro, ativo, valor_repasse]);

    res.json({
      success: true,
      message: "Modalidade criada com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao criar modalidade:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar modalidade",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function editarModalidade(req: Request, res: Response) {
  try {
    // Configurar contexto de tenant
    await setTenantContextFromRequest(req);

    const { id } = req.params;
    const { nome, descricao, codigo_financeiro, ativo, valor_repasse } = req.body;

    const result = await db.query(`
      UPDATE modalidades SET
        nome = $1,
        descricao = $2,
        codigo_financeiro = $3,
        ativo = $4,
        valor_repasse = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 AND tenant_id = current_setting('app.current_tenant_id')::uuid
      RETURNING *
    `, [nome, descricao, codigo_financeiro, ativo, valor_repasse, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Modalidade não encontrada"
      });
    }

    res.json({
      success: true,
      message: "Modalidade atualizada com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao editar modalidade:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao editar modalidade",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function removerModalidade(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { forceDelete = false } = req.query;

    // Configurar contexto de tenant
    await setTenantContextFromRequest(req);

    // Verificar se a modalidade existe
    const modalidade = await db.get(`
      SELECT * FROM modalidades 
      WHERE id = $1 AND tenant_id = current_setting('app.current_tenant_id')::uuid
    `, [id]);

    if (!modalidade) {
      return res.status(404).json({
        success: false,
        message: "Modalidade não encontrada"
      });
    }

    // Verificar se há referências em outras tabelas (dentro do mesmo tenant)
    const referencias = await db.all(`
      SELECT 
        'escola_modalidades' as tabela, COUNT(*) as total
      FROM escola_modalidades em
      JOIN escolas e ON em.escola_id = e.id
      WHERE em.modalidade_id = $1 
        AND e.tenant_id = current_setting('app.current_tenant_id')::uuid
    `, [id]);

    const totalReferencias = referencias.reduce((sum, ref) => sum + parseInt(ref.total), 0);

    if (totalReferencias > 0 && forceDelete !== 'true') {
      return res.status(400).json({
        success: false,
        message: "Não é possível excluir esta modalidade pois ela está sendo utilizada",
        details: {
          referencias: referencias.filter(ref => parseInt(ref.total) > 0),
          totalReferencias,
          sugestao: "Use exclusão lógica (desativar) ou force a exclusão com ?forceDelete=true"
        }
      });
    }

    if (forceDelete === 'true') {
      // Mostrar o que será removido
      const referenciasFiltradas = referencias.filter(ref => parseInt(ref.total) > 0);
      
      console.log(`⚠️  EXCLUSÃO FORÇADA - Modalidade ID ${id}:`);
      console.log(`📋 Referências que serão removidas:`);
      referenciasFiltradas.forEach(ref => {
        console.log(`   - ${ref.tabela}: ${ref.total} registro(s)`);
      });
      
      // Exclusão forçada - remover referências primeiro (apenas do tenant atual)
      let removidosEscolaModalidades = 0;
      
      const resultEscola = await db.query(`
        DELETE FROM escola_modalidades 
        WHERE modalidade_id = $1 
          AND escola_id IN (
            SELECT id FROM escolas 
            WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
          )
      `, [id]);
      removidosEscolaModalidades = resultEscola.rowCount || 0;
      
      console.log(`✅ Referências removidas:`);
      console.log(`   - escola_modalidades: ${removidosEscolaModalidades} registro(s)`);
    }

    // Excluir a modalidade (apenas se pertencer ao tenant atual)
    const result = await db.query(`
      DELETE FROM modalidades 
      WHERE id = $1 AND tenant_id = current_setting('app.current_tenant_id')::uuid
      RETURNING *
    `, [id]);

    const message = forceDelete === 'true' 
      ? `Modalidade e suas referências removidas com sucesso. Foram removidos ${totalReferencias} registro(s) de referência.`
      : "Modalidade removida com sucesso";
    
    res.json({
      success: true,
      message,
      data: result.rows[0],
      ...(forceDelete === 'true' && {
        detalhesRemocao: {
          modalidadeRemovida: true,
          referenciasPreviasRemovidas: referencias.filter(ref => parseInt(ref.total) > 0),
          totalReferenciasRemovidas: totalReferencias
        }
      })
    });
  } catch (error) {
    console.error("❌ Erro ao remover modalidade:", error);
    
    // Verificar se é erro de chave estrangeira
    if (error instanceof Error && error.message.includes('viola restrição de chave estrangeira')) {
      return res.status(400).json({
        success: false,
        message: "Não é possível excluir esta modalidade pois ela está sendo utilizada em outros registros",
        error: "Violação de integridade referencial",
        sugestao: "Desative a modalidade em vez de excluí-la, ou use ?forceDelete=true para forçar a exclusão"
      });
    }

    res.status(500).json({
      success: false,
      message: "Erro ao remover modalidade",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}