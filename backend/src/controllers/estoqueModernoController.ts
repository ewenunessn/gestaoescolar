import { Request, Response } from "express";
import {
  createEstoqueModernoTables,
  criarLoteEstoque,
  getLotesProduto,
  getPosicaoEstoque,
  getMovimentacoesProduto,
  processarSaida,
  verificarAlertas,
  getAlertas,
  getLoteById
} from "../models/EstoqueModerno";
import { getProdutoById } from "../models/Produto";
const db = require("../database");

// Inicializar tabelas (chamado no startup)
export async function initEstoqueModerno() {
  try {
    await createEstoqueModernoTables();
    await migrarStatusEsgotado();
    await limparAlertasDuplicados();
    console.log("✅ Tabelas do estoque moderno criadas com sucesso");
  } catch (error) {
    console.error("❌ Erro ao criar tabelas do estoque moderno:", error);
  }
}

// Migração para limpar alertas duplicados
async function limparAlertasDuplicados() {
  try {
    console.log("🔄 Limpando alertas duplicados...");

    const result = await db.query(`
      DELETE FROM estoque_alertas 
      WHERE id NOT IN (
        SELECT MAX(id) 
        FROM estoque_alertas 
        GROUP BY produto_id, COALESCE(lote_id, 0), tipo, resolvido
      )
    `);

    console.log(`✅ ${result.rowCount || 0} alertas duplicados removidos`);
  } catch (error) {
    console.error("⚠️ Erro ao limpar alertas duplicados (continuando):", error);
    // Não falha a inicialização se a limpeza der erro
  }
}

// Migração para adicionar status 'esgotado'
async function migrarStatusEsgotado() {
  try {
    // Verificar se já existe algum lote com status 'esgotado'
    const statusExistentes = await db.query(`SELECT DISTINCT status FROM estoque_lotes`);
    const hasEsgotado = statusExistentes.rows.some((s: any) => s.status === 'esgotado');

    if (hasEsgotado) {
      console.log("✅ Status 'esgotado' já existe na tabela");
    }

    console.log("🔄 Atualizando lotes com quantidade 0 para status 'esgotado'...");

    const result = await db.query(
      `UPDATE estoque_lotes 
       SET status = 'esgotado' 
       WHERE quantidade_atual = 0 AND status = 'ativo'`
    );

    console.log(`✅ Migração concluída! ${result.rowCount || 0} lotes atualizados para 'esgotado'`);
  } catch (error) {
    console.error("⚠️ Erro na migração (continuando):", error);
    // Não falha a inicialização se a migração der erro
  }
}

// Listar posição geral do estoque
export async function listarPosicaoEstoque(req: Request, res: Response) {
  try {
    const mostrarTodos = req.query.mostrarTodos === 'true';
    const posicoes = await getPosicaoEstoque(mostrarTodos);
    res.json({
      success: true,
      data: posicoes,
      total: posicoes.length
    });
  } catch (error: any) {
    console.error("Erro ao listar posição do estoque:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar posição do estoque",
      error: error.message
    });
  }
}

// Listar todos os lotes
export async function listarTodosLotes(req: Request, res: Response) {
  try {
    const { status, ordenar_por = "created_at", ordem = "DESC", limite = "50" } = req.query;

    let whereClause = "";
    const params: any[] = [];

    if (status) {
      whereClause = "WHERE el.status = $1";
      params.push(status);
    }

    const query = `
      SELECT 
        el.id,
        el.produto_id,
        p.nome as produto_nome,
        p.unidade as unidade_medida,
        el.lote,
        el.quantidade_inicial,
        el.quantidade_atual,
        el.data_validade,
        el.data_fabricacao,
        el.fornecedor_id,
        f.nome as fornecedor_nome,
  
        el.status,
        el.observacoes,
        el.created_at,
        el.updated_at
      FROM estoque_lotes el
      LEFT JOIN produtos p ON el.produto_id = p.id
      LEFT JOIN fornecedores f ON el.fornecedor_id = f.id
      ${whereClause}
      ORDER BY el.${ordenar_por} ${ordem}
      LIMIT $${params.length + 1}
    `;

    params.push(parseInt(limite as string));

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: {
        lotes: result.rows,
        total: result.rows.length
      }
    });

  } catch (error) {
    console.error("Erro ao listar todos os lotes:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
}

// Listar lotes de um produto
export async function listarLotesProduto(req: Request, res: Response) {
  try {
    const produto_id = Number(req.params.produto_id);
    const apenasAtivos = req.query.apenas_ativos !== 'false';

    if (!produto_id) {
      return res.status(400).json({
        success: false,
        message: "ID do produto é obrigatório"
      });
    }

    // Verificar se produto existe
    const produto = await getProdutoById(produto_id);
    if (!produto) {
      return res.status(404).json({
        success: false,
        message: "Produto não encontrado"
      });
    }

    const lotes = await getLotesProduto(produto_id, apenasAtivos);
    
    res.json({
      success: true,
      data: lotes,
      produto: {
        id: produto.id,
        nome: produto.nome,
        unidade: produto.unidade
      }
    });
  } catch (error: any) {
    console.error("Erro ao listar lotes do produto:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar lotes do produto",
      error: error.message
    });
  }
}

