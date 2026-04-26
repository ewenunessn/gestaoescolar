import { Request, Response } from "express";

import EstoqueCentralModel from "../models/EstoqueCentral";
import estoqueLedgerService from "../services/estoqueLedgerService";
import estoqueProjectionService from "../services/estoqueProjectionService";

function parsePositiveNumber(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Quantidade deve ser maior que zero");
  }
  return parsed;
}

function parseNonNegativeNumber(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Quantidade nao pode ser negativa");
  }
  return parsed;
}

function mapLegacyCentralRow(item: any) {
  return {
    produto_id: Number(item.produto_id),
    produto_nome: item.produto_nome,
    produto_unidade: item.produto_unidade || item.unidade || "UN",
    quantidade_total: Number(item.quantidade_total ?? item.quantidade ?? 0),
    quantidade_disponivel: Number(item.quantidade_disponivel ?? item.quantidade ?? 0),
    quantidade_reservada: Number(item.quantidade_reservada ?? 0),
    quantidade_vencida: Number(item.quantidade_vencida ?? 0),
    lotes_ativos: Number(item.lotes_ativos ?? item.total_lotes ?? 0),
    proximo_vencimento: item.proximo_vencimento ?? item.proxima_validade ?? null,
  };
}

function mapLegacyMovimentacaoRow(item: any) {
  const quantidade = Number(item.quantidade ?? 0);
  return {
    id: Number(item.id),
    escopo: "central",
    produto_id: Number(item.produto_id),
    produto_nome: item.produto_nome || "Movimentacao de estoque",
    tipo_evento:
      item.tipo === "entrada"
        ? "recebimento_central"
        : item.tipo === "saida"
          ? "saida_central"
          : item.tipo === "ajuste"
            ? "ajuste_estoque"
            : item.tipo || "movimentacao",
    origem: "central_operador",
    quantidade_movimentada: quantidade,
    data_movimentacao: item.data_movimentacao ?? item.created_at ?? item.updated_at,
    usuario_nome: item.usuario_nome ?? null,
    motivo: item.motivo ?? null,
    observacoes: item.observacao ?? item.observacoes ?? null,
  };
}

function isMissingRelationError(error: any): boolean {
  return error?.code === "42P01" || String(error?.message || "").includes("does not exist");
}

class EstoqueCentralController {
  async listar(req: Request, res: Response) {
    try {
      const mostrarTodos =
        req.query.mostrarTodos === "true" ||
        req.query.mostrar_todos === "true" ||
        req.query.incluirZerados === "true";
      const estoque = await estoqueProjectionService.listarSaldoCentral({ mostrarTodos });
      res.json({ success: true, data: estoque, estoque });
    } catch (error: any) {
      try {
        console.warn("Falha ao ler ledger central; usando estoque legado:", error.message);
        const legacy = await EstoqueCentralModel.listar();
        const estoque = legacy.map(mapLegacyCentralRow);
        return res.json({ success: true, data: estoque, estoque, source: "legacy" });
      } catch (fallbackError: any) {
        if (isMissingRelationError(fallbackError)) {
          return res.json({ success: true, data: [], estoque: [], source: "empty" });
        }
        return res.status(500).json({ error: fallbackError.message || error.message });
      }
    }
  }

