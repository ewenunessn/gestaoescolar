import { Request, Response, NextFunction } from "express";

/**
 * Middleware para validar parâmetros de busca do catálogo
 */
export function validateCatalogoQuery(req: Request, res: Response, next: NextFunction) {
  try {
    const errors: string[] = [];
    
    // Validar fornecedor_id se fornecido
    if (req.query.fornecedor_id) {
      const fornecedorId = parseInt(req.query.fornecedor_id as string);
      if (isNaN(fornecedorId) || fornecedorId <= 0) {
        errors.push("fornecedor_id deve ser um número válido maior que 0");
      }
    }
    
    // Validar contrato_id se fornecido
    if (req.query.contrato_id) {
      const contratoId = parseInt(req.query.contrato_id as string);
      if (isNaN(contratoId) || contratoId <= 0) {
        errors.push("contrato_id deve ser um número válido maior que 0");
      }
    }
    
    // Validar limit se fornecido
    if (req.query.limit) {
      const limit = parseInt(req.query.limit as string);
      if (isNaN(limit) || limit <= 0 || limit > 100) {
        errors.push("limit deve ser um número entre 1 e 100");
      }
    }
    
    // Validar offset se fornecido
    if (req.query.offset) {
      const offset = parseInt(req.query.offset as string);
      if (isNaN(offset) || offset < 0) {
        errors.push("offset deve ser um número maior ou igual a 0");
      }
    }
    
    // Validar busca se fornecida
    if (req.query.busca) {
      const busca = req.query.busca as string;
      if (busca.length < 2) {
        errors.push("busca deve ter pelo menos 2 caracteres");
      }
      if (busca.length > 100) {
        errors.push("busca deve ter no máximo 100 caracteres");
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        message: "Parâmetros de busca inválidos",
        errors
      });
    }
    
    next();
  } catch (error) {
    console.error('❌ Erro na validação do catálogo:', error);
    res.status(500).json({ message: "Erro interno na validação" });
  }
}

/**
 * Middleware para validar parâmetros de produto específico
 */
export function validateProdutoParams(req: Request, res: Response, next: NextFunction) {
  try {
    const errors: string[] = [];
    
    // Validar produto_id
    const produtoId = parseInt(req.params.produto_id);
    if (isNaN(produtoId) || produtoId <= 0) {
      errors.push("produto_id deve ser um número válido maior que 0");
    }
    
    // Validar contrato_id se fornecido
    if (req.params.contrato_id) {
      const contratoId = parseInt(req.params.contrato_id);
      if (isNaN(contratoId) || contratoId <= 0) {
        errors.push("contrato_id deve ser um número válido maior que 0");
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        message: "Parâmetros inválidos",
        errors
      });
    }
    
    next();
  } catch (error) {
    console.error('❌ Erro na validação de parâmetros:', error);
    res.status(500).json({ message: "Erro interno na validação" });
  }
}

/**
 * Middleware para validar parâmetros de fornecedor
 */
export function validateFornecedorParams(req: Request, res: Response, next: NextFunction) {
  try {
    const fornecedorId = parseInt(req.params.fornecedor_id);
    
    if (isNaN(fornecedorId) || fornecedorId <= 0) {
      return res.status(400).json({
        message: "fornecedor_id deve ser um número válido maior que 0"
      });
    }
    
    next();
  } catch (error) {
    console.error('❌ Erro na validação de fornecedor:', error);
    res.status(500).json({ message: "Erro interno na validação" });
  }
}

/**
 * Middleware para sanitizar strings de busca
 */
export function sanitizeBusca(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.query.busca) {
      // Remover caracteres especiais perigosos e limitar tamanho
      let busca = (req.query.busca as string)
        .trim()
        .replace(/[<>\"'%;()&+]/g, '') // Remove caracteres potencialmente perigosos
        .substring(0, 100); // Limita a 100 caracteres
      
      req.query.busca = busca;
    }
    
    next();
  } catch (error) {
    console.error('❌ Erro na sanitização:', error);
    res.status(500).json({ message: "Erro interno na sanitização" });
  }
}

/**
 * Middleware para log de requisições do catálogo (desenvolvimento)
 */
export function logCatalogoRequest(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`📋 Catálogo: ${req.method} ${req.originalUrl}`, {
      query: req.query,
      params: req.params,
      user: (req as any).user?.id
    });
  }
  next();
}