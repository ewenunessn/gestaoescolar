/**
 * Enhanced tenant configuration types with validation, inheritance, and versioning
 */

export interface TenantConfigurationVersion {
  id: string;
  tenantId: string;
  version: number;
  configurations: Record<string, any>;
  createdBy?: number;
  createdAt: string;
  description?: string;
  isActive: boolean;
}

export interface ConfigurationSchema {
  category: string;
  key: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
    custom?: (value: any) => boolean | string;
  };
  dependencies?: ConfigurationDependency[];
  description?: string;
  deprecated?: boolean;
  inheritFromParent?: boolean;
}

export interface ConfigurationDependency {
  category: string;
  key: string;
  condition: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'exists' | 'not_exists';
  value?: any;
  errorMessage?: string;
}

export interface ConfigurationValidationResult {
  isValid: boolean;
  errors: ConfigurationValidationError[];
  warnings: ConfigurationValidationWarning[];
}

export interface ConfigurationValidationError {
  category: string;
  key: string;
  message: string;
  code: string;
}

export interface ConfigurationValidationWarning {
  category: string;
  key: string;
  message: string;
  code: string;
}

export interface ConfigurationInheritanceRule {
  category: string;
  key: string;
  inheritanceType: 'override' | 'merge' | 'append';
  mergeStrategy?: 'deep' | 'shallow';
}

