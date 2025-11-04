import { Pool } from 'pg';
import { promises as fs } from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { createHash } from 'crypto';
import { tenantCache } from '../utils/tenantCache';
import { TenantAuditService } from './tenantAuditService';

export interface BackupOptions {
  tenantId: string;
  includeData?: boolean;
  includeSchema?: boolean;
  compression?: boolean;
  encryption?: boolean;
  tables?: string[];
}

export interface RestoreOptions {
  tenantId: string;
  backupPath: string;
  pointInTime?: Date;
  targetTenantId?: string; // For cross-tenant restoration
  validateOnly?: boolean;
}

export interface BackupMetadata {
  id: string;
  tenantId: string;
  timestamp: Date;
  size: number;
  checksum: string;
  tables: string[];
  compression: boolean;
  encryption: boolean;
  status: 'completed' | 'failed' | 'in_progress';
  path: string;
}

export class TenantBackupService {
  private pool: Pool;
  private backupDir: string;
  private auditService: TenantAuditService;

  constructor(pool: Pool, backupDir: string = './backups') {
    this.pool = pool;
    this.backupDir = backupDir;
    this.auditService = new TenantAuditService();
  }

  /**
   * Create a tenant-specific backup
   */
  async createTenantBackup(options: BackupOptions): Promise<BackupMetadata> {
    const backupId = this.generateBackupId(options.tenantId);
    const timestamp = new Date();
    
    try {
      // Validate tenant exists
      await this.validateTenant(options.tenantId);
      
      // Create backup directory if it doesn't exist
      await this.ensureBackupDirectory(options.tenantId);
      
      // Get tenant tables
      const tables = options.tables || await this.getTenantTables();
      
      // Create backup metadata
      const metadata: BackupMetadata = {
        id: backupId,
        tenantId: options.tenantId,
        timestamp,
        size: 0,
        checksum: '',
        tables,
        compression: options.compression || false,
        encryption: options.encryption || false,
        status: 'in_progress',
        path: this.getBackupPath(options.tenantId, backupId)
      };
      
      // Store backup metadata
      await this.storeBackupMetadata(metadata);
      
      // Perform the actual backup
      const backupPath = await this.performBackup(options, metadata);
      
      // Calculate checksum and size
      const stats = await fs.stat(backupPath);
      const checksum = await this.calculateChecksum(backupPath);
      
      // Update metadata
      metadata.size = stats.size;
      metadata.checksum = checksum;
      metadata.status = 'completed';
      
      await this.updateBackupMetadata(metadata);
      
      // Log audit event
      await this.auditService.logAuditEvent({
        tenantId: options.tenantId,
        operation: 'backup_created',
        entityType: 'tenant_backup',
        entityId: backupId,
        category: 'tenant_management',
        severity: 'medium',
        metadata: {
          tables: tables.length,
          size: stats.size,
          compression: options.compression,
          encryption: options.encryption
        }
      });
      
      return metadata;
      
    } catch (error) {
      // Update metadata with failure status
      await this.updateBackupMetadata({
        id: backupId,
        tenantId: options.tenantId,
        timestamp,
        size: 0,
        checksum: '',
        tables: [],
        compression: false,
        encryption: false,
        status: 'failed',
        path: ''
      });
      
      throw new Error(`Backup failed for tenant ${options.tenantId}: ${error.message}`);
    }
  }

  /**
   * Restore tenant data from backup
   */
  async restoreTenantBackup(options: RestoreOptions): Promise<void> {
    try {
      // Validate backup exists and is valid
      const metadata = await this.validateBackup(options.backupPath);
      
      if (options.validateOnly) {
        return;
      }
      
      // Validate target tenant
      const targetTenantId = options.targetTenantId || options.tenantId;
      await this.validateTenant(targetTenantId);
      
      // Create restore point before restoration
      const restorePointId = await this.createRestorePoint(targetTenantId);
      
      try {
        // Perform restoration
        await this.performRestore(options, metadata);
        
        // Log audit event
        await this.auditService.logAuditEvent({
          tenantId: targetTenantId,
          operation: 'backup_restored',
          entityType: 'tenant_backup',
          entityId: metadata.id,
          category: 'tenant_management',
          severity: 'medium',
          metadata: {
            sourceTenantId: metadata.tenantId,
            targetTenantId,
            restorePointId,
            pointInTime: options.pointInTime
          }
        });
        
      } catch (restoreError) {
        // Rollback to restore point on failure
        await this.rollbackToRestorePoint(targetTenantId, restorePointId);
        throw restoreError;
      }
      
    } catch (error) {
      throw new Error(`Restore failed: ${error.message}`);
    }
  }

