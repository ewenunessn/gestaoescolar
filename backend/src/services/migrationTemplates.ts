/**
 * Migration Templates for Multi-Tenant Operations
 * Provides templates for common tenant migration patterns
 */

export interface MigrationTemplate {
  name: string;
  description: string;
  generateUpSql: (params: any) => string;
  generateDownSql: (params: any) => string;
}

export interface AddTenantIdParams {
  tableName: string;
  defaultTenantId?: string;
  nullable?: boolean;
  addIndex?: boolean;
  addForeignKey?: boolean;
}

export interface EnableRLSParams {
  tableName: string;
  policyName?: string;
  customPolicy?: string;
}

export interface CreateTenantTableParams {
  tableName: string;
  columns: Array<{
    name: string;
    type: string;
    constraints?: string;
  }>;
  indexes?: Array<{
    name: string;
    columns: string[];
    unique?: boolean;
  }>;
}

/**
 * Template for adding tenant_id column to existing tables
 */
export const addTenantIdTemplate: MigrationTemplate = {
  name: 'add_tenant_id',
  description: 'Add tenant_id column to existing table with proper constraints and indexes',
  
  generateUpSql: (params: AddTenantIdParams) => {
    const { tableName, defaultTenantId, nullable = false, addIndex = true, addForeignKey = true } = params;
    
    let sql = `-- Add tenant_id column to ${tableName}\n`;
    
    // Add column
    sql += `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS tenant_id UUID`;
    if (!nullable && defaultTenantId) {
      sql += ` DEFAULT '${defaultTenantId}'`;
    }
    if (!nullable) {
      sql += ` NOT NULL`;
    }
    sql += `;\n\n`;
    
    // Add foreign key constraint
    if (addForeignKey) {
      sql += `-- Add foreign key constraint\n`;
      sql += `ALTER TABLE ${tableName} ADD CONSTRAINT fk_${tableName}_tenant_id \n`;
      sql += `  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;\n\n`;
    }
    
    // Add index
    if (addIndex) {
      sql += `-- Add index for performance\n`;
      sql += `CREATE INDEX IF NOT EXISTS idx_${tableName}_tenant_id ON ${tableName}(tenant_id);\n\n`;
    }
    
    // Update existing records if default tenant provided
    if (defaultTenantId && nullable) {
      sql += `-- Update existing records with default tenant\n`;
      sql += `UPDATE ${tableName} SET tenant_id = '${defaultTenantId}' WHERE tenant_id IS NULL;\n\n`;
      
      // Make column NOT NULL after updating
      sql += `-- Make column NOT NULL after updating existing records\n`;
      sql += `ALTER TABLE ${tableName} ALTER COLUMN tenant_id SET NOT NULL;\n\n`;
    }
    
    return sql;
  },
  
  generateDownSql: (params: AddTenantIdParams) => {
    const { tableName, addIndex = true, addForeignKey = true } = params;
    
    let sql = `-- Remove tenant_id column from ${tableName}\n`;
    
    // Drop foreign key constraint
    if (addForeignKey) {
      sql += `ALTER TABLE ${tableName} DROP CONSTRAINT IF EXISTS fk_${tableName}_tenant_id;\n`;
    }
    
    // Drop index
    if (addIndex) {
      sql += `DROP INDEX IF EXISTS idx_${tableName}_tenant_id;\n`;
    }
    
    // Drop column
    sql += `ALTER TABLE ${tableName} DROP COLUMN IF EXISTS tenant_id;\n`;
    
    return sql;
  }
};

/**
 * Template for enabling Row Level Security on tables
 */
