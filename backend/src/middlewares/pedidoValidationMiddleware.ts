import { Request, Response, NextFunction } from "express";
const db = require("../database");

// Interface para erros de validação
interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Classe para erros de validação
export class PedidoValidationError extends Error {
  public errors: ValidationError[];
  public statusCode: number;

  constructor(errors: ValidationError[], message = "Dados inválidos") {
    super(message);
    this.name = "PedidoValidationError";
    this.errors = errors;
    this.statusCode = 400;
  }
}

// Utilitários de validação
export const validators = {
  // Validar ID numérico
  validateId(value: any, fieldName = "id"): number {
    const id = parseInt(value);
    if (isNaN(id) || id <= 0) {
      throw new PedidoValidationError([{
        field: fieldName,
        message: `${fieldName} deve ser um número inteiro positivo`,
        value
      }]);
    }
    return id;
  },

  // Validar string não vazia
  validateRequiredString(value: any, fieldName: string, minLength = 1, maxLength = 255): string {
    if (!value || typeof value !== 'string') {
      throw new PedidoValidationError([{
        field: fieldName,
        message: `${fieldName} é obrigatório e deve ser uma string`,
        value
      }]);
    }

    const trimmed = value.trim();
    if (trimmed.length < minLength) {
      throw new PedidoValidationError([{
        field: fieldName,
        message: `${fieldName} deve ter pelo menos ${minLength} caracteres`,
        value
      }]);
    }

    if (trimmed.length > maxLength) {
      throw new PedidoValidationError([{
        field: fieldName,
        message: `${fieldName} deve ter no máximo ${maxLength} caracteres`,
        value
      }]);
    }

    return trimmed;
  },

  // Validar string opcional
  validateOptionalString(value: any, fieldName: string, maxLength = 1000): string | null {
    if (!value) return null;
    
    if (typeof value !== 'string') {
      throw new PedidoValidationError([{
        field: fieldName,
        message: `${fieldName} deve ser uma string`,
        value
      }]);
    }

    const trimmed = value.trim();
    if (trimmed.length > maxLength) {
      throw new PedidoValidationError([{
        field: fieldName,
        message: `${fieldName} deve ter no máximo ${maxLength} caracteres`,
        value
      }]);
    }

    return trimmed.length > 0 ? trimmed : null;
  },

  // Validar número positivo
  validatePositiveNumber(value: any, fieldName: string): number {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) {
      throw new PedidoValidationError([{
        field: fieldName,
        message: `${fieldName} deve ser um número positivo`,
        value
      }]);
    }
    return num;
  },

  // Validar número não negativo
  validateNonNegativeNumber(value: any, fieldName: string): number {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) {
      throw new PedidoValidationError([{
        field: fieldName,
        message: `${fieldName} deve ser um número não negativo`,
        value
      }]);
    }
    return num;
  },

  // Validar status do pedido
  validatePedidoStatus(value: any): string {
    const statusValidos = ['PENDENTE', 'CONFIRMADO', 'RECEBIMENTO', 'RECEBIDO', 'EM_PREPARACAO', 'ENVIADO', 'ENTREGUE', 'FATURADO', 'CANCELADO'];
    if (!value || !statusValidos.includes(value)) {
      throw new PedidoValidationError([{
        field: 'status',
        message: `Status deve ser um dos seguintes: ${statusValidos.join(', ')}`,
        value
      }]);
    }
    return value;
  },

  // Validar array não vazio
  validateNonEmptyArray(value: any, fieldName: string): any[] {
    if (!Array.isArray(value) || value.length === 0) {
      throw new PedidoValidationError([{
        field: fieldName,
        message: `${fieldName} deve ser um array não vazio`,
        value
      }]);
    }
    return value;
  },

  // Validar paginação
  validatePagination(page: any, limit: any): { page: number; limit: number } {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 12));
    return { page: pageNum, limit: limitNum };
  }
};

// Middleware para validar parâmetros de ID
export function validateIdParam(paramName = 'id') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = validators.validateId(req.params[paramName], paramName);
      req.params[paramName] = id.toString();
      next();
    } catch (error) {
      if (error instanceof PedidoValidationError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          errors: error.errors
        });
      }
      next(error);
    }
  };
}

