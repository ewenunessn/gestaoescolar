const db = require("../../../database");

export interface ModalidadeCalculo {
  id: number;
  nome: string;
  codigo_financeiro?: string;
  valor_repasse: number;
  percentual: number;
}

export interface ItemDivisao {
  modalidade_id: number;
  modalidade_nome: string;
  modalidade_codigo_financeiro?: string;
  quantidade: number;
  percentual: number;
  valor: number;
}

export interface ItemCalculado {
  pedido_item_id: number;
  produto_id: number;
  produto_nome: string;
  unidade_medida: string;
  quantidade_original: number;
  preco_unitario: number;
  valor_original: number;
  divisoes: ItemDivisao[];
}

export interface ContratoCalculado {
  contrato_id: number;
  contrato_numero: string;
  fornecedor_id: number;
  fornecedor_nome: string;
  itens: ItemCalculado[];
  quantidade_total: number;
  valor_total: number;
}

export class FaturamentoService {
  
  /**
   * Busca todas as modalidades ativas e calcula os percentuais
   */
  static async obterModalidadesComPercentuais(): Promise<ModalidadeCalculo[]> {
    const query = `
      SELECT id, nome, codigo_financeiro, valor_repasse
      FROM modalidades 
      WHERE ativo = true 
      ORDER BY nome
    `;
    
    const result = await db.all(query);
    const modalidades = result;
    
    if (modalidades.length === 0) {
      throw new Error('Nenhuma modalidade ativa encontrada');
    }
    
    // Calcular soma total dos repasses
    const somaRepasses = modalidades.reduce((soma, modalidade) => {
      return soma + parseFloat(modalidade.valor_repasse.toString());
    }, 0);
    
    if (somaRepasses <= 0) {
      throw new Error('Soma dos valores de repasse deve ser maior que zero');
    }
    
    // Calcular percentual de cada modalidade
    return modalidades.map(modalidade => ({
      id: modalidade.id,
      nome: modalidade.nome,
      codigo_financeiro: modalidade.codigo_financeiro,
      valor_repasse: parseFloat(modalidade.valor_repasse.toString()),
      percentual: (parseFloat(modalidade.valor_repasse.toString()) / somaRepasses) * 100
    }));
  }
  
  /**
   * Divide uma quantidade entre modalidades garantindo valores inteiros e soma exata
   */
  static dividirQuantidadeEntreModalidades(
    quantidadeTotal: number, 
    modalidades: ModalidadeCalculo[]
  ): { modalidade_id: number; quantidade: number; percentual: number }[] {
    
    if (modalidades.length === 0) {
      throw new Error('Deve haver pelo menos uma modalidade');
    }
    
    // Converter quantidade total para inteiro se for decimal
    const quantidadeTotalInteira = Math.round(quantidadeTotal);
    
    // Calcular quantidades proporcionais (com decimais)
    const divisoesDecimais = modalidades.map(modalidade => ({
      modalidade_id: modalidade.id,
      quantidade_decimal: (quantidadeTotalInteira * modalidade.percentual) / 100,
      percentual: modalidade.percentual
    }));
    
    // Converter para inteiros usando Math.floor
    const divisoesInteiras = divisoesDecimais.map(divisao => ({
      modalidade_id: divisao.modalidade_id,
      quantidade: Math.floor(divisao.quantidade_decimal),
      percentual: divisao.percentual,
      resto: divisao.quantidade_decimal - Math.floor(divisao.quantidade_decimal)
    }));
    
    // Calcular quantos inteiros foram "perdidos" no arredondamento
    const somaInteiros = divisoesInteiras.reduce((soma, divisao) => soma + divisao.quantidade, 0);
    const diferenca = quantidadeTotalInteira - somaInteiros;
    
    // Distribuir a diferença para as modalidades com maior resto
    if (diferenca > 0) {
      // Ordenar por resto decrescente
      const ordenadosPorResto = [...divisoesInteiras].sort((a, b) => b.resto - a.resto);
      
      // Adicionar 1 unidade para as modalidades com maior resto
      for (let i = 0; i < diferenca && i < ordenadosPorResto.length; i++) {
        const modalidade = divisoesInteiras.find(d => d.modalidade_id === ordenadosPorResto[i].modalidade_id);
        if (modalidade) {
          modalidade.quantidade += 1;
        }
      }
    }
    
    // Verificar se a soma está correta
    const somaFinal = divisoesInteiras.reduce((soma, divisao) => soma + divisao.quantidade, 0);
    if (somaFinal !== quantidadeTotalInteira) {
      throw new Error(`Erro na divisão: soma ${somaFinal} diferente do total ${quantidadeTotalInteira}`);
    }
    
    return divisoesInteiras.map(divisao => ({
      modalidade_id: divisao.modalidade_id,
      quantidade: divisao.quantidade,
      percentual: divisao.percentual
    }));
  }
  
