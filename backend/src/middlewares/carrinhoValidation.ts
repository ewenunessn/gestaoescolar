import { Request, Response, NextFunction } from "express";
const db = require("../database");

/**
 * Middleware para validar dados de adição de item ao carrinho
 */
export function validateAdicionarItem(req: Request, res: Response, next: NextFunction) {
  try {
    const { produto_id, contrato_id, quantidade } = req.body;
    const errors: string[] = [];

    // Validar produto_id
    if (!produto_id) {
      errors.push("produto_id é obrigatório");
    } else {
      const produtoIdNum = parseInt(produto_id);
      if (isNaN(produtoIdNum) || produtoIdNum <= 0) {
        errors.push("produto_id deve ser um número inteiro maior que 0");
      } else {
        req.body.produto_id = produtoIdNum; // Normalizar
      }
    }

    // Validar contrato_id
    if (!contrato_id) {
      errors.push("contrato_id é obrigatório");
    } else {
      const contratoIdNum = parseInt(contrato_id);
      if (isNaN(contratoIdNum) || contratoIdNum <= 0) {
        errors.push("contrato_id deve ser um número inteiro maior que 0");
      } else {
        req.body.contrato_id = contratoIdNum; // Normalizar
      }
    }

    // Validar quantidade
    if (quantidade === undefined || quantidade === null) {
      errors.push("quantidade é obrigatória");
    } else {
      const quantidadeNum = parseFloat(quantidade);
      if (isNaN(quantidadeNum) || quantidadeNum <= 0) {
        errors.push("quantidade deve ser um número maior que 0");
      } else if (quantidadeNum > 1000000) {
        errors.push("quantidade não pode exceder 1.000.000 unidades");
      } else {
        req.body.quantidade = quantidadeNum; // Normalizar
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos para adicionar item ao carrinho",
        errors
      });
    }

    next();
  } catch (error) {
    console.error('❌ Erro na validação de adição ao carrinho:', error);
    res.status(500).json({ 
      success: false,
      message: "Erro interno na validação" 
    });
  }
}

/**
 * Middleware para validar dados de alteração de quantidade
 */
export function validateAtualizarQuantidade(req: Request, res: Response, next: NextFunction) {
  try {
    const { item_id, quantidade } = req.body;
    const errors: string[] = [];

    // Validar item_id
    if (!item_id && item_id !== 0) {
      errors.push("item_id é obrigatório");
    } else {
      const itemIdNum = parseInt(item_id);
      if (isNaN(itemIdNum) || itemIdNum <= 0) {
        errors.push("item_id deve ser um número inteiro maior que 0");
      } else {
        req.body.item_id = itemIdNum; // Normalizar
      }
    }

    // Validar quantidade
    if (quantidade === undefined || quantidade === null || quantidade === '') {
      errors.push("quantidade é obrigatória");
    } else {
      const quantidadeNum = parseFloat(quantidade);
      if (isNaN(quantidadeNum) || quantidadeNum <= 0) {
        errors.push("quantidade deve ser um número maior que 0");
      } else if (quantidadeNum > 1000000) {
        errors.push("quantidade não pode exceder 1.000.000 unidades");
      } else {
        req.body.quantidade = quantidadeNum; // Normalizar
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos para alterar quantidade",
        errors
      });
    }

    next();
  } catch (error) {
    console.error('❌ Erro na validação de alteração de quantidade:', error);
    res.status(500).json({ 
      success: false,
      message: "Erro interno na validação" 
    });
  }
}

/**
 * Middleware para validar parâmetros de remoção de item
 */
export function validateRemoverItem(req: Request, res: Response, next: NextFunction) {
  try {
    const itemId = parseInt(req.params.itemId);

    if (isNaN(itemId) || itemId <= 0) {
      return res.status(400).json({
        message: "itemId deve ser um número válido maior que 0"
      });
    }

    next();
  } catch (error) {
    console.error('❌ Erro na validação de remoção de item:', error);
    res.status(500).json({ message: "Erro interno na validação" });
  }
}

/**
 * Middleware para validar limites contratuais antes de adicionar ao carrinho
 */