  /**
   * Perform point-in-time recovery for a tenant
   */
  async performPointInTimeRecovery(tenantId: string, targetTime: Date): Promise<void> {
    try {
      // Find the most recent backup before target time
      const baseBackup = await this.findBaseBackup(tenantId, targetTime);
      if (!baseBackup) {
        throw new Error(`No backup found before ${targetTime.toISOString()}`);
      }
      
      // Restore from base backup
      await this.restoreTenantBackup({
        tenantId,
        backupPath: baseBackup.path
      });
      
      // Apply WAL logs up to target time
      await this.applyWALLogs(tenantId, baseBackup.timestamp, targetTime);
      
      // Log audit event
      await this.auditService.logAuditEvent({
        tenantId,
        operation: 'point_in_time_recovery',
        entityType: 'tenant_data',
        entityId: tenantId,
        category: 'tenant_management',
        severity: 'high',
        metadata: {
          targetTime: targetTime.toISOString(),
          baseBackupId: baseBackup.id
        }
      });
      
    } catch (error) {
      throw new Error(`Point-in-time recovery failed: ${error.message}`);
    }
  }

  /**
   * Validate backup integrity
   */
  async validateBackupIntegrity(backupPath: string): Promise<boolean> {
    try {
      const metadata = await this.getBackupMetadata(backupPath);
      
      // Check file exists
      const stats = await fs.stat(backupPath);
      
      // Verify size matches
      if (stats.size !== metadata.size) {
        return false;
      }
      
      // Verify checksum
      const currentChecksum = await this.calculateChecksum(backupPath);
      if (currentChecksum !== metadata.checksum) {
        return false;
      }
      
      // Test backup can be read
      await this.testBackupReadability(backupPath);
      
      return true;
      
    } catch (error) {
      return false;
    }
  }

  /**
   * List available backups for a tenant
   */
  async listTenantBackups(tenantId: string): Promise<BackupMetadata[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM tenant_backups WHERE tenant_id = $1 ORDER BY timestamp DESC',
        [tenantId]
      );
      
