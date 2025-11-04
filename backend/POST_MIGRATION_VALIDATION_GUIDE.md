# Post-Migration Referential Integrity Validation Guide

## Overview

This guide provides comprehensive instructions for validating referential integrity after the inventory tenant migration. The validation tools ensure that all inventory records have valid tenant_id assignments, check foreign key relationships within tenant boundaries, validate no cross-tenant references exist, and create detailed reports on migration success and data inconsistencies.

## Validation Tools

### 1. JavaScript Validator (`post-migration-referential-integrity-validator.js`)

**Purpose**: Comprehensive programmatic validation with detailed reporting and optional issue fixing.

**Features**:
- Validates tenant_id assignments across all inventory tables
- Checks foreign key relationships within tenant boundaries
- Detects cross-tenant reference violations
- Validates data consistency (quantities, duplicates)
- Generates tenant distribution reports
- Optional automatic fixing of minor issues
- Exports detailed JSON reports

**Usage**:
```bash
# Basic validation
node backend/scripts/post-migration-referential-integrity-validator.js

# Detailed validation with verbose output
node backend/scripts/post-migration-referential-integrity-validator.js --detailed --verbose

# Validation with automatic minor issue fixing
node backend/scripts/post-migration-referential-integrity-validator.js --fix-minor-issues

# Full validation with report export
node backend/scripts/post-migration-referential-integrity-validator.js --detailed --export-report --fix-minor-issues
```

**Command Line Options**:
- `--detailed`: Include detailed analysis and sample data
- `--export-report`: Export comprehensive JSON report
- `--fix-minor-issues`: Automatically fix minor issues (orphaned records, missing tenant_id)
- `--verbose` or `-v`: Verbose logging with query details

### 2. SQL Validator (`post-migration-referential-integrity-validation.sql`)

**Purpose**: Direct database validation with immediate SQL results.

**Features**:
- Real-time SQL validation queries
- Immediate console output with status indicators
- Comprehensive checks across all inventory tables
- Built-in recommendations based on findings
- No external dependencies

**Usage**:
```bash
# Run SQL validation directly
psql -d gestao_escolar -f backend/scripts/post-migration-referential-integrity-validation.sql

# Run with connection parameters
psql -h localhost -p 5432 -U postgres -d gestao_escolar -f backend/scripts/post-migration-referential-integrity-validation.sql

# Save output to file
psql -d gestao_escolar -f backend/scripts/post-migration-referential-integrity-validation.sql > validation-report.txt 2>&1
```

### 3. Test Suite (`test-post-migration-referential-integrity.js`)

**Purpose**: Automated testing of the validation tools to ensure they work correctly.

**Features**:
- Creates test scenarios with known issues
- Validates that the validator detects expected problems
- Tests all validation functions
- Automatic cleanup of test data

**Usage**:
```bash
# Run validation tests
node backend/test-post-migration-referential-integrity.js
```

## Validation Checklist

### Pre-Validation Requirements

Before running the validation tools, ensure:

1. **Migration Completed**: The inventory tenant migration has been executed
2. **Database Access**: You have appropriate database connection credentials
3. **Backup Available**: A recent database backup exists (recommended)
4. **Environment Variables**: Database connection variables are set

```bash
# Required environment variables
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=gestao_escolar
export DB_USER=postgres
export DB_PASSWORD=your_password
export DB_SSL=false  # or true for production
```

### Validation Steps

#### Step 1: Quick SQL Validation

Start with the SQL validator for immediate feedback:

```bash
psql -d gestao_escolar -f backend/scripts/post-migration-referential-integrity-validation.sql
```

**Expected Results**:
- ✅ All tenant_id columns exist and are populated
- ✅ No cross-tenant reference violations
- ✅ All foreign key relationships are valid within tenants
- ✅ Data distribution across tenants is reasonable

#### Step 2: Comprehensive JavaScript Validation

Run the comprehensive validator for detailed analysis:

```bash
node backend/scripts/post-migration-referential-integrity-validator.js --detailed --export-report
```

**Expected Results**:
- Success rate > 95%
- No critical issues
- Detailed tenant distribution report
- JSON report exported for documentation

#### Step 3: Fix Minor Issues (if needed)

If minor issues are found, run with auto-fix:

```bash
node backend/scripts/post-migration-referential-integrity-validator.js --fix-minor-issues --detailed
```

#### Step 4: Re-validate After Fixes

After fixing issues, re-run validation to confirm:

```bash
node backend/scripts/post-migration-referential-integrity-validator.js --detailed
```

## Validation Categories

### 1. Tenant ID Assignment Validation

**What it checks**:
- All inventory records have tenant_id assigned
- All tenant_id values reference valid tenants
- No NULL tenant_id values in critical tables

**Tables validated**:
- `estoque_escolas`
- `estoque_lotes`
- `estoque_escolas_historico`
- `estoque_movimentacoes`

**Success criteria**:
- 100% of records have valid tenant_id
- 0 invalid tenant_id references

### 2. Foreign Key Relationship Validation

**What it checks**:
- `estoque_escolas` → `escolas` (same tenant)
- `estoque_lotes` → `escolas` (same tenant)
- `estoque_movimentacoes` → `estoque_lotes` (same tenant)
- `estoque_escolas_historico` → `escolas` (same tenant)

**Success criteria**:
- 0 cross-tenant foreign key references
- 0 orphaned records (references to non-existent records)

### 3. Cross-Tenant Reference Validation

**What it checks**:
- No inventory records reference entities from different tenants
- Complete tenant isolation is maintained
- No data leakage between tenants

**Success criteria**:
- 0 cross-tenant violations detected
- Perfect tenant isolation maintained

### 4. Data Consistency Validation

