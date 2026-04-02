// Controller de refeições para PostgreSQL
import { Request, Response } from "express";
import db from "../../../database";

export async function listarRefeicoes(req: Request, res: Response) {
  try {
    // Query que considera per capita ajustado por modalidade (usa a primeira modalidade ativa como padrão)
    const result = await db.query(`
      WITH primeira_modalidade AS (
        SELECT id FROM modalidades WHERE ativo = true ORDER BY id LIMIT 1
      ),
      calculos_refeicoes AS (
        SELECT 
          r.id as refeicao_id,
          ROUND(
            COALESCE(
              SUM(
                CASE 
                  WHEN pcn.energia_kcal IS NOT NULL THEN 
                    -- Usar per capita ajustado por modalidade se existir, senão usar o padrão
                    pcn.energia_kcal * (
                      CASE 
                        WHEN rp.tipo_medida = 'unidades' THEN 
                          (COALESCE(rpm.per_capita_ajustado, rp.per_capita) * 100.0) / 100.0
                        ELSE 
                          COALESCE(rpm.per_capita_ajustado, rp.per_capita) / 100.0
                      END
                    )
                  ELSE 0
                END
              ), 
              0
            ),
            0
          ) as valor_calorico_total
        FROM refeicoes r
        LEFT JOIN refeicao_produtos rp ON r.id = rp.refeicao_id
        LEFT JOIN produto_composicao_nutricional pcn ON rp.produto_id = pcn.produto_id
        LEFT JOIN refeicao_produto_modalidade rpm ON rpm.refeicao_produto_id = rp.id 
          AND rpm.modalidade_id = (SELECT id FROM primeira_modalidade)
        GROUP BY r.id
      )
      SELECT 
        r.id,
        r.nome,
        r.descricao,
        r.categoria,
        r.ativo,
        r.tempo_preparo_minutos,
        r.rendimento_porcoes,
        r.calorias_por_porcao,
        r.custo_por_porcao,
        r.created_at,
        r.updated_at,
        (SELECT COUNT(DISTINCT rp.id) FROM refeicao_produtos rp WHERE rp.refeicao_id = r.id) as total_produtos,
        COALESCE(cr.valor_calorico_total, 0) as valor_calorico_total
      FROM refeicoes r
      LEFT JOIN calculos_refeicoes cr ON cr.refeicao_id = r.id
      ORDER BY r.nome
    `);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error("❌ Erro ao listar refeições:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar refeições",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function buscarRefeicao(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT 
        r.*,
        COALESCE(
          SUM(
            CASE 
              WHEN pcn.energia_kcal IS NOT NULL THEN 
                (rp.per_capita / 100.0) * pcn.energia_kcal
              ELSE 0
            END
          ), 
          0
        ) as valor_calorico_total
      FROM refeicoes r
      LEFT JOIN refeicao_produtos rp ON r.id = rp.refeicao_id
      LEFT JOIN produto_composicao_nutricional pcn ON rp.produto_id = pcn.produto_id
      WHERE r.id = $1
      GROUP BY r.id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Refeição não encontrada"
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao buscar refeição:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar refeição",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function criarRefeicao(req: Request, res: Response) {
  try {
    const {
      nome,
      descricao,
      categoria,
      modo_preparo,
      tempo_preparo_minutos,
      rendimento_porcoes,
      utensílios,
      calorias_por_porcao,
      proteinas_g,
      carboidratos_g,
      lipidios_g,
      fibras_g,
      sodio_mg,
      custo_por_porcao,
      observacoes_tecnicas,
      ativo = true
    } = req.body;

    const result = await db.query(`
      INSERT INTO refeicoes (
        nome, descricao, categoria, modo_preparo, tempo_preparo_minutos,
        rendimento_porcoes, utensílios, calorias_por_porcao, proteinas_g,
        carboidratos_g, lipidios_g, fibras_g, sodio_mg, custo_por_porcao,
        observacoes_tecnicas, ativo, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      nome, descricao, categoria, modo_preparo, tempo_preparo_minutos,
      rendimento_porcoes, utensílios, calorias_por_porcao, proteinas_g,
      carboidratos_g, lipidios_g, fibras_g, sodio_mg, custo_por_porcao,
      observacoes_tecnicas, ativo
    ]);

    res.json({
      success: true,
      message: "Refeição criada com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao criar refeição:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar refeição",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function editarRefeicao(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      nome,
      descricao,
      categoria,
      modo_preparo,
      tempo_preparo_minutos,
      rendimento_porcoes,
      utensílios,
      calorias_por_porcao,
      proteinas_g,
      carboidratos_g,
      lipidios_g,
      fibras_g,
      sodio_mg,
      custo_por_porcao,
      observacoes_tecnicas,
      ativo
    } = req.body;

    const result = await db.query(`
      UPDATE refeicoes SET
        nome = COALESCE($1, nome),
        descricao = COALESCE($2, descricao),
        categoria = COALESCE($3, categoria),
        modo_preparo = $4,
        tempo_preparo_minutos = $5,
        rendimento_porcoes = $6,
        utensílios = $7,
        calorias_por_porcao = $8,
        proteinas_g = $9,
        carboidratos_g = $10,
        lipidios_g = $11,
        fibras_g = $12,
        sodio_mg = $13,
        custo_por_porcao = $14,
        observacoes_tecnicas = $15,
        ativo = COALESCE($16, ativo),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $17
      RETURNING *
    `, [
      nome, descricao, categoria, modo_preparo, tempo_preparo_minutos,
      rendimento_porcoes, utensílios, calorias_por_porcao, proteinas_g,
      carboidratos_g, lipidios_g, fibras_g, sodio_mg, custo_por_porcao,
      observacoes_tecnicas, ativo, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Refeição não encontrada"
      });
    }

    res.json({
      success: true,
      message: "Refeição atualizada com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao editar refeição:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao editar refeição",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function removerRefeicao(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await db.query(`
      DELETE FROM refeicoes WHERE id = $1 RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Refeição não encontrada"
      });
    }

    res.json({
      success: true,
      message: "Refeição removida com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao remover refeição:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao remover refeição",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function toggleAtivoRefeicao(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await db.query(`
      UPDATE refeicoes SET
        ativo = NOT ativo,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Refeição não encontrada"
      });
    }

    res.json({
      success: true,
      message: `Refeição ${result.rows[0].ativo ? 'ativada' : 'desativada'} com sucesso`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao alterar status da refeição:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao alterar status da refeição",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function duplicarRefeicao(req: Request, res: Response) {
  const client = await db.pool.connect();
  
  try {
    const { id } = req.params;
    const { nome } = req.body;

    if (!nome || !nome.trim()) {
      return res.status(400).json({
        success: false,
        message: "Nome da nova refeição é obrigatório"
      });
    }

    await client.query('BEGIN');

    // Buscar refeição original
    const refeicaoOriginal = await client.query(`
      SELECT * FROM refeicoes WHERE id = $1
    `, [id]);

    if (refeicaoOriginal.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: "Refeição não encontrada"
      });
    }

    const original = refeicaoOriginal.rows[0];

    // Criar nova refeição com os dados da original
    const novaRefeicao = await client.query(`
      INSERT INTO refeicoes (
        nome, descricao, categoria, modo_preparo, tempo_preparo_minutos,
        rendimento_porcoes, utensílios, calorias_por_porcao, proteinas_g,
        carboidratos_g, lipidios_g, fibras_g, sodio_mg, custo_por_porcao,
        observacoes_tecnicas, ativo, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      nome.trim(),
      original.descricao,
      original.categoria,
      original.modo_preparo,
      original.tempo_preparo_minutos,
      original.rendimento_porcoes,
      original.utensílios,
      original.calorias_por_porcao,
      original.proteinas_g,
      original.carboidratos_g,
      original.lipidios_g,
      original.fibras_g,
      original.sodio_mg,
      original.custo_por_porcao,
      original.observacoes_tecnicas,
      true // Nova refeição sempre começa ativa
    ]);

    const novaRefeicaoId = novaRefeicao.rows[0].id;

    // Copiar produtos da refeição (com todas as colunas corretas)
    const produtosCopiados = await client.query(`
      INSERT INTO refeicao_produtos (
        refeicao_id, produto_id, per_capita, tipo_medida, observacoes, ordem, tipo_ingrediente
      )
      SELECT 
        $1, produto_id, per_capita, tipo_medida, observacoes, ordem, tipo_ingrediente
      FROM refeicao_produtos
      WHERE refeicao_id = $2
      RETURNING id, produto_id
    `, [novaRefeicaoId, id]);

    // Copiar configurações por modalidade (usando refeicao_produto_id correto)
    // Para cada produto copiado, copiar suas configurações de modalidade
    for (const produtoNovo of produtosCopiados.rows) {
      // Encontrar o produto original correspondente
      const produtoOriginal = await client.query(`
        SELECT id FROM refeicao_produtos
        WHERE refeicao_id = $1 AND produto_id = $2
        LIMIT 1
      `, [id, produtoNovo.produto_id]);

      if (produtoOriginal.rows.length > 0) {
        // Copiar as configurações de modalidade do produto original para o novo
        await client.query(`
          INSERT INTO refeicao_produto_modalidade (
            refeicao_produto_id, modalidade_id, per_capita_ajustado, observacao
          )
          SELECT 
            $1, modalidade_id, per_capita_ajustado, observacao
          FROM refeicao_produto_modalidade
          WHERE refeicao_produto_id = $2
        `, [produtoNovo.id, produtoOriginal.rows[0].id]);
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: "Refeição duplicada com sucesso",
      data: novaRefeicao.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Erro ao duplicar refeição:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao duplicar refeição",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  } finally {
    client.release();
  }
}

// Buscar ficha técnica da refeição (pública - sem autenticação)
export const buscarFichaTecnica = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Buscar refeição
    const refeicao = await db.query(
      'SELECT * FROM refeicoes WHERE id = $1',
      [id]
    );

    if (refeicao.rows.length === 0) {
      return res.status(404).json({ error: 'Refeição não encontrada' });
    }

    // Buscar produtos da refeição com custos
    const produtos = await db.query(`
      SELECT 
        rp.id,
        rp.produto_id,
        p.nome as produto_nome,
        rp.per_capita as quantidade,
        CASE 
          WHEN rp.tipo_medida = 'gramas' THEN 'g'
          WHEN rp.tipo_medida = 'unidades' THEN 'un'
          ELSE p.unidade_medida
        END as unidade_medida,
        COALESCE(cp.preco_unitario, 0) as custo_unitario,
        COALESCE(cp.preco_unitario * (rp.per_capita / 100.0), 0) as custo_total
      FROM refeicao_produtos rp
      JOIN produtos p ON p.id = rp.produto_id
      LEFT JOIN LATERAL (
        SELECT preco_unitario
        FROM contrato_produtos
        WHERE produto_id = rp.produto_id
        AND ativo = true
        ORDER BY id DESC
        LIMIT 1
      ) cp ON true
      WHERE rp.refeicao_id = $1
      ORDER BY p.nome
    `, [id]);

    // Calcular custo total
    const custoTotal = produtos.rows.reduce((sum, p) => sum + parseFloat(p.custo_total || 0), 0);

    res.json({
      refeicao: refeicao.rows[0],
      produtos: produtos.rows,
      custo_total: custoTotal
    });
  } catch (error) {
    console.error('Erro ao buscar ficha técnica:', error);
    res.status(500).json({ error: 'Erro ao buscar ficha técnica' });
  }
};
