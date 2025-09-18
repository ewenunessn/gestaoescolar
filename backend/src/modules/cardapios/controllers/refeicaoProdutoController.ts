import { Request, Response } from "express";
import {
  getRefeicaoProdutos,
  addRefeicaoProduto,
  updateRefeicaoProduto,
  deleteRefeicaoProduto,
} from "../models/RefeicaoProduto";

// Listar produtos de uma refeição
export async function listarRefeicaoProdutos(req: Request, res: Response) {
  const refeicao_id = Number(req.params.refeicaoId);
  const lista = await getRefeicaoProdutos(refeicao_id);
  res.json(lista);
}

// Adicionar produto à refeição
export async function adicionarRefeicaoProduto(req: Request, res: Response) {
  const refeicao_id = Number(req.params.refeicaoId);
  const { produto_id, per_capita, tipo_medida = 'gramas' } = req.body;
  
  if (!produto_id || per_capita == null) {
    return res
      .status(400)
      .json({ message: "Dados obrigatórios não informados." });
  }
  
  // Validar tipo_medida
  if (!['gramas', 'unidades'].includes(tipo_medida)) {
    return res.status(400).json({ 
      message: "tipo_medida deve ser 'gramas' ou 'unidades'." 
    });
  }
  
  // Validar se o valor está dentro de limites razoáveis
  const limite = tipo_medida === 'unidades' ? 100 : 1000;
  if (per_capita < 0 || per_capita > limite) {
    return res.status(400).json({ 
      message: `per_capita deve estar entre 0 e ${limite} ${tipo_medida}.` 
    });
  }
  
  const novo = await addRefeicaoProduto({
    refeicao_id,
    produto_id,
    per_capita,
    tipo_medida,
  });
  res.status(201).json(novo);
}

// Editar per_capita e tipo_medida de um produto da refeição
export async function editarRefeicaoProduto(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const { per_capita, tipo_medida } = req.body;
  
    if (per_capita == null) {
      return res.status(400).json({ message: "per_capita é obrigatório." });
    }
    
    // Validar tipo_medida se fornecido
    if (tipo_medida && !['gramas', 'unidades'].includes(tipo_medida)) {
      return res.status(400).json({ 
        message: "tipo_medida deve ser 'gramas' ou 'unidades'." 
      });
    }
    
    // Validar se o valor está dentro de limites razoáveis
    const limite = tipo_medida === 'unidades' ? 100 : 1000;
    if (per_capita < 0 || per_capita > limite) {
      return res.status(400).json({ 
        message: `per_capita deve estar entre 0 e ${limite} ${tipo_medida || 'gramas'}.` 
      });
    }
    
    const atualizado = await updateRefeicaoProduto(id, per_capita, tipo_medida);
    if (!atualizado)
      return res.status(404).json({ message: "Associação não encontrada." });
    res.json(atualizado);
  } catch (error) {
    console.error('Erro ao editar refeição produto:', error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
}

// Remover produto da refeição
export async function removerRefeicaoProduto(req: Request, res: Response) {
  const id = Number(req.params.id);
  const ok = await deleteRefeicaoProduto(id);
  if (!ok)
    return res.status(404).json({ message: "Associação não encontrada." });
  res.status(204).send();
}