**What it checks**:
- Quantity consistency between `estoque_escolas` and `estoque_lotes`
- No duplicate records within same tenant
- Referential integrity across related tables

**Success criteria**:
- >95% quantity consistency
- 0 duplicate records
- All relationships are valid

### 5. Tenant Distribution Validation

**What it checks**:
- Data is properly distributed across tenants
- No tenant has disproportionate data
- All active tenants have expected data

**Success criteria**:
- Reasonable data distribution
- All expected tenants have inventory data
- No unexpected data concentrations

## Interpreting Results

### Status Indicators

- ✅ **PASS**: Validation passed completely
- ⚠️ **WARNING**: Minor issues found, review recommended
- ❌ **FAIL**: Critical issues found, action required
- 🚨 **CRITICAL**: Severe issues, immediate action needed

### Common Issues and Solutions

#### Missing tenant_id Values

**Issue**: Some records don't have tenant_id assigned
**Solution**: 
```bash
# Auto-fix with validator
node backend/scripts/post-migration-referential-integrity-validator.js --fix-minor-issues

# Or manual SQL fix
UPDATE estoque_escolas 
SET tenant_id = (SELECT tenant_id FROM escolas WHERE id = estoque_escolas.escola_id)
WHERE tenant_id IS NULL;
```

#### Cross-Tenant References

**Issue**: Records reference entities from different tenants
**Severity**: CRITICAL - breaks tenant isolation
**Solution**: 
1. Identify the incorrect references
2. Update tenant_id to match the referenced entity's tenant
3. Or remove the invalid references if they're orphaned

#### Orphaned Records

**Issue**: Records reference non-existent entities
**Solution**:
```bash
# Auto-fix with validator
node backend/scripts/post-migration-referential-integrity-validator.js --fix-minor-issues

# Or manual cleanup
DELETE FROM estoque_movimentacoes 
WHERE lote_id NOT IN (SELECT id FROM estoque_lotes);
```

#### Quantity Inconsistencies

**Issue**: Quantities don't match between estoque_escolas and estoque_lotes
**Severity**: WARNING - data integrity issue
**Solution**: Review and reconcile quantities manually or run inventory recalculation

## Report Interpretation

### JavaScript Validator Report

The JavaScript validator generates a comprehensive JSON report with:

```json
{
  "timestamp": "2025-11-03T...",
  "summary": {
    "totalChecks": 25,
    "passedChecks": 23,
    "failedChecks": 2,
    "warningChecks": 0,
    "criticalIssues": 1,
    "minorIssues": 1,
    "successRate": "92.00",
    "status": "FAILURE"
  },
  "tenantDistribution": {
    "total_tenants": 3,
    "tenants_with_inventory": 2,
    "total_inventory_records": 1250,
    "tenant_stats": [...]
  },
  "issues": [...],
  "recommendations": [...]
}
```

**Key Metrics**:
- **Success Rate**: Percentage of checks that passed
- **Critical Issues**: Issues that break tenant isolation
- **Status**: Overall validation status

### SQL Validator Output

The SQL validator provides immediate console output with:
- Structured validation results
- Status indicators for each check
- Immediate recommendations
- Summary statistics

## Troubleshooting

### Common Problems

#### Database Connection Issues
```bash
# Check connection
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;"

# Verify environment variables
echo $DB_HOST $DB_PORT $DB_NAME $DB_USER
```

#### Permission Issues
```bash
# Ensure user has required permissions
GRANT SELECT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_user;
```

#### Memory Issues with Large Datasets
```bash
# Run validation in smaller chunks or increase Node.js memory
node --max-old-space-size=4096 backend/scripts/post-migration-referential-integrity-validator.js
```

### Performance Considerations

For large databases:
1. Run validation during low-traffic periods
2. Consider running checks individually rather than full validation
3. Use `--detailed` flag only when necessary
4. Monitor database performance during validation

## Post-Validation Steps

After successful validation:

1. **Set NOT NULL Constraints**:
```sql
ALTER TABLE estoque_escolas ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE estoque_lotes ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE estoque_escolas_historico ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE estoque_movimentacoes ALTER COLUMN tenant_id SET NOT NULL;
```

2. **Add Foreign Key Constraints**:
```sql
ALTER TABLE estoque_escolas ADD CONSTRAINT fk_estoque_escolas_tenant 
  FOREIGN KEY (tenant_id) REFERENCES tenants(id);
-- Repeat for other tables
```

3. **Enable Row Level Security** (if not already enabled):
```sql
ALTER TABLE estoque_escolas ENABLE ROW LEVEL SECURITY;
-- Repeat for other tables
```

4. **Create RLS Policies** (if not already created):
```sql
CREATE POLICY tenant_isolation_estoque_escolas ON estoque_escolas
  USING (tenant_id = get_current_tenant_id());
-- Repeat for other tables
```

5. **Document Results**: Save validation reports for audit purposes

## Maintenance

### Regular Validation

Consider running periodic validations:
- After major data imports
- Before production deployments
- Monthly integrity checks

### Monitoring

Set up monitoring for:
- Cross-tenant access attempts
- Orphaned record creation
- Quantity inconsistencies

## Support

If validation fails or you encounter issues:

1. Review the detailed error messages
2. Check the recommendations in the report
3. Consult the troubleshooting section
4. Run the test suite to verify validator functionality
5. Contact the development team with the validation report

## Files Reference

- `backend/scripts/post-migration-referential-integrity-validator.js` - Main JavaScript validator
- `backend/scripts/post-migration-referential-integrity-validation.sql` - SQL validator
- `backend/test-post-migration-referential-integrity.js` - Test suite
- `backend/POST_MIGRATION_VALIDATION_GUIDE.md` - This guide

## Version History

- **v1.0** (2025-11-03): Initial implementation with comprehensive validation suite