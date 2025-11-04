# Implementation Plan

- [x] 1. Database Schema Enhancement for Tenant Support

  - Add tenant_id columns to all inventory-related tables
  - Create tenant-aware composite indexes for optimal query performance
  - Implement Row Level Security (RLS) policies for automatic tenant filtering
  - Create database triggers to automatically set tenant_id on record insertion
  - _Requirements: 1.1, 1.2, 5.1, 5.2, 9.1_

- [x] 1.1 Add tenant_id columns to inventory tables


  - Execute ALTER TABLE statements to add tenant_id UUID columns (nullable initially) to estoque_escolas, estoque_lotes, and estoque_escolas_historico tables
  - Add missing columns to tables if schema is inconsistent (e.g., escola_id in estoque_lotes)
  - Add foreign key constraints referencing tenants(id) table after data population
  - Ensure all inventory tables have proper structure before tenant implementation
  - _Requirements: 1.1, 1.2_

- [x] 1.2 Create tenant-aware database indexes

  - Create composite indexes with tenant_id as the first column for optimal filtering performance
  - Implement indexes for common query patterns: (tenant_id, escola_id), (tenant_id, produto_id), (tenant_id, escola_id, produto_id)
  - Add conditional indexes for active inventory items and expiring batches
  - _Requirements: 5.1, 5.2, 9.1_

- [x] 1.3 Implement Row Level Security policies

  - Enable RLS on estoque_escolas, estoque_lotes, and estoque_escolas_historico tables
  - Create tenant isolation policies using get_current_tenant_id() function
  - Test RLS policies to ensure proper tenant data filtering
  - _Requirements: 1.1, 1.2, 9.1_

- [x] 1.4 Create automatic tenant_id assignment triggers

  - Implement database trigger function to automatically set tenant_id on INSERT operations
  - Create triggers for all inventory tables to ensure tenant_id is always populated
  - Test trigger functionality with sample data insertions
  - _Requirements: 1.1, 1.2_

- [x] 2. Backend Controller Enhancement with Tenant Context

  - Enhance existing inventory controllers to use tenant context from middleware
  - Implement tenant ownership validation for all inventory operations
  - Add comprehensive error handling for tenant-specific scenarios
  - Update inventory movement controllers with tenant-aware logic
  - _Requirements: 3.1, 3.2, 3.3, 2.1, 2.2_

- [x] 2.1 Enhance estoqueEscolaController with tenant context



  - Modify listarEstoqueEscola function to use setTenantContextFromRequest
  - Add tenant ownership validation for school access
  - Update all inventory query functions to leverage RLS automatic filtering
  - Implement tenant-specific error handling and logging
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 2.2 Implement tenant validation services






  - Create TenantInventoryValidator class with methods for validating school, product, and inventory item ownership
  - Implement validateSchoolTenantOwnership, validateProductTenantOwnership, and validateInventoryItemTenantOwnership methods
  - Add bulk validation method for multiple entities
  - Create comprehensive error classes for tenant ownership violations
  - _Requirements: 1.4, 2.4, 9.2_

- [x] 2.3 Update inventory movement controllers






  - Enhance registrarMovimentacao function with tenant context validation
  - Add tenant ownership checks for schools and products in movement operations
  - Update movement history queries to respect tenant boundaries
  - Implement tenant-aware audit logging for all inventory movements
  - _Requirements: 2.1, 2.2, 2.3, 6.1, 6.2_

- [x] 2.4 Add comprehensive tenant error handling



  - Create TenantOwnershipError, TenantInventoryLimitError, and CrossTenantInventoryAccessError classes
  - Implement handleTenantInventoryError function for consistent error responses
  - Add tenant context to all error logs and audit trails
  - Create user-friendly error messages for tenant-related failures
  - _Requirements: 1.5, 6.4, 9.4_

