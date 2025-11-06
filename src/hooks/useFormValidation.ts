/**
 * Hook personalizado para validação de formulários com Zod
 * Fornece validação robusta e gerenciamento de estado de erro
 */

import { useState, useCallback, useMemo } from 'react';
import { z } from 'zod';

interface ValidationError {
  field: string;
  message: string;
}

interface UseFormValidationOptions {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceMs?: number;
}

interface UseFormValidationReturn<T> {
  // Estado
  errors: Record<string, string[]>;
  isValid: boolean;
  isValidating: boolean;
  
  // Funções
  validate: (data: unknown) => Promise<{ success: boolean; data?: T; errors?: Record<string, string[]> }>;
  validateField: (fieldName: string, value: unknown) => Promise<boolean>;
  clearErrors: () => void;
  clearFieldError: (fieldName: string) => void;
  setFieldError: (fieldName: string, message: string) => void;
  
  // Helpers para integração com formulários
  getFieldError: (fieldName: string) => string | undefined;
  hasFieldError: (fieldName: string) => boolean;
}

/**
 * Hook para validação de formulários com Zod
 */
export function useFormValidation<T>(
  schema: z.ZodSchema<T>,
  options: UseFormValidationOptions = {}
): UseFormValidationReturn<T> {
  const {
    validateOnChange = false,
    validateOnBlur = true,
    debounceMs = 300
  } = options;

  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isValidating, setIsValidating] = useState(false);

  // Memoizar se o formulário é válido
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  // Função principal de validação
  const validate = useCallback(async (data: unknown) => {
    setIsValidating(true);
    
    try {
      const validatedData = await schema.parseAsync(data);
      setErrors({});
      
      return {
        success: true,
        data: validatedData
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors: Record<string, string[]> = {};
        
        error.issues.forEach((err) => {
          const path = err.path.join('.');
          if (!formattedErrors[path]) {
            formattedErrors[path] = [];
          }
          formattedErrors[path].push(err.message);
        });

        setErrors(formattedErrors);
        
        return {
          success: false,
          errors: formattedErrors
        };
      }

      // Erro inesperado
      const unexpectedError = { general: ['Erro de validação desconhecido'] };
      setErrors(unexpectedError);
      
      return {
        success: false,
        errors: unexpectedError
      };
    } finally {
      setIsValidating(false);
    }
  }, [schema]);

  // Validar campo específico
  const validateField = useCallback(async (fieldName: string, value: unknown) => {
    try {
      // Criar schema temporário apenas para o campo
      const fieldSchema = z.object({ [fieldName]: z.any() });
      await fieldSchema.parseAsync({ [fieldName]: value });
      
      // Se passou na validação, remover erro do campo
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
      
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldError = error.issues.find(err => err.path.join('.') === fieldName);
        if (fieldError) {
          setErrors(prev => ({
            ...prev,
            [fieldName]: [fieldError.message]
          }));
        }
      }
      
      return false;
    }
  }, [schema]);

  // Limpar todos os erros
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Limpar erro de campo específico
  const clearFieldError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  // Definir erro para campo específico
  const setFieldError = useCallback((fieldName: string, message: string) => {
    setErrors(prev => ({
      ...prev,
      [fieldName]: [message]
    }));
  }, []);

  // Obter erro de campo específico
  const getFieldError = useCallback((fieldName: string): string | undefined => {
    const fieldErrors = errors[fieldName];
    return fieldErrors && fieldErrors.length > 0 ? fieldErrors[0] : undefined;
  }, [errors]);

  // Verificar se campo tem erro
  const hasFieldError = useCallback((fieldName: string): boolean => {
    return fieldName in errors && errors[fieldName].length > 0;
  }, [errors]);

  return {
    // Estado
    errors,
    isValid,
    isValidating,
    
    // Funções
    validate,
    validateField,
    clearErrors,
    clearFieldError,
    setFieldError,
    
    // Helpers
    getFieldError,
    hasFieldError
  };
}

/**
 * Hook simplificado para validação de formulário único
 */
export function useSimpleFormValidation<T>(schema: z.ZodSchema<T>) {
  const [errors, setErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  const validate = useCallback(async (data: unknown) => {
    setIsValidating(true);
    setErrors([]);
    
    try {
      const validatedData = await schema.parseAsync(data);
      return {
        success: true,
        data: validatedData
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.issues.map(err => err.message);
        setErrors(errorMessages);
        
        return {
          success: false,
          errors: errorMessages
        };
      }

      const unexpectedError = ['Erro de validação desconhecido'];
      setErrors(unexpectedError);
      
      return {
        success: false,
        errors: unexpectedError
      };
    } finally {
      setIsValidating(false);
    }
  }, [schema]);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  return {
    errors,
    isValidating,
    validate,
    clearErrors,
    hasErrors: errors.length > 0
  };
}

/**
 * Hook para validação em tempo real (debounced)
 */
export function useRealtimeValidation<T>(
  schema: z.ZodSchema<T>,
  debounceMs: number = 300
) {
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isValidating, setIsValidating] = useState(false);

  // Debounce da validação
  const debouncedValidate = useCallback(
    debounce(async (data: unknown) => {
      setIsValidating(true);
      
      try {
        await schema.parseAsync(data);
        setErrors({});
      } catch (error) {
        if (error instanceof z.ZodError) {
          const formattedErrors: Record<string, string[]> = {};
          
          error.issues.forEach((err) => {
            const path = err.path.join('.');
            if (!formattedErrors[path]) {
              formattedErrors[path] = [];
            }
            formattedErrors[path].push(err.message);
          });

          setErrors(formattedErrors);
        }
      } finally {
        setIsValidating(false);
      }
    }, debounceMs),
    [schema, debounceMs]
  );

  return {
    errors,
    isValidating,
    validate: debouncedValidate,
    clearErrors: () => setErrors({})
  };
}

// Função utilitária de debounce
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}