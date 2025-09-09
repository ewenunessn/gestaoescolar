import { useState, useCallback, useRef } from 'react';

// Interfaces para validação
export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'email' | 'phone' | 'date' | 'array';
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  message?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface PedidoValidationData {
  // Dados básicos do pedido
  numero_pedido?: string;
  usuario_id?: number;
  status?: string;
  valor_total?: number;
  desconto_aplicado?: number;
  observacoes?: string;
  
  // Itens do pedido
  itens_selecionados?: Array<{
    id?: number;
    produto_id: number;
    contrato_id: number;
    fornecedor_id: number;
    quantidade: number;
    preco_unitario: number;
  }>;
}

// Regras de validação para pedidos
const PEDIDO_VALIDATION_RULES: ValidationRule[] = [
  {
    field: 'numero_pedido',
    required: true,
    type: 'string',
    min: 3,
    max: 50,
    message: 'Número do pedido deve ter entre 3 e 50 caracteres'
  },
  {
    field: 'usuario_id',
    required: true,
    type: 'number',
    min: 1,
    message: 'ID do usuário deve ser um número positivo'
  },
  {
    field: 'status',
    required: true,
    type: 'string',
    custom: (value) => {
      const statusValidos = ['PENDENTE', 'CONFIRMADO', 'RECEBIMENTO', 'RECEBIDO', 'EM_PREPARACAO', 'ENVIADO', 'ENTREGUE', 'FATURADO', 'CANCELADO'];
      return statusValidos.includes(value) ? null : 'Status inválido';
    },
    message: 'Status deve ser um dos valores válidos'
  },
  {
    field: 'valor_total',
    required: true,
    type: 'number',
    min: 0,
    message: 'Valor total deve ser um número não negativo'
  },
  {
    field: 'desconto_aplicado',
    type: 'number',
    min: 0,
    message: 'Desconto deve ser um número não negativo'
  },
  {
    field: 'observacoes',
    type: 'string',
    max: 1000,
    message: 'Observações não podem exceder 1000 caracteres'
  },
  {
    field: 'itens_selecionados',
    required: true,
    type: 'array',
    min: 1,
    message: 'Deve haver pelo menos um item selecionado'
  }
];

// Regras para itens do pedido
const ITEM_VALIDATION_RULES: ValidationRule[] = [
  {
    field: 'produto_id',
    required: true,
    type: 'number',
    min: 1,
    message: 'ID do produto deve ser um número positivo'
  },
  {
    field: 'contrato_id',
    required: true,
    type: 'number',
    min: 1,
    message: 'ID do contrato deve ser um número positivo'
  },
  {
    field: 'fornecedor_id',
    required: true,
    type: 'number',
    min: 1,
    message: 'ID do fornecedor deve ser um número positivo'
  },
  {
    field: 'quantidade',
    required: true,
    type: 'number',
    min: 0.01,
    max: 1000000,
    message: 'Quantidade deve estar entre 0.01 e 1.000.000'
  },
  {
    field: 'preco_unitario',
    required: true,
    type: 'number',
    min: 0.01,
    message: 'Preço unitário deve ser maior que zero'
  }
];

