const db = require('../database');

// Interfaces movidas para este arquivo após remoção do ORM
export interface IFaturamentoItensModalidades {
  id?: number;
  faturamento_id: number;
  modalidade_id: number;
  valor_modalidade: number;
  percentual_modalidade: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface IModalidadeSelecionada {
  modalidade_id: number;
  percentual: number;
}

export interface IPedidoItemComModalidades {
  pedido_item_id: number;
  modalidades: IModalidadeSelecionada[];
}

export interface ICalculoProporcionaModalidade {
  modalidade_id: number;
  nome_modalidade: string;
  valor_repasse: number;
  percentual_proporcional: number;
  quantidade_proporcional: number;
  valor_total_modalidade: number;
}

export interface IResultadoDivisaoItem {
  pedido_item_id: number;
  produto_id: number;
  nome_produto: string;
  quantidade_original: number;
  valor_unitario: number;
  valor_total_original: number;
  divisoes_modalidades: ICalculoProporcionaModalidade[];
  total_percentual: number;
  total_quantidade_dividida: number;
  total_valor_dividido: number;
}

export interface IParametrosFaturamento {
  pedido_id: number;
  fornecedor_id: number;
  contrato_id?: number;
  observacoes?: string;
}

export class FaturamentoModalidadesService {
  
  /**
   * Valida se os percentuais estão corretos
   */
  static validarPercentuais(percentuais: number[]): void {
    // Verificar se todos os percentuais estão entre 0 e 100
    for (const percentual of percentuais) {
      if (percentual < 0 || percentual > 100) {
        throw new Error('Percentuais devem estar entre 0 e 100');
      }
    }

    // Verificar se a soma dos percentuais é exatamente 100
    const soma = percentuais.reduce((acc, val) => acc + val, 0);
    const somaArredondada = Math.round(soma * 100) / 100; // Arredondar para 2 casas decimais
    
    if (Math.abs(somaArredondada - 100) > 0.01) {
      throw new Error('A soma dos percentuais deve ser exatamente 100%');
    }
  }

  /**
   * Calcula valores por modalidade com base em percentuais
   */
  static calcularValoresPorModalidade(
    valorItem: number,
    modalidades: any[],
    percentuais: number[]
  ): Array<{ modalidade_id: number; percentual: number; valor_calculado: number }> {
    // Validar entrada
    if (modalidades.length !== percentuais.length) {
      throw new Error('Número de modalidades deve corresponder ao número de percentuais');
    }

    this.validarPercentuais(percentuais);

    // Calcular valores
    const resultados = modalidades.map((modalidade, index) => {
      const percentual = percentuais[index];
      const valorCalculado = Math.round((valorItem * percentual / 100) * 100) / 100;
      
      return {
        modalidade_id: modalidade.id,
        percentual: percentual,
        valor_calculado: valorCalculado
      };
    });

    // Verificar precisão dos cálculos
    this.verificarPrecisaoCalculos(valorItem, resultados);

    return resultados;
  }

  /**
   * Verifica se não há perda significativa de precisão nos cálculos
   */
  static verificarPrecisaoCalculos(
    valorOriginal: number,
    divisoes: Array<{ valor_calculado: number }>
  ): void {
    const somaCalculada = divisoes.reduce((sum, div) => sum + div.valor_calculado, 0);
    const diferenca = Math.abs(somaCalculada - valorOriginal);
    
    // Tolerância de 1 centavo
    if (diferenca > 0.01) {
      console.warn(`Diferença de precisão detectada: ${diferenca.toFixed(4)}`);
      
      // Se a diferença for significativa (mais de 5 centavos), ajustar o último valor
      if (diferenca > 0.05 && divisoes.length > 0) {
        const ultimaDivisao = divisoes[divisoes.length - 1];
        const ajuste = valorOriginal - (somaCalculada - ultimaDivisao.valor_calculado);
        ultimaDivisao.valor_calculado = Math.round(ajuste * 100) / 100;
      }
    }
  }

