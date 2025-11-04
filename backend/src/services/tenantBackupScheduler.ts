import { Pool } from 'pg';
import { CronJob } from 'cron';
import { TenantBackupService } from './tenantBackupService';
import { TenantAuditService } from './tenantAuditService';

interface BackupSchedule {
  id: string;
  tenantId: string;
  name: string;
  scheduleCron: string;
  backupType: 'full' | 'incremental' | 'differential';
  retentionDays: number;
  compression: boolean;
  encryption: boolean;
  includeTables?: string[];
  excludeTables: string[];
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

export class TenantBackupScheduler {
  private pool: Pool;
  private backupService: TenantBackupService;
  private auditService: TenantAuditService;
  private scheduledJobs: Map<string, CronJob> = new Map();
  private isRunning: boolean = false;

  constructor(pool: Pool) {
    this.pool = pool;
    this.backupService = new TenantBackupService(pool);
    this.auditService = new TenantAuditService();
  }

  /**
   * Start the backup scheduler
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Backup scheduler is already running');
      return;
    }

    console.log('Starting tenant backup scheduler...');
    
    // Load and schedule all active backup schedules
    await this.loadAndScheduleBackups();
    
    // Set up periodic refresh of schedules (every 5 minutes)
    const refreshJob = new CronJob('*/5 * * * *', async () => {
      await this.refreshSchedules();
    });
    
    refreshJob.start();
    this.scheduledJobs.set('refresh', refreshJob);
    
    this.isRunning = true;
    console.log('Tenant backup scheduler started successfully');
  }

  /**
   * Stop the backup scheduler
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('Backup scheduler is not running');
      return;
    }

    console.log('Stopping tenant backup scheduler...');
    
    // Stop all scheduled jobs
    for (const [scheduleId, job] of this.scheduledJobs) {
      job.stop();
    }
    
    this.scheduledJobs.clear();
    this.isRunning = false;
    
    console.log('Tenant backup scheduler stopped');
  }

  /**
   * Add a new backup schedule
   */
  async addSchedule(schedule: Omit<BackupSchedule, 'id'>): Promise<string> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        INSERT INTO tenant_backup_schedules (
          tenant_id, name, schedule_cron, backup_type, retention_days,
          compression, encryption, include_tables, exclude_tables, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `, [
        schedule.tenantId,
        schedule.name,
        schedule.scheduleCron,
        schedule.backupType,
        schedule.retentionDays,
        schedule.compression,
        schedule.encryption,
        schedule.includeTables ? JSON.stringify(schedule.includeTables) : null,
        JSON.stringify(schedule.excludeTables),
        schedule.isActive
      ]);

      const scheduleId = result.rows[0].id;
      
      // Schedule the backup job if active
      if (schedule.isActive) {
        await this.scheduleBackupJob({ ...schedule, id: scheduleId });
      }

      return scheduleId;
      
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing backup schedule
   */
  async updateSchedule(scheduleId: string, updates: Partial<BackupSchedule>): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // Build dynamic update query
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          updateFields.push(`${dbKey} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }

      if (updateFields.length === 0) {
        return;
      }

      values.push(scheduleId);
      
      await client.query(`
        UPDATE tenant_backup_schedules 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex}
      `, values);

      // Reschedule the job
      await this.rescheduleBackupJob(scheduleId);
      
    } finally {
      client.release();
    }
  }

  /**
   * Delete a backup schedule
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('DELETE FROM tenant_backup_schedules WHERE id = $1', [scheduleId]);
      
      // Remove the scheduled job
      const job = this.scheduledJobs.get(scheduleId);
      if (job) {
        job.stop();
        this.scheduledJobs.delete(scheduleId);
      }
      
    } finally {
      client.release();
    }
  }

  /**
   * Get backup schedules for a tenant
   */
  async getTenantSchedules(tenantId: string): Promise<BackupSchedule[]> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        SELECT * FROM tenant_backup_schedules 
        WHERE tenant_id = $1 
        ORDER BY created_at DESC
      `, [tenantId]);

      return result.rows.map(this.mapRowToSchedule);
      
    } finally {
      client.release();
    }
  }

  /**
   * Execute a backup schedule manually
   */
  async executeSchedule(scheduleId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM tenant_backup_schedules WHERE id = $1',
        [scheduleId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Backup schedule ${scheduleId} not found`);
      }

      const schedule = this.mapRowToSchedule(result.rows[0]);
      await this.executeBackup(schedule);
      
    } finally {
      client.release();
    }
  }

  // Private methods

  private async loadAndScheduleBackups(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        SELECT * FROM tenant_backup_schedules 
        WHERE is_active = true
      `);

      for (const row of result.rows) {
        const schedule = this.mapRowToSchedule(row);
        await this.scheduleBackupJob(schedule);
      }
      
      console.log(`Loaded ${result.rows.length} active backup schedules`);
      
    } finally {
      client.release();
    }
  }

  private async scheduleBackupJob(schedule: BackupSchedule): Promise<void> {
    try {
      // Remove existing job if it exists
      const existingJob = this.scheduledJobs.get(schedule.id);
      if (existingJob) {
        existingJob.stop();
      }

      // Create new cron job
      const job = new CronJob(
        schedule.scheduleCron,
        async () => {
          await this.executeBackup(schedule);
        },
        null,
        false,
        'America/Sao_Paulo' // Default timezone
      );

      job.start();
      this.scheduledJobs.set(schedule.id, job);
      
      console.log(`Scheduled backup job for tenant ${schedule.tenantId}: ${schedule.name}`);
      
    } catch (error) {
      console.error(`Failed to schedule backup job ${schedule.id}:`, error);
    }
  }

  private async rescheduleBackupJob(scheduleId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM tenant_backup_schedules WHERE id = $1',
        [scheduleId]
      );

      if (result.rows.length > 0) {
        const schedule = this.mapRowToSchedule(result.rows[0]);
        
        if (schedule.isActive) {
          await this.scheduleBackupJob(schedule);
        } else {
          // Remove job if schedule is inactive
          const job = this.scheduledJobs.get(scheduleId);
          if (job) {
            job.stop();
            this.scheduledJobs.delete(scheduleId);
          }
        }
      }
      
    } finally {
      client.release();
    }
  }

  private async executeBackup(schedule: BackupSchedule): Promise<void> {
    const startTime = new Date();
    let logId: string | null = null;
    
    try {
      // Log backup start
      logId = await this.logBackupOperation(schedule.id, schedule.tenantId, 'backup', 'started');
      
      console.log(`Executing scheduled backup: ${schedule.name} for tenant ${schedule.tenantId}`);
      
      // Create backup
      const backupOptions = {
        tenantId: schedule.tenantId,
        includeData: true,
        includeSchema: schedule.backupType === 'full',
        compression: schedule.compression,
        encryption: schedule.encryption,
        tables: schedule.includeTables
      };

      const metadata = await this.backupService.createTenantBackup(backupOptions);
      
      // Update schedule last run time
      await this.updateScheduleLastRun(schedule.id, startTime);
      
      // Log backup completion
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      
      if (logId) {
        await this.updateBackupLog(logId, 'completed', endTime, duration, {
          backupId: metadata.id,
          size: metadata.size,
          tables: metadata.tables.length
        });
      }
      
      // Clean up old backups if retention policy is set
      if (schedule.retentionDays > 0) {
        await this.backupService.cleanupOldBackups(schedule.tenantId, schedule.retentionDays);
      }
      
      console.log(`Backup completed successfully: ${metadata.id}`);
      
    } catch (error) {
      console.error(`Backup failed for schedule ${schedule.id}:`, error);
      
      // Log backup failure
      if (logId) {
        const endTime = new Date();
        const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
        
        await this.updateBackupLog(logId, 'failed', endTime, duration, null, error.message);
      }
      
      // Log audit event for failure
      await this.auditService.logAuditEvent({
        tenantId: schedule.tenantId,
        operation: 'scheduled_backup_failed',
        entityType: 'backup_schedule',
        entityId: schedule.id,
        category: 'system',
        severity: 'high',
        metadata: {
          scheduleName: schedule.name,
          error: error.message
        }
      });
    }
  }

  private async refreshSchedules(): Promise<void> {
    try {
      // This method can be used to reload schedules from database
      // and update any changes made directly to the database
      console.log('Refreshing backup schedules...');
      
      const client = await this.pool.connect();
      
      try {
        const result = await client.query(`
          SELECT id, is_active FROM tenant_backup_schedules
        `);

        // Check for schedules that should be active but aren't scheduled
        for (const row of result.rows) {
          const hasJob = this.scheduledJobs.has(row.id);
          
          if (row.is_active && !hasJob) {
            // Schedule missing active job
            await this.rescheduleBackupJob(row.id);
          } else if (!row.is_active && hasJob) {
            // Remove inactive job
            const job = this.scheduledJobs.get(row.id);
            if (job) {
              job.stop();
              this.scheduledJobs.delete(row.id);
            }
          }
        }
        
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error('Failed to refresh schedules:', error);
    }
  }

  private async updateScheduleLastRun(scheduleId: string, lastRun: Date): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query(`
        UPDATE tenant_backup_schedules 
        SET last_run = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [lastRun, scheduleId]);
      
    } finally {
      client.release();
    }
  }

  private async logBackupOperation(
    scheduleId: string, 
    tenantId: string, 
    operationType: string, 
    status: string
  ): Promise<string> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        INSERT INTO tenant_backup_logs (
          tenant_id, schedule_id, operation_type, status, start_time
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        RETURNING id
      `, [tenantId, scheduleId, operationType, status]);

      return result.rows[0].id;
      
    } finally {
      client.release();
    }
  }

  private async updateBackupLog(
    logId: string,
    status: string,
    endTime: Date,
    duration: number,
    details?: any,
    errorMessage?: string
  ): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query(`
        UPDATE tenant_backup_logs 
        SET status = $1, end_time = $2, duration_seconds = $3, 
            details = $4, error_message = $5
        WHERE id = $6
      `, [status, endTime, duration, details ? JSON.stringify(details) : null, errorMessage, logId]);
      
    } finally {
      client.release();
    }
  }

  private mapRowToSchedule(row: any): BackupSchedule {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      scheduleCron: row.schedule_cron,
      backupType: row.backup_type,
      retentionDays: row.retention_days,
      compression: row.compression,
      encryption: row.encryption,
      includeTables: row.include_tables ? JSON.parse(row.include_tables) : undefined,
      excludeTables: row.exclude_tables ? JSON.parse(row.exclude_tables) : [],
      isActive: row.is_active,
      lastRun: row.last_run,
      nextRun: row.next_run
    };
  }
}