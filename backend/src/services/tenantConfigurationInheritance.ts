/**
 * Tenant configuration inheritance service
 * Handles configuration inheritance from parent tenants and default templates
 */

import {
  ConfigurationInheritanceRule,
  TenantConfigurationTemplate,
  DEFAULT_INHERITANCE_RULES,
  DEFAULT_CONFIGURATION_SCHEMAS
} from '../types/tenantConfiguration';
import { DEFAULT_TENANT_SETTINGS, DEFAULT_TENANT_LIMITS } from '../types/tenant';

export class TenantConfigurationInheritance {
  private inheritanceRules: Map<string, ConfigurationInheritanceRule> = new Map();
  private templates: Map<string, TenantConfigurationTemplate> = new Map();

  constructor() {
    this.loadDefaultRules();
    this.loadDefaultTemplates();
  }

  /**
   * Load default inheritance rules
   */
  private loadDefaultRules(): void {
    for (const rule of DEFAULT_INHERITANCE_RULES) {
      const key = `${rule.category}.${rule.key}`;
      this.inheritanceRules.set(key, rule);
    }
  }

  /**
   * Load default configuration templates
   */
  private loadDefaultTemplates(): void {
    // Default system template
    const defaultTemplate: TenantConfigurationTemplate = {
      id: 'default-system',
      name: 'Default System Configuration',
      description: 'Default configuration for all tenants',
      configurations: {
        features: DEFAULT_TENANT_SETTINGS.features,
        branding: DEFAULT_TENANT_SETTINGS.branding,
        notifications: DEFAULT_TENANT_SETTINGS.notifications,
        integrations: DEFAULT_TENANT_SETTINGS.integrations,
        limits: DEFAULT_TENANT_LIMITS
      },
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.templates.set(defaultTemplate.id, defaultTemplate);

    // Educational institution template
    const educationalTemplate: TenantConfigurationTemplate = {
      id: 'educational-institution',
      name: 'Educational Institution',
      description: 'Configuration template for educational institutions',
      configurations: {
        features: {
          ...DEFAULT_TENANT_SETTINGS.features,
          analytics: true
        },
        branding: {
          primaryColor: '#2e7d32',
          secondaryColor: '#1565c0'
        },
        notifications: {
          email: true,
          sms: true,
          push: true
        },
        integrations: {
          whatsapp: true,
          email: true,
          sms: true
        },
        limits: {
          ...DEFAULT_TENANT_LIMITS,
          maxSchools: 100,
          maxProducts: 2000
        }
      },
      targetTenantTypes: ['educational'],
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.templates.set(educationalTemplate.id, educationalTemplate);

    // Municipality template
    const municipalityTemplate: TenantConfigurationTemplate = {
      id: 'municipality',
      name: 'Municipality',
      description: 'Configuration template for municipalities',
      configurations: {
        features: {
          ...DEFAULT_TENANT_SETTINGS.features,
          analytics: true,
          reports: true
        },
        branding: {
          primaryColor: '#1976d2',
          secondaryColor: '#dc004e'
        },
        notifications: {
          email: true,
          sms: false,
          push: true
        },
        integrations: {
          whatsapp: false,
          email: true,
          sms: false
        },
        limits: {
          ...DEFAULT_TENANT_LIMITS,
          maxUsers: 500,
          maxSchools: 200,
          maxProducts: 5000,
          storageLimit: 5120
        }
      },
      targetTenantTypes: ['municipality'],
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.templates.set(municipalityTemplate.id, municipalityTemplate);
  }

  /**
   * Apply inheritance to tenant configuration
   */
  async applyInheritance(
    tenantConfiguration: Record<string, any>,
    parentConfiguration?: Record<string, any>,
    templateId?: string
  ): Promise<Record<string, any>> {
    let baseConfiguration: Record<string, any> = {};

    // Start with template configuration if specified
    if (templateId) {
      const template = this.templates.get(templateId);
      if (template) {
        baseConfiguration = JSON.parse(JSON.stringify(template.configurations));
      }
    } else {
      // Use default template
      const defaultTemplate = Array.from(this.templates.values()).find(t => t.isDefault);
      if (defaultTemplate) {
        baseConfiguration = JSON.parse(JSON.stringify(defaultTemplate.configurations));
      }
    }

    // Apply parent configuration if available
    if (parentConfiguration) {
      baseConfiguration = this.mergeConfigurations(baseConfiguration, parentConfiguration);
    }

    // Apply tenant-specific configuration
    const finalConfiguration = this.mergeConfigurations(baseConfiguration, tenantConfiguration);

    return finalConfiguration;
  }

  /**
   * Merge configurations based on inheritance rules
   */
  private mergeConfigurations(
    baseConfiguration: Record<string, any>,
    overrideConfiguration: Record<string, any>
  ): Record<string, any> {
    const result = JSON.parse(JSON.stringify(baseConfiguration));

    for (const [category, categoryConfig] of Object.entries(overrideConfiguration)) {
      if (typeof categoryConfig !== 'object' || categoryConfig === null) {
        result[category] = categoryConfig;
        continue;
      }

      if (!result[category]) {
        result[category] = {};
      }

      for (const [key, value] of Object.entries(categoryConfig)) {
        const rule = this.getInheritanceRule(category, key);
        
        switch (rule.inheritanceType) {
          case 'override':
            result[category][key] = value;
            break;
          
          case 'merge':
            if (typeof result[category][key] === 'object' && typeof value === 'object') {
              result[category][key] = this.mergeObjects(
                result[category][key],
                value,
                rule.mergeStrategy || 'deep'
              );
            } else {
              result[category][key] = value;
            }
            break;
          
          case 'append':
            if (Array.isArray(result[category][key]) && Array.isArray(value)) {
              result[category][key] = [...result[category][key], ...value];
            } else {
              result[category][key] = value;
            }
            break;
        }
      }
    }

    return result;
  }

  /**
   * Get inheritance rule for a specific field
   */
  private getInheritanceRule(category: string, key: string): ConfigurationInheritanceRule {
    // Try exact match first
    let rule = this.inheritanceRules.get(`${category}.${key}`);
    
    // Try wildcard match
    if (!rule) {
      rule = this.inheritanceRules.get(`${category}.*`);
    }
    
    // Default rule
    if (!rule) {
      rule = {
        category,
        key,
        inheritanceType: 'override'
      };
    }

    return rule;
  }

  /**
   * Merge objects based on strategy
   */
  private mergeObjects(base: any, override: any, strategy: 'deep' | 'shallow'): any {
    if (strategy === 'shallow') {
      return { ...base, ...override };
    }

    // Deep merge
    const result = { ...base };
    
    for (const [key, value] of Object.entries(override)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value) &&
          typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key])) {
        result[key] = this.mergeObjects(result[key], value, 'deep');
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Get configuration with inheritance applied
   */
  async getInheritedConfiguration(
    tenantId: string,
    tenantConfiguration: Record<string, any>,
    options?: {
      parentTenantId?: string;
      templateId?: string;
      includeDefaults?: boolean;
    }
  ): Promise<Record<string, any>> {
    let parentConfiguration: Record<string, any> | undefined;

    // Get parent configuration if specified
    if (options?.parentTenantId) {
      // This would typically fetch from database
      // For now, we'll use a placeholder
      parentConfiguration = {};
    }

    // Apply inheritance
    const inheritedConfiguration = await this.applyInheritance(
      tenantConfiguration,
      parentConfiguration,
      options?.templateId
    );

    // Add default values for missing required fields if requested
    if (options?.includeDefaults) {
      return this.addDefaultValues(inheritedConfiguration);
    }

    return inheritedConfiguration;
  }

  /**
   * Add default values for missing required fields
   */
  private addDefaultValues(configuration: Record<string, any>): Record<string, any> {
    const result = JSON.parse(JSON.stringify(configuration));

    for (const schema of DEFAULT_CONFIGURATION_SCHEMAS) {
      if (!schema.required || schema.defaultValue === undefined) {
        continue;
      }

      if (!result[schema.category]) {
        result[schema.category] = {};
      }

      if (result[schema.category][schema.key] === undefined) {
        result[schema.category][schema.key] = schema.defaultValue;
      }
    }

    return result;
  }

  /**
   * Get available templates
   */
  getTemplates(tenantType?: string): TenantConfigurationTemplate[] {
    const templates = Array.from(this.templates.values());
    
    if (tenantType) {
      return templates.filter(template => 
        template.isDefault || 
        !template.targetTenantTypes || 
        template.targetTenantTypes.includes(tenantType)
      );
    }

    return templates;
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): TenantConfigurationTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Add or update template
   */
  addTemplate(template: TenantConfigurationTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Remove template
   */
  removeTemplate(templateId: string): void {
    const template = this.templates.get(templateId);
    if (template && !template.isDefault) {
      this.templates.delete(templateId);
    }
  }

  /**
   * Add or update inheritance rule
   */
  addInheritanceRule(rule: ConfigurationInheritanceRule): void {
    const key = `${rule.category}.${rule.key}`;
    this.inheritanceRules.set(key, rule);
  }

  /**
   * Remove inheritance rule
   */
  removeInheritanceRule(category: string, key: string): void {
    const ruleKey = `${category}.${key}`;
    this.inheritanceRules.delete(ruleKey);
  }

  /**
   * Get all inheritance rules
   */
  getInheritanceRules(): ConfigurationInheritanceRule[] {
    return Array.from(this.inheritanceRules.values());
  }

  /**
   * Calculate configuration diff between two configurations
   */
  calculateDiff(
    oldConfiguration: Record<string, any>,
    newConfiguration: Record<string, any>
  ): { added: any; modified: any; removed: any } {
    const added: any = {};
    const modified: any = {};
    const removed: any = {};

    // Find added and modified
    for (const [category, categoryConfig] of Object.entries(newConfiguration)) {
      if (typeof categoryConfig !== 'object' || categoryConfig === null) {
        if (oldConfiguration[category] !== categoryConfig) {
          if (oldConfiguration[category] === undefined) {
            if (!added[category]) added[category] = {};
            added[category] = categoryConfig;
          } else {
            if (!modified[category]) modified[category] = {};
            modified[category] = { old: oldConfiguration[category], new: categoryConfig };
          }
        }
        continue;
      }

      for (const [key, value] of Object.entries(categoryConfig)) {
        const oldValue = oldConfiguration[category]?.[key];
        
        if (oldValue === undefined) {
          if (!added[category]) added[category] = {};
          added[category][key] = value;
        } else if (JSON.stringify(oldValue) !== JSON.stringify(value)) {
          if (!modified[category]) modified[category] = {};
          modified[category][key] = { old: oldValue, new: value };
        }
      }
    }

    // Find removed
    for (const [category, categoryConfig] of Object.entries(oldConfiguration)) {
      if (typeof categoryConfig !== 'object' || categoryConfig === null) {
        if (newConfiguration[category] === undefined) {
          if (!removed[category]) removed[category] = {};
          removed[category] = categoryConfig;
        }
        continue;
      }

      for (const [key, value] of Object.entries(categoryConfig)) {
        if (newConfiguration[category]?.[key] === undefined) {
          if (!removed[category]) removed[category] = {};
          removed[category][key] = value;
        }
      }
    }

    return { added, modified, removed };
  }
}

// Singleton instance
export const tenantConfigurationInheritance = new TenantConfigurationInheritance();