  /**
   * Valida configuração de modalidades para um item
   */
  static async validarConfiguracaoModalidades(
    pedido_item_id: number,
    modalidades: IModalidadeSelecionada[]
  ): Promise<void> {
    // Verificar se há pelo menos uma modalidade
    if (!modalidades || modalidades.length === 0) {
      throw new Error('Pelo menos uma modalidade deve ser configurada');
    }

    // Verificar se todas as modalidades existem
    for (const modalidade of modalidades) {
      const modalidadeExiste = await db.get(
        'SELECT id FROM modalidades WHERE id = $1',
        [modalidade.modalidade_id]
      );
      
      if (!modalidadeExiste) {
        throw new Error(`Modalidade ${modalidade.modalidade_id} não encontrada`);
      }
    }

    // Verificar se não há modalidades duplicadas
    const idsModalidades = modalidades.map(m => m.modalidade_id);
    const idsUnicos = new Set(idsModalidades);
    
    if (idsUnicos.size !== idsModalidades.length) {
      throw new Error('Modalidades duplicadas não são permitidas');
    }
  }

  /**
   * Calcula a divisão proporcional de um item por modalidades
   */
  static async calcularDivisaoProporcionalItem(
    pedido_item_id: number,
    quantidade_total: number,
    valor_unitario: number
  ): Promise<IResultadoDivisaoItem> {
    try {
      // Buscar modalidades configuradas para o item
      const modalidadesQuery = `
        SELECT modalidade_id, percentual 
        FROM pedido_itens_modalidades_config 
        WHERE pedido_item_id = ?
      `;
      const modalidades = await db.query(modalidadesQuery, [pedido_item_id]);
      
      if (modalidades.length === 0) {
        throw new Error(`Nenhuma modalidade configurada para o item ${pedido_item_id}`);
      }

      // Buscar informações do produto
      const itemInfo = await db.get(`
        SELECT pi.produto_id, p.nome as nome_produto
        FROM pedidos_itens pi
        JOIN produtos p ON pi.produto_id = p.id
        WHERE pi.id = $1
      `, [pedido_item_id]);

      if (!itemInfo) {
        throw new Error(`Item do pedido ${pedido_item_id} não encontrado`);
      }

      // Calcular soma total dos valores de repasse
      const somaRepasseTotal = modalidades.reduce((soma, modalidade) => {
        return soma + parseFloat(modalidade.valor_repasse.toString());
      }, 0);

      if (somaRepasseTotal === 0) {
        throw new Error('Soma dos valores de repasse das modalidades é zero');
      }

      // Validar modalidades antes do cálculo
      await this.validarConfiguracaoModalidades(pedido_item_id, modalidades);

      // Calcular divisão proporcional para cada modalidade
      const divisoesModalidades: ICalculoProporcionaModalidade[] = [];
      let totalQuantidadeDividida = 0;
      let totalValorDividido = 0;
      const valorTotalOriginal = quantidade_total * valor_unitario;

      for (const modalidade of modalidades) {
        const valorRepasse = parseFloat(modalidade.valor_repasse.toString());
        const percentualProporcional = (valorRepasse / somaRepasseTotal) * 100;
        const quantidadeProporcional = (quantidade_total * valorRepasse) / somaRepasseTotal;
        const valorTotalModalidade = quantidadeProporcional * valor_unitario;

        const divisao: ICalculoProporcionaModalidade = {
          modalidade_id: modalidade.modalidade_id,
          nome_modalidade: modalidade.nome_modalidade,
          valor_repasse: valorRepasse,
          percentual_proporcional: Math.round(percentualProporcional * 100) / 100, // 2 casas decimais
          quantidade_proporcional: Math.round(quantidadeProporcional * 1000) / 1000, // 3 casas decimais
          valor_total_modalidade: Math.round(valorTotalModalidade * 100) / 100 // 2 casas decimais
        };

        divisoesModalidades.push(divisao);
        totalQuantidadeDividida += divisao.quantidade_proporcional;
        totalValorDividido += divisao.valor_total_modalidade;
      }

      // Verificar precisão dos cálculos
      const divisoesParaValidacao = divisoesModalidades.map(d => ({ valor_calculado: d.valor_total_modalidade }));
      this.verificarPrecisaoCalculos(valorTotalOriginal, divisoesParaValidacao);

      // Ajustar possíveis diferenças de arredondamento na última modalidade
      if (divisoesModalidades.length > 0) {
        const ultimaModalidade = divisoesModalidades[divisoesModalidades.length - 1];
        const diferencaQuantidade = quantidade_total - totalQuantidadeDividida;
        const diferencaValor = valorTotalOriginal - totalValorDividido;
        
        // Aplicar ajuste se a diferença for significativa
        if (Math.abs(diferencaQuantidade) > 0.001 || Math.abs(diferencaValor) > 0.01) {
          ultimaModalidade.quantidade_proporcional = Math.round((ultimaModalidade.quantidade_proporcional + diferencaQuantidade) * 1000) / 1000;
          ultimaModalidade.valor_total_modalidade = Math.round((ultimaModalidade.valor_total_modalidade + diferencaValor) * 100) / 100;
          
          // Recalcular totais
          totalQuantidadeDividida = divisoesModalidades.reduce((sum, d) => sum + d.quantidade_proporcional, 0);
          totalValorDividido = divisoesModalidades.reduce((sum, d) => sum + d.valor_total_modalidade, 0);
        }
      }

      // Validação final de precisão
      const diferencaFinalValor = Math.abs(totalValorDividido - valorTotalOriginal);
      const diferencaFinalQuantidade = Math.abs(totalQuantidadeDividida - quantidade_total);
      
      if (diferencaFinalValor > 0.02) {
        throw new Error(`Erro de precisão no cálculo de valores: diferença de R$ ${diferencaFinalValor.toFixed(4)}`);
      }
      
      if (diferencaFinalQuantidade > 0.002) {
        throw new Error(`Erro de precisão no cálculo de quantidades: diferença de ${diferencaFinalQuantidade.toFixed(6)}`);
      }

      const resultado: IResultadoDivisaoItem = {
        pedido_item_id,
        produto_id: itemInfo.produto_id,
        nome_produto: itemInfo.nome_produto,
        quantidade_original: quantidade_total,
        valor_unitario,
        valor_total_original: quantidade_total * valor_unitario,
        divisoes_modalidades: divisoesModalidades,
        total_percentual: 100,
        total_quantidade_dividida: Math.round(totalQuantidadeDividida * 1000) / 1000,
        total_valor_dividido: Math.round(totalValorDividido * 100) / 100
      };

      return resultado;
    } catch (error) {
      console.error('Erro ao calcular divisão proporcional do item:', error);
      throw error;
    }
  }

