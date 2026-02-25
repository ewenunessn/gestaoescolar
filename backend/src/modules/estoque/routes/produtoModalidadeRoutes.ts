import { Router } from "express";
import {
  listarProdutoModalidades,
  buscarProdutoModalidade,
  criarProdutoModalidade,
  editarProdutoModalidade,
  removerProdutoModalidade
} from "../controllers/produtoModalidadeController";

const router = Router();

// Listar todas as associações produto-modalidade
router.get("/", listarProdutoModalidades);

// Buscar associação produto-modalidade por ID
router.get("/:id", buscarProdutoModalidade);

// Criar nova associação produto-modalidade
router.post("/", criarProdutoModalidade);

// Editar associação produto-modalidade
router.put("/:id", editarProdutoModalidade);

// Remover associação produto-modalidade
router.delete("/:id", removerProdutoModalidade);

export default router;