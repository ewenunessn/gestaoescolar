import { Router } from "express";
import { 
  getCarrinho, 
  adicionarItemCarrinho, 
  removerItemCarrinho, 
  limparCarrinho,
  atualizarQuantidadeItem,
  confirmarPedido
} from "../controllers/carrinhoController";
import { validateLimitesContratuais, validateLimitesAlteracao } from "../middlewares/carrinhoValidation";

const router = Router();

// Buscar carrinho
router.get("/", getCarrinho);

// Adicionar item ao carrinho
router.post("/itens", validateLimitesContratuais, adicionarItemCarrinho);
router.post("/adicionar", validateLimitesContratuais, adicionarItemCarrinho); // Alias para compatibilidade

// Atualizar quantidade de item
router.put("/alterar", validateLimitesAlteracao, atualizarQuantidadeItem);
router.put("/itens/:id", validateLimitesAlteracao, atualizarQuantidadeItem);

// Remover item do carrinho
router.delete("/itens/:id", removerItemCarrinho);
router.delete("/:id", removerItemCarrinho); // Alias para compatibilidade

// Limpar carrinho
router.delete("/", limparCarrinho);

// Confirmar pedido
router.post("/confirmar", confirmarPedido);

export default router;