export const enableRLSTemplate: MigrationTemplate = {
  name: 'enable_rls',
  description: 'Enable Row Level Security with tenant isolation policy',
  
  generateUpSql: (params: EnableRLSParams) => {
    const { tableName, policyName, customPolicy } = params;
    const defaultPolicyName = policyName || `tenant_isolation_${tableName}`;
    
    let sql = `-- Enable Row Level Security for ${tableName}\n`;
    
    // Enable RLS
    sql += `ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;\n\n`;
    
    // Create policy
    sql += `-- Create tenant isolation policy\n`;
    if (customPolicy) {
      sql += `CREATE POLICY ${defaultPolicyName} ON ${tableName}\n`;
      sql += `  ${customPolicy};\n\n`;
    } else {
      sql += `CREATE POLICY ${defaultPolicyName} ON ${tableName}\n`;
      sql += `  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);\n\n`;
    }
    
    // Grant permissions to application role
    sql += `-- Grant permissions to application role\n`;
    sql += `GRANT ALL ON ${tableName} TO postgres;\n`;
    
    return sql;
  },
  
  generateDownSql: (params: EnableRLSParams) => {
    const { tableName, policyName } = params;
    const defaultPolicyName = policyName || `tenant_isolation_${tableName}`;
    
    let sql = `-- Disable Row Level Security for ${tableName}\n`;
    
    // Drop policy
    sql += `DROP POLICY IF EXISTS ${defaultPolicyName} ON ${tableName};\n`;
    
    // Disable RLS
    sql += `ALTER TABLE ${tableName} DISABLE ROW LEVEL SECURITY;\n`;
    
    return sql;
  }
};

/**
 * Template for creating new tenant-aware tables
 */