  /**
   * Calcula a prévia do faturamento para um pedido
   */
  static async calcularPreviaFaturamento(pedidoId: number): Promise<any> {
    // Buscar dados do pedido
    const pedidoQuery = `
      SELECT id, numero, status, valor_total
      FROM pedidos 
      WHERE id = $1
    `;
    const pedidoResult = await db.get(pedidoQuery, [pedidoId]);
    
    if (!pedidoResult) {
      throw new Error('Pedido não encontrado');
    }
    
    if (pedidoResult.status === 'rascunho') {
      throw new Error('Não é possível gerar faturamento para pedidos em rascunho');
    }
    
    // Buscar modalidades com percentuais
    const modalidades = await this.obterModalidadesComPercentuais();
    
    // Buscar itens do pedido agrupados por contrato
    const itensQuery = `
      SELECT 
        pi.id as pedido_item_id,
        pi.quantidade,
        pi.preco_unitario,
        pi.valor_total,
        cp.contrato_id,
        c.numero as contrato_numero,
        c.fornecedor_id,
        f.nome as fornecedor_nome,
        p.id as produto_id,
        p.nome as produto_nome,
        p.unidade as unidade_medida
      FROM pedido_itens pi
      JOIN contrato_produtos cp ON pi.contrato_produto_id = cp.id
      JOIN contratos c ON cp.contrato_id = c.id
      JOIN fornecedores f ON c.fornecedor_id = f.id
      JOIN produtos p ON pi.produto_id = p.id
      WHERE pi.pedido_id = $1
      ORDER BY c.numero, f.nome, p.nome
    `;
    
    const itensResult = await db.all(itensQuery, [pedidoId]);
    
    if (itensResult.length === 0) {
      throw new Error('Nenhum item encontrado no pedido');
    }
    
    // Agrupar por contrato
    const contratosPorId: { [key: number]: ContratoCalculado } = {};
    
    for (const item of itensResult) {
      const contratoId = item.contrato_id;
      
      if (!contratosPorId[contratoId]) {
        contratosPorId[contratoId] = {
          contrato_id: contratoId,
          contrato_numero: item.contrato_numero,
          fornecedor_id: item.fornecedor_id,
          fornecedor_nome: item.fornecedor_nome,
          itens: [],
          quantidade_total: 0,
          valor_total: 0
        };
      }
      
      // Dividir quantidade do item entre modalidades
      const divisoesQuantidade = this.dividirQuantidadeEntreModalidades(
        item.quantidade, 
        modalidades
      );
      
      // Criar divisões com valores calculados
      const divisoes: ItemDivisao[] = divisoesQuantidade.map(divisao => {
        const modalidade = modalidades.find(m => m.id === divisao.modalidade_id)!;
        const valor = divisao.quantidade * item.preco_unitario;
        
        return {
          modalidade_id: divisao.modalidade_id,
          modalidade_nome: modalidade.nome,
          modalidade_codigo_financeiro: modalidade.codigo_financeiro,
          quantidade: divisao.quantidade,
          percentual: divisao.percentual,
          valor: valor
        };
      });
      
      const itemCalculado: ItemCalculado = {
        pedido_item_id: item.pedido_item_id,
        produto_id: item.produto_id,
        produto_nome: item.produto_nome,
        unidade_medida: item.unidade_medida,
        quantidade_original: item.quantidade,
        preco_unitario: item.preco_unitario,
        valor_original: item.valor_total,
        divisoes: divisoes
      };
      
      contratosPorId[contratoId].itens.push(itemCalculado);
      contratosPorId[contratoId].quantidade_total += parseFloat(item.quantidade.toString());
      contratosPorId[contratoId].valor_total += parseFloat(item.valor_total.toString());
    }
    
    const contratos = Object.values(contratosPorId);
    
    // Calcular resumo
    const resumo = {
      total_contratos: contratos.length,
      total_fornecedores: new Set(contratos.map(c => c.fornecedor_id)).size,
      total_modalidades: modalidades.length,
      total_itens: itensResult.length,
      quantidade_total: contratos.reduce((sum, c) => sum + parseFloat(c.quantidade_total.toString()), 0),
      valor_total: contratos.reduce((sum, c) => sum + parseFloat(c.valor_total.toString()), 0)
    };
    
    return {
      pedido_id: pedidoId,
      pedido_numero: pedidoResult.numero,
      modalidades: modalidades,
      contratos: contratos,
      resumo: resumo
    };
  }
  