export interface TenantConfigurationTemplate {
  id: string;
  name: string;
  description: string;
  configurations: Record<string, any>;
  targetTenantTypes?: string[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConfigurationChangeRequest {
  tenantId: string;
  changes: ConfigurationChange[];
  description?: string;
  requestedBy?: number;
  autoApply?: boolean;
}

export interface ConfigurationChange {
  category: string;
  key: string;
  oldValue?: any;
  newValue: any;
  operation: 'create' | 'update' | 'delete';
}

export interface ConfigurationRollbackRequest {
  tenantId: string;
  targetVersion: number;
  reason?: string;
  requestedBy?: number;
}

// Default configuration schemas
export const DEFAULT_CONFIGURATION_SCHEMAS: ConfigurationSchema[] = [
  // Features
  {
    category: 'features',
    key: 'inventory',
    type: 'boolean',
    required: true,
    defaultValue: true,
    description: 'Enable inventory management features',
    inheritFromParent: true
  },
  {
    category: 'features',
    key: 'contracts',
    type: 'boolean',
    required: true,
    defaultValue: true,
    description: 'Enable contract management features',
    inheritFromParent: true
  },
  {
    category: 'features',
    key: 'deliveries',
    type: 'boolean',
    required: true,
    defaultValue: true,
    description: 'Enable delivery management features',
    dependencies: [
      {
        category: 'features',
        key: 'contracts',
        condition: 'equals',
        value: true,
        errorMessage: 'Deliveries feature requires contracts feature to be enabled'
      }
    ],
    inheritFromParent: true
  },
  {
    category: 'features',
    key: 'reports',
    type: 'boolean',
    required: true,
    defaultValue: true,
    description: 'Enable reporting features',
    inheritFromParent: true
  },
  {
    category: 'features',
    key: 'mobile',
    type: 'boolean',
    required: true,
    defaultValue: true,
    description: 'Enable mobile application access',
    inheritFromParent: true
  },
  {
    category: 'features',
    key: 'analytics',
    type: 'boolean',
    required: false,
    defaultValue: false,
    description: 'Enable advanced analytics features',
    inheritFromParent: true
  },

  // Limits
  {
    category: 'limits',
    key: 'maxUsers',
    type: 'number',
    required: true,
    defaultValue: 100,
    validation: {
      min: 1,
      max: 10000
    },
    description: 'Maximum number of users allowed',
    inheritFromParent: false
  },
  {
    category: 'limits',
    key: 'maxSchools',
    type: 'number',
    required: true,
    defaultValue: 50,
    validation: {
      min: 1,
      max: 1000
    },
    description: 'Maximum number of schools allowed',
    inheritFromParent: false
  },
  {
    category: 'limits',
    key: 'maxProducts',
    type: 'number',
    required: true,
    defaultValue: 1000,
    validation: {
      min: 1,
      max: 100000
    },
    description: 'Maximum number of products allowed',
    inheritFromParent: false
  },
  {
    category: 'limits',
    key: 'storageLimit',
    type: 'number',
    required: true,
    defaultValue: 1024,
    validation: {
      min: 100,
      max: 102400
    },
    description: 'Storage limit in MB',
    inheritFromParent: false
  },
  {
    category: 'limits',
    key: 'apiRateLimit',
    type: 'number',
    required: true,
    defaultValue: 100,
    validation: {
      min: 10,
      max: 10000
    },
    description: 'API rate limit per minute',
    inheritFromParent: false
  },

  // Branding
  {
    category: 'branding',
    key: 'primaryColor',
    type: 'string',
    required: false,
    defaultValue: '#1976d2',
    validation: {
      pattern: '^#[0-9A-Fa-f]{6}$'
    },
    description: 'Primary brand color (hex format)',
    inheritFromParent: true
  },
  {
    category: 'branding',
    key: 'secondaryColor',
    type: 'string',
    required: false,
    defaultValue: '#dc004e',
    validation: {
      pattern: '^#[0-9A-Fa-f]{6}$'
    },
    description: 'Secondary brand color (hex format)',
    inheritFromParent: true
  },
  {
    category: 'branding',
    key: 'logo',
    type: 'string',
    required: false,
    description: 'Logo URL or base64 encoded image',
    inheritFromParent: true
  },
  {
    category: 'branding',
    key: 'favicon',
    type: 'string',
    required: false,
    description: 'Favicon URL or base64 encoded image',
    inheritFromParent: true
  },

  // Notifications
  {
    category: 'notifications',
    key: 'email',
    type: 'boolean',
    required: true,
    defaultValue: true,
    description: 'Enable email notifications',
    inheritFromParent: true
  },
  {
    category: 'notifications',
    key: 'sms',
    type: 'boolean',
    required: true,
    defaultValue: false,
    description: 'Enable SMS notifications',
    inheritFromParent: true
  },
  {
    category: 'notifications',
    key: 'push',
    type: 'boolean',
    required: true,
    defaultValue: true,
    description: 'Enable push notifications',
    dependencies: [
      {
        category: 'features',
        key: 'mobile',
        condition: 'equals',
        value: true,
        errorMessage: 'Push notifications require mobile feature to be enabled'
      }
    ],
    inheritFromParent: true
  },

  // Integrations
  {
    category: 'integrations',
    key: 'whatsapp',
    type: 'boolean',
    required: false,
    defaultValue: false,
    description: 'Enable WhatsApp integration',
    inheritFromParent: true
  },
  {
    category: 'integrations',
    key: 'email',
    type: 'boolean',
    required: false,
    defaultValue: true,
    description: 'Enable email integration',
    inheritFromParent: true
  },
  {
    category: 'integrations',
    key: 'sms',
    type: 'boolean',
    required: false,
    defaultValue: false,
    description: 'Enable SMS integration',
    inheritFromParent: true
  }
];

// Default inheritance rules
export const DEFAULT_INHERITANCE_RULES: ConfigurationInheritanceRule[] = [
  {
    category: 'features',
    key: '*',
    inheritanceType: 'override'
  },
  {
    category: 'branding',
    key: '*',
    inheritanceType: 'override'
  },
  {
    category: 'notifications',
    key: '*',
    inheritanceType: 'override'
  },
  {
    category: 'integrations',
    key: '*',
    inheritanceType: 'override'
  },
  {
    category: 'limits',
    key: '*',
    inheritanceType: 'override'
  }
];

// Configuration error codes
export const CONFIG_ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  DEPENDENCY_NOT_MET: 'DEPENDENCY_NOT_MET',
  REQUIRED_FIELD_MISSING: 'REQUIRED_FIELD_MISSING',
  INVALID_TYPE: 'INVALID_TYPE',
  INVALID_VALUE: 'INVALID_VALUE',
  DEPRECATED_FIELD: 'DEPRECATED_FIELD',
  UNKNOWN_FIELD: 'UNKNOWN_FIELD',
  VERSION_NOT_FOUND: 'VERSION_NOT_FOUND',
  ROLLBACK_FAILED: 'ROLLBACK_FAILED'
} as const;

export type ConfigErrorCode = typeof CONFIG_ERROR_CODES[keyof typeof CONFIG_ERROR_CODES];