export const createTenantTableTemplate: MigrationTemplate = {
  name: 'create_tenant_table',
  description: 'Create new table with tenant_id column and proper constraints',
  
  generateUpSql: (params: CreateTenantTableParams) => {
    const { tableName, columns, indexes = [] } = params;
    
    let sql = `-- Create tenant-aware table ${tableName}\n`;
    
    // Create table
    sql += `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;
    sql += `  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
    sql += `  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,\n`;
    
    // Add custom columns
    columns.forEach(column => {
      sql += `  ${column.name} ${column.type}`;
      if (column.constraints) {
        sql += ` ${column.constraints}`;
      }
      sql += `,\n`;
    });
    
    sql += `  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n`;
    sql += `  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
    sql += `);\n\n`;
    
    // Create indexes
    sql += `-- Create tenant index\n`;
    sql += `CREATE INDEX idx_${tableName}_tenant_id ON ${tableName}(tenant_id);\n\n`;
    
    indexes.forEach(index => {
      sql += `-- Create ${index.name} index\n`;
      const indexType = index.unique ? 'UNIQUE INDEX' : 'INDEX';
      sql += `CREATE ${indexType} ${index.name} ON ${tableName}(${index.columns.join(', ')});\n`;
    });
    
    if (indexes.length > 0) {
      sql += `\n`;
    }
    
    // Enable RLS
    sql += `-- Enable Row Level Security\n`;
    sql += `ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;\n\n`;
    
    // Create tenant isolation policy
    sql += `-- Create tenant isolation policy\n`;
    sql += `CREATE POLICY tenant_isolation_${tableName} ON ${tableName}\n`;
    sql += `  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);\n`;
    
    return sql;
  },
  
  generateDownSql: (params: CreateTenantTableParams) => {
    const { tableName } = params;
    
    return `-- Drop tenant-aware table ${tableName}\n` +
           `DROP TABLE IF EXISTS ${tableName} CASCADE;\n`;
  }
};

/**
 * Template for migrating data between tenant structures
 */
export const dataMigrationTemplate: MigrationTemplate = {
  name: 'data_migration',
  description: 'Migrate data with tenant context',
  
  generateUpSql: (params: any) => {
    const { 
      sourceTable, 
      targetTable, 
      columnMapping = {}, 
      tenantId, 
      whereClause = '',
      transformations = {}
    } = params;
    
    let sql = `-- Migrate data from ${sourceTable} to ${targetTable}\n`;
    
    // Build column lists
    const sourceColumns = Object.keys(columnMapping).length > 0 
      ? Object.keys(columnMapping) 
      : ['*'];
    const targetColumns = Object.keys(columnMapping).length > 0 
      ? Object.values(columnMapping) 
      : [];
    
    sql += `INSERT INTO ${targetTable} (\n`;
    if (targetColumns.length > 0) {
      sql += `  ${targetColumns.join(',\n  ')},\n`;
    }
    sql += `  tenant_id\n`;
    sql += `) SELECT \n`;
    
    if (sourceColumns.includes('*')) {
      sql += `  *,\n`;
    } else {
      sourceColumns.forEach((col, index) => {
        const transformation = transformations[col];
        const sourceCol = transformation ? transformation : col;
        sql += `  ${sourceCol}`;
        if (index < sourceColumns.length - 1) {
          sql += `,`;
        }
        sql += `\n`;
      });
      sql += `,\n`;
    }
    
    sql += `  '${tenantId}'::UUID as tenant_id\n`;
    sql += `FROM ${sourceTable}`;
    
    if (whereClause) {
      sql += `\nWHERE ${whereClause}`;
    }
    
    sql += `;\n`;
    
    return sql;
  },
  
  generateDownSql: (params: any) => {
    const { targetTable, tenantId, whereClause = '' } = params;
    
    let sql = `-- Remove migrated data from ${targetTable}\n`;
    sql += `DELETE FROM ${targetTable} WHERE tenant_id = '${tenantId}'`;
    
    if (whereClause) {
      sql += ` AND ${whereClause}`;
    }
    
    sql += `;\n`;
    
    return sql;
  }
};

/**
 * Template for updating existing data with tenant context
 */
export const updateTenantDataTemplate: MigrationTemplate = {
  name: 'update_tenant_data',
  description: 'Update existing records with tenant information',
  
  generateUpSql: (params: any) => {
    const { 
      tableName, 
      tenantId, 
      whereClause = '', 
      additionalUpdates = {} 
    } = params;
    
    let sql = `-- Update existing records in ${tableName} with tenant context\n`;
    
    const updateClauses = [`tenant_id = '${tenantId}'`];
    
    // Add additional updates
    Object.entries(additionalUpdates).forEach(([column, value]) => {
      updateClauses.push(`${column} = ${value}`);
    });
    
    sql += `UPDATE ${tableName} SET \n`;
    sql += `  ${updateClauses.join(',\n  ')}\n`;
    
    if (whereClause) {
      sql += `WHERE ${whereClause}`;
    } else {
      sql += `WHERE tenant_id IS NULL`;
    }
    
    sql += `;\n`;
    
    return sql;
  },
  
  generateDownSql: (params: any) => {
    const { tableName, whereClause = '' } = params;
    
    let sql = `-- Reset tenant_id in ${tableName}\n`;
    sql += `UPDATE ${tableName} SET tenant_id = NULL`;
    
    if (whereClause) {
      sql += ` WHERE ${whereClause}`;
    }
    
    sql += `;\n`;
    
    return sql;
  }
};

/**
 * Get all available migration templates
 */
export const migrationTemplates: Record<string, MigrationTemplate> = {
  addTenantId: addTenantIdTemplate,
  enableRLS: enableRLSTemplate,
  createTenantTable: createTenantTableTemplate,
  dataMigration: dataMigrationTemplate,
  updateTenantData: updateTenantDataTemplate
};

/**
 * Generate migration SQL from template
 */
export function generateMigrationFromTemplate(
  templateName: string, 
  params: any
): { upSql: string; downSql: string } {
  const template = migrationTemplates[templateName];
  
  if (!template) {
    throw new Error(`Migration template not found: ${templateName}`);
  }
  
  return {
    upSql: template.generateUpSql(params),
    downSql: template.generateDownSql(params)
  };
}

/**
 * Generate migration for adding tenant_id to multiple tables
 */
export function generateBulkTenantIdMigration(
  tableNames: string[], 
  defaultTenantId?: string
): { upSql: string; downSql: string } {
  let upSql = `-- Bulk add tenant_id to multiple tables\n\n`;
  let downSql = `-- Bulk remove tenant_id from multiple tables\n\n`;
  
  tableNames.forEach(tableName => {
    const migration = generateMigrationFromTemplate('addTenantId', {
      tableName,
      defaultTenantId,
      nullable: false,
      addIndex: true,
      addForeignKey: true
    });
    
    upSql += migration.upSql + '\n';
    downSql += migration.downSql + '\n';
  });
  
  return { upSql, downSql };
}

/**
 * Generate migration for enabling RLS on multiple tables
 */
export function generateBulkRLSMigration(tableNames: string[]): { upSql: string; downSql: string } {
  let upSql = `-- Bulk enable RLS on multiple tables\n\n`;
  let downSql = `-- Bulk disable RLS on multiple tables\n\n`;
  
  tableNames.forEach(tableName => {
    const migration = generateMigrationFromTemplate('enableRLS', {
      tableName
    });
    
    upSql += migration.upSql + '\n';
    downSql += migration.downSql + '\n';
  });
  
  return { upSql, downSql };
}