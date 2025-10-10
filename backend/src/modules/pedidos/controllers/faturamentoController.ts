import { Request, Response } from "express";
import { FaturamentoService } from "../services/FaturamentoService";
import { FaturamentoModel } from "../models/Faturamento";
import { getErrorStatus, isBusinessError } from "../errors/FaturamentoErrors";
const db = require("../../../database");

const faturamentoModel = new FaturamentoModel(db.pool);

export async function calcularPreviaFaturamento(req: Request, res: Response) {
  try {
    const { pedido_id } = req.params;
    
    const previa = await FaturamentoService.calcularPreviaFaturamento(Number(pedido_id));
    
    res.json({
      success: true,
      data: previa
    });
  } catch (error) {
    console.error("❌ Erro ao calcular prévia do faturamento:", error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    const status = error instanceof Error ? getErrorStatus(error) : 500;
    
    res.status(status).json({
      success: false,
      message: errorMessage
    });
  }
}

export async function gerarFaturamento(req: Request, res: Response) {
  try {
    const { pedido_id } = req.params;
    const { observacoes } = req.body;
    const usuarioId = 1; // TODO: Pegar do token de autenticação
    
    const resultado = await FaturamentoService.gerarFaturamento(
      Number(pedido_id), 
      usuarioId, 
      observacoes
    );
    
    res.json({
      success: true,
      message: "Faturamento gerado com sucesso",
      data: resultado
    });
  } catch (error) {
    console.error("❌ Erro ao gerar faturamento:", error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    const status = error instanceof Error ? getErrorStatus(error) : 500;
    
    res.status(status).json({
      success: false,
      message: errorMessage
    });
  }
}

export async function listarFaturamentos(req: Request, res: Response) {
  try {
    const { pedido_id, status, data_inicio, data_fim, page = 1, limit = 50 } = req.query;
    
    const filtros: any = {};
    if (pedido_id) filtros.pedido_id = Number(pedido_id);
    if (status) filtros.status = status as string;
    if (data_inicio) filtros.data_inicio = new Date(data_inicio as string);
    if (data_fim) filtros.data_fim = new Date(data_fim as string);
    
    const faturamentos = await faturamentoModel.listar(filtros);
    
    // Paginação simples
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    
    const paginatedResults = faturamentos.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: paginatedResults,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: faturamentos.length,
        totalPages: Math.ceil(faturamentos.length / limitNum)
      }
    });
  } catch (error) {
    console.error("❌ Erro ao listar faturamentos:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar faturamentos",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function buscarFaturamento(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const faturamento = await faturamentoModel.buscarPorId(Number(id));
    
    if (!faturamento) {
      return res.status(404).json({
        success: false,
        message: "Faturamento não encontrado"
      });
    }
    
    const itens = await faturamentoModel.buscarItens(Number(id));
    
    res.json({
      success: true,
      data: {
        ...faturamento,
        itens: itens
      }
    });
  } catch (error) {
    console.error("❌ Erro ao buscar faturamento:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar faturamento",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function buscarFaturamentosPorPedido(req: Request, res: Response) {
  try {
    const { pedido_id } = req.params;
    
    const faturamentos = await faturamentoModel.buscarPorPedido(Number(pedido_id));
    
    res.json({
      success: true,
      data: faturamentos
    });
  } catch (error) {
    console.error("❌ Erro ao buscar faturamentos do pedido:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar faturamentos do pedido",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function atualizarStatusFaturamento(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['gerado', 'processado', 'cancelado'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status inválido"
      });
    }
    
    const sucesso = await faturamentoModel.atualizarStatus(Number(id), status);
    
    if (!sucesso) {
      return res.status(404).json({
        success: false,
        message: "Faturamento não encontrado"
      });
    }
    
    res.json({
      success: true,
      message: "Status do faturamento atualizado com sucesso"
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar status do faturamento:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao atualizar status do faturamento",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function excluirFaturamento(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    // Verificar se o faturamento existe e pode ser excluído
    const faturamento = await faturamentoModel.buscarPorId(Number(id));
    
    if (!faturamento) {
      return res.status(404).json({
        success: false,
        message: "Faturamento não encontrado"
      });
    }
    
    if (faturamento.status === 'processado') {
      return res.status(400).json({
        success: false,
        message: "Não é possível excluir faturamentos processados"
      });
    }
    
    const sucesso = await faturamentoModel.excluir(Number(id));
    
    if (!sucesso) {
      return res.status(500).json({
        success: false,
        message: "Erro ao excluir faturamento"
      });
    }
    
    res.json({
      success: true,
      message: "Faturamento excluído com sucesso"
    });
  } catch (error) {
    console.error("❌ Erro ao excluir faturamento:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao excluir faturamento",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function registrarConsumoFaturamento(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    await FaturamentoService.registrarConsumo(Number(id));
    
    res.json({
      success: true,
      message: "Consumo registrado com sucesso"
    });
  } catch (error) {
    console.error("❌ Erro ao registrar consumo:", error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    const status = error instanceof Error ? getErrorStatus(error) : 500;
    
    res.status(status).json({
      success: false,
      message: errorMessage
    });
  }
}

export async function registrarConsumoItem(req: Request, res: Response) {
  try {
    const { id, itemId } = req.params;
    const usuarioId = 1; // TODO: Pegar do token
    
    await FaturamentoService.registrarConsumoItem(
      Number(id),
      Number(itemId),
      usuarioId
    );
    
    res.json({
      success: true,
      message: "Consumo do item registrado com sucesso"
    });
  } catch (error) {
    console.error("❌ Erro ao registrar consumo do item:", error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    const status = error instanceof Error ? getErrorStatus(error) : 500;
    
    res.status(status).json({
      success: false,
      message: errorMessage
    });
  }
}

export async function reverterConsumoItem(req: Request, res: Response) {
  try {
    const { id, itemId } = req.params;
    const usuarioId = 1; // TODO: Pegar do token
    
    await FaturamentoService.reverterConsumoItem(
      Number(id),
      Number(itemId),
      usuarioId
    );
    
    res.json({
      success: true,
      message: "Consumo do item revertido com sucesso"
    });
  } catch (error) {
    console.error("❌ Erro ao reverter consumo do item:", error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    const status = error instanceof Error ? getErrorStatus(error) : 500;
    
    res.status(status).json({
      success: false,
      message: errorMessage
    });
  }
}

export async function removerItensModalidade(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { contrato_id, modalidade_id } = req.body;
    
    if (!contrato_id || !modalidade_id) {
      return res.status(400).json({
        success: false,
        message: "contrato_id e modalidade_id são obrigatórios"
      });
    }
    
    await FaturamentoService.removerItensModalidade(
      Number(id),
      Number(contrato_id),
      Number(modalidade_id)
    );
    
    res.json({
      success: true,
      message: "Itens da modalidade removidos com sucesso"
    });
  } catch (error) {
    console.error("❌ Erro ao remover itens da modalidade:", error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    res.status(500).json({
      success: false,
      message: errorMessage
    });
  }
}

export async function obterResumoFaturamento(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const faturamento = await faturamentoModel.buscarPorId(Number(id));
    
    if (!faturamento) {
      return res.status(404).json({
        success: false,
        message: "Faturamento não encontrado"
      });
    }
    
    const itens = await faturamentoModel.buscarItens(Number(id));
    
    // Agrupar por contrato e modalidade
    const resumoPorContrato: any = {};
    
    for (const item of itens) {
      const contratoKey = `${item.contrato_id}`;
      
      if (!resumoPorContrato[contratoKey]) {
        resumoPorContrato[contratoKey] = {
          contrato_id: item.contrato_id,
          contrato_numero: item.contrato_numero,
          fornecedor_id: item.fornecedor_id,
          fornecedor_nome: item.fornecedor_nome,
          fornecedor_cnpj: item.fornecedor_cnpj,
          modalidades: {},
          quantidade_total: 0,
          valor_total: 0
        };
      }
      
      const modalidadeKey = `${item.modalidade_id}`;
      
      if (!resumoPorContrato[contratoKey].modalidades[modalidadeKey]) {
        resumoPorContrato[contratoKey].modalidades[modalidadeKey] = {
          modalidade_id: item.modalidade_id,
          modalidade_nome: item.modalidade_nome,
          modalidade_codigo_financeiro: item.modalidade_codigo_financeiro,
          itens: [],
          quantidade_total: 0,
          valor_total: 0
        };
      }
      
      const modalidade = resumoPorContrato[contratoKey].modalidades[modalidadeKey];
      
      const itemData = {
        faturamento_item_id: item.id, // ID do item de faturamento
        produto_id: item.produto_id,
        produto_nome: item.produto_nome,
        unidade_medida: item.unidade ,
        quantidade_total: item.quantidade_modalidade,
        preco_unitario: item.preco_unitario,
        valor_total: item.valor_total,
        consumo_registrado: item.consumo_registrado || false,
        data_consumo: item.data_consumo
      };
      
      console.log('📊 Item adicionado ao resumo:', itemData);
      modalidade.itens.push(itemData);
      
      modalidade.quantidade_total += Number(item.quantidade_modalidade || 0);
      modalidade.valor_total += Number(item.valor_total || 0);
      
      resumoPorContrato[contratoKey].quantidade_total += Number(item.quantidade_modalidade || 0);
      resumoPorContrato[contratoKey].valor_total += Number(item.valor_total || 0);
    }
    
    // Converter modalidades de objeto para array
    const contratos = Object.values(resumoPorContrato).map((contrato: any) => ({
      ...contrato,
      modalidades: Object.values(contrato.modalidades)
    }));
    
    res.json({
      success: true,
      data: {
        faturamento: faturamento,
        contratos: contratos
      }
    });
  } catch (error) {
    console.error("❌ Erro ao obter resumo do faturamento:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao obter resumo do faturamento",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}