  /**
   * Calcula a divisão proporcional para todos os itens de um pedido
   */
  static async calcularDivisaoProporcionalPedido(pedido_id: number): Promise<IResultadoDivisaoItem[]> {
    try {
      // Buscar itens do pedido com modalidades configuradas
      const itensQuery = `
        SELECT DISTINCT pi.id as pedido_item_id, pi.produto_id, pi.quantidade, pi.valor_unitario,
               p.nome as nome_produto
        FROM pedido_itens pi
        JOIN produtos p ON pi.produto_id = p.id
        JOIN pedido_itens_modalidades_config pimc ON pi.id = pimc.pedido_item_id
        WHERE pi.pedido_id = ?
      `;
      const itensComModalidades = await db.query(itensQuery, [pedido_id]);
      
      if (itensComModalidades.length === 0) {
        throw new Error(`Nenhum item com modalidades configuradas encontrado para o pedido ${pedido_id}`);
      }

      const resultados: IResultadoDivisaoItem[] = [];

      for (const item of itensComModalidades) {
        if (item.modalidades_selecionadas.length === 0) {
          console.warn(`Item ${item.pedido_item_id} não possui modalidades configuradas, pulando...`);
          continue;
        }

        const resultado = await this.calcularDivisaoProporcionalItem(
          item.pedido_item_id,
          item.quantidade,
          item.preco_unitario
        );

        resultados.push(resultado);
      }

      return resultados;
    } catch (error) {
      console.error('Erro ao calcular divisão proporcional do pedido:', error);
      throw error;
    }
  }

