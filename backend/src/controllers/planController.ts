import { Request, Response } from 'express';
import db from '../database';

export class PlanController {
  // List all plans
  async list(req: Request, res: Response) {
    try {
      const result = await db.query(`
        SELECT * FROM institution_plans 
        WHERE active = true 
        ORDER BY display_order, price
      `);

      res.json({
        success: true,
        data: result.rows,
        total: result.rows.length
      });
    } catch (error) {
      console.error('Erro ao listar planos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar planos',
        error: error.message
      });
    }
  }

  // Get plan by ID
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const result = await db.query(
        'SELECT * FROM institution_plans WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Plano não encontrado'
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Erro ao buscar plano:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar plano',
        error: error.message
      });
    }
  }
}

export default new PlanController();
