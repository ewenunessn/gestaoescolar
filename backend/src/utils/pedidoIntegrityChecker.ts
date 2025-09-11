const db = require("../database");

// Interface para relatório de integridade
export interface IntegrityReport {
  pedidoId: number;
  numeroPedido: string;
  status: string;
  problemas: IntegrityIssue[];
  score: number; // 0-100, onde 100 é perfeito
  recomendacoes: string[];
}

export interface IntegrityIssue {
  tipo: 'CRITICO' | 'AVISO' | 'INFO';
  categoria: 'DADOS' | 'REFERENCIA' | 'CALCULO' | 'CONSISTENCIA';
  descricao: string;
  campo?: string;
  valorEsperado?: any;
  valorEncontrado?: any;
  sugestaoCorrecao?: string;
}

export interface SystemIntegrityReport {
  totalPedidos: number;
  pedidosComProblemas: number;
  problemasEncontrados: IntegrityIssue[];
  estatisticas: {
    problemasCriticos: number;
    problemasAvisos: number;
    problemasInfo: number;
  };
  recomendacoes: string[];
}

// Classe principal para verificação de integridade
export class PedidoIntegrityChecker {
  
  // Verificar integridade de um pedido específico
  static async checkPedidoIntegrity(pedidoId: number): Promise<IntegrityReport> {
    try {
      // Buscar dados básicos do pedido
      const result = await db.query(`
        SELECT 
          pm.id,
          pm.numero_pedido,
          pm.status,
          pm.valor_total,
          pm.usuario_id,
          u.nome as nome_usuario
        FROM pedidos pm
        LEFT JOIN usuarios u ON pm.usuario_id = u.id
        WHERE pm.id = $1
      `, [pedidoId]);
      
      const pedido = result.rows[0];

      if (!pedido) {
        return {
          pedidoId,
          numeroPedido: 'N/A',
          status: 'NAO_ENCONTRADO',
          problemas: [{
            tipo: 'CRITICO',
            categoria: 'DADOS',
            descricao: 'Pedido não encontrado na base de dados'
          }],
          score: 0,
          recomendacoes: ['Verificar se o ID do pedido está correto']
        };
      }

      const problemas: IntegrityIssue[] = [];

      // 1. Verificar referência do usuário
      if (!pedido.nome_usuario) {
        problemas.push({
          tipo: 'CRITICO',
          categoria: 'REFERENCIA',
          descricao: 'Usuário do pedido não encontrado',
          campo: 'usuario_id',
          valorEncontrado: pedido.usuario_id,
          sugestaoCorrecao: 'Verificar se o usuário ainda existe na base de dados'
        });
      }

      // 2. Verificar fornecedores e itens (usando estrutura moderna)
      const fornecedoresItensResult = await db.query(`
        SELECT 
          pi.id as item_id,
          pi.produto_id,
          p.nome as nome_produto,
          pi.quantidade,
          pi.preco_unitario,
          pi.subtotal,
          pf.fornecedor_id,
          f.nome as nome_fornecedor,
          pi.contrato_id,
          'Contrato não informado' as numero_contrato,
          true as contrato_ativo
        FROM pedidos_fornecedores pf
        JOIN pedidos_itens pi ON pf.id = pi.pedido_fornecedor_id
        LEFT JOIN pedidos pm ON pf.pedido_id = pm.id
        LEFT JOIN produtos p ON pi.produto_id = p.id
        LEFT JOIN fornecedores f ON pf.fornecedor_id = f.id
        WHERE pf.pedido_id = $1
        ORDER BY pi.id
      `, [pedidoId]);
      
      const fornecedoresItens = fornecedoresItensResult.rows;

      if (fornecedoresItens.length === 0) {
        problemas.push({
          tipo: 'CRITICO',
          categoria: 'DADOS',
          descricao: 'Pedido não possui fornecedores ou itens',
          sugestaoCorrecao: 'Verificar se os dados foram inseridos corretamente'
        });
      }

      let valorTotalCalculado = 0;
      const fornecedoresProcessados = new Set();

      for (const item of fornecedoresItens) {
        // Verificar fornecedor
        if (!item.nome_fornecedor) {
          problemas.push({
            tipo: 'CRITICO',
            categoria: 'REFERENCIA',
            descricao: `Fornecedor ${item.fornecedor_id} não encontrado`,
            campo: 'fornecedor_id',
            valorEncontrado: item.fornecedor_id,
            sugestaoCorrecao: 'Verificar se o fornecedor ainda existe'
          });
        }

        // Verificar produto
        if (!item.nome_produto) {
          problemas.push({
            tipo: 'CRITICO',
            categoria: 'REFERENCIA',
            descricao: `Produto ${item.produto_id} não encontrado`,
            campo: 'produto_id',
            valorEncontrado: item.produto_id,
            sugestaoCorrecao: 'Verificar se o produto ainda existe'
          });
        }

        // Verificar contrato (informação não disponível na estrutura moderna)
        if (item.contrato_id && !item.numero_contrato) {
          problemas.push({
            tipo: 'AVISO',
            categoria: 'REFERENCIA',
            descricao: `Contrato ${item.contrato_id} não encontrado`,
            campo: 'contrato_id',
            valorEncontrado: item.contrato_id,
            sugestaoCorrecao: 'Verificar se o contrato ainda existe'
          });
        } else if (item.contrato_id && !item.contrato_ativo) {
          problemas.push({
            tipo: 'AVISO',
            categoria: 'CONSISTENCIA',
            descricao: `Contrato ${item.numero_contrato} está inativo`,
            campo: 'contrato_ativo',
            valorEncontrado: false,
            sugestaoCorrecao: 'Verificar se o contrato deveria estar ativo'
          });
        }

        // Verificar cálculos
        if (item.item_id) {
          const subtotalCalculado = (item.quantidade || 0) * (item.preco_unitario || 0);
          const subtotalArmazenado = parseFloat(item.subtotal) || 0;

          if (Math.abs(subtotalCalculado - subtotalArmazenado) > 0.01) {
            problemas.push({
              tipo: 'CRITICO',
              categoria: 'CALCULO',
              descricao: `Subtotal incorreto no item ${item.item_id}`,
              campo: 'subtotal',
              valorEsperado: subtotalCalculado,
              valorEncontrado: subtotalArmazenado,
              sugestaoCorrecao: 'Recalcular o subtotal do item'
            });
          }

          valorTotalCalculado += subtotalCalculado;

          // Verificar valores positivos
          if ((item.quantidade || 0) <= 0) {
            problemas.push({
              tipo: 'CRITICO',
              categoria: 'DADOS',
              descricao: `Quantidade inválida no item ${item.item_id}`,
              campo: 'quantidade',
              valorEncontrado: item.quantidade,
              sugestaoCorrecao: 'Quantidade deve ser maior que zero'
            });
          }

          if ((item.preco_unitario || 0) <= 0) {
            problemas.push({
              tipo: 'CRITICO',
              categoria: 'DADOS',
              descricao: `Preço unitário inválido no item ${item.item_id}`,
              campo: 'preco_unitario',
              valorEncontrado: item.preco_unitario,
              sugestaoCorrecao: 'Preço unitário deve ser maior que zero'
            });
          }
        }

        // Verificar subtotal do fornecedor (apenas uma vez por fornecedor)
        if (!fornecedoresProcessados.has(item.fornecedor_pedido_id)) {
          fornecedoresProcessados.add(item.fornecedor_pedido_id);
          
          // Verificação de subtotal do fornecedor
          const subtotalFornecedorResult = { rows: [{ total: 0 }] };
          
          const subtotalFornecedorCalculado = subtotalFornecedorResult.rows[0];

          const subtotalFornecedorArmazenado = parseFloat(item.valor_subtotal) || 0;
          const subtotalFornecedorReal = parseFloat(subtotalFornecedorCalculado.total.toString()) || 0;

          if (Math.abs(subtotalFornecedorReal - subtotalFornecedorArmazenado) > 0.01) {
            problemas.push({
              tipo: 'AVISO',
              categoria: 'CALCULO',
              descricao: `Subtotal do fornecedor ${item.nome_fornecedor || item.fornecedor_id} incorreto`,
              campo: 'valor_subtotal',
              valorEsperado: subtotalFornecedorReal,
              valorEncontrado: subtotalFornecedorArmazenado,
              sugestaoCorrecao: 'Recalcular o subtotal do fornecedor'
            });
          }
        }
      }

      // 3. Verificar valor total do pedido
      const valorTotalArmazenado = parseFloat(pedido.valor_total) || 0;
      const valorTotalEsperado = valorTotalCalculado;

      if (Math.abs(valorTotalEsperado - valorTotalArmazenado) > 0.01) {
        problemas.push({
          tipo: 'CRITICO',
          categoria: 'CALCULO',
          descricao: 'Valor total do pedido incorreto',
          campo: 'valor_total',
          valorEsperado: valorTotalEsperado,
          valorEncontrado: valorTotalArmazenado,
          sugestaoCorrecao: 'Recalcular o valor total do pedido'
        });
      }

      // 4. Verificar status válido
      const statusValidos = ['PENDENTE', 'CONFIRMADO', 'RECEBIMENTO', 'RECEBIDO', 'EM_PREPARACAO', 'ENVIADO', 'ENTREGUE', 'FATURADO', 'CANCELADO'];
      if (!statusValidos.includes(pedido.status)) {
        problemas.push({
          tipo: 'CRITICO',
          categoria: 'DADOS',
          descricao: 'Status do pedido inválido',
          campo: 'status',
          valorEncontrado: pedido.status,
          sugestaoCorrecao: `Status deve ser um dos seguintes: ${statusValidos.join(', ')}`
        });
      }

      // Calcular score de integridade
      const score = this.calculateIntegrityScore(problemas);

      // Gerar recomendações
      const recomendacoes = this.generateRecommendations(problemas);

      return {
        pedidoId,
        numeroPedido: pedido.numero_pedido,
        status: pedido.status,
        problemas,
        score,
        recomendacoes
      };

    } catch (error) {
      console.error(`❌ Erro ao verificar integridade do pedido ${pedidoId}:`, error);
      return {
        pedidoId,
        numeroPedido: 'ERRO',
        status: 'ERRO',
        problemas: [{
          tipo: 'CRITICO',
          categoria: 'DADOS',
          descricao: `Erro ao verificar integridade: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        }],
        score: 0,
        recomendacoes: ['Verificar logs do sistema para mais detalhes']
      };
    }
  }

  // Verificar integridade de todo o sistema
  static async checkSystemIntegrity(): Promise<SystemIntegrityReport> {
    try {
      // Buscar todos os pedidos
      const pedidos = await db.all(`
        SELECT id, numero_pedido FROM pedidos ORDER BY id
      `);

      const problemasGerais: IntegrityIssue[] = [];
      let pedidosComProblemas = 0;
      let problemasCriticos = 0;
      let problemasAvisos = 0;
      let problemasInfo = 0;

      // Verificar cada pedido
      for (const pedido of pedidos) {
        const relatorio = await this.checkPedidoIntegrity(pedido.id);
        
        if (relatorio.problemas.length > 0) {
          pedidosComProblemas++;
          
          // Contar tipos de problemas
          relatorio.problemas.forEach(problema => {
            switch (problema.tipo) {
              case 'CRITICO':
                problemasCriticos++;
                break;
              case 'AVISO':
                problemasAvisos++;
                break;
              case 'INFO':
                problemasInfo++;
                break;
            }
          });

          // Adicionar problemas críticos ao relatório geral
          const problemasCriticosPedido = relatorio.problemas.filter(p => p.tipo === 'CRITICO');
          if (problemasCriticosPedido.length > 0) {
            problemasGerais.push({
              tipo: 'CRITICO',
              categoria: 'DADOS',
              descricao: `Pedido ${pedido.numero_pedido} tem ${problemasCriticosPedido.length} problemas críticos`
            });
          }
        }
      }

      // Verificar problemas estruturais do sistema
      await this.checkSystemStructuralIssues(problemasGerais);

      // Gerar recomendações gerais
      const recomendacoes = this.generateSystemRecommendations(problemasGerais, {
        problemasCriticos,
        problemasAvisos,
        problemasInfo
      });

      return {
        totalPedidos: pedidos.length,
        pedidosComProblemas,
        problemasEncontrados: problemasGerais,
        estatisticas: {
          problemasCriticos,
          problemasAvisos,
          problemasInfo
        },
        recomendacoes
      };

    } catch (error) {
      console.error('❌ Erro ao verificar integridade do sistema:', error);
      return {
        totalPedidos: 0,
        pedidosComProblemas: 0,
        problemasEncontrados: [{
          tipo: 'CRITICO',
          categoria: 'DADOS',
          descricao: `Erro ao verificar integridade do sistema: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        }],
        estatisticas: {
          problemasCriticos: 1,
          problemasAvisos: 0,
          problemasInfo: 0
        },
        recomendacoes: ['Verificar logs do sistema e conectividade com a base de dados']
      };
    }
  }

