import { Request, Response } from "express";
import {
  getProdutoComposicaoNutricional,
  upsertComposicaoNutricional,
} from "../models/ProdutoComposicaoNutricional";

// Buscar composição nutricional de um produto
export async function buscarComposicaoNutricional(req: Request, res: Response) {
  const produto_id = Number(req.params.produtoId);
  if (isNaN(produto_id))
    return res.status(400).json({ message: "ID do produto inválido." });
  const composicao = await getProdutoComposicaoNutricional(produto_id);
  if (!composicao)
    return res
      .status(404)
      .json({
        message: "Composição nutricional não encontrada para este produto.",
      });
  res.json(composicao);
}

// Criar ou atualizar composição nutricional de um produto
export async function salvarComposicaoNutricional(req: Request, res: Response) {
  const produto_id = Number(req.params.produtoId);
  if (isNaN(produto_id))
    return res.status(400).json({ message: "ID do produto inválido." });
  // Validação básica dos campos (pode ser expandida)
  const data = req.body;
  try {
    const composicao = await upsertComposicaoNutricional(produto_id, data);
    res.status(200).json(composicao);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erro ao salvar composição nutricional.", error });
  }
}