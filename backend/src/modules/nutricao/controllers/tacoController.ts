import { Request, Response } from 'express';
import db from '../../../database';

/**
 * Busca alimentos na tabela TACO por nome (busca parcial, case-insensitive)
 */
export const buscarTaco = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    if (!q || String(q).trim().length < 2) {
      return res.json({ success: true, data: [] });
    }

    const termo = `%${String(q).trim().toLowerCase()}%`;
    const result = await db.query(
      `SELECT id, nome, categoria,
              energia_kcal, proteina_g, lipideos_g, carboidratos_g,
              fibra_alimentar_g, calcio_mg, ferro_mg, sodio_mg,
              vitamina_c_mg, vitamina_a_mcg,
              gorduras_saturadas_g, colesterol_mg
       FROM taco_alimentos
       WHERE LOWER(nome) LIKE $1
       ORDER BY nome
       LIMIT 20`,
      [termo]
    );

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[TACO] Erro ao buscar:', error);
    return res.status(500).json({ success: false, message: 'Erro ao buscar na tabela TACO' });
  }
};