// Middleware para validar dados de criação de pedido
export function validateCriarPedido(req: Request, res: Response, next: NextFunction) {
  try {
    const errors: ValidationError[] = [];
    const { itens_selecionados, observacoes } = req.body;

    // Validar itens selecionados
    try {
      const itens = validators.validateNonEmptyArray(itens_selecionados, 'itens_selecionados');
      
      // Validar cada item
      itens.forEach((item, index) => {
        try {
          validators.validateId(item.produto_id, `itens_selecionados[${index}].produto_id`);
          validators.validateId(item.contrato_id, `itens_selecionados[${index}].contrato_id`);
          validators.validateId(item.fornecedor_id, `itens_selecionados[${index}].fornecedor_id`);
          validators.validatePositiveNumber(item.quantidade, `itens_selecionados[${index}].quantidade`);
          validators.validatePositiveNumber(item.preco_unitario, `itens_selecionados[${index}].preco_unitario`);
        } catch (itemError) {
          if (itemError instanceof PedidoValidationError) {
            errors.push(...itemError.errors);
          }
        }
      });
    } catch (arrayError) {
      if (arrayError instanceof PedidoValidationError) {
        errors.push(...arrayError.errors);
      }
    }

    // Validar observações (opcional)
    if (observacoes !== undefined) {
      try {
        validators.validateOptionalString(observacoes, 'observacoes', 1000);
      } catch (obsError) {
        if (obsError instanceof PedidoValidationError) {
          errors.push(...obsError.errors);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos para criação do pedido",
        errors
      });
    }

    next();
  } catch (error) {
    console.error('❌ Erro na validação de criação de pedido:', error);
    res.status(500).json({
      success: false,
      message: "Erro interno na validação"
    });
  }
}

// Middleware para validar atualização de status
export function validateAtualizarStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const errors: ValidationError[] = [];
    const { status, observacoes } = req.body;

    // Validar status
    try {
      validators.validatePedidoStatus(status);
    } catch (statusError) {
      if (statusError instanceof PedidoValidationError) {
        errors.push(...statusError.errors);
      }
    }

    // Validar observações (opcional)
    if (observacoes !== undefined) {
      try {
        validators.validateOptionalString(observacoes, 'observacoes', 1000);
      } catch (obsError) {
        if (obsError instanceof PedidoValidationError) {
          errors.push(...obsError.errors);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos para atualização de status",
        errors
      });
    }

    next();
  } catch (error) {
    console.error('❌ Erro na validação de atualização de status:', error);
    res.status(500).json({
      success: false,
      message: "Erro interno na validação"
    });
  }
}

// Middleware para validar cancelamento de pedido
export function validateCancelarPedido(req: Request, res: Response, next: NextFunction) {
  try {
    const { motivo } = req.body;

    try {
      validators.validateRequiredString(motivo, 'motivo', 5, 500);
    } catch (error) {
      if (error instanceof PedidoValidationError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          errors: error.errors
        });
      }
    }

    next();
  } catch (error) {
    console.error('❌ Erro na validação de cancelamento:', error);
    res.status(500).json({
      success: false,
      message: "Erro interno na validação"
    });
  }
}

// Middleware para validar filtros de listagem
export function validateFiltrosListagem(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, busca, status } = req.query;

    // Validar paginação
    const pagination = validators.validatePagination(page, limit);
    req.query.page = pagination.page.toString();
    req.query.limit = pagination.limit.toString();

    // Validar busca (opcional)
    if (busca) {
      try {
        const buscaValidada = validators.validateOptionalString(busca, 'busca', 100);
        req.query.busca = buscaValidada || undefined;
      } catch (buscaError) {
        if (buscaError instanceof PedidoValidationError) {
          return res.status(buscaError.statusCode).json({
            success: false,
            message: buscaError.message,
            errors: buscaError.errors
          });
        }
      }
    }

    // Validar status (opcional)
    if (status) {
      try {
        validators.validatePedidoStatus(status);
      } catch (statusError) {
        if (statusError instanceof PedidoValidationError) {
          return res.status(statusError.statusCode).json({
            success: false,
            message: statusError.message,
            errors: statusError.errors
          });
        }
      }
    }

    next();
  } catch (error) {
    console.error('❌ Erro na validação de filtros:', error);
    res.status(500).json({
      success: false,
      message: "Erro interno na validação"
    });
  }
}

