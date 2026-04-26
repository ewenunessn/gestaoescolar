import { Request, Response } from "express";

import db from "../../../database";
import estoqueLedgerService from "../services/estoqueLedgerService";
import estoqueProjectionService from "../services/estoqueProjectionService";

const DEFAULT_STOCK_MODE = {
  modo_operacao: "hibrido",
  permite_ajuste_escola: true,
  permite_lancamento_central: true,
};

function getSchoolEventOrigin(req: Request): "portal_escola" | "central_operador" {
  return req.body.origem === "portal_escola" ? "portal_escola" : "central_operador";
}

export async function listarEstoqueEscola(req: Request, res: Response) {
  try {
    const escolaId = Number(req.params.escolaId);
    if (!escolaId) {
      return res.status(400).json({ success: false, message: "Escola inválida" });
    }

    const data = await estoqueProjectionService.listarSaldoEscolar(escolaId);
    return res.json({ success: true, data, total: data.length });
  } catch (error: any) {
    console.error("[ERROR] Erro ao listar estoque escolar por projeção:", error);
    return res.status(500).json({ success: false, message: "Erro ao listar estoque", error: error.message });
  }
}

export async function buscarConfiguracaoOperacaoEscola(req: Request, res: Response) {
  try {
    const escolaId = Number(req.params.escolaId);
    if (!escolaId) {
      return res.status(400).json({ success: false, message: "Escola inválida" });
    }

    const result = await db.query(
      `
        SELECT escola_id, modo_operacao, permite_ajuste_escola, permite_lancamento_central, updated_at, updated_by
        FROM estoque_operacao_escola
        WHERE escola_id = $1
      `,
      [escolaId],
    );

    return res.json({
      success: true,
      data: result.rows[0] ?? { escola_id: escolaId, ...DEFAULT_STOCK_MODE },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Erro ao buscar modo de operação", error: error.message });
  }
}

export async function buscarItemEstoque(req: Request, res: Response) {
  try {
    const escolaId = Number(req.params.escolaId);
    const produtoId = Number(req.params.produtoId);
    if (!escolaId || !produtoId) {
      return res.status(400).json({ success: false, message: "Parâmetros inválidos" });
    }

    const itens = await estoqueProjectionService.listarSaldoEscolar(escolaId);
    const item = itens.find((row) => row.produto_id === produtoId);

    if (!item) {
      return res.status(404).json({ success: false, message: "Item não encontrado" });
    }

    return res.json({ success: true, data: item });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Erro ao buscar item", error: error.message });
  }
}

export async function listarHistoricoEscola(req: Request, res: Response) {
  try {
    const escolaId = Number(req.params.escolaId);
    if (!escolaId) {
      return res.status(400).json({ success: false, message: "Escola inválida" });
    }

    const limite = Number(req.query.limite) || 200;
    const result = await db.query(
      `
        SELECT
          ee.id,
          ee.escola_id,
          ee.produto_id,
          ee.tipo_evento,
          ee.origem,
          ee.quantidade_delta,
          ee.quantidade_absoluta,
          ee.motivo,
          ee.observacao AS observacoes,
          ee.usuario_id,
          ee.usuario_nome_snapshot AS usuario_nome,
          ee.data_evento AS data_movimentacao,
          p.nome AS produto_nome
        FROM estoque_eventos ee
        LEFT JOIN produtos p ON p.id = ee.produto_id
        WHERE ee.escopo = 'escola'
          AND ee.escola_id = $1
        ORDER BY ee.data_evento DESC, ee.id DESC
        LIMIT $2
      `,
      [escolaId, limite],
    );

    return res.json({ success: true, data: result.rows });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Erro ao listar histórico", error: error.message });
  }
}

export async function registrarMovimentacao(req: Request, res: Response) {
  try {
    const escolaId = Number(req.params.escolaId);
    const produtoId = Number(req.body.produto_id);
    const tipoMovimentacao = req.body.tipo_movimentacao;
    const quantidade = Number(req.body.quantidade);

    if (!escolaId || !produtoId) {
      return res.status(400).json({ success: false, message: "Escola e produto são obrigatórios" });
    }

    if (!["entrada", "saida", "ajuste"].includes(tipoMovimentacao)) {
      return res.status(400).json({ success: false, message: "Tipo de movimentação inválido" });
    }

    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      return res.status(400).json({ success: false, message: "Quantidade inválida" });
    }

    const evento = await estoqueLedgerService.registrarMovimentacaoEscolar({
      escolaId,
      produtoId,
      tipoMovimentacao,
      quantidade,
      origem: getSchoolEventOrigin(req),
      motivo: req.body.motivo ?? req.body.tipo_movimentacao,
      observacao: req.body.observacoes,
      usuario_id: req.user?.id ?? req.body.usuario_id,
      usuario_nome_snapshot: req.user?.nome,
    });

    const quantidadePosterior = await estoqueLedgerService.getCurrentBalance("escola", produtoId, escolaId);

    return res.status(201).json({
      success: true,
      message: "Movimentação registrada",
      data: {
        evento_id: evento.id,
        escola_id: escolaId,
        produto_id: produtoId,
        tipo_evento: evento.tipo_evento,
        quantidade_posterior: quantidadePosterior,
      },
    });
  } catch (error: any) {
    const status = error.message === "Saldo insuficiente para a movimentação" ? 400 : 500;
    return res.status(status).json({ success: false, message: "Erro ao registrar movimentação", error: error.message });
  }
}

export async function debugEstoqueEscola(req: Request, res: Response) {
  try {
    const escolaId = Number(req.params.escolaId);
    if (!escolaId) {
      return res.status(400).json({ success: false, message: "Escola inválida" });
    }

    const saldo = await estoqueProjectionService.listarSaldoEscolar(escolaId);
    const eventos = await db.query(
      `
        SELECT id, produto_id, tipo_evento, origem, quantidade_delta, quantidade_absoluta, data_evento
        FROM estoque_eventos
        WHERE escopo = 'escola' AND escola_id = $1
        ORDER BY data_evento DESC, id DESC
        LIMIT 50
      `,
      [escolaId],
    );

    return res.json({
      success: true,
      debug: {
        escola_id: escolaId,
        saldo,
        eventos: eventos.rows,
      },
    });
  } catch (error: any) {
    console.error("[ERROR] Erro no debug do estoque escolar:", error);
    return res.status(500).json({ success: false, message: "Erro no debug", error: error.message });
  }
}