export const usePedidoValidation = () => {
  const [validationState, setValidationState] = useState<{
    isValidating: boolean;
    lastValidation: ValidationResult | null;
    realTimeErrors: { [field: string]: string };
  }>({
    isValidating: false,
    lastValidation: null,
    realTimeErrors: {}
  });

  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Função para validar um campo específico
  const validateField = useCallback((field: string, value: any, rules: ValidationRule[]): ValidationError | null => {
    const rule = rules.find(r => r.field === field);
    if (!rule) return null;

    // Verificar se é obrigatório
    if (rule.required && (value === undefined || value === null || value === '')) {
      return {
        field,
        message: rule.message || `${field} é obrigatório`,
        value
      };
    }

    // Se não é obrigatório e está vazio, não validar outros critérios
    if (!rule.required && (value === undefined || value === null || value === '')) {
      return null;
    }

    // Validar tipo
    if (rule.type) {
      switch (rule.type) {
        case 'string':
          if (typeof value !== 'string') {
            return {
              field,
              message: rule.message || `${field} deve ser uma string`,
              value
            };
          }
          break;
        case 'number':
          const num = parseFloat(value);
          if (isNaN(num)) {
            return {
              field,
              message: rule.message || `${field} deve ser um número`,
              value
            };
          }
          value = num; // Usar o valor convertido para validações subsequentes
          break;
        case 'array':
          if (!Array.isArray(value)) {
            return {
              field,
              message: rule.message || `${field} deve ser um array`,
              value
            };
          }
          break;
        case 'email':
          const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailPattern.test(value)) {
            return {
              field,
              message: rule.message || `${field} deve ser um email válido`,
              value
            };
          }
          break;
        case 'date':
          if (isNaN(Date.parse(value))) {
            return {
              field,
              message: rule.message || `${field} deve ser uma data válida`,
              value
            };
          }
          break;
      }
    }

    // Validar tamanho mínimo
    if (rule.min !== undefined) {
      if (rule.type === 'string' && value.length < rule.min) {
        return {
          field,
          message: rule.message || `${field} deve ter pelo menos ${rule.min} caracteres`,
          value
        };
      }
      if (rule.type === 'number' && value < rule.min) {
        return {
          field,
          message: rule.message || `${field} deve ser pelo menos ${rule.min}`,
          value
        };
      }
      if (rule.type === 'array' && value.length < rule.min) {
        return {
          field,
          message: rule.message || `${field} deve ter pelo menos ${rule.min} itens`,
          value
        };
      }
    }

    // Validar tamanho máximo
    if (rule.max !== undefined) {
      if (rule.type === 'string' && value.length > rule.max) {
        return {
          field,
          message: rule.message || `${field} deve ter no máximo ${rule.max} caracteres`,
          value
        };
      }
      if (rule.type === 'number' && value > rule.max) {
        return {
          field,
          message: rule.message || `${field} deve ser no máximo ${rule.max}`,
          value
        };
      }
      if (rule.type === 'array' && value.length > rule.max) {
        return {
          field,
          message: rule.message || `${field} deve ter no máximo ${rule.max} itens`,
          value
        };
      }
    }

    // Validar padrão regex
    if (rule.pattern && rule.type === 'string' && !rule.pattern.test(value)) {
      return {
        field,
        message: rule.message || `${field} não atende ao padrão exigido`,
        value
      };
    }

    // Validação customizada
    if (rule.custom) {
      const customError = rule.custom(value);
      if (customError) {
        return {
          field,
          message: customError,
          value
        };
      }
    }

    return null;
  }, []);

  // Validar dados completos do pedido
  const validatePedido = useCallback((data: PedidoValidationData): ValidationResult => {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Validar campos básicos do pedido
    for (const rule of PEDIDO_VALIDATION_RULES) {
      const error = validateField(rule.field, (data as any)[rule.field], PEDIDO_VALIDATION_RULES);
      if (error) {
        errors.push(error);
      }
    }

    // Validar itens se existirem
    if (data.itens_selecionados && Array.isArray(data.itens_selecionados)) {
      data.itens_selecionados.forEach((item, index) => {
        for (const rule of ITEM_VALIDATION_RULES) {
          const error = validateField(rule.field, (item as any)[rule.field], ITEM_VALIDATION_RULES);
          if (error) {
            errors.push({
              ...error,
              field: `itens_selecionados[${index}].${error.field}`,
              message: `Item ${index + 1}: ${error.message}`
            });
          }
        }

        // Validações específicas de negócio
        if (item.quantidade && item.preco_unitario) {
          const subtotal = item.quantidade * item.preco_unitario;
          if (subtotal > 100000) {
            warnings.push({
              field: `itens_selecionados[${index}].subtotal`,
              message: `Item ${index + 1}: Subtotal muito alto (R$ ${subtotal.toFixed(2)})`
            });
          }
        }
      });

      // Verificar duplicatas
      const duplicates = data.itens_selecionados.reduce((acc, item, index) => {
        const key = `${item.produto_id}-${item.contrato_id}`;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(index);
        return acc;
      }, {} as { [key: string]: number[] });

      Object.entries(duplicates).forEach(([key, indices]) => {
        if (indices.length > 1) {
          warnings.push({
            field: 'itens_selecionados',
            message: `Produto duplicado nos itens: ${indices.map(i => i + 1).join(', ')}`
          });
        }
      });
    }

    // Validações de negócio adicionais
    if (data.valor_total && data.desconto_aplicado) {
      if (data.desconto_aplicado > data.valor_total) {
        errors.push({
          field: 'desconto_aplicado',
          message: 'Desconto não pode ser maior que o valor total'
        });
      }

      if (data.desconto_aplicado > data.valor_total * 0.5) {
        warnings.push({
          field: 'desconto_aplicado',
          message: 'Desconto muito alto (mais de 50% do valor total)'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, [validateField]);

  // Validação em tempo real de um campo
  const validateFieldRealTime = useCallback((field: string, value: any) => {
    // Limpar timeout anterior
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    // Validar após um pequeno delay para evitar validações excessivas
    validationTimeoutRef.current = setTimeout(() => {
      let error: ValidationError | null = null;

      // Determinar quais regras usar baseado no campo
      if (field.startsWith('itens_selecionados[')) {
        const itemField = field.split('.').pop() || '';
        error = validateField(itemField, value, ITEM_VALIDATION_RULES);
      } else {
        error = validateField(field, value, PEDIDO_VALIDATION_RULES);
      }

      setValidationState(prev => ({
        ...prev,
        realTimeErrors: {
          ...prev.realTimeErrors,
          [field]: error?.message || ''
        }
      }));
    }, 300);
  }, [validateField]);

  // Validação completa assíncrona
  const validateAsync = useCallback(async (data: PedidoValidationData): Promise<ValidationResult> => {
    setValidationState(prev => ({ ...prev, isValidating: true }));

    try {
      // Simular validação assíncrona (ex: verificar se produtos/contratos existem)
      await new Promise(resolve => setTimeout(resolve, 500));

      const result = validatePedido(data);

      setValidationState(prev => ({
        ...prev,
        isValidating: false,
        lastValidation: result
      }));

      return result;
    } catch (error) {
      setValidationState(prev => ({
        ...prev,
        isValidating: false,
        lastValidation: {
          isValid: false,
          errors: [{
            field: 'validation',
            message: 'Erro durante a validação'
          }],
          warnings: []
        }
      }));

      throw error;
    }
  }, [validatePedido]);

  // Limpar erros de um campo específico
  const clearFieldError = useCallback((field: string) => {
    setValidationState(prev => ({
      ...prev,
      realTimeErrors: {
        ...prev.realTimeErrors,
        [field]: ''
      }
    }));
  }, []);

  // Limpar todos os erros
  const clearAllErrors = useCallback(() => {
    setValidationState(prev => ({
      ...prev,
      realTimeErrors: {},
      lastValidation: null
    }));
  }, []);

  // Verificar se um campo tem erro
  const hasFieldError = useCallback((field: string): boolean => {
    return !!(validationState.realTimeErrors[field] || 
             validationState.lastValidation?.errors.some(e => e.field === field));
  }, [validationState]);

  // Obter mensagem de erro de um campo
  const getFieldError = useCallback((field: string): string => {
    return validationState.realTimeErrors[field] || 
           validationState.lastValidation?.errors.find(e => e.field === field)?.message || '';
  }, [validationState]);

  // Validar se dados estão prontos para submissão
  const isReadyForSubmission = useCallback((data: PedidoValidationData): boolean => {
    const result = validatePedido(data);
    return result.isValid;
  }, [validatePedido]);

  return {
    // Estado
    isValidating: validationState.isValidating,
    lastValidation: validationState.lastValidation,
    realTimeErrors: validationState.realTimeErrors,

    // Métodos de validação
    validatePedido,
    validateAsync,
    validateFieldRealTime,
    
    // Utilitários
    hasFieldError,
    getFieldError,
    clearFieldError,
    clearAllErrors,
    isReadyForSubmission,

    // Regras (para referência)
    pedidoRules: PEDIDO_VALIDATION_RULES,
    itemRules: ITEM_VALIDATION_RULES
  };
};