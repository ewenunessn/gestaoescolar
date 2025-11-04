/**
 * Tenant Migration Service
 * Handles tenant-specific database migrations with rollback and recovery
 */

import { Pool, PoolClient } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
const db = require('../database');

export interface MigrationDefinition {
  id: string;
  name: string;
  description: string;
  upSql: string;
  downSql: string;
  tenantSpecific: boolean;
  dependencies?: string[];
  createdAt: Date;
}

export interface MigrationStatus {
  id: string;
  migrationId: string;
  tenantId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back';
  appliedAt?: Date;
  rolledBackAt?: Date;
  error?: string;
  executionTime?: number;
}

export interface MigrationResult {
  success: boolean;
  migrationId: string;
  tenantId?: string;
  executionTime: number;
  error?: string;
  warnings?: string[];
}

export interface TenantMigrationRunner {
  // Migration execution
  runMigration(migrationId: string, tenantId?: string): Promise<MigrationResult>;
  runAllPendingMigrations(tenantId?: string): Promise<MigrationResult[]>;
  rollbackMigration(migrationId: string, tenantId?: string): Promise<MigrationResult>;
  
  // Migration management
  createMigration(definition: Omit<MigrationDefinition, 'id' | 'createdAt'>): Promise<MigrationDefinition>;
  getMigrationStatus(tenantId?: string): Promise<MigrationStatus[]>;
  getMigrationDefinition(migrationId: string): Promise<MigrationDefinition | null>;
  
  // Tenant-specific operations
  runTenantMigrations(tenantId: string): Promise<MigrationResult[]>;
  rollbackTenantMigrations(tenantId: string, toMigrationId?: string): Promise<MigrationResult[]>;
  
  // Recovery operations
  recoverFailedMigration(migrationId: string, tenantId?: string): Promise<MigrationResult>;
  validateMigrationIntegrity(tenantId?: string): Promise<boolean>;
}

export class TenantMigrationService implements TenantMigrationRunner {
  private migrationsPath: string;

  constructor(migrationsPath?: string) {
    this.migrationsPath = migrationsPath || path.join(__dirname, '../../migrations/tenant');
    this.ensureMigrationsDirectory();
    this.initializeMigrationTables();
  }

  /**
   * Ensure migrations directory exists
   */
  private ensureMigrationsDirectory(): void {
    if (!fs.existsSync(this.migrationsPath)) {
      fs.mkdirSync(this.migrationsPath, { recursive: true });
    }
  }