- [x] 3. Frontend Integration with Tenant Context







  - Update React Query hooks to include tenant context in API calls
  - Enhance inventory pages to handle tenant-specific data and errors
  - Implement tenant-aware filtering and validation in frontend components
  - Add tenant context to inventory navigation and breadcrumbs
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 3.1 Update React Query hooks for tenant context


  - Modify useEstoqueEscolarResumo and useMatrizEstoque hooks to include tenant information
  - Add tenant validation to hook parameters and error handling
  - Implement automatic tenant context inclusion in all inventory API calls

  - Add tenant-specific caching keys for query optimization
  
  - _Requirements: 4.1, 4.2_

- [x] 3.2 Enhance EstoqueEscolar page with tenant awareness


  - Update EstoqueEscolarPage component to handle tenant context from TenantContext
  - Add tenant-specific error handling for ownership and access violations
  - Implement tenant-aware loading states and error messages
  - Ensure all inventory operations respect tenant boundaries
  - _Requirements: 4.2, 4.3, 4.4_

- [x] 3.3 Update MovimentacaoEstoque page for tenant support


  - Enhance MovimentacaoEstoquePage component with tenant context integration
  - Add tenant validation for school and product selection
  - Implement tenant-specific error handling for movement operations
  - Update inventory movement forms to include tenant validation
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 3.4 Implement tenant-aware inventory components


  - Update inventory list components to display only tenant-scoped data
  - Add tenant context to inventory filters and search functionality
  - Implement tenant-specific branding and configuration display
  - Create tenant-aware navigation and breadcrumb components
  - _Requirements: 4.3, 4.4, 4.5_

- [-] 4. Data Migration and Tenant Assigmnment






  - Create migration scripts to assign existing inventory data to appropriate tenants
  - Implement data validation and integrity checks for tenant assignments
  - Create rollback mechanisms for migration failures
  - Validate referential integrity between schools, products, and inventory records
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 4.1 Create inventory data migration scripts



  - Handle database schema inconsistencies before tenant migration
  - Add missing escola_id column to estoque_lotes table if not present
  - Make tenant_id columns nullable initially to avoid constraint violations
  - Handle foreign key constraints properly during data cleanup (estoque_movimentacoes -> estoque_lotes)
  - Develop SQL scripts to assign tenant_id to existing estoque_escolas records based on school ownership
  - Create migration for estoque_lotes records using proper escola_id to tenant mapping
  - Implement migration for estoque_escolas_historico records with proper tenant assignment
  - Add comprehensive data validation queries to verify migration accuracy and referential integrity
  - Set tenant_id columns to NOT NULL after successful data population
  - _Requirements: 7.1, 7.2, 7.4_

- [x] 4.1.1 Fix database constraint issues for tenant migration



  - Analyze current database schema to identify missing columns and constraint conflicts
  - Add missing escola_id column to estoque_lotes table with proper foreign key constraints
  - Temporarily disable foreign key constraints during data migration if necessary
  - Create safe data cleanup procedures that respect referential integrity
  - Implement constraint re-enabling procedures after successful migration
  - _Requirements: 7.1, 7.4_

- [x] 4.2 Implement migration validation and rollback





  - Create validation scripts to check data integrity after tenant assignment
  - Implement rollback procedures for failed migrations
  - Add comprehensive logging for migration operations
  - Create verification queries to ensure no data loss during migration
  - _Requirements: 7.2, 7.3, 7.5_

- [x] 4.3 Validate referential integrity post-migration





  - Verify all inventory records have valid tenant_id assignments
  - Check foreign key relationships between schools, products, and inventory items within tenant boundaries
  - Validate that no cross-tenant references exist in inventory data
  - Create reports on migration success and any data inconsistencies
  - _Requirements: 7.4, 7.5_

- [-] 5. Testing and Quality Assurance



  - Implement comprehensive unit tests for tenant validation and isolation
  - Create integration tests for end-to-end tenant inventory workflows
  - Develop performance tests for tenant-scoped inventory queries
  - Add security tests to verify cross-tenant access prevention
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 5.1 Create unit tests for tenant validation


  - Write tests for TenantInventoryValidator class methods
  - Test tenant ownership validation for schools, products, and inventory items
  - Create tests for tenant-specific error handling and error classes
  - Implement tests for database trigger functionality and RLS policies
  - _Requirements: 8.1, 8.4_

