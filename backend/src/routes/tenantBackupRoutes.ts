import { Router } from 'express';
import { Pool } from 'pg';
import { TenantBackupController } from '../controllers/tenantBackupController';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { tenantAuthMiddleware } from '../middlewares/tenantAuthMiddleware';

export function createTenantBackupRoutes(pool: Pool): Router {
  const router = Router();
  const backupController = new TenantBackupController(pool);

  // Apply tenant middleware to all routes
  router.use(tenantMiddleware);
  router.use(tenantAuthMiddleware);

  // Backup management routes
  router.post('/tenants/:tenantId/backups', backupController.createBackup);
  router.get('/tenants/:tenantId/backups', backupController.listBackups);
  router.get('/tenants/:tenantId/backups/stats', backupController.getBackupStats);
  
  // Restore operations
  router.post('/tenants/:tenantId/restore', backupController.restoreBackup);
  router.post('/tenants/:tenantId/point-in-time-recovery', backupController.pointInTimeRecovery);
  
  // Backup validation and maintenance
  router.post('/backups/validate', backupController.validateBackup);
  router.delete('/tenants/:tenantId/backups/cleanup', backupController.cleanupBackups);
  
  // Backup scheduling
  router.get('/tenants/:tenantId/backup-schedules', backupController.getBackupSchedules);
  router.post('/tenants/:tenantId/backup-schedules', backupController.manageBackupSchedule);

  return router;
}