import { Request, Response } from 'express';
import db from '../../../database';

// Listar todos os grupos com seus itens
export const listarGrupos = async (req: Request, res: Response) => {
  try {
    const grupos = await db.query(`SELECT * FROM grupos_ingredientes ORDER BY nome`);
    const itens = await db.query(`
      SELECT gii.*, p.nome as produto_nome, p.fator_correcao
      FROM grupos_ingredientes_itens gii
      INNER JOIN produtos p ON p.id = gii.produto_id
      ORDER BY gii.grupo_id, p.nome
    `);

    const data = grupos.rows.map(g => ({
      ...g,
      itens: itens.rows.filter(i => i.grupo_id === g.id),
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('[GRUPOS] Erro ao listar:', error);
    res.status(500).json({ success: false, message: 'Erro ao listar grupos' });
  }
};

// Criar grupo
export const criarGrupo = async (req: Request, res: Response) => {
  const { nome, descricao } = req.body;
  if (!nome?.trim()) return res.status(400).json({ success: false, message: 'Nome obrigatório' });

  try {
    const r = await db.query(
      `INSERT INTO grupos_ingredientes (nome, descricao) VALUES ($1, $2) RETURNING *`,
      [nome.trim(), descricao || null]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao criar grupo' });
  }
};

// Atualizar grupo
export const atualizarGrupo = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nome, descricao } = req.body;

  try {
    const r = await db.query(
      `UPDATE grupos_ingredientes SET nome = COALESCE($1, nome), descricao = COALESCE($2, descricao) WHERE id = $3 RETURNING *`,
      [nome?.trim() || null, descricao ?? null, id]
    );
    if (!r.rows.length) return res.status(404).json({ success: false, message: 'Grupo não encontrado' });
    res.json({ success: true, data: r.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao atualizar grupo' });
  }
};

// Excluir grupo
export const excluirGrupo = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.query(`DELETE FROM grupos_ingredientes WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao excluir grupo' });
  }
};

// Salvar itens do grupo (substitui todos)
export const salvarItensGrupo = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { itens } = req.body; // [{ produto_id, per_capita, tipo_medida }]

  if (!Array.isArray(itens)) return res.status(400).json({ success: false, message: 'itens deve ser array' });

  try {
    await db.transaction(async (client) => {
      await client.query(`DELETE FROM grupos_ingredientes_itens WHERE grupo_id = $1`, [id]);
      for (const item of itens) {
        await client.query(
          `INSERT INTO grupos_ingredientes_itens (grupo_id, produto_id, per_capita, tipo_medida)
           VALUES ($1, $2, $3, $4)`,
          [id, item.produto_id, item.per_capita, item.tipo_medida || 'gramas']
        );
      }
    });

    const r = await db.query(`
      SELECT gii.*, p.nome as produto_nome, p.fator_correcao
      FROM grupos_ingredientes_itens gii
      INNER JOIN produtos p ON p.id = gii.produto_id
      WHERE gii.grupo_id = $1 ORDER BY p.nome
    `, [id]);

    res.json({ success: true, data: r.rows });
  } catch (error) {
    console.error('[GRUPOS] Erro ao salvar itens:', error);
    res.status(500).json({ success: false, message: 'Erro ao salvar itens do grupo' });
  }
};