// Criar novo lote (entrada manual)
export async function criarLote(req: Request, res: Response) {
  try {
    const {
      produto_id,
      lote,
      quantidade,
      data_fabricacao,
      data_validade,
      fornecedor_id,
      observacoes
    } = req.body;

    // Validações básicas
    if (!produto_id || !lote || quantidade === null || quantidade === undefined || quantidade < 0) {
      return res.status(400).json({
        success: false,
        message: "Produto, lote e quantidade são obrigatórios"
      });
    }

    // Verificar se produto existe
    const produto = await getProdutoById(produto_id);
    if (!produto) {
      return res.status(404).json({
        success: false,
        message: "Produto não encontrado"
      });
    }

    // Validar datas se fornecidas
    if (data_fabricacao && data_validade) {
      const fabricacao = new Date(data_fabricacao);
      const validade = new Date(data_validade);
      
      if (validade <= fabricacao) {
        return res.status(400).json({
          success: false,
          message: "Data de validade deve ser posterior à data de fabricação"
        });
      }
    }

    const novoLote = await criarLoteEstoque({
      produto_id,
      lote: lote.toString().trim(),
      quantidade: Number(quantidade),
      data_fabricacao,
      data_validade,
      fornecedor_id: fornecedor_id || null,

      observacoes,
      usuario_id: req.user?.id || 1 // TODO: pegar do token JWT
    });

    res.status(201).json({
      success: true,
      message: "Lote criado com sucesso",
      data: novoLote
    });
  } catch (error: any) {
    console.error("Erro ao criar lote:", error);
    
    if (error.message.includes('já existe')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: "Erro ao criar lote",
      error: error.message
    });
  }
}

// Processar saída de estoque
export async function processarSaidaEstoque(req: Request, res: Response) {
  try {
    console.log('🔄 Processando saída de estoque:', req.body);
    
    const {
      produto_id,
      quantidade,
      motivo,
      documento_referencia,
      observacoes
    } = req.body;

    // Validações
    if (!produto_id || quantidade === null || quantidade === undefined || quantidade < 0 || !motivo) {
      console.log('❌ Validação falhou:', { produto_id, quantidade, motivo });
      return res.status(400).json({
        success: false,
        message: "Produto, quantidade e motivo são obrigatórios"
      });
    }

    // Verificar se produto existe
    const produto = await getProdutoById(produto_id);
    if (!produto) {
      console.log('❌ Produto não encontrado:', produto_id);
      return res.status(404).json({
        success: false,
        message: "Produto não encontrado"
      });
    }

    console.log('✅ Produto encontrado:', produto.nome);
    console.log('🔄 Processando saída...');

    const movimentacoes = await processarSaida({
      produto_id,
      quantidade: Number(quantidade),
      motivo,
      documento_referencia,
      observacoes,
      usuario_id: req.user?.id || 1 // TODO: pegar do token JWT
    });

    console.log('✅ Saída processada com sucesso:', Array.isArray(movimentacoes) ? movimentacoes.length : 1, 'movimentações');

    res.json({
      success: true,
      message: "Saída processada com sucesso",
      data: {
        movimentacoes,
        quantidade_total: Array.isArray(movimentacoes) && movimentacoes.length > 0 ? movimentacoes.reduce((sum, mov) => sum + mov.quantidade, 0) : 0
      }
    });
  } catch (error: any) {
    console.error("Erro ao processar saída:", error);
    
    if (error.message.includes('estoque')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: "Erro ao processar saída",
      error: error.message
    });
  }
}

// Listar movimentações de um produto
export async function listarMovimentacoes(req: Request, res: Response) {
  try {
    const produto_id = Number(req.params.produto_id);
    const limite = Number(req.query.limite) || 50;

    if (!produto_id) {
      return res.status(400).json({
        success: false,
        message: "ID do produto é obrigatório"
      });
    }

    const movimentacoes = await getMovimentacoesProduto(produto_id, limite);
    
    res.json({
      success: true,
      data: movimentacoes
    });
  } catch (error: any) {
    console.error("Erro ao listar movimentações:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar movimentações",
      error: error.message
    });
  }
}

// Listar alertas do estoque
export async function listarAlertas(req: Request, res: Response) {
  try {
    const apenasNaoResolvidos = req.query.apenas_nao_resolvidos !== 'false';
    const alertas = await getAlertas(!apenasNaoResolvidos);
    
    res.json({
      success: true,
      data: alertas,
      resumo: {
        total: alertas.length,
        criticos: alertas.filter(a => a.nivel === 'critical').length,
        avisos: alertas.filter(a => a.nivel === 'warning').length,
        informativos: alertas.filter(a => a.nivel === 'info').length
      }
    });
  } catch (error: any) {
    console.error("Erro ao listar alertas:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar alertas",
      error: error.message
    });
  }
}

