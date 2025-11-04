/**
 * Tenant configuration validation service
 * Handles validation, dependency checking, and schema enforcement
 */

import {
  ConfigurationSchema,
  ConfigurationDependency,
  ConfigurationValidationResult,
  ConfigurationValidationError,
  ConfigurationValidationWarning,
  ConfigurationChange,
  DEFAULT_CONFIGURATION_SCHEMAS,
  CONFIG_ERROR_CODES
} from '../types/tenantConfiguration';

export class TenantConfigurationValidator {
  private schemas: Map<string, ConfigurationSchema> = new Map();

  constructor(customSchemas?: ConfigurationSchema[]) {
    // Load default schemas
    this.loadSchemas(DEFAULT_CONFIGURATION_SCHEMAS);
    
    // Load custom schemas if provided
    if (customSchemas) {
      this.loadSchemas(customSchemas);
    }
  }

  /**
   * Load configuration schemas
   */
  private loadSchemas(schemas: ConfigurationSchema[]): void {
    for (const schema of schemas) {
      const key = `${schema.category}.${schema.key}`;
      this.schemas.set(key, schema);
    }
  }

  /**
   * Validate a complete configuration set
   */
  async validateConfiguration(
    configurations: Record<string, any>,
    existingConfigurations?: Record<string, any>
  ): Promise<ConfigurationValidationResult> {
    const errors: ConfigurationValidationError[] = [];
    const warnings: ConfigurationValidationWarning[] = [];

    // Validate each configuration against its schema
    for (const [category, categoryConfig] of Object.entries(configurations)) {
      if (typeof categoryConfig !== 'object' || categoryConfig === null) {
        errors.push({
          category,
          key: '',
          message: `Category ${category} must be an object`,
          code: CONFIG_ERROR_CODES.INVALID_TYPE
        });
        continue;
      }

      for (const [key, value] of Object.entries(categoryConfig)) {
        const schemaKey = `${category}.${key}`;
        const schema = this.schemas.get(schemaKey);

        if (!schema) {
          warnings.push({
            category,
            key,
            message: `Unknown configuration field: ${category}.${key}`,
            code: CONFIG_ERROR_CODES.UNKNOWN_FIELD
          });
          continue;
        }

        // Check if field is deprecated
        if (schema.deprecated) {
          warnings.push({
            category,
            key,
            message: `Configuration field ${category}.${key} is deprecated`,
            code: CONFIG_ERROR_CODES.DEPRECATED_FIELD
          });
        }

        // Validate field value
        const fieldErrors = this.validateField(schema, value);
        errors.push(...fieldErrors);
      }
    }

    // Check for required fields
    const requiredErrors = this.validateRequiredFields(configurations);
    errors.push(...requiredErrors);

    // Validate dependencies
    const dependencyErrors = await this.validateDependencies(configurations);
    errors.push(...dependencyErrors);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate configuration changes
   */
  async validateChanges(
    changes: ConfigurationChange[],
    currentConfigurations: Record<string, any>
  ): Promise<ConfigurationValidationResult> {
    const errors: ConfigurationValidationError[] = [];
    const warnings: ConfigurationValidationWarning[] = [];

    // Apply changes to create new configuration state
    const newConfigurations = this.applyChanges(currentConfigurations, changes);

    // Validate the resulting configuration
    const validationResult = await this.validateConfiguration(newConfigurations, currentConfigurations);
    
    return validationResult;
  }

  /**
   * Validate a single field against its schema
   */
  private validateField(schema: ConfigurationSchema, value: any): ConfigurationValidationError[] {
    const errors: ConfigurationValidationError[] = [];

    // Type validation
    if (!this.validateType(schema.type, value)) {
      errors.push({
        category: schema.category,
        key: schema.key,
        message: `Expected type ${schema.type}, got ${typeof value}`,
        code: CONFIG_ERROR_CODES.INVALID_TYPE
      });
      return errors; // Don't continue if type is wrong
    }

    // Value validation
    if (schema.validation) {
      const validationErrors = this.validateValue(schema, value);
      errors.push(...validationErrors);
    }

    return errors;
  }

  /**
   * Validate field type
   */
  private validateType(expectedType: string, value: any): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      default:
        return true;
    }
  }

  /**
   * Validate field value against validation rules
   */
  private validateValue(schema: ConfigurationSchema, value: any): ConfigurationValidationError[] {
    const errors: ConfigurationValidationError[] = [];
    const validation = schema.validation!;

    // Min/Max validation for numbers
    if (typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        errors.push({
          category: schema.category,
          key: schema.key,
          message: `Value ${value} is less than minimum ${validation.min}`,
          code: CONFIG_ERROR_CODES.INVALID_VALUE
        });
      }
      if (validation.max !== undefined && value > validation.max) {
        errors.push({
          category: schema.category,
          key: schema.key,
          message: `Value ${value} is greater than maximum ${validation.max}`,
          code: CONFIG_ERROR_CODES.INVALID_VALUE
        });
      }
    }

    // Pattern validation for strings
    if (typeof value === 'string' && validation.pattern) {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        errors.push({
          category: schema.category,
          key: schema.key,
          message: `Value "${value}" does not match required pattern`,
          code: CONFIG_ERROR_CODES.INVALID_VALUE
        });
      }
    }

    // Enum validation
    if (validation.enum && !validation.enum.includes(value)) {
      errors.push({
        category: schema.category,
        key: schema.key,
        message: `Value "${value}" is not one of allowed values: ${validation.enum.join(', ')}`,
        code: CONFIG_ERROR_CODES.INVALID_VALUE
      });
    }

    // Custom validation
    if (validation.custom) {
      const customResult = validation.custom(value);
      if (customResult !== true) {
        errors.push({
          category: schema.category,
          key: schema.key,
          message: typeof customResult === 'string' ? customResult : 'Custom validation failed',
          code: CONFIG_ERROR_CODES.VALIDATION_FAILED
        });
      }
    }

    return errors;
  }

  /**
   * Validate required fields
   */
  private validateRequiredFields(configurations: Record<string, any>): ConfigurationValidationError[] {
    const errors: ConfigurationValidationError[] = [];

    for (const schema of this.schemas.values()) {
      if (!schema.required) continue;

      const categoryConfig = configurations[schema.category];
      if (!categoryConfig || categoryConfig[schema.key] === undefined) {
        errors.push({
          category: schema.category,
          key: schema.key,
          message: `Required field ${schema.category}.${schema.key} is missing`,
          code: CONFIG_ERROR_CODES.REQUIRED_FIELD_MISSING
        });
      }
    }

    return errors;
  }

  /**
   * Validate configuration dependencies
   */
  private async validateDependencies(configurations: Record<string, any>): Promise<ConfigurationValidationError[]> {
    const errors: ConfigurationValidationError[] = [];

    for (const schema of this.schemas.values()) {
      if (!schema.dependencies) continue;

      const currentValue = configurations[schema.category]?.[schema.key];
      if (currentValue === undefined) continue;

      for (const dependency of schema.dependencies) {
        const dependencyValue = configurations[dependency.category]?.[dependency.key];
        
        if (!this.checkDependencyCondition(dependency, dependencyValue)) {
          errors.push({
            category: schema.category,
            key: schema.key,
            message: dependency.errorMessage || 
              `Dependency not met: ${dependency.category}.${dependency.key} must ${dependency.condition} ${dependency.value}`,
            code: CONFIG_ERROR_CODES.DEPENDENCY_NOT_MET
          });
        }
      }
    }

    return errors;
  }

  /**
   * Check if a dependency condition is met
   */
  private checkDependencyCondition(dependency: ConfigurationDependency, actualValue: any): boolean {
    switch (dependency.condition) {
      case 'equals':
        return actualValue === dependency.value;
      case 'not_equals':
        return actualValue !== dependency.value;
      case 'greater_than':
        return typeof actualValue === 'number' && actualValue > dependency.value;
      case 'less_than':
        return typeof actualValue === 'number' && actualValue < dependency.value;
      case 'exists':
        return actualValue !== undefined && actualValue !== null;
      case 'not_exists':
        return actualValue === undefined || actualValue === null;
      default:
        return true;
    }
  }

  /**
   * Apply configuration changes to current configuration
   */
  private applyChanges(
    currentConfigurations: Record<string, any>,
    changes: ConfigurationChange[]
  ): Record<string, any> {
    const newConfigurations = JSON.parse(JSON.stringify(currentConfigurations));

    for (const change of changes) {
      if (!newConfigurations[change.category]) {
        newConfigurations[change.category] = {};
      }

      switch (change.operation) {
        case 'create':
        case 'update':
          newConfigurations[change.category][change.key] = change.newValue;
          break;
        case 'delete':
          delete newConfigurations[change.category][change.key];
          break;
      }
    }

    return newConfigurations;
  }

  /**
   * Get schema for a specific field
   */
  getSchema(category: string, key: string): ConfigurationSchema | undefined {
    return this.schemas.get(`${category}.${key}`);
  }

  /**
   * Get all schemas for a category
   */
  getCategorySchemas(category: string): ConfigurationSchema[] {
    return Array.from(this.schemas.values()).filter(schema => schema.category === category);
  }

  /**
   * Get all schemas
   */
  getAllSchemas(): ConfigurationSchema[] {
    return Array.from(this.schemas.values());
  }

  /**
   * Add or update a schema
   */
  addSchema(schema: ConfigurationSchema): void {
    const key = `${schema.category}.${schema.key}`;
    this.schemas.set(key, schema);
  }

  /**
   * Remove a schema
   */
  removeSchema(category: string, key: string): void {
    const schemaKey = `${category}.${key}`;
    this.schemas.delete(schemaKey);
  }
}

// Singleton instance
export const tenantConfigurationValidator = new TenantConfigurationValidator();