- [x] 5.2 Implement integration tests for tenant isolation


  - Create end-to-end tests that verify complete inventory data isolation between tenants
  - Test inventory operations (create, read, update, delete) with multiple tenant contexts
  - Verify that inventory movements respect tenant boundaries
  - Test API endpoints with different tenant contexts to ensure proper filtering
  - _Requirements: 8.1, 8.2, 8.5_

- [x] 5.3 Develop performance tests for tenant queries


  - Create performance benchmarks for inventory queries with tenant filtering
  - Test query performance with large datasets across multiple tenants
  - Verify index effectiveness for tenant-scoped inventory operations
  - Implement load testing for concurrent tenant inventory access
  - _Requirements: 8.3, 5.3, 5.4_

- [ ]* 5.4 Add security tests for cross-tenant access prevention
  - Test attempts to access inventory data across tenant boundaries
  - Verify RLS policy effectiveness in preventing unauthorized data access
  - Test API security with manipulated tenant context headers
  - Create tests for privilege escalation prevention in inventory operations
  - _Requirements: 8.2, 9.2, 9.3, 9.4_

- [ ] 6. Performance Optimization and Monitoring
  - Implement tenant-aware caching strategies for inventory data
  - Optimize database queries for multi-tenant inventory operations
  - Add monitoring and alerting for tenant-specific inventory performance
  - Create performance dashboards for tenant inventory metrics
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 6.1 Implement tenant-aware inventory caching








  - Create TenantInventoryCache class with tenant-scoped cache keys
  - Implement caching for frequently accessed inventory data (product lists, school inventories)
  - Add cache invalidation strategies for inventory updates and movements
  - Configure Redis caching with tenant-prefixed keys for inventory operations
  - _Requirements: 10.1, 10.3_

- [x] 6.2 Optimize inventory database queries



  - Analyze and optimize slow inventory queries using EXPLAIN ANALYZE
  - Implement query result pagination for large inventory datasets
  - Add database connection pooling optimizations for tenant-scoped operations
  - Create materialized views for complex inventory reporting queries
  - _Requirements: 10.2, 10.4_

- [ ]* 6.3 Add inventory performance monitoring
  - Implement metrics collection for tenant-specific inventory query performance
  - Create alerts for slow inventory operations and high resource usage
  - Add monitoring dashboards for inventory API response times per tenant
  - Implement logging and analytics for inventory usage patterns by tenant
  - _Requirements: 10.5, 5.5_

- [ ] 6.4 Handle database constraint violations during migration
  - Create scripts to safely handle estoque_movimentacoes foreign key constraints to estoque_lotes
  - Implement proper data cleanup procedures that maintain referential integrity
  - Add validation to ensure produtos table can accept tenant_id without constraint violations
  - Create procedures to handle missing columns in inventory tables (escola_id in estoque_lotes)
  - Implement constraint checking and repair utilities for inventory tables
  - _Requirements: 7.1, 7.4, 7.5_

- [ ] 7. Documentation and Deployment
  - Create comprehensive documentation for tenant inventory implementation
  - Update API documentation with tenant context requirements
  - Prepare deployment scripts and configuration for production
  - Create operational runbooks for tenant inventory management
  - _Requirements: 3.5, 6.3, 7.5_

- [ ] 7.1 Create implementation documentation
  - Document tenant inventory architecture and design decisions
  - Create developer guide for working with tenant-aware inventory code
  - Write database schema documentation for inventory tenant support
  - Document migration procedures and rollback processes
  - _Requirements: 3.5, 7.5_

- [ ] 7.2 Update API documentation
  - Update OpenAPI/Swagger documentation with tenant context requirements
  - Document new error codes and responses for tenant-related failures
  - Create examples of tenant-aware inventory API calls
  - Document authentication and authorization requirements for inventory endpoints
  - _Requirements: 6.3_

- [ ]* 7.3 Prepare deployment and operational procedures
  - Create deployment scripts for database migrations and schema updates
  - Write operational runbooks for tenant inventory troubleshooting
  - Document monitoring and alerting setup for tenant inventory operations
  - Create backup and recovery procedures for tenant inventory data
  - _Requirements: 7.5, 10.5_