  /**
   * Processa o faturamento automático com divisão por modalidades
   */
  static async processarFaturamentoAutomatico(
    parametros: IParametrosFaturamento
  ): Promise<{ faturamento_id: number; divisoes: IResultadoDivisaoItem[] }> {
    try {
      await db.run('BEGIN TRANSACTION');

      // Verificar se o pedido existe e está com entrega completa
      const pedido = await db.get(`
        SELECT pm.*, f.nome as nome_fornecedor
        FROM pedidos pm
        JOIN fornecedores f ON pm.fornecedor_id = f.id
        WHERE pm.id = $1 AND pm.fornecedor_id = $2
      `, [parametros.pedido_id, parametros.fornecedor_id]);

      if (!pedido) {
        throw new Error('Pedido não encontrado ou fornecedor não corresponde');
      }

      // Calcular divisões proporcionais
      const divisoes = await this.calcularDivisaoProporcionalPedido(parametros.pedido_id);
      
      if (divisoes.length === 0) {
        throw new Error('Nenhum item válido para faturamento encontrado');
      }

      // Calcular valor total do faturamento
      const valorTotalFaturamento = divisoes.reduce((total, divisao) => {
        return total + divisao.total_valor_dividido;
      }, 0);

      // Criar registro de faturamento principal
      const resultFaturamento = await db.run(`
        INSERT INTO faturamentos (
          pedido_id, fornecedor_id, contrato_id, valor_total, 
          status, observacoes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'processado', $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        parametros.pedido_id,
        parametros.fornecedor_id,
        parametros.contrato_id || null,
        valorTotalFaturamento,
        parametros.observacoes || 'Faturamento automático com divisão por modalidades'
      ]);

      const faturamento_id = resultFaturamento.lastID;

      // Inserir divisões por modalidade
      for (const divisao of divisoes) {
        for (const modalidade of divisao.divisoes_modalidades) {
          await db.run(`
            INSERT INTO faturamento_itens_modalidades (
              faturamento_id, pedido_item_id, produto_id, modalidade_id,
              quantidade_original, quantidade_modalidade, percentual_modalidade,
              valor_unitario, valor_total_modalidade, valor_repasse_modalidade,
              observacoes, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [
            faturamento_id,
            divisao.pedido_item_id,
            divisao.produto_id,
            modalidade.modalidade_id,
            divisao.quantidade_original,
            modalidade.quantidade_proporcional,
            modalidade.percentual_proporcional,
            divisao.valor_unitario,
            modalidade.valor_total_modalidade,
            modalidade.valor_repasse,
            `Divisão proporcional - ${modalidade.percentual_proporcional}%`
          ]);
        }
      }

      await db.run('COMMIT');

      return {
        faturamento_id: faturamento_id!,
        divisoes
      };
    } catch (error) {
      await db.run('ROLLBACK');
      console.error('Erro ao processar faturamento automático:', error);
      throw error;
    }
  }

  /**
   * Gera relatório detalhado de faturamento
   */
  static async gerarRelatorioFaturamento(faturamento_id: number): Promise<any> {
    try {
      // Buscar divisões do faturamento com JOIN para obter nomes
      const query = `
        SELECT 
          fim.*,
          p.nome as nome_produto,
          m.nome as nome_modalidade
        FROM faturamento_itens_modalidades fim
        LEFT JOIN produtos p ON fim.produto_id = p.id
        LEFT JOIN modalidades m ON fim.modalidade_id = m.id
        WHERE fim.faturamento_id = $1
        ORDER BY fim.id
      `;
      
      const result = await db.query(query, [faturamento_id]);
      const divisoes = result.rows;

      if (divisoes.length === 0) {
        throw new Error('Faturamento não encontrado ou sem divisões');
      }

      const relatorio = {
        faturamento_id,
        data_geracao: new Date(),
        resumo_por_modalidade: {} as any,
        totais: {
          quantidade_total: 0,
          valor_total: 0,
          modalidades_utilizadas: [] as string[]
        }
      };

      const modalidadesUtilizadas = new Set<string>();

      // Processar cada divisão
      for (const divisao of divisoes) {
        const nomeModalidade = divisao.nome_modalidade || `Modalidade ${divisao.modalidade_id}`;
        const nomeProduto = divisao.nome_produto || `Produto ${divisao.produto_id}`;
        
        // Inicializar modalidade se não existir
        if (!relatorio.resumo_por_modalidade[nomeModalidade]) {
          relatorio.resumo_por_modalidade[nomeModalidade] = {
            quantidade_total: 0,
            valor_total: 0,
            produtos: []
          };
        }

        // Acumular dados por modalidade
        relatorio.resumo_por_modalidade[nomeModalidade].quantidade_total += parseFloat(divisao.quantidade_modalidade);
        relatorio.resumo_por_modalidade[nomeModalidade].valor_total += parseFloat(divisao.valor_total_modalidade);
        relatorio.resumo_por_modalidade[nomeModalidade].produtos.push({
          nome_produto: nomeProduto,
          quantidade: parseFloat(divisao.quantidade_modalidade),
          valor_total: parseFloat(divisao.valor_total_modalidade)
        });

        // Totais gerais
        relatorio.totais.quantidade_total += parseFloat(divisao.quantidade_modalidade);
        relatorio.totais.valor_total += parseFloat(divisao.valor_total_modalidade);
        modalidadesUtilizadas.add(nomeModalidade);
      }

      relatorio.totais.modalidades_utilizadas = Array.from(modalidadesUtilizadas);

      return relatorio;
    } catch (error) {
      console.error('Erro ao gerar relatório de faturamento:', error);
      throw error;
    }
  }
}

export default FaturamentoModalidadesService;