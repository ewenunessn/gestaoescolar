import { Request, Response } from 'express';
import db from '../database';

// Listar ajustes de per capita por modalidade para um produto da refeição
export const listarAjustes = async (req: Request, res: Response) => {
  try {
    const { refeicaoProdutoId } = req.params;

    const result = await db.pool.query(
      `SELECT 
        rpm.id,
        rpm.refeicao_produto_id,
        rpm.modalidade_id,
        m.nome as modalidade_nome,
        rpm.per_capita_ajustado,
        rpm.observacao,
        rpm.created_at,
        rpm.updated_at
      FROM refeicao_produto_modalidade rpm
      INNER JOIN modalidades m ON m.id = rpm.modalidade_id
      WHERE rpm.refeicao_produto_id = $1
      ORDER BY m.nome`,
      [refeicaoProdutoId]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Erro ao listar ajustes:', error);
    res.status(500).json({ message: 'Erro ao listar ajustes de per capita' });
  }
};

// Salvar/atualizar ajustes em lote
export const salvarAjustes = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const { refeicaoProdutoId } = req.params;
    const { ajustes } = req.body; // Array de { modalidade_id, per_capita_ajustado, observacao }

    await client.query('BEGIN');

    // Deletar ajustes existentes
    await client.query(
      'DELETE FROM refeicao_produto_modalidade WHERE refeicao_produto_id = $1',
      [refeicaoProdutoId]
    );

    // Inserir novos ajustes
    if (ajustes && ajustes.length > 0) {
      for (const ajuste of ajustes) {
        await client.query(
          `INSERT INTO refeicao_produto_modalidade 
            (refeicao_produto_id, modalidade_id, per_capita_ajustado, observacao)
          VALUES ($1, $2, $3, $4)`,
          [
            refeicaoProdutoId,
            ajuste.modalidade_id,
            ajuste.per_capita_ajustado,
            ajuste.observacao || null
          ]
        );
      }
    }

    await client.query('COMMIT');

    res.json({ 
      message: 'Ajustes salvos com sucesso',
      count: ajustes?.length || 0
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Erro ao salvar ajustes:', error);
    res.status(500).json({ message: 'Erro ao salvar ajustes de per capita' });
  } finally {
    client.release();
  }
};

// Obter per capita efetivo para uma modalidade específica
export const obterPerCapitaEfetivo = async (req: Request, res: Response) => {
  try {
    const { refeicaoProdutoId, modalidadeId } = req.params;

    const result = await db.pool.query(
      `SELECT 
        rp.id as refeicao_produto_id,
        rp.per_capita as per_capita_padrao,
        rp.tipo_medida,
        COALESCE(rpm.per_capita_ajustado, rp.per_capita) as per_capita_efetivo,
        CASE 
          WHEN rpm.per_capita_ajustado IS NOT NULL THEN true 
          ELSE false 
        END as tem_ajuste,
        rpm.observacao
      FROM refeicao_produtos rp
      LEFT JOIN refeicao_produto_modalidade rpm 
        ON rpm.refeicao_produto_id = rp.id 
        AND rpm.modalidade_id = $2
      WHERE rp.id = $1`,
      [refeicaoProdutoId, modalidadeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Produto da refeição não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Erro ao obter per capita efetivo:', error);
    res.status(500).json({ message: 'Erro ao obter per capita efetivo' });
  }
};

// Listar todos os produtos de uma refeição com per capita por modalidade
export const listarProdutosComModalidades = async (req: Request, res: Response) => {
  try {
    const { refeicaoId } = req.params;

    const result = await db.pool.query(
      `SELECT 
        rp.id as refeicao_produto_id,
        rp.refeicao_id,
        rp.produto_id,
        p.nome as produto_nome,
        rp.per_capita as per_capita_padrao,
        rp.tipo_medida,
        rp.observacoes,
        (
          SELECT json_agg(
            json_build_object(
              'modalidade_id', rpm.modalidade_id,
              'modalidade_nome', m.nome,
              'per_capita_ajustado', rpm.per_capita_ajustado,
              'observacao', rpm.observacao
            )
          )
          FROM refeicao_produto_modalidade rpm
          INNER JOIN modalidades m ON m.id = rpm.modalidade_id
          WHERE rpm.refeicao_produto_id = rp.id
        ) as ajustes_modalidades
      FROM refeicao_produtos rp
      INNER JOIN produtos p ON p.id = rp.produto_id
      WHERE rp.refeicao_id = $1
      ORDER BY p.nome`,
      [refeicaoId]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Erro ao listar produtos com modalidades:', error);
    res.status(500).json({ message: 'Erro ao listar produtos com modalidades' });
  }
};

// Deletar um ajuste específico
export const deletarAjuste = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await db.pool.query(
      'DELETE FROM refeicao_produto_modalidade WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Ajuste não encontrado' });
    }

    res.json({ message: 'Ajuste deletado com sucesso' });
  } catch (error: any) {
    console.error('Erro ao deletar ajuste:', error);
    res.status(500).json({ message: 'Erro ao deletar ajuste' });
  }
};
