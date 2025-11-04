import { Request, Response } from 'express';
import { Pool } from 'pg';
import { TenantBackupService, BackupOptions, RestoreOptions } from '../services/tenantBackupService';
import { TenantAuditService } from '../services/tenantAuditService';

export class TenantBackupController {
  private backupService: TenantBackupService;
  private auditService: TenantAuditService;

  constructor(pool: Pool) {
    this.backupService = new TenantBackupService(pool);
    this.auditService = new TenantAuditService();
  }

  /**
   * Create a new backup for a tenant
   */
  createBackup = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId } = req.params;
      const options: BackupOptions = {
        tenantId,
        includeData: req.body.includeData !== false,
        includeSchema: req.body.includeSchema !== false,
        compression: req.body.compression || false,
        encryption: req.body.encryption || false,
        tables: req.body.tables
      };

      // Validate user has permission for this tenant
      if (req.tenantContext?.tenantId !== tenantId && !req.user?.isSystemAdmin) {
        res.status(403).json({ error: 'Access denied to tenant backup operations' });
        return;
      }

      const metadata = await this.backupService.createTenantBackup(options);

      res.status(201).json({
        success: true,
        data: metadata,
        message: 'Backup created successfully'
      });

    } catch (error) {
      console.error('Backup creation failed:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create backup'
      });
    }
  };

  /**
   * Restore a tenant from backup
   */
  restoreBackup = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId } = req.params;
      const options: RestoreOptions = {
        tenantId,
        backupPath: req.body.backupPath,
        pointInTime: req.body.pointInTime ? new Date(req.body.pointInTime) : undefined,
        targetTenantId: req.body.targetTenantId,
        validateOnly: req.body.validateOnly || false
      };

      // Only system admins can perform cross-tenant restoration
      if (options.targetTenantId && options.targetTenantId !== tenantId && !req.user?.isSystemAdmin) {
        res.status(403).json({ error: 'Cross-tenant restoration requires system admin privileges' });
        return;
      }

      // Validate user has permission for this tenant
      if (req.tenantContext?.tenantId !== tenantId && !req.user?.isSystemAdmin) {
        res.status(403).json({ error: 'Access denied to tenant restore operations' });
        return;
      }

      await this.backupService.restoreTenantBackup(options);

      res.json({
        success: true,
        message: options.validateOnly ? 'Backup validation completed' : 'Restore completed successfully'
      });

    } catch (error) {
      console.error('Backup restoration failed:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to restore backup'
      });
    }
  };

  /**
   * Perform point-in-time recovery
   */
  pointInTimeRecovery = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId } = req.params;
      const { targetTime } = req.body;

      if (!targetTime) {
        res.status(400).json({ error: 'Target time is required for point-in-time recovery' });
        return;
      }

      // Validate user has permission for this tenant
      if (req.tenantContext?.tenantId !== tenantId && !req.user?.isSystemAdmin) {
        res.status(403).json({ error: 'Access denied to tenant recovery operations' });
        return;
      }

      await this.backupService.performPointInTimeRecovery(tenantId, new Date(targetTime));

      res.json({
        success: true,
        message: 'Point-in-time recovery completed successfully'
      });

    } catch (error) {
      console.error('Point-in-time recovery failed:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to perform point-in-time recovery'
      });
    }
  };

  /**
   * List backups for a tenant
   */
  listBackups = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId } = req.params;

      // Validate user has permission for this tenant
      if (req.tenantContext?.tenantId !== tenantId && !req.user?.isSystemAdmin) {
        res.status(403).json({ error: 'Access denied to tenant backup information' });
        return;
      }

      const backups = await this.backupService.listTenantBackups(tenantId);

      res.json({
        success: true,
        data: backups,
        count: backups.length
      });

    } catch (error) {
      console.error('Failed to list backups:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to list backups'
      });
    }
  };

  /**
   * Validate backup integrity
   */
  validateBackup = async (req: Request, res: Response): Promise<void> => {
    try {
      const { backupPath } = req.body;

      if (!backupPath) {
        res.status(400).json({ error: 'Backup path is required' });
        return;
      }

      const isValid = await this.backupService.validateBackupIntegrity(backupPath);

      res.json({
        success: true,
        data: { isValid },
        message: isValid ? 'Backup is valid' : 'Backup validation failed'
      });

    } catch (error) {
      console.error('Backup validation failed:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to validate backup'
      });
    }
  };

  /**
   * Clean up old backups
   */
  cleanupBackups = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId } = req.params;
      const { retentionDays = 30 } = req.body;

      // Validate user has permission for this tenant
      if (req.tenantContext?.tenantId !== tenantId && !req.user?.isSystemAdmin) {
        res.status(403).json({ error: 'Access denied to tenant backup operations' });
        return;
      }

      await this.backupService.cleanupOldBackups(tenantId, retentionDays);

      res.json({
        success: true,
        message: `Cleaned up backups older than ${retentionDays} days`
      });

    } catch (error) {
      console.error('Backup cleanup failed:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to cleanup backups'
      });
    }
  };

  /**
   * Get backup statistics for a tenant
   */
  getBackupStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId } = req.params;

      // Validate user has permission for this tenant
      if (req.tenantContext?.tenantId !== tenantId && !req.user?.isSystemAdmin) {
        res.status(403).json({ error: 'Access denied to tenant backup statistics' });
        return;
      }

      const pool = req.app.get('pool') as Pool;
      const client = await pool.connect();

      try {
        const result = await client.query(`
          SELECT * FROM tenant_backup_stats WHERE tenant_id = $1
        `, [tenantId]);

        const stats = result.rows[0] || {
          tenant_id: tenantId,
          total_backups: 0,
          successful_backups: 0,
          failed_backups: 0,
          last_backup: null,
          total_backup_size: 0,
          avg_backup_size: 0
        };

        res.json({
          success: true,
          data: stats
        });

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Failed to get backup statistics:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get backup statistics'
      });
    }
  };

  /**
   * Get backup schedules for a tenant
   */
  getBackupSchedules = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId } = req.params;

      // Validate user has permission for this tenant
      if (req.tenantContext?.tenantId !== tenantId && !req.user?.isSystemAdmin) {
        res.status(403).json({ error: 'Access denied to tenant backup schedules' });
        return;
      }

      const pool = req.app.get('pool') as Pool;
      const client = await pool.connect();

      try {
        const result = await client.query(`
          SELECT * FROM tenant_backup_schedules 
          WHERE tenant_id = $1 
          ORDER BY created_at DESC
        `, [tenantId]);

        res.json({
          success: true,
          data: result.rows,
          count: result.rows.length
        });

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Failed to get backup schedules:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get backup schedules'
      });
    }
  };

  /**
   * Create or update backup schedule
   */
  manageBackupSchedule = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId } = req.params;
      const {
        name,
        scheduleCron,
        backupType = 'full',
        retentionDays = 30,
        compression = true,
        encryption = false,
        includeTables,
        excludeTables = [],
        isActive = true
      } = req.body;

      // Validate user has permission for this tenant
      if (req.tenantContext?.tenantId !== tenantId && !req.user?.isSystemAdmin) {
        res.status(403).json({ error: 'Access denied to tenant backup schedule management' });
        return;
      }

      if (!name || !scheduleCron) {
        res.status(400).json({ error: 'Name and schedule cron expression are required' });
        return;
      }

      const pool = req.app.get('pool') as Pool;
      const client = await pool.connect();

      try {
        const result = await client.query(`
          INSERT INTO tenant_backup_schedules (
            tenant_id, name, schedule_cron, backup_type, retention_days,
            compression, encryption, include_tables, exclude_tables, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `, [
          tenantId, name, scheduleCron, backupType, retentionDays,
          compression, encryption, 
          includeTables ? JSON.stringify(includeTables) : null,
          JSON.stringify(excludeTables),
          isActive
        ]);

        res.status(201).json({
          success: true,
          data: result.rows[0],
          message: 'Backup schedule created successfully'
        });

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Failed to manage backup schedule:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to manage backup schedule'
      });
    }
  };
}