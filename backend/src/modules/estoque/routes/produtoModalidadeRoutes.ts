import { Router } from "express";
import {
  listarProdutoModalidades,
  buscarProdutoModalidade,
  criarProdutoModalidade,
  editarProdutoModalidade,
  removerProdutoModalidade,
  listarModalidadesPorProduto,
  listarProdutosPorModalidade
} from "../controllers/produtoModalidadeController";

const router = Router();

// Listar todas as associações produto-modalidade
router.get("/", listarProdutoModalidades);

// Listar modalidades de um produto específico
router.get("/produto/:produto_id", listarModalidadesPorProduto);

// Listar produtos de uma modalidade específica
router.get("/modalidade/:modalidade_id", listarProdutosPorModalidade);

// Buscar associação produto-modalidade por ID
router.get("/:id", buscarProdutoModalidade);

// Criar nova associação produto-modalidade
router.post("/", criarProdutoModalidade);

// Editar associação produto-modalidade
router.put("/:id", editarProdutoModalidade);

// Remover associação produto-modalidade
router.delete("/:id", removerProdutoModalidade);

export default router;