// Middleware para validar integridade de dados antes de operações críticas
export async function validateDataIntegrity(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const pedidoId = parseInt(id);

    if (isNaN(pedidoId) || pedidoId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID do pedido inválido"
      });
    }

    // Verificar se o pedido existe
    const pedido = await db.get(`
      SELECT pm.id, pm.status, pm.numero_pedido, u.nome as nome_usuario
      FROM pedidos pm
      INNER JOIN usuarios u ON pm.usuario_id = u.id
      WHERE pm.id = $1
    `, [pedidoId]);

    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: "Pedido não encontrado"
      });
    }

    // Verificar integridade dos dados relacionados
    const integrityCheck = await db.get(`
      SELECT 
        COUNT(DISTINCT pf.id) as total_fornecedores,
        COUNT(DISTINCT pi.id) as total_itens,
        COUNT(DISTINCT CASE WHEN p.id IS NULL THEN pi.id END) as itens_produto_orfao,
        COUNT(DISTINCT CASE WHEN f.id IS NULL THEN pf.id END) as fornecedores_orfaos,
        COUNT(DISTINCT CASE WHEN c.id IS NULL THEN pi.id END) as itens_contrato_orfao
      FROM pedidos_fornecedores pf
      LEFT JOIN pedidos_itens pi ON pf.id = pi.pedido_fornecedor_id
      LEFT JOIN produtos p ON pi.produto_id = p.id
      LEFT JOIN fornecedores f ON pf.fornecedor_id = f.id
      LEFT JOIN contratos c ON pi.contrato_id = c.id
      WHERE pf.pedido_id = $1
    `, [pedidoId]);

    // Alertar sobre problemas de integridade
    if (integrityCheck.itens_produto_orfao > 0) {
      console.warn(`⚠️ Pedido ${pedidoId} tem ${integrityCheck.itens_produto_orfao} itens com produtos inexistentes`);
    }

    if (integrityCheck.fornecedores_orfaos > 0) {
      console.warn(`⚠️ Pedido ${pedidoId} tem ${integrityCheck.fornecedores_orfaos} fornecedores inexistentes`);
    }

    if (integrityCheck.itens_contrato_orfao > 0) {
      console.warn(`⚠️ Pedido ${pedidoId} tem ${integrityCheck.itens_contrato_orfao} itens com contratos inexistentes`);
    }

    // Adicionar informações ao request para uso posterior
    (req as any).pedidoInfo = {
      ...pedido,
      integrityCheck
    };

    next();
  } catch (error) {
    console.error('❌ Erro na validação de integridade:', error);
    res.status(500).json({
      success: false,
      message: "Erro interno na validação de integridade"
    });
  }
}

// Middleware para sanitizar dados de entrada
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  try {
    // Sanitizar strings no body
    if (req.body && typeof req.body === 'object') {
      for (const [key, value] of Object.entries(req.body)) {
        if (typeof value === 'string') {
          // Remover caracteres perigosos e limitar tamanho
          req.body[key] = value.trim().substring(0, 10000);
        }
      }
    }

    // Sanitizar parâmetros da query
    if (req.query && typeof req.query === 'object') {
      for (const [key, value] of Object.entries(req.query)) {
        if (typeof value === 'string') {
          req.query[key] = value.trim().substring(0, 1000);
        }
      }
    }

    next();
  } catch (error) {
    console.error('❌ Erro na sanitização:', error);
    res.status(500).json({
      success: false,
      message: "Erro interno na sanitização"
    });
  }
}

// Middleware para log de operações (desenvolvimento)
export function logPedidoOperation(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 Pedido: ${req.method} ${req.originalUrl}`, {
      params: req.params,
      query: req.query,
      body: req.body,
      user: (req as any).user?.id,
      timestamp: new Date().toISOString()
    });
  }
  next();
}

// Middleware para verificar permissões do usuário
export function checkPedidoPermissions(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;

    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        message: "Usuário não autenticado"
      });
    }

    // Verificar se o usuário tem permissão para acessar pedidos
    // Por enquanto, todos os usuários autenticados podem acessar
    // Futuramente pode ser implementada lógica de roles/permissões mais específica

    next();
  } catch (error) {
    console.error('❌ Erro na verificação de permissões:', error);
    res.status(500).json({
      success: false,
      message: "Erro interno na verificação de permissões"
    });
  }
}

// Middleware para tratamento de erros de validação
export function handleValidationErrors(error: any, req: Request, res: Response, next: NextFunction) {
  if (error instanceof PedidoValidationError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errors: error.errors
    });
  }

  // Se não for um erro de validação, passa para o próximo middleware de erro
  next(error);
}