  async buscarPorProduto(req: Request, res: Response) {
    try {
      const produtoId = Number(req.params.produtoId);
      const estoque = await estoqueProjectionService.listarSaldoCentral();
      const item = estoque.find((row) => row.produto_id === produtoId);

      if (!item) {
        return res.status(404).json({ error: "Produto nao encontrado no estoque" });
      }

      return res.json({ success: true, data: item, item });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async registrarEntrada(req: Request, res: Response) {
    try {
      const produto_id = Number(req.body.produto_id);
      if (!produto_id) {
        return res.status(400).json({ error: "produto_id e obrigatorio" });
      }

      const quantidade = parsePositiveNumber(req.body.quantidade);
      const movimentacao = await estoqueLedgerService.registrarMovimentacaoCentral({
        produtoId: produto_id,
        tipoMovimentacao: "entrada",
        quantidade,
        origem: req.body.origem ?? "central_operador",
        motivo: req.body.motivo,
        observacao: req.body.observacao,
        referencia_tipo: req.body.referencia_tipo ?? "entrada_manual",
        referencia_id: req.body.referencia_id ? Number(req.body.referencia_id) : undefined,
        usuario_id: req.user?.id,
        usuario_nome_snapshot: req.user?.nome,
      });

      return res.status(201).json({ success: true, data: movimentacao, movimentacao });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async simularSaida(req: Request, res: Response) {
    try {
      const produto_id = Number(req.body.produto_id);
      if (!produto_id) {
        return res.status(400).json({ error: "produto_id e obrigatorio" });
      }

      const quantidade = parsePositiveNumber(req.body.quantidade);
      const saldoAtual = await estoqueLedgerService.getCurrentBalance("central", produto_id);
      const saldoPosterior = saldoAtual - quantidade;

      if (saldoPosterior < 0) {
        return res.status(400).json({
          error: `Quantidade insuficiente. Saldo atual: ${saldoAtual}`,
        });
      }

      return res.json({
        success: true,
        data: {
          produto_id,
          quantidade_solicitada: quantidade,
          quantidade_disponivel: saldoAtual,
          saldo_posterior: saldoPosterior,
        },
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async registrarSaida(req: Request, res: Response) {
    try {
      const produto_id = Number(req.body.produto_id);
      if (!produto_id) {
        return res.status(400).json({ error: "produto_id e obrigatorio" });
      }

      const quantidade = parsePositiveNumber(req.body.quantidade);
      const movimentacao = await estoqueLedgerService.registrarMovimentacaoCentral({
        produtoId: produto_id,
        tipoMovimentacao: "saida",
        quantidade,
        origem: req.body.origem ?? "central_operador",
        motivo: req.body.motivo,
        observacao: req.body.observacao,
        referencia_tipo: req.body.referencia_tipo ?? "saida_manual",
        referencia_id: req.body.referencia_id ? Number(req.body.referencia_id) : undefined,
        usuario_id: req.user?.id,
        usuario_nome_snapshot: req.user?.nome,
      });

      return res.status(201).json({ success: true, data: movimentacao, movimentacao });
    } catch (error: any) {
      const status = error.message?.includes("Saldo insuficiente") ? 400 : 500;
      return res.status(status).json({ error: error.message });
    }
  }

  async registrarAjuste(req: Request, res: Response) {
    try {
      const produto_id = Number(req.body.produto_id);
      if (!produto_id) {
        return res.status(400).json({ error: "produto_id e obrigatorio" });
      }

      const quantidade = parseNonNegativeNumber(req.body.quantidade_nova);
      const movimentacao = await estoqueLedgerService.registrarMovimentacaoCentral({
        produtoId: produto_id,
        tipoMovimentacao: "ajuste",
        quantidade,
        origem: req.body.origem ?? "central_operador",
        motivo: req.body.motivo,
        observacao: req.body.observacao,
        referencia_tipo: req.body.referencia_tipo ?? "ajuste_manual",
        referencia_id: req.body.referencia_id ? Number(req.body.referencia_id) : undefined,
        usuario_id: req.user?.id,
        usuario_nome_snapshot: req.user?.nome,
      });

      return res.status(201).json({ success: true, data: movimentacao, movimentacao });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async registrarTransferencia(req: Request, res: Response) {
    try {
      const escola_id = Number(req.body.escola_id);
      const produto_id = Number(req.body.produto_id);
      if (!escola_id || !produto_id) {
        return res.status(400).json({ error: "escola_id e produto_id sao obrigatorios" });
      }

      const quantidade = parsePositiveNumber(req.body.quantidade);
      const data = await estoqueLedgerService.registrarTransferenciaParaEscola({
        escola_id,
        produto_id,
        quantidade,
        motivo: req.body.motivo,
        observacao: req.body.observacao,
        referencia_tipo: req.body.referencia_tipo ?? "transferencia_manual",
        referencia_id: req.body.referencia_id ? Number(req.body.referencia_id) : undefined,
        usuario_id: req.user?.id,
        usuario_nome_snapshot: req.user?.nome,
      });

      return res.status(201).json({ success: true, data });
    } catch (error: any) {
      const status = error.message?.includes("Saldo insuficiente") ? 400 : 500;
      return res.status(status).json({ error: error.message });
    }
  }

  async listarLotes(req: Request, res: Response) {
    try {
      const estoqueId = Number(req.params.estoqueId);
      const lotes = await EstoqueCentralModel.listarLotes(estoqueId);
      const lotesFormatados = lotes.map((lote) => ({
        ...lote,
        quantidade: parseFloat(lote.quantidade as any) || 0,
        quantidade_reservada: parseFloat(lote.quantidade_reservada as any) || 0,
        quantidade_disponivel: parseFloat(lote.quantidade_disponivel as any) || 0,
      }));

      return res.json({ success: true, data: lotesFormatados, lotes: lotesFormatados });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async listarLotesProximosVencimento(req: Request, res: Response) {
    try {
      const dias = parseInt(req.query.dias as string) || 30;
      const lotes = await EstoqueCentralModel.listarLotesProximosVencimento(dias);
      return res.json({ success: true, data: lotes, lotes, dias });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async listarEstoqueBaixo(req: Request, res: Response) {
    try {
      const produtos = await EstoqueCentralModel.listarEstoqueBaixo();
      return res.json({ success: true, data: produtos, produtos });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async listarAlertas(req: Request, res: Response) {
    try {
      const dias = parseInt(req.query.dias as string) || 30;
      const [lotesVencimento, produtosEstoqueBaixo] = await Promise.all([
        EstoqueCentralModel.listarLotesProximosVencimento(dias),
        EstoqueCentralModel.listarEstoqueBaixo(),
      ]);

      const alertas = [
        ...lotesVencimento.map((lote: any) => ({
          id: `vencimento-${lote.id}`,
          produto_id: lote.produto_id,
          lote_id: lote.id,
          tipo: "vencimento_proximo",
          nivel: lote.dias_para_vencimento <= 7 ? "critical" : "warning",
          titulo: "Lote proximo do vencimento",
          descricao: `${lote.produto_nome} - Lote ${lote.lote} vence em ${lote.dias_para_vencimento} dias`,
          data_alerta: new Date().toISOString(),
          visualizado: false,
          resolvido: false,
          produto_nome: lote.produto_nome,
          lote: lote.lote,
        })),
        ...produtosEstoqueBaixo.map((produto: any) => ({
          id: `estoque-baixo-${produto.id}`,
          produto_id: produto.id,
          lote_id: null,
          tipo: produto.quantidade_total === 0 ? "estoque_zerado" : "estoque_baixo",
          nivel: produto.quantidade_total === 0 ? "critical" : "warning",
          titulo: produto.quantidade_total === 0 ? "Estoque zerado" : "Estoque baixo",
          descricao: `${produto.nome} - Quantidade: ${produto.quantidade_total} ${produto.unidade}`,
          data_alerta: new Date().toISOString(),
          visualizado: false,
          resolvido: false,
          produto_nome: produto.nome,
          lote: null,
        })),
      ];

      return res.json({ success: true, data: alertas });
    } catch (error: any) {
      if (isMissingRelationError(error)) {
        return res.json({ success: true, data: [] });
      }
      return res.status(500).json({ error: error.message });
    }
  }

  async listarMovimentacoes(req: Request, res: Response) {
    const produtoId =
      req.query.produto_id !== undefined
        ? Number(req.query.produto_id)
        : req.query.estoque_id !== undefined
          ? Number(req.query.estoque_id)
          : undefined;
    const limit = parseInt(req.query.limit as string) || 100;

    try {
      const movimentacoes = await estoqueProjectionService.listarMovimentacoes("central", {
        produtoId,
        limit,
      });

      return res.json({ success: true, data: movimentacoes, movimentacoes });
    } catch (error: any) {
      try {
        console.warn("Falha ao ler timeline central; usando historico legado:", error.message);
        const legacy = await EstoqueCentralModel.listarMovimentacoes(
          produtoId,
          undefined,
          undefined,
          undefined,
          limit,
          0,
        );
        const movimentacoes = legacy.map(mapLegacyMovimentacaoRow);
        return res.json({ success: true, data: movimentacoes, movimentacoes, source: "legacy" });
      } catch (fallbackError: any) {
        if (isMissingRelationError(fallbackError)) {
          return res.json({ success: true, data: [], movimentacoes: [], source: "empty" });
        }
        return res.status(500).json({ error: fallbackError.message || error.message });
      }
    }
  }
}

export default new EstoqueCentralController();
