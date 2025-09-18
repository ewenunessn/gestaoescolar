import { Router } from "express";
import { 
  listarProdutos, 
  buscarProduto, 
  criarProduto, 
  editarProduto, 
  removerProduto,
  buscarComposicaoNutricional,
  salvarComposicaoNutricional,

  importarProdutosLote
} from "../controllers/produtoController";

const router = Router();

// Listar produtos
router.get("/", listarProdutos);

// Buscar produto por ID
router.get("/:id", buscarProduto);

// Criar novo produto
router.post("/", criarProduto);

// Editar produto
router.put("/:id", editarProduto);

// Remover produto
router.delete("/:id", removerProduto);

// Importar produtos em lote
router.post("/importar-lote", importarProdutosLote);



// Composição nutricional
router.get("/:id/composicao-nutricional", buscarComposicaoNutricional);
router.put("/:id/composicao-nutricional", salvarComposicaoNutricional);

export default router;