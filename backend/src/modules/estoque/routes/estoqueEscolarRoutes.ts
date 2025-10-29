import { Router } from "express";
import {
  buscarEstoqueEscolarProduto,
  listarEstoqueEscolar,
  resetEstoque,
  buscarEstoqueMultiplosProdutos,
  buscarMatrizEstoque
} from "../controllers/estoqueEscolarController";
import { 
  validateBody, 
  validateQuery, 
  validateParams,
  validatePagination,
  sanitize,
  logValidation
} from "../../../middleware/validation";
import { 
  multiplosProdutosSchema, 
  matrizEstoqueQuerySchema,
  idSchema 
} from "../../../schemas";
import { z } from 'zod';

const router = Router();

// Aplicar sanitização e logging em todas as rotas
router.use(sanitize());
if (process.env.NODE_ENV === 'development') {
  router.use(logValidation());
}

// Schema para validação de parâmetro produto_id
const produtoIdParamSchema = z.object({
  produto_id: z.coerce.number().int().positive('ID do produto deve ser um número positivo')
});

// Listar estoque escolar (resumo de todos os produtos)
router.get("/", 
  validatePagination,
  listarEstoqueEscolar
);

// NOVO: Buscar matriz completa (escolas x produtos) - OTIMIZADO
router.get("/matriz", 
  validateQuery(matrizEstoqueQuerySchema),
  buscarMatrizEstoque
);

// NOVO: Buscar múltiplos produtos de uma vez - RESOLVE N+1
router.post("/multiplos-produtos", 
  validateBody(multiplosProdutosSchema),
  buscarEstoqueMultiplosProdutos
);

// Buscar estoque escolar de um produto específico
router.get("/produto/:produto_id", 
  validateParams(produtoIdParamSchema),
  buscarEstoqueEscolarProduto
);

// Resetar estoque global (todas as escolas) com backup
router.post("/reset", resetEstoque);

export default router;