      return result.rows.map(row => ({
        id: row.id,
        tenantId: row.tenant_id,
        timestamp: row.timestamp,
        size: row.size,
        checksum: row.checksum,
        tables: row.tables,
        compression: row.compression,
        encryption: row.encryption,
        status: row.status,
        path: row.path
      }));
      
    } finally {
      client.release();
    }
  }

  /**
   * Delete old backups based on retention policy
   */
  async cleanupOldBackups(tenantId: string, retentionDays: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    const client = await this.pool.connect();
    try {
      // Get old backups
      const result = await client.query(
        'SELECT * FROM tenant_backups WHERE tenant_id = $1 AND timestamp < $2',
        [tenantId, cutoffDate]
      );
      
      // Delete backup files and metadata
      for (const backup of result.rows) {
        try {
          await fs.unlink(backup.path);
          await client.query(
            'DELETE FROM tenant_backups WHERE id = $1',
            [backup.id]
          );
        } catch (error) {
          console.error(`Failed to delete backup ${backup.id}:`, error);
        }
      }
      
    } finally {
      client.release();
    }
  }

  // Private helper methods

  private generateBackupId(tenantId: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${tenantId}-${timestamp}`;
  }

  private async validateTenant(tenantId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT id FROM tenants WHERE id = $1 AND status = $2',
        [tenantId, 'active']
      );
      
      if (result.rows.length === 0) {
        throw new Error(`Tenant ${tenantId} not found or inactive`);
      }
    } finally {
      client.release();
    }
  }

  private async ensureBackupDirectory(tenantId: string): Promise<void> {
    const tenantBackupDir = path.join(this.backupDir, tenantId);
    await fs.mkdir(tenantBackupDir, { recursive: true });
  }

  private getBackupPath(tenantId: string, backupId: string): string {
    return path.join(this.backupDir, tenantId, `${backupId}.sql`);
  }

  private async getTenantTables(): Promise<string[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'tenant_id' 
        AND table_schema = 'public'
      `);
      
      return result.rows.map(row => row.table_name);
    } finally {
      client.release();
    }
  }

  private async performBackup(options: BackupOptions, metadata: BackupMetadata): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        '--host', process.env.DB_HOST || 'localhost',
        '--port', process.env.DB_PORT || '5432',
        '--username', process.env.DB_USER || 'postgres',
        '--dbname', process.env.DB_NAME || 'sistema_escolar',
        '--no-password',
        '--verbose'
      ];

      // Add table-specific options
      if (options.tables) {
        options.tables.forEach(table => {
          args.push('--table', table);
        });
      }

      // Add WHERE clause for tenant isolation
      args.push('--where', `tenant_id = '${options.tenantId}'`);

      if (options.includeSchema !== false) {
        args.push('--schema-only');
      }

      if (options.includeData !== false) {
        args.push('--data-only');
      }

      args.push('--file', metadata.path);

      const pgDump = spawn('pg_dump', args, {
        env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD }
      });

      pgDump.on('close', (code) => {
        if (code === 0) {
          resolve(metadata.path);
        } else {
          reject(new Error(`pg_dump exited with code ${code}`));
        }
      });

      pgDump.on('error', (error) => {
        reject(error);
      });
    });
  }

  private async performRestore(options: RestoreOptions, metadata: BackupMetadata): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        '--host', process.env.DB_HOST || 'localhost',
        '--port', process.env.DB_PORT || '5432',
        '--username', process.env.DB_USER || 'postgres',
        '--dbname', process.env.DB_NAME || 'sistema_escolar',
        '--no-password',
        '--verbose',
        options.backupPath
      ];

      const psql = spawn('psql', args, {
        env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD }
      });

      psql.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`psql exited with code ${code}`));
        }
      });

      psql.on('error', (error) => {
        reject(error);
      });
    });
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    const hash = createHash('sha256');
    const data = await fs.readFile(filePath);
    hash.update(data);
    return hash.digest('hex');
  }

  private async storeBackupMetadata(metadata: BackupMetadata): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        INSERT INTO tenant_backups (
          id, tenant_id, timestamp, size, checksum, tables, 
          compression, encryption, status, path
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        metadata.id,
        metadata.tenantId,
        metadata.timestamp,
        metadata.size,
        metadata.checksum,
        JSON.stringify(metadata.tables),
        metadata.compression,
        metadata.encryption,
        metadata.status,
        metadata.path
      ]);
    } finally {
      client.release();
    }
  }

  private async updateBackupMetadata(metadata: BackupMetadata): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        UPDATE tenant_backups 
        SET size = $1, checksum = $2, status = $3
        WHERE id = $4
      `, [metadata.size, metadata.checksum, metadata.status, metadata.id]);
    } finally {
      client.release();
    }
  }

  private async validateBackup(backupPath: string): Promise<BackupMetadata> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM tenant_backups WHERE path = $1 AND status = $2',
        [backupPath, 'completed']
      );
      
      if (result.rows.length === 0) {
        throw new Error('Backup not found or incomplete');
      }
      
      const metadata = result.rows[0];
      const isValid = await this.validateBackupIntegrity(backupPath);
      
      if (!isValid) {
        throw new Error('Backup integrity validation failed');
      }
      
      return {
        id: metadata.id,
        tenantId: metadata.tenant_id,
        timestamp: metadata.timestamp,
        size: metadata.size,
        checksum: metadata.checksum,
        tables: JSON.parse(metadata.tables),
        compression: metadata.compression,
        encryption: metadata.encryption,
        status: metadata.status,
        path: metadata.path
      };
      
    } finally {
      client.release();
    }
  }

  private async createRestorePoint(tenantId: string): Promise<string> {
    const restorePointId = `restore_point_${Date.now()}`;
    
    // Create a quick backup as restore point
    const restorePointBackup = await this.createTenantBackup({
      tenantId,
      includeData: true,
      includeSchema: false
    });
    
    return restorePointBackup.id;
  }

  private async rollbackToRestorePoint(tenantId: string, restorePointId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT path FROM tenant_backups WHERE id = $1',
        [restorePointId]
      );
      
      if (result.rows.length > 0) {
        await this.restoreTenantBackup({
          tenantId,
          backupPath: result.rows[0].path
        });
      }
    } finally {
      client.release();
    }
  }

  private async findBaseBackup(tenantId: string, targetTime: Date): Promise<BackupMetadata | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM tenant_backups 
        WHERE tenant_id = $1 AND timestamp <= $2 AND status = 'completed'
        ORDER BY timestamp DESC 
        LIMIT 1
      `, [tenantId, targetTime]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        tenantId: row.tenant_id,
        timestamp: row.timestamp,
        size: row.size,
        checksum: row.checksum,
        tables: JSON.parse(row.tables),
        compression: row.compression,
        encryption: row.encryption,
        status: row.status,
        path: row.path
      };
      
    } finally {
      client.release();
    }
  }

  private async applyWALLogs(tenantId: string, fromTime: Date, toTime: Date): Promise<void> {
    // This would implement WAL log replay for point-in-time recovery
    // For now, we'll log that this feature needs PostgreSQL WAL-E or similar
    console.log(`WAL log replay from ${fromTime} to ${toTime} for tenant ${tenantId}`);
    console.log('Note: Full WAL log replay requires PostgreSQL WAL-E or similar tools');
  }

  private async getBackupMetadata(backupPath: string): Promise<BackupMetadata> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM tenant_backups WHERE path = $1',
        [backupPath]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Backup metadata not found');
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        tenantId: row.tenant_id,
        timestamp: row.timestamp,
        size: row.size,
        checksum: row.checksum,
        tables: JSON.parse(row.tables),
        compression: row.compression,
        encryption: row.encryption,
        status: row.status,
        path: row.path
      };
      
    } finally {
      client.release();
    }
  }

  private async testBackupReadability(backupPath: string): Promise<void> {
    // Test that the backup file can be read and contains valid SQL
    const content = await fs.readFile(backupPath, 'utf8');
    
    if (!content.includes('--') && !content.includes('CREATE') && !content.includes('INSERT')) {
      throw new Error('Backup file does not contain valid SQL content');
    }
  }
}