  /**
   * Initialize migration tracking tables
   */
  private async initializeMigrationTables(): Promise<void> {
    try {
      // Create migration definitions table
      await db.query(`
        CREATE TABLE IF NOT EXISTS tenant_migration_definitions (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          up_sql TEXT NOT NULL,
          down_sql TEXT NOT NULL,
          tenant_specific BOOLEAN DEFAULT false,
          dependencies JSONB DEFAULT '[]',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create migration status table
      await db.query(`
        CREATE TABLE IF NOT EXISTS tenant_migration_status (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          migration_id VARCHAR(255) NOT NULL,
          tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
          status VARCHAR(20) DEFAULT 'pending',
          applied_at TIMESTAMP,
          rolled_back_at TIMESTAMP,
          error TEXT,
          execution_time INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(migration_id, tenant_id)
        )
      `);

      // Create indexes for performance
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_migration_status_tenant 
        ON tenant_migration_status(tenant_id, status)
      `);

      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_migration_status_migration 
        ON tenant_migration_status(migration_id, status)
      `);

    } catch (error) {
      console.error('Error initializing migration tables:', error);
      throw error;
    }
  }

  /**
   * Run a specific migration
   */
  async runMigration(migrationId: string, tenantId?: string): Promise<MigrationResult> {
    const startTime = Date.now();
    
    try {
      // Get migration definition
      const migration = await this.getMigrationDefinition(migrationId);
      if (!migration) {
        throw new Error(`Migration not found: ${migrationId}`);
      }

      // Check if migration is already applied
      const status = await this.getMigrationStatusRecord(migrationId, tenantId);
      if (status && status.status === 'completed') {
        return {
          success: true,
          migrationId,
          tenantId,
          executionTime: 0,
          warnings: ['Migration already applied']
        };
      }

      // Update status to running
      await this.updateMigrationStatus(migrationId, tenantId, 'running');

      // Execute migration in transaction
      const result = await db.transaction(async (client: PoolClient) => {
        // Set tenant context if specified
        if (tenantId) {
          await client.query(`SET app.current_tenant_id = '${tenantId}'`);
        }

        // Execute migration SQL
        await client.query(migration.upSql);

        return { success: true };
      });

      const executionTime = Date.now() - startTime;

      // Update status to completed
      await this.updateMigrationStatus(migrationId, tenantId, 'completed', {
        appliedAt: new Date(),
        executionTime
      });

      return {
        success: true,
        migrationId,
        tenantId,
        executionTime
      };

    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      
      // Update status to failed
      await this.updateMigrationStatus(migrationId, tenantId, 'failed', {
        error: error.message,
        executionTime
      });

      return {
        success: false,
        migrationId,
        tenantId,
        executionTime,
        error: error.message
      };
    }
  }

  /**
   * Run all pending migrations
   */
  async runAllPendingMigrations(tenantId?: string): Promise<MigrationResult[]> {
    try {
      // Get all migration definitions ordered by dependencies
      const migrations = await this.getOrderedMigrations();
      const results: MigrationResult[] = [];

      for (const migration of migrations) {
        // Skip non-tenant-specific migrations if tenantId is provided
        if (tenantId && !migration.tenantSpecific) {
          continue;
        }

        // Skip tenant-specific migrations if no tenantId provided
        if (!tenantId && migration.tenantSpecific) {
          continue;
        }

        // Check if migration is already applied
        const status = await this.getMigrationStatusRecord(migration.id, tenantId);
        if (status && status.status === 'completed') {
          continue;
        }

        // Run migration
        const result = await this.runMigration(migration.id, tenantId);
        results.push(result);

        // Stop on first failure
        if (!result.success) {
          break;
        }
      }

      return results;
    } catch (error: any) {
      throw new Error(`Failed to run migrations: ${error.message}`);
    }
  }

  /**
   * Rollback a specific migration
   */
  async rollbackMigration(migrationId: string, tenantId?: string): Promise<MigrationResult> {
    const startTime = Date.now();
    
    try {
      // Get migration definition
      const migration = await this.getMigrationDefinition(migrationId);
      if (!migration) {
        throw new Error(`Migration not found: ${migrationId}`);
      }

      // Check if migration is applied
      const status = await this.getMigrationStatusRecord(migrationId, tenantId);
      if (!status || status.status !== 'completed') {
        throw new Error(`Migration not applied or not in completed state: ${migrationId}`);
      }

      // Update status to running
      await this.updateMigrationStatus(migrationId, tenantId, 'running');

      // Execute rollback in transaction
      await db.transaction(async (client: PoolClient) => {
        // Set tenant context if specified
        if (tenantId) {
          await client.query(`SET app.current_tenant_id = '${tenantId}'`);
        }

        // Execute rollback SQL
        await client.query(migration.downSql);
      });

      const executionTime = Date.now() - startTime;

      // Update status to rolled_back
      await this.updateMigrationStatus(migrationId, tenantId, 'rolled_back', {
        rolledBackAt: new Date(),
        executionTime
      });

      return {
        success: true,
        migrationId,
        tenantId,
        executionTime
      };

    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      
      // Update status to failed
      await this.updateMigrationStatus(migrationId, tenantId, 'failed', {
        error: error.message,
        executionTime
      });

      return {
        success: false,
        migrationId,
        tenantId,
        executionTime,
        error: error.message
      };
    }
  }

  /**
   * Create a new migration
   */
  async createMigration(definition: Omit<MigrationDefinition, 'id' | 'createdAt'>): Promise<MigrationDefinition> {
    try {
      // Generate migration ID
      const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
      const migrationId = `${timestamp}_${definition.name.toLowerCase().replace(/\s+/g, '_')}`;

      const migration: MigrationDefinition = {
        id: migrationId,
        createdAt: new Date(),
        ...definition
      };

      // Save migration definition to database
      await db.query(`
        INSERT INTO tenant_migration_definitions (
          id, name, description, up_sql, down_sql, tenant_specific, dependencies
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        migration.id,
        migration.name,
        migration.description,
        migration.upSql,
        migration.downSql,
        migration.tenantSpecific,
        JSON.stringify(migration.dependencies || [])
      ]);

      // Save migration files to disk
      const migrationDir = path.join(this.migrationsPath, migrationId);
      fs.mkdirSync(migrationDir, { recursive: true });

      fs.writeFileSync(
        path.join(migrationDir, 'up.sql'),
        migration.upSql
      );

      fs.writeFileSync(
        path.join(migrationDir, 'down.sql'),
        migration.downSql
      );

      fs.writeFileSync(
        path.join(migrationDir, 'definition.json'),
        JSON.stringify(migration, null, 2)
      );

      return migration;
    } catch (error: any) {
      throw new Error(`Failed to create migration: ${error.message}`);
    }
  }

  /**
   * Get migration status for tenant or all
   */
  async getMigrationStatus(tenantId?: string): Promise<MigrationStatus[]> {
    try {
      let query = `
        SELECT 
          ms.id,
          ms.migration_id as "migrationId",
          ms.tenant_id as "tenantId",
          ms.status,
          ms.applied_at as "appliedAt",
          ms.rolled_back_at as "rolledBackAt",
          ms.error,
          ms.execution_time as "executionTime",
          md.name as "migrationName",
          md.description as "migrationDescription"
        FROM tenant_migration_status ms
        JOIN tenant_migration_definitions md ON ms.migration_id = md.id
      `;

      const params: any[] = [];
      
      if (tenantId) {
        query += ' WHERE ms.tenant_id = $1';
        params.push(tenantId);
      }

      query += ' ORDER BY ms.created_at DESC';

      const result = await db.query(query, params);
      return result.rows;
    } catch (error: any) {
      throw new Error(`Failed to get migration status: ${error.message}`);
    }
  }

  /**
   * Get migration definition by ID
   */
  async getMigrationDefinition(migrationId: string): Promise<MigrationDefinition | null> {
    try {
      const result = await db.query(`
        SELECT 
          id,
          name,
          description,
          up_sql as "upSql",
          down_sql as "downSql",
          tenant_specific as "tenantSpecific",
          dependencies,
          created_at as "createdAt"
        FROM tenant_migration_definitions
        WHERE id = $1
      `, [migrationId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      let dependencies = [];
      
      try {
        if (row.dependencies) {
          if (typeof row.dependencies === 'string') {
            dependencies = JSON.parse(row.dependencies);
          } else if (Array.isArray(row.dependencies)) {
            dependencies = row.dependencies;
          }
        }
      } catch (parseError) {
        console.warn(`Failed to parse dependencies for migration ${migrationId}:`, parseError);
        dependencies = [];
      }
      
      return {
        ...row,
        dependencies
      };
    } catch (error: any) {
      throw new Error(`Failed to get migration definition: ${error.message}`);
    }
  }

  /**
   * Run migrations for a specific tenant
   */
  async runTenantMigrations(tenantId: string): Promise<MigrationResult[]> {
    try {
      // Validate tenant exists
      const tenantResult = await db.query('SELECT id FROM tenants WHERE id = $1', [tenantId]);
      if (tenantResult.rows.length === 0) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }

      // Run all tenant-specific migrations
      return await this.runAllPendingMigrations(tenantId);
    } catch (error: any) {
      throw new Error(`Failed to run tenant migrations: ${error.message}`);
    }
  }

  /**
   * Rollback tenant migrations to a specific point
   */
  async rollbackTenantMigrations(tenantId: string, toMigrationId?: string): Promise<MigrationResult[]> {
    try {
      // Get applied migrations for tenant in reverse order
      const appliedMigrations = await db.query(`
        SELECT migration_id
        FROM tenant_migration_status
        WHERE tenant_id = $1 AND status = 'completed'
        ORDER BY applied_at DESC
      `, [tenantId]);

      const results: MigrationResult[] = [];

      for (const row of appliedMigrations.rows) {
        const migrationId = row.migration_id;
        
        // Stop if we reached the target migration
        if (toMigrationId && migrationId === toMigrationId) {
          break;
        }

        // Rollback migration
        const result = await this.rollbackMigration(migrationId, tenantId);
        results.push(result);

        // Stop on first failure
        if (!result.success) {
          break;
        }
      }

      return results;
    } catch (error: any) {
      throw new Error(`Failed to rollback tenant migrations: ${error.message}`);
    }
  }

  /**
   * Recover a failed migration
   */
  async recoverFailedMigration(migrationId: string, tenantId?: string): Promise<MigrationResult> {
    try {
      // Reset migration status to pending
      await this.updateMigrationStatus(migrationId, tenantId, 'pending', {
        error: null
      });

      // Retry migration
      return await this.runMigration(migrationId, tenantId);
    } catch (error: any) {
      throw new Error(`Failed to recover migration: ${error.message}`);
    }
  }

  /**
   * Validate migration integrity
   */
  async validateMigrationIntegrity(tenantId?: string): Promise<boolean> {
    try {
      // Check for missing dependencies
      const migrations = await this.getOrderedMigrations();
      const appliedMigrations = await this.getAppliedMigrations(tenantId);
      
      for (const migration of migrations) {
        if (migration.dependencies && migration.dependencies.length > 0) {
          for (const dependency of migration.dependencies) {
            if (!appliedMigrations.includes(dependency)) {
              console.error(`Missing dependency ${dependency} for migration ${migration.id}`);
              return false;
            }
          }
        }
      }

      return true;
    } catch (error: any) {
      console.error('Migration integrity validation failed:', error);
      return false;
    }
  }

  // Private helper methods

  private async getMigrationStatusRecord(migrationId: string, tenantId?: string): Promise<MigrationStatus | null> {
    try {
      let query = `
        SELECT 
          id,
          migration_id as "migrationId",
          tenant_id as "tenantId",
          status,
          applied_at as "appliedAt",
          rolled_back_at as "rolledBackAt",
          error,
          execution_time as "executionTime"
        FROM tenant_migration_status
        WHERE migration_id = $1
      `;

      const params = [migrationId];

      if (tenantId) {
        query += ' AND tenant_id = $2';
        params.push(tenantId);
      } else {
        query += ' AND tenant_id IS NULL';
      }

      const result = await db.query(query, params);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      return null;
    }
  }

  private async updateMigrationStatus(
    migrationId: string, 
    tenantId: string | undefined, 
    status: string, 
    additionalData?: any
  ): Promise<void> {
    try {
      const updateFields = ['status = $3', 'updated_at = CURRENT_TIMESTAMP'];
      const params = [migrationId, tenantId, status];
      let paramIndex = 4;

      if (additionalData) {
        if (additionalData.appliedAt) {
          updateFields.push(`applied_at = $${paramIndex++}`);
          params.push(additionalData.appliedAt);
        }
        if (additionalData.rolledBackAt) {
          updateFields.push(`rolled_back_at = $${paramIndex++}`);
          params.push(additionalData.rolledBackAt);
        }
        if (additionalData.error !== undefined) {
          updateFields.push(`error = $${paramIndex++}`);
          params.push(additionalData.error);
        }
        if (additionalData.executionTime) {
          updateFields.push(`execution_time = $${paramIndex++}`);
          params.push(additionalData.executionTime);
        }
      }

      await db.query(`
        INSERT INTO tenant_migration_status (migration_id, tenant_id, status)
        VALUES ($1, $2, $3)
        ON CONFLICT (migration_id, tenant_id)
        DO UPDATE SET ${updateFields.join(', ')}
      `, params);
    } catch (error) {
      console.error('Error updating migration status:', error);
    }
  }

  private async getOrderedMigrations(): Promise<MigrationDefinition[]> {
    try {
      const result = await db.query(`
        SELECT 
          id,
          name,
          description,
          up_sql as "upSql",
          down_sql as "downSql",
          tenant_specific as "tenantSpecific",
          dependencies,
          created_at as "createdAt"
        FROM tenant_migration_definitions
        ORDER BY created_at ASC
      `);

      return result.rows.map(row => {
        let dependencies = [];
        
        try {
          if (row.dependencies) {
            if (typeof row.dependencies === 'string') {
              dependencies = JSON.parse(row.dependencies);
            } else if (Array.isArray(row.dependencies)) {
              dependencies = row.dependencies;
            }
          }
        } catch (parseError) {
          console.warn(`Failed to parse dependencies for migration ${row.id}:`, parseError);
          dependencies = [];
        }
        
        return {
          ...row,
          dependencies
        };
      });
    } catch (error: any) {
      throw new Error(`Failed to get ordered migrations: ${error.message}`);
    }
  }

  private async getAppliedMigrations(tenantId?: string): Promise<string[]> {
    try {
      let query = `
        SELECT migration_id
        FROM tenant_migration_status
        WHERE status = 'completed'
      `;

      const params: any[] = [];

      if (tenantId) {
        query += ' AND tenant_id = $1';
        params.push(tenantId);
      } else {
        query += ' AND tenant_id IS NULL';
      }

      const result = await db.query(query, params);
      return result.rows.map(row => row.migration_id);
    } catch (error) {
      return [];
    }
  }
}

// Singleton instance
export const tenantMigrationService = new TenantMigrationService();