// Atualizar alertas (verificar novos)
export async function atualizarAlertas(req: Request, res: Response) {
  try {
    const produto_id = req.query.produto_id ? Number(req.query.produto_id) : undefined;
    
    await verificarAlertas(produto_id);
    
    res.json({
      success: true,
      message: "Alertas atualizados com sucesso"
    });
  } catch (error: any) {
    console.error("Erro ao atualizar alertas:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao atualizar alertas",
      error: error.message
    });
  }
}

// Marcar alerta como resolvido
export async function resolverAlerta(req: Request, res: Response) {
  try {
    const alerta_id = Number(req.params.alerta_id);
    
    if (!alerta_id) {
      return res.status(400).json({
        success: false,
        message: "ID do alerta é obrigatório"
      });
    }

    // Verificar se alerta existe
    const alerta = await db.query(
      'SELECT * FROM estoque_alertas WHERE id = $1',
      [alerta_id]
    );

    if (alerta.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Alerta não encontrado"
      });
    }

    // Marcar como resolvido
    await db.query(
      'UPDATE estoque_alertas SET resolvido = TRUE WHERE id = $1',
      [alerta_id]
    );

    res.json({
      success: true,
      message: "Alerta marcado como resolvido"
    });
  } catch (error: any) {
    console.error("Erro ao resolver alerta:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao resolver alerta",
      error: error.message
    });
  }
}

// Detalhes de um lote específico
export async function detalharLote(req: Request, res: Response) {
  try {
    const lote_id = Number(req.params.lote_id);
    
    if (!lote_id) {
      return res.status(400).json({
        success: false,
        message: "ID do lote é obrigatório"
      });
    }

    const lote = await getLoteById(lote_id);
    
    res.json({
      success: true,
      data: lote
    });
  } catch (error: any) {
    console.error("Erro ao detalhar lote:", error);
    
    if (error.message.includes('não encontrado')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: "Erro ao detalhar lote",
      error: error.message
    });
  }
}

// Rastreabilidade completa de um lote
export async function rastreabilidadeLote(req: Request, res: Response) {
  try {
    const lote_id = Number(req.params.lote_id);
    
    if (!lote_id) {
      return res.status(400).json({
        success: false,
        message: "ID do lote é obrigatório"
      });
    }

    // Buscar dados completos do lote com rastreabilidade
    const loteCompletoResult = await db.query(`
      SELECT 
        el.*,
        rm.numero_recebimento,
        rm.pedido_id,
        rm.usuario_recebedor_id,
        rm.data_inicio as data_recebimento,
        ur.nome as usuario_recebedor_nome,
        pm.numero_pedido,
        pm.data_pedido,
        pm.valor_total as valor_pedido,
        f.nome as fornecedor_nome
      FROM estoque_lotes el
      LEFT JOIN recebimentos_modernos rm ON el.recebimento_id = rm.id
      LEFT JOIN usuarios ur ON rm.usuario_recebedor_id = ur.id
      LEFT JOIN pedidos pm ON rm.pedido_id = pm.id
      LEFT JOIN fornecedores f ON el.fornecedor_id = f.id
      WHERE el.id = $1
    `, [lote_id]);

    const loteCompleto = loteCompletoResult.rows[0];

    if (!loteCompleto) {
      return res.status(404).json({
        success: false,
        message: "Lote não encontrado"
      });
    }

    // Buscar todas as movimentações do lote
    const movimentacoesResult = await db.query(`
      SELECT 
        em.*,
        u.nome as usuario_nome
      FROM estoque_movimentacoes em
      LEFT JOIN usuarios u ON em.usuario_id = u.id
      WHERE em.lote_id = $1
      ORDER BY em.data_movimentacao ASC
    `, [lote_id]);

    res.json({
      success: true,
      data: {
        lote: loteCompleto,
        movimentacoes: movimentacoesResult.rows,
        rastreabilidade: {
          pedido: loteCompleto.numero_pedido ? {
            numero: loteCompleto.numero_pedido,
            data: loteCompleto.data_pedido,
            valor: loteCompleto.valor_pedido
          } : null,
          recebimento: loteCompleto.numero_recebimento ? {
            numero: loteCompleto.numero_recebimento,
            data: loteCompleto.data_recebimento,
            usuario: loteCompleto.usuario_recebedor_nome
          } : null,
          fornecedor: loteCompleto.fornecedor_nome
        }
      }
    });
  } catch (error: any) {
    console.error("Erro ao buscar rastreabilidade:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar rastreabilidade",
      error: error.message
    });
  }
}