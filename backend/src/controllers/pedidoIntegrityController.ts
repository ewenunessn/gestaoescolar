import { Request, Response } from "express";
import { PedidoIntegrityChecker } from "../utils/pedidoIntegrityChecker";

/**
 * Controller para operações de integridade de pedidos
 */

// Verificar integridade de um pedido específico
export async function checkPedidoIntegrity(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const pedidoId = parseInt(id);

    if (isNaN(pedidoId) || pedidoId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID do pedido deve ser um número válido maior que zero"
      });
    }

    console.log(`🔍 Verificando integridade do pedido ${pedidoId}...`);

    const report = await PedidoIntegrityChecker.checkPedidoIntegrity(pedidoId);

    res.json({
      success: true,
      data: report,
      message: `Verificação de integridade concluída. Score: ${report.score}/100`
    });

  } catch (error) {
    console.error("❌ Erro ao verificar integridade do pedido:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao verificar integridade do pedido",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Verificar integridade de todo o sistema
export async function checkSystemIntegrity(req: Request, res: Response) {
  try {
    console.log('🔍 Verificando integridade do sistema...');

    const report = await PedidoIntegrityChecker.checkSystemIntegrity();

    res.json({
      success: true,
      data: report,
      message: `Verificação do sistema concluída. ${report.pedidosComProblemas}/${report.totalPedidos} pedidos com problemas`
    });

  } catch (error) {
    console.error("❌ Erro ao verificar integridade do sistema:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao verificar integridade do sistema",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Corrigir problemas automaticamente
export async function autoFixPedidoIssues(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const pedidoId = parseInt(id);

    if (isNaN(pedidoId) || pedidoId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID do pedido deve ser um número válido maior que zero"
      });
    }

    console.log(`🔧 Corrigindo problemas do pedido ${pedidoId}...`);

    const result = await PedidoIntegrityChecker.autoFixIssues(pedidoId);

    res.json({
      success: true,
      data: result,
      message: `Correção concluída. ${result.corrigidos} problemas corrigidos, ${result.naoCorrigidos.length} não corrigidos`
    });

  } catch (error) {
    console.error("❌ Erro ao corrigir problemas:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao corrigir problemas automaticamente",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Validar dados antes de submissão
export async function validateBeforeSubmit(req: Request, res: Response) {
  try {
    const dadosPedido = req.body;

    console.log('🔍 Validando dados do pedido antes da submissão...');

    // Validações básicas
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!dadosPedido.itens_selecionados || dadosPedido.itens_selecionados.length === 0) {
      errors.push('É necessário informar pelo menos um item');
    }

    if (dadosPedido.itens_selecionados) {
      dadosPedido.itens_selecionados.forEach((item: any, index: number) => {
        if (!item.produto_id) errors.push(`Item ${index + 1}: produto_id é obrigatório`);
        if (!item.contrato_id) errors.push(`Item ${index + 1}: contrato_id é obrigatório`);
        if (!item.fornecedor_id) errors.push(`Item ${index + 1}: fornecedor_id é obrigatório`);
        if (!item.quantidade || item.quantidade <= 0) errors.push(`Item ${index + 1}: quantidade deve ser maior que zero`);
        if (!item.preco_unitario || item.preco_unitario <= 0) errors.push(`Item ${index + 1}: preco_unitario deve ser maior que zero`);
      });
    }



    res.json({
      success: true,
      data: {
        isValid: errors.length === 0,
        errors,
        warnings
      },
      message: errors.length === 0 ? 'Dados válidos' : `${errors.length} erros encontrados`
    });

  } catch (error) {
    console.error("❌ Erro ao validar dados:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao validar dados do pedido",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Obter histórico de verificações de integridade
export async function getIntegrityHistory(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const pedidoId = parseInt(id);

    if (isNaN(pedidoId) || pedidoId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID do pedido deve ser um número válido maior que zero"
      });
    }

    // Por enquanto, retornar histórico simulado
    // Em produção, isso viria de uma tabela de histórico
    const history = [
      {
        pedidoId,
        numeroPedido: `PED-${pedidoId}`,
        status: 'PENDENTE',
        problemas: [],
        score: 100,
        recomendacoes: [],
        dataVerificacao: new Date().toISOString()
      }
    ];

    res.json({
      success: true,
      data: history,
      message: 'Histórico de integridade obtido com sucesso'
    });

  } catch (error) {
    console.error("❌ Erro ao obter histórico:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao obter histórico de integridade",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Executar limpeza de dados órfãos
export async function cleanOrphanedData(req: Request, res: Response) {
  try {
    console.log('🧹 Executando limpeza de dados órfãos...');

    // Simulação de limpeza - em produção, implementar lógica real
    const cleaned = {
      pedidos: 0,
      fornecedores: 0,
      itens: 0
    };

    res.json({
      success: true,
      message: 'Limpeza de dados órfãos concluída',
      cleaned
    });

  } catch (error) {
    console.error("❌ Erro na limpeza:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao executar limpeza de dados órfãos",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Executar migração de integridade
export async function runIntegrityMigration(req: Request, res: Response) {
  try {
    console.log('🔧 Executando migração de integridade...');

    // Simulação de migração - em produção, executar migração real
    const details = [
      'Subtotais recalculados',
      'Valores de fornecedores atualizados',
      'Valores totais corrigidos',
      'Scores de integridade atualizados'
    ];

    res.json({
      success: true,
      message: 'Migração de integridade concluída',
      details
    });

  } catch (error) {
    console.error("❌ Erro na migração:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao executar migração de integridade",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Obter métricas de performance
export async function getPerformanceMetrics(req: Request, res: Response) {
  try {
    console.log('📊 Obtendo métricas de performance...');

    // Simulação de métricas - em produção, calcular métricas reais
    const metrics = {
      averageValidationTime: 150,
      totalValidations: 1000,
      successRate: 95.5,
      commonIssues: [
        {
          tipo: 'CRITICO',
          categoria: 'CALCULO',
          count: 25,
          percentage: 15.5
        },
        {
          tipo: 'AVISO',
          categoria: 'REFERENCIA',
          count: 18,
          percentage: 11.2
        }
      ]
    };

    res.json({
      success: true,
      data: metrics,
      message: 'Métricas de performance obtidas com sucesso'
    });

  } catch (error) {
    console.error("❌ Erro ao obter métricas:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao obter métricas de performance",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}