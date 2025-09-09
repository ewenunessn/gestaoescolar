import { Request, Response, NextFunction } from "express";

export function validatePedido(req: Request, res: Response, next: NextFunction) {
  const { fornecedor_id, contrato_id, produtos } = req.body;

  console.log("Validando pedido:", { fornecedor_id, contrato_id, produtos });

  // Validação do fornecedor
  if (fornecedor_id === undefined || fornecedor_id === null) {
    return res.status(400).json({ message: "Fornecedor é obrigatório." });
  }

  const fornecedorId = typeof fornecedor_id === "string" ? Number(fornecedor_id) : fornecedor_id;
  if (isNaN(fornecedorId) || fornecedorId <= 0) {
    return res.status(400).json({ message: "ID do fornecedor deve ser um número positivo." });
  }
  req.body.fornecedor_id = fornecedorId;

  // Validação do contrato
  if (contrato_id === undefined || contrato_id === null) {
    return res.status(400).json({ message: "Contrato é obrigatório." });
  }

  const contratoId = typeof contrato_id === "string" ? Number(contrato_id) : contrato_id;
  if (isNaN(contratoId) || contratoId <= 0) {
    return res.status(400).json({ message: "ID do contrato deve ser um número positivo." });
  }
  req.body.contrato_id = contratoId;

  // Validação dos produtos
  if (!Array.isArray(produtos) || produtos.length === 0) {
    return res.status(400).json({ message: "Produtos são obrigatórios e devem ser uma lista não vazia." });
  }

  // Validação de cada produto
  for (let i = 0; i < produtos.length; i++) {
    const produto = produtos[i];
    
    if (!produto.produto_id || isNaN(Number(produto.produto_id)) || Number(produto.produto_id) <= 0) {
      return res.status(400).json({ 
        message: `Produto ${i + 1}: ID do produto deve ser um número positivo.` 
      });
    }

    if (!produto.quantidade || isNaN(Number(produto.quantidade)) || Number(produto.quantidade) <= 0) {
      return res.status(400).json({ 
        message: `Produto ${i + 1}: Quantidade deve ser um número positivo.` 
      });
    }

    // Normalizar tipos
    produtos[i].produto_id = Number(produto.produto_id);
    produtos[i].quantidade = Number(produto.quantidade);
  }

  next();
}

export function validateCancelamentoPedido(req: Request, res: Response, next: NextFunction) {
  const { pedido_id } = req.params;
  const { justificativa } = req.body;

  console.log("Validando cancelamento de pedido:", { pedido_id, justificativa });

  // Validação do ID do pedido
  if (!pedido_id || isNaN(Number(pedido_id)) || Number(pedido_id) <= 0) {
    return res.status(400).json({ message: "ID do pedido deve ser um número positivo." });
  }

  // Validação da justificativa
  if (!justificativa || typeof justificativa !== "string" || justificativa.trim().length === 0) {
    return res.status(400).json({ message: "Justificativa do cancelamento é obrigatória." });
  }

  if (justificativa.trim().length < 10) {
    return res.status(400).json({ message: "Justificativa deve ter pelo menos 10 caracteres." });
  }

  // Normalizar justificativa
  req.body.justificativa = justificativa.trim();

  next();
}