export async function validateLimitesContratuais(req: Request, res: Response, next: NextFunction) {
  try {
    const { produto_id, contrato_id, quantidade } = req.body;
    const usuario_id = 1; // Por enquanto usuário fixo

    console.log(`🔍 Validando limites contratuais - Produto: ${produto_id}, Contrato: ${contrato_id}, Quantidade: ${quantidade}`);

    // Buscar informações do produto no contrato usando a view que considera reservas
    const produtoContrato = await db.get(`
      SELECT 
        vsci.contrato_produto_id,
        vsci.produto_id,
        vsci.produto_nome as nome_produto,
        vsci.quantidade_total as quantidade_contratual,
        vsci.quantidade_disponivel_real as quantidade_disponivel
      FROM view_saldo_contratos_itens vsci
      INNER JOIN contratos c ON vsci.contrato_id = c.id
      WHERE vsci.produto_id = $1 AND vsci.contrato_id = $2
        AND c.ativo = true
        AND vsci.data_fim >= CURRENT_DATE
    `, [produto_id, contrato_id]);
    
    if (!produtoContrato) {
      return res.status(404).json({
        success: false,
        message: "Produto não encontrado no contrato ou contrato inativo"
      });
    }

    // Buscar quantidade atual do produto no carrinho do usuário
    const quantidadeAtualNoCarrinho = await db.get(`
      SELECT COALESCE(SUM(quantidade), 0) as total
      FROM carrinho_itens
      WHERE produto_id = $1 AND contrato_id = $2 AND usuario_id = $3
    `, [produto_id, contrato_id, usuario_id]);

    const quantidadeAtual = quantidadeAtualNoCarrinho?.total || 0;
    const quantidadeTotal = quantidadeAtual + quantidade;

    console.log(`📊 Validação de limites:`, {
      produto: produtoContrato.nome_produto,
      quantidade_solicitada: quantidade,
      quantidade_atual_carrinho: quantidadeAtual,
      quantidade_total: quantidadeTotal,
      quantidade_disponivel: produtoContrato.quantidade_disponivel
    });

    // Verificar se a quantidade total não excede o disponível
    if (quantidadeTotal > produtoContrato.quantidade_disponivel) {
      return res.status(400).json({
        success: false,
        message: "Quantidade total excederia o limite contratual",
        quantidade_solicitada: quantidade,
        quantidade_no_carrinho: quantidadeAtual,
        quantidade_total: quantidadeTotal,
        quantidade_disponivel: produtoContrato.quantidade_disponivel,
        produto: produtoContrato.nome_produto
      });
    }

    // Adicionar informações do produto ao request para uso posterior
    (req as any).produtoContrato = produtoContrato;

    console.log(`✅ Limites contratuais validados com sucesso`);
    next();

  } catch (error: any) {
    console.error('❌ Erro na validação de limites contratuais:', error);
    res.status(500).json({
      success: false,
      message: "Erro interno na validação de limites contratuais",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Middleware para validar limites contratuais na alteração de quantidade
 */
export async function validateLimitesAlteracao(req: Request, res: Response, next: NextFunction) {
  try {
    const { item_id, quantidade } = req.body;
    const usuario_id = 1; // Por enquanto usuário fixo

    console.log(`🔍 Validando limites para alteração - Item: ${item_id}, Nova quantidade: ${quantidade}`);

    // Buscar item atual no carrinho
    const itemAtual = await db.get(`
      SELECT ci.*, p.nome as nome_produto, f.nome as nome_fornecedor
      FROM carrinho_itens ci
      INNER JOIN produtos p ON ci.produto_id = p.id
      INNER JOIN fornecedores f ON ci.fornecedor_id = f.id
      WHERE ci.id = $1 AND ci.usuario_id = $2
    `, [item_id, usuario_id]);

    if (!itemAtual) {
      return res.status(404).json({
        success: false,
        message: "Item não encontrado no carrinho do usuário"
      });
    }

    // Buscar informações do produto no contrato usando a view que considera reservas
    const produtoContrato = await db.get(`
      SELECT 
        vsci.contrato_produto_id,
        vsci.produto_id,
        vsci.produto_nome as nome_produto,
        vsci.quantidade_total as quantidade_contratual,
        vsci.quantidade_disponivel_real as quantidade_disponivel
      FROM view_saldo_contratos_itens vsci
      INNER JOIN contratos c ON vsci.contrato_id = c.id
      WHERE vsci.produto_id = $1 AND vsci.contrato_id = $2
        AND c.ativo = true
        AND vsci.data_fim >= CURRENT_DATE
    `, [itemAtual.produto_id, itemAtual.contrato_id]);
    
    if (!produtoContrato) {
      return res.status(404).json({
        success: false,
        message: "Produto não encontrado no contrato ou contrato inativo"
      });
    }

    // Calcular a diferença entre a nova quantidade e a atual
    const diferencaQuantidade = quantidade - itemAtual.quantidade;
    
    // Se a diferença for positiva (aumento), verificar se há saldo suficiente
    if (diferencaQuantidade > 0) {
      if (diferencaQuantidade > produtoContrato.quantidade_disponivel) {
        return res.status(400).json({
          success: false,
          message: `Quantidade solicitada (${quantidade}) excede o limite disponível (${produtoContrato.quantidade_disponivel}) para ${produtoContrato.nome_produto}`,
          quantidade_solicitada: quantidade,
          quantidade_atual: itemAtual.quantidade,
          diferenca_solicitada: diferencaQuantidade,
          quantidade_disponivel: produtoContrato.quantidade_disponivel,
          produto: produtoContrato.nome_produto
        });
      }
    }

    // Adicionar informações ao request para uso posterior
    (req as any).itemAtual = itemAtual;
    (req as any).produtoContrato = produtoContrato;

    console.log(`✅ Limites para alteração validados com sucesso`);
    next();

  } catch (error: any) {
    console.error('❌ Erro na validação de limites para alteração:', error);
    res.status(500).json({
      success: false,
      message: "Erro interno na validação de limites",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Middleware para sanitizar dados de entrada do carrinho
 */
export function sanitizeCarrinhoData(req: Request, res: Response, next: NextFunction) {
  try {
    // Sanitizar números para garantir que são inteiros
    if (req.body.produto_id) {
      req.body.produto_id = parseInt(req.body.produto_id);
    }
    
    if (req.body.contrato_id) {
      req.body.contrato_id = parseInt(req.body.contrato_id);
    }
    
    if (req.body.quantidade) {
      req.body.quantidade = parseInt(req.body.quantidade);
    }
    
    if (req.body.item_id) {
      req.body.item_id = parseInt(req.body.item_id);
    }

    // Sanitizar parâmetros da URL
    if (req.params.itemId) {
      req.params.itemId = req.params.itemId.replace(/[^0-9]/g, '');
    }

    next();
  } catch (error) {
    console.error('❌ Erro na sanitização de dados do carrinho:', error);
    res.status(500).json({ message: "Erro interno na sanitização" });
  }
}

/**
 * Middleware para log de operações do carrinho (desenvolvimento)
 */
export function logCarrinhoOperation(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🛒 Carrinho: ${req.method} ${req.originalUrl}`, {
      body: req.body,
      params: req.params,
      query: req.query,
      user: (req as any).user?.id
    });
  }
  next();
}

// Middleware validateConfirmarPedido removido pois não é usado
// A função confirmarPedido não requer fornecedor_id no body da requisição

/**
 * Middleware para verificar se o usuário tem permissão para acessar o carrinho
 */
export function checkCarrinhoPermission(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;

    if (!user || !user.id) {
      return res.status(401).json({
        message: "Usuário não autenticado"
      });
    }

    // Verificar se o usuário tem permissão para usar o carrinho
    // Por enquanto, todos os usuários autenticados podem usar
    // Futuramente pode ser implementada lógica de roles/permissões

    next();
  } catch (error) {
    console.error('❌ Erro na verificação de permissão do carrinho:', error);
    res.status(500).json({ message: "Erro interno na verificação de permissão" });
  }
}