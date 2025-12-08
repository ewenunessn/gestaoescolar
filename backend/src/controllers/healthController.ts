import { Request, Response } from 'express';
import db from '../database';

export class HealthController {
  /**
   * Health check endpoint
   */
  async check(req: Request, res: Response) {
    try {
      // Test database connection
      const result = await db.pool.query('SELECT NOW() as time, version() as version');
      
      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: {
          connected: true,
          time: result.rows[0].time,
          version: result.rows[0].version
        },
        environment: {
          nodeEnv: process.env.NODE_ENV,
          hasDatabase: !!process.env.DATABASE_URL || !!process.env.POSTGRES_URL
        },
        version: {
          commit: '28b8184',
          message: 'debug: adicionar logs detalhados'
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Test provisioning service
   */
  async testProvisioning(req: Request, res: Response) {
    try {
      const institutionId = req.params.institutionId;
      
      // Test query
      const result = await db.pool.query(
        'SELECT * FROM institutions WHERE id = $1',
        [institutionId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Instituição não encontrada',
          institutionId
        });
      }
      
      const institution = result.rows[0];
      
      // Test user count
      const userCount = await db.pool.query(
        'SELECT COUNT(*) as count FROM institution_users WHERE institution_id = $1',
        [institutionId]
      );
      
      res.json({
        success: true,
        institution: {
          id: institution.id,
          name: institution.name,
          limits: institution.limits
        },
        userCount: parseInt(userCount.rows[0].count),
        canCreateUser: true
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack
      });
    }
  }
}

export default new HealthController();