  /**
   * Gera o faturamento definitivo
   */
  static async gerarFaturamento(pedidoId: number, usuarioId: number, observacoes?: string): Promise<any> {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Verificar se já existe faturamento para este pedido
      const faturamentoExistente = await client.query(`
        SELECT id FROM faturamentos WHERE pedido_id = $1
      `, [pedidoId]);
      
      if (faturamentoExistente.rows.length > 0) {
        throw new Error('Já existe um faturamento para este pedido');
      }
      
      // Calcular prévia
      const previa = await this.calcularPreviaFaturamento(pedidoId);
      
      // Gerar número do faturamento
      const numeroQuery = `
        SELECT COUNT(*) as total 
        FROM faturamentos 
        WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
      `;
      const numeroResult = await client.query(numeroQuery);
      const sequencial = (parseInt(numeroResult.rows[0].total) + 1).toString().padStart(6, '0');
      const numero = `FAT${new Date().getFullYear()}${sequencial}`;
      
      // Criar faturamento
      const faturamentoQuery = `
        INSERT INTO faturamentos (
          pedido_id, numero, data_faturamento, status, valor_total, 
          observacoes, usuario_criacao_id
        )
        VALUES ($1, $2, CURRENT_DATE, 'gerado', $3, $4, $5)
        RETURNING *
      `;
      
      const faturamentoResult = await client.query(faturamentoQuery, [
        pedidoId,
        numero,
        previa.resumo.valor_total,
        observacoes,
        usuarioId
      ]);
      
      const faturamento = faturamentoResult.rows[0];
      
      // Criar itens do faturamento
      for (const contrato of previa.contratos) {
        for (const item of contrato.itens) {
          for (const divisao of item.divisoes) {
            if (divisao.quantidade > 0) { // Só criar se quantidade > 0
              await client.query(`
                INSERT INTO faturamento_itens (
                  faturamento_id, pedido_item_id, modalidade_id, contrato_id,
                  fornecedor_id, produto_id, quantidade_original, quantidade_modalidade,
                  percentual_modalidade, preco_unitario, valor_total
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
              `, [
                faturamento.id,
                item.pedido_item_id,
                divisao.modalidade_id,
                contrato.contrato_id,
                contrato.fornecedor_id,
                item.produto_id,
                item.quantidade_original,
                divisao.quantidade,
                divisao.percentual,
                item.preco_unitario,
                divisao.valor
              ]);
            }
          }
        }
      }
      
      await client.query('COMMIT');
      
      return {
        faturamento: faturamento,
        previa: previa
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}