  // Verificar problemas estruturais do sistema
  private static async checkSystemStructuralIssues(problemasGerais: IntegrityIssue[]): Promise<void> {
    try {
      // Verificar pedidos órfãos (sem usuário)
      const pedidosOrfaos = await db.get(`
        SELECT COUNT(*) as count
        FROM pedidos pm
        LEFT JOIN usuarios u ON pm.usuario_id = u.id
        WHERE u.id IS NULL
      `);

      if (pedidosOrfaos.count > 0) {
        problemasGerais.push({
          tipo: 'CRITICO',
          categoria: 'REFERENCIA',
          descricao: `${pedidosOrfaos.count} pedidos sem usuário válido`,
          sugestaoCorrecao: 'Verificar e corrigir referências de usuários'
        });
      }



      // Verificar produtos órfãos
      const produtosOrfaos = await db.get(`
        SELECT COUNT(*) as count
        FROM pedidos_fornecedores pf
        JOIN pedidos_itens pi ON pf.id = pi.pedido_fornecedor_id
        LEFT JOIN produtos p ON pi.produto_id = p.id
        WHERE p.id IS NULL
      `);

      if (produtosOrfaos.count > 0) {
        problemasGerais.push({
          tipo: 'CRITICO',
          categoria: 'REFERENCIA',
          descricao: `${produtosOrfaos.count} itens com produtos inexistentes`,
          sugestaoCorrecao: 'Verificar e corrigir referências de produtos'
        });
      }

      // Verificar contratos órfãos
      // Contratos não são mais obrigatórios na estrutura moderna
      const contratosOrfaos = { count: 0 };

      if (contratosOrfaos.count > 0) {
        problemasGerais.push({
          tipo: 'CRITICO',
          categoria: 'REFERENCIA',
          descricao: `${contratosOrfaos.count} itens com contratos inexistentes`,
          sugestaoCorrecao: 'Verificar e corrigir referências de contratos'
        });
      }

    } catch (error) {
      problemasGerais.push({
        tipo: 'CRITICO',
        categoria: 'DADOS',
        descricao: `Erro ao verificar problemas estruturais: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      });
    }
  }

  // Calcular score de integridade (0-100)
  private static calculateIntegrityScore(problemas: IntegrityIssue[]): number {
    if (problemas.length === 0) return 100;

    let penalidade = 0;
    problemas.forEach(problema => {
      switch (problema.tipo) {
        case 'CRITICO':
          penalidade += 20;
          break;
        case 'AVISO':
          penalidade += 5;
          break;
        case 'INFO':
          penalidade += 1;
          break;
      }
    });

    return Math.max(0, 100 - penalidade);
  }

  // Gerar recomendações baseadas nos problemas encontrados
  private static generateRecommendations(problemas: IntegrityIssue[]): string[] {
    const recomendacoes: string[] = [];
    const categorias = new Set(problemas.map(p => p.categoria));

    if (categorias.has('REFERENCIA')) {
      recomendacoes.push('Verificar e corrigir referências órfãs (produtos, fornecedores, contratos, usuários)');
    }

    if (categorias.has('CALCULO')) {
      recomendacoes.push('Recalcular valores e subtotais do pedido');
    }

    if (categorias.has('DADOS')) {
      recomendacoes.push('Validar e corrigir dados básicos do pedido');
    }

    if (categorias.has('CONSISTENCIA')) {
      recomendacoes.push('Verificar consistência dos dados relacionados');
    }

    const criticos = problemas.filter(p => p.tipo === 'CRITICO').length;
    if (criticos > 0) {
      recomendacoes.push(`Priorizar correção de ${criticos} problemas críticos`);
    }

    return recomendacoes;
  }

  // Gerar recomendações para o sistema
  private static generateSystemRecommendations(
    problemas: IntegrityIssue[], 
    estatisticas: { problemasCriticos: number; problemasAvisos: number; problemasInfo: number }
  ): string[] {
    const recomendacoes: string[] = [];

    if (estatisticas.problemasCriticos > 0) {
      recomendacoes.push(`Corrigir urgentemente ${estatisticas.problemasCriticos} problemas críticos`);
    }

    if (estatisticas.problemasAvisos > 10) {
      recomendacoes.push('Implementar rotina de manutenção preventiva para corrigir avisos');
    }

    if (problemas.some(p => p.categoria === 'REFERENCIA')) {
      recomendacoes.push('Implementar constraints de integridade referencial no banco de dados');
    }

    if (problemas.some(p => p.categoria === 'CALCULO')) {
      recomendacoes.push('Implementar triggers para recálculo automático de valores');
    }

    recomendacoes.push('Executar verificação de integridade regularmente');
    recomendacoes.push('Implementar validações mais rigorosas na entrada de dados');

    return recomendacoes;
  }

  // Corrigir problemas automaticamente (quando possível)
  static async autoFixIssues(pedidoId: number): Promise<{
    corrigidos: number;
    naoCorrigidos: IntegrityIssue[];
    relatorio: string[];
  }> {
    const relatorio: string[] = [];
    const naoCorrigidos: IntegrityIssue[] = [];
    let corrigidos = 0;

    try {
      const integrityReport = await this.checkPedidoIntegrity(pedidoId);
      
      for (const problema of integrityReport.problemas) {
        if (problema.categoria === 'CALCULO' && problema.campo === 'subtotal' && problema.valorEsperado) {
          // Corrigir subtotal de item
          try {
            await db.run(`
              UPDATE pedidos_itens 
              SET subtotal = $1 
              WHERE id = $2
            `, [problema.valorEsperado, problema.campo]);
            
            relatorio.push(`Subtotal corrigido para ${problema.valorEsperado}`);
            corrigidos++;
          } catch (error) {
            naoCorrigidos.push(problema);
            relatorio.push(`Erro ao corrigir subtotal: ${error}`);
          }
        } else if (problema.categoria === 'CALCULO' && problema.campo === 'valor_total' && problema.valorEsperado) {
          // Corrigir valor total do pedido
          try {
            await db.run(`
              UPDATE pedidos 
              SET valor_total = $1 
              WHERE id = $2
            `, [problema.valorEsperado, pedidoId]);
            
            relatorio.push(`Valor total corrigido para ${problema.valorEsperado}`);
            corrigidos++;
          } catch (error) {
            naoCorrigidos.push(problema);
            relatorio.push(`Erro ao corrigir valor total: ${error}`);
          }
        } else {
          // Problemas que não podem ser corrigidos automaticamente
          naoCorrigidos.push(problema);
        }
      }

      return { corrigidos, naoCorrigidos, relatorio };

    } catch (error) {
      relatorio.push(`Erro durante correção automática: ${error}`);
      return { 
        corrigidos, 
        naoCorrigidos: [], 
        relatorio 
      };
    }
  }
}