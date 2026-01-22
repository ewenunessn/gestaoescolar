const db = require("../../../database");
import {
  FaturamentoDuplicadoError,
  SaldoInsuficienteError,
  PedidoInvalidoError,
  FaturamentoNaoEncontradoError,
  ConsumoJaRegistradoError,
  ModalidadeNaoEncontradaError
} from "../errors/FaturamentoErrors";

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
  unidade: string;
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
  fornecedor_cnpj: string;
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
        AND tenant_id = get_current_tenant_id()
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
        AND tenant_id = get_current_tenant_id()
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
    
    // Check if unidade column exists in contrato_produtos table
    const columnCheck = await db.all(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contrato_produtos' AND column_name = 'unidade'
    `);
    const unidadeColumnExists = columnCheck.length > 0;

    let itensQuery;
    if (unidadeColumnExists) {
      itensQuery = `
        SELECT 
          pi.id as pedido_item_id,
          pi.quantidade,
          pi.preco_unitario,
          pi.valor_total,
          cp.contrato_id,
          c.numero as contrato_numero,
          c.fornecedor_id,
          f.nome as fornecedor_nome,
          f.cnpj as fornecedor_cnpj,
          p.id as produto_id,
          p.nome as produto_nome,
          COALESCE(cp.unidade, 'Kg') as unidade 
        FROM pedido_itens pi
        JOIN contrato_produtos cp ON pi.contrato_produto_id = cp.id
        JOIN contratos c ON cp.contrato_id = c.id
        JOIN fornecedores f ON c.fornecedor_id = f.id
        JOIN produtos p ON pi.produto_id = p.id
        WHERE pi.pedido_id = $1
        ORDER BY c.numero, f.nome, p.nome
      `;
    } else {
      itensQuery = `
        SELECT 
          pi.id as pedido_item_id,
          pi.quantidade,
          pi.preco_unitario,
          pi.valor_total,
          cp.contrato_id,
          c.numero as contrato_numero,
          c.fornecedor_id,
          f.nome as fornecedor_nome,
          f.cnpj as fornecedor_cnpj,
          p.id as produto_id,
          p.nome as produto_nome,
          'Kg' as unidade 
        FROM pedido_itens pi
        JOIN contrato_produtos cp ON pi.contrato_produto_id = cp.id
        JOIN contratos c ON cp.contrato_id = c.id
        JOIN fornecedores f ON c.fornecedor_id = f.id
        JOIN produtos p ON pi.produto_id = p.id
        WHERE pi.pedido_id = $1
        ORDER BY c.numero, f.nome, p.nome
      `;
    }

    // Buscar itens do pedido agrupados por contrato
    
    const itensResult = await db.all(itensQuery, [pedidoId]);
    
    if (itensResult.length === 0) {
      throw new Error('Nenhum item encontrado no pedido');
    }
    
    // Agrupar por contrato
    const contratosPorId: { [key: number]: ContratoCalculado } = {};
    const alertas: string[] = [];
    
    for (const item of itensResult) {
      const contratoId = item.contrato_id;
      
      if (!contratosPorId[contratoId]) {
        contratosPorId[contratoId] = {
          contrato_id: contratoId,
          contrato_numero: item.contrato_numero,
          fornecedor_id: item.fornecedor_id,
          fornecedor_nome: item.fornecedor_nome,
          fornecedor_cnpj: item.fornecedor_cnpj,
          itens: [],
          quantidade_total: 0,
          valor_total: 0
        };
      }
      
      // Buscar saldos disponíveis por modalidade para este produto/contrato
      const saldosQuery = `
        SELECT 
          cpm.modalidade_id,
          cpm.quantidade_disponivel,
          cpm.quantidade_inicial,
          m.nome as modalidade_nome,
          m.valor_repasse
        FROM contrato_produtos_modalidades cpm
        JOIN contrato_produtos cp ON cpm.contrato_produto_id = cp.id
        JOIN modalidades m ON cpm.modalidade_id = m.id
        WHERE cp.contrato_id = $1
          AND cp.produto_id = $2
          AND cpm.ativo = true
          AND m.ativo = true
      `;
      
      let saldosResult = [];
      try {
        saldosResult = await db.all(saldosQuery, [contratoId, item.produto_id]);
      } catch (error: any) {
        console.error('Erro ao buscar saldos:', error.message);
        console.error('Query:', saldosQuery);
        console.error('Params:', [contratoId, item.produto_id]);
        throw error;
      }
      
      // Filtrar modalidades que têm saldo disponível (quantidade_inicial > 0 e quantidade_disponivel > 0)
      const modalidadesComSaldo = modalidades
        .map(modalidade => {
          const saldo = saldosResult.find((s: any) => s.modalidade_id === modalidade.id);
          return {
            ...modalidade,
            quantidade_disponivel: saldo ? parseFloat(saldo.quantidade_disponivel.toString()) : 0,
            quantidade_inicial: saldo ? parseFloat(saldo.quantidade_inicial.toString()) : 0,
            tem_registro: !!saldo
          };
        })
        .filter(m => m.tem_registro && m.quantidade_inicial > 0 && m.quantidade_disponivel > 0);
      
      // Se nenhuma modalidade tem saldo, pular este item e alertar
      if (modalidadesComSaldo.length === 0) {
        const mensagemAlerta = saldosResult.length === 0
          ? `❌ Produto "${item.produto_nome}" (Contrato ${item.contrato_numero}): ` +
            `Não há saldos configurados. Este item será EXCLUÍDO do faturamento.`
          : `❌ Produto "${item.produto_nome}" (Contrato ${item.contrato_numero}): ` +
            `Todas as modalidades estão com saldo zerado. Este item será EXCLUÍDO do faturamento.`;
        
        alertas.push(mensagemAlerta);
        continue; // Pula para o próximo item
      }
      
      // Verificar se a soma dos saldos disponíveis é suficiente
      const somaSaldosDisponiveis = modalidadesComSaldo.reduce((soma, m) => soma + m.quantidade_disponivel, 0);
      const quantidadeNecessaria = parseFloat(item.quantidade.toString());
      
      if (somaSaldosDisponiveis < quantidadeNecessaria) {
        alertas.push(
          `❌ Produto "${item.produto_nome}" (Contrato ${item.contrato_numero}): ` +
          `Saldo insuficiente. Necessário: ${quantidadeNecessaria}, Disponível: ${somaSaldosDisponiveis}. ` +
          `Faltam ${(quantidadeNecessaria - somaSaldosDisponiveis).toFixed(2)} unidades. ` +
          `Este item será EXCLUÍDO do faturamento.`
        );
        continue; // Pula para o próximo item
      }
      
      // Recalcular percentuais apenas para modalidades com saldo
      const somaRepasses = modalidadesComSaldo.reduce((soma, m) => soma + m.valor_repasse, 0);
      const modalidadesAjustadas = modalidadesComSaldo.map(m => ({
        ...m,
        percentual: (m.valor_repasse / somaRepasses) * 100
      }));
      
      // Dividir quantidade do item entre modalidades COM SALDO
      let divisoesQuantidade = this.dividirQuantidadeEntreModalidades(
        item.quantidade, 
        modalidadesAjustadas
      );
      
      // Ajustar divisões que excedem o saldo disponível
      let quantidadeRestante = 0;
      const divisoesAjustadas = divisoesQuantidade.map(divisao => {
        const modalidadeComSaldo = modalidadesAjustadas.find(m => m.id === divisao.modalidade_id)!;
        
        if (divisao.quantidade > modalidadeComSaldo.quantidade_disponivel) {
          const excedente = divisao.quantidade - modalidadeComSaldo.quantidade_disponivel;
          quantidadeRestante += excedente;
          
          return {
            ...divisao,
            quantidade: modalidadeComSaldo.quantidade_disponivel,
            ajustado: true
          };
        }
        
        return { ...divisao, ajustado: false };
      });
      
      // Redistribuir quantidade restante entre modalidades que ainda têm espaço
      if (quantidadeRestante > 0) {
        const modalidadesComEspaco = divisoesAjustadas
          .map(d => {
            const modalidade = modalidadesAjustadas.find(m => m.id === d.modalidade_id)!;
            const espacoDisponivel = modalidade.quantidade_disponivel - d.quantidade;
            return { ...d, modalidade, espacoDisponivel };
          })
          .filter(d => d.espacoDisponivel > 0)
          .sort((a, b) => b.espacoDisponivel - a.espacoDisponivel);
        
        let restante = quantidadeRestante;
        for (const item of modalidadesComEspaco) {
          if (restante <= 0) break;
          
          const podeAdicionar = Math.min(restante, item.espacoDisponivel);
          const divisaoOriginal = divisoesAjustadas.find(d => d.modalidade_id === item.modalidade_id);
          if (divisaoOriginal) {
            divisaoOriginal.quantidade += podeAdicionar;
            restante -= podeAdicionar;
          }
        }
        
        if (restante > 0) {
          // Isso não deveria acontecer pois já validamos a soma total
          throw new Error(
            `Erro interno: Não foi possível redistribuir ${restante} unidades de "${item.produto_nome}"`
          );
        }
      }
      
      divisoesQuantidade = divisoesAjustadas;
      
      // Criar divisões com valores calculados
      const divisoes: ItemDivisao[] = divisoesQuantidade.map(divisao => {
        const modalidade = modalidadesAjustadas.find(m => m.id === divisao.modalidade_id)!;
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
        unidade: item.unidade ,
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
    
    // Filtrar contratos vazios (sem itens processados)
    const contratosComItens = contratos.filter(c => c.itens.length > 0);
    
    // Verificar se pelo menos um item foi processado
    if (contratosComItens.length === 0) {
      throw new Error(
        'Nenhum item pôde ser processado devido a problemas de saldo. ' +
        'Verifique os alertas e ajuste os saldos em "Saldo por Modalidade".'
      );
    }
    
    // Calcular resumo apenas dos itens processados
    const totalItensProcessados = contratosComItens.reduce((sum, c) => sum + c.itens.length, 0);
    const itensExcluidos = itensResult.length - totalItensProcessados;
    
    if (itensExcluidos > 0) {
      alertas.unshift(
        `⚠️ ATENÇÃO: ${itensExcluidos} de ${itensResult.length} itens foram EXCLUÍDOS do faturamento por falta de saldo.`
      );
    }
    
    const resumo = {
      total_contratos: contratosComItens.length,
      total_fornecedores: new Set(contratosComItens.map(c => c.fornecedor_id)).size,
      total_modalidades: modalidades.length,
      total_itens: itensResult.length,
      total_itens_processados: totalItensProcessados,
      total_itens_excluidos: itensExcluidos,
      quantidade_total: contratosComItens.reduce((sum, c) => sum + parseFloat(c.quantidade_total.toString()), 0),
      valor_total: contratosComItens.reduce((sum, c) => sum + parseFloat(c.valor_total.toString()), 0)
    };
    
    return {
      pedido_id: pedidoId,
      pedido_numero: pedidoResult.numero,
      modalidades: modalidades,
      contratos: contratosComItens,
      resumo: resumo,
      alertas: alertas.length > 0 ? alertas : undefined
    };
  }
  
  /**
   * Verifica se há saldo disponível por modalidade para os itens do pedido
   */
  static async verificarSaldoModalidades(pedidoId: number, previa: any): Promise<void> {
    const erros: string[] = [];
    
    for (const contrato of previa.contratos) {
      for (const item of contrato.itens) {
        for (const divisao of item.divisoes) {
          if (divisao.quantidade > 0) {
            // Buscar saldo disponível para este produto/contrato/modalidade
            const saldoQuery = `
              SELECT 
                cpm.quantidade_disponivel,
                cpm.quantidade_inicial,
                p.nome as produto_nome,
                m.nome as modalidade_nome,
                c.numero as contrato_numero
              FROM contrato_produtos_modalidades cpm
              JOIN contrato_produtos cp ON cpm.contrato_produto_id = cp.id
              JOIN produtos p ON cp.produto_id = p.id
              JOIN modalidades m ON cpm.modalidade_id = m.id
              JOIN contratos c ON cp.contrato_id = c.id
              WHERE cp.contrato_id = $1
                AND cp.produto_id = $2
                AND cpm.modalidade_id = $3
                AND cpm.ativo = true
            `;
            
            const saldoResult = await db.get(saldoQuery, [
              contrato.contrato_id,
              item.produto_id,
              divisao.modalidade_id
            ]);
            
            if (!saldoResult) {
              erros.push(
                `Produto "${item.produto_nome}" não possui saldo configurado para modalidade "${divisao.modalidade_nome}" no contrato ${contrato.contrato_numero}`
              );
            } else if (saldoResult.quantidade_disponivel < divisao.quantidade) {
              erros.push(
                `Saldo insuficiente para "${item.produto_nome}" na modalidade "${divisao.modalidade_nome}" (Contrato ${contrato.contrato_numero}). ` +
                `Disponível: ${saldoResult.quantidade_disponivel}, Necessário: ${divisao.quantidade}`
              );
            }
          }
        }
      }
    }
    
    if (erros.length > 0) {
      throw new Error('Erros de saldo por modalidade:\n' + erros.join('\n'));
    }
  }

  /**
   * Gera o faturamento definitivo
   */
  static async gerarFaturamento(pedidoId: number, usuarioId: number, observacoes?: string): Promise<any> {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Verificar se já existe faturamento para este pedido
      // FOR UPDATE trava o registro e previne race condition
      const faturamentoExistente = await client.query(`
        SELECT id FROM faturamentos 
        WHERE pedido_id = $1 
        FOR UPDATE
      `, [pedidoId]);
      
      if (faturamentoExistente.rows.length > 0) {
        throw new FaturamentoDuplicadoError(pedidoId);
      }
      
      // Travar também o pedido para evitar modificações simultâneas
      await client.query(`
        SELECT id FROM pedidos 
        WHERE id = $1 
          AND tenant_id = get_current_tenant_id()
        FOR UPDATE
      `, [pedidoId]);
      
      // Calcular prévia DENTRO da transação
      const previa = await this.calcularPreviaFaturamento(pedidoId);
      
      // Travar saldos para evitar race condition
      // Buscar todos os saldos que serão usados e travá-los
      for (const contrato of previa.contratos) {
        for (const item of contrato.itens) {
          for (const divisao of item.divisoes) {
            await client.query(`
              SELECT cpm.id, cpm.quantidade_disponivel
              FROM contrato_produtos_modalidades cpm
              JOIN contrato_produtos cp ON cpm.contrato_produto_id = cp.id
              WHERE cp.contrato_id = $1
                AND cp.produto_id = $2
                AND cpm.modalidade_id = $3
                AND cpm.ativo = true
              FOR UPDATE
            `, [contrato.contrato_id, item.produto_id, divisao.modalidade_id]);
          }
        }
      }
      
      // Verificar saldo por modalidade (agora com locks aplicados)
      await this.verificarSaldoModalidades(pedidoId, previa);
      
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
      
      // Criar itens do faturamento e atualizar saldo por modalidade
      for (const contrato of previa.contratos) {
        for (const item of contrato.itens) {
          for (const divisao of item.divisoes) {
            if (divisao.quantidade > 0) { // Só criar se quantidade > 0
              // Criar item do faturamento
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
              
              // Não atualizar consumo automaticamente - será feito ao clicar em "Registrar Consumo"
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

  /**
   * Remove itens de uma modalidade específica do faturamento
   */
  static async removerItensModalidade(
    faturamentoId: number,
    contratoId: number,
    modalidadeId: number
  ): Promise<void> {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Verificar se o faturamento existe
      const faturamentoResult = await client.query(`
        SELECT f.id, f.status 
        FROM faturamentos f
        JOIN pedidos p ON f.pedido_id = p.id
        WHERE f.id = $1 
          AND p.tenant_id = get_current_tenant_id()
      `, [faturamentoId]);
      
      if (faturamentoResult.rows.length === 0) {
        throw new Error('Faturamento não encontrado');
      }
      
      const faturamento = faturamentoResult.rows[0];
      const consumoRegistrado = faturamento.status === 'consumido';
      
      // Buscar itens que serão removidos
      const itensResult = await client.query(`
        SELECT 
          fi.id,
          fi.quantidade_modalidade,
          fi.produto_id,
          p.nome as produto_nome,
          m.nome as modalidade_nome
        FROM faturamento_itens fi
        JOIN produtos p ON p.id = fi.produto_id
        JOIN modalidades m ON m.id = fi.modalidade_id
        WHERE fi.faturamento_id = $1
          AND fi.contrato_id = $2
          AND fi.modalidade_id = $3
      `, [faturamentoId, contratoId, modalidadeId]);
      
      if (itensResult.rows.length === 0) {
        throw new Error('Nenhum item encontrado para esta modalidade neste contrato');
      }
      
      // Se o consumo foi registrado, restaurar saldos
      if (consumoRegistrado) {
        for (const item of itensResult.rows) {
          const updateResult = await client.query(`
            UPDATE contrato_produtos_modalidades cpm
            SET quantidade_consumida = cpm.quantidade_consumida - $1
            FROM contrato_produtos cp
            WHERE cpm.contrato_produto_id = cp.id
              AND cp.contrato_id = $2
              AND cp.produto_id = $3
              AND cpm.modalidade_id = $4
              AND cpm.ativo = true
            RETURNING cpm.id
          `, [
            item.quantidade_modalidade,
            contratoId,
            item.produto_id,
            modalidadeId
          ]);
          
          // Registrar no histórico
          if (updateResult.rows.length > 0) {
            await client.query(`
              INSERT INTO movimentacoes_consumo_modalidade (
                contrato_produto_modalidade_id,
                quantidade,
                tipo_movimentacao,
                observacao,
                usuario_id
              )
              VALUES ($1, $2, 'ESTORNO', $3, $4)
            `, [
              updateResult.rows[0].id,
              item.quantidade_modalidade,
              `Faturamento #${faturamentoId} - Modalidade ${item.modalidade_nome} removida`,
              1
            ]);
          }
        }
      }
      
      // Para cada produto que tinha itens na modalidade removida, redistribuir
      for (const itemRemovido of itensResult.rows) {
        // Buscar outros itens do mesmo produto no mesmo faturamento e contrato
        const outrosItensResult = await client.query(`
          SELECT 
            fi.id,
            fi.modalidade_id,
            fi.quantidade_modalidade,
            fi.preco_unitario,
            m.valor_repasse
          FROM faturamento_itens fi
          JOIN modalidades m ON m.id = fi.modalidade_id
          WHERE fi.faturamento_id = $1
            AND fi.contrato_id = $2
            AND fi.produto_id = $3
            AND fi.modalidade_id != $4
        `, [faturamentoId, contratoId, itemRemovido.produto_id, modalidadeId]);
        
        if (outrosItensResult.rows.length > 0) {
          // Calcular o total de valor_repasse das modalidades restantes
          const totalRepasse = outrosItensResult.rows.reduce(
            (sum, item) => sum + Number(item.valor_repasse || 0), 
            0
          );
          
          if (totalRepasse > 0) {
            // Redistribuir a quantidade proporcionalmente
            const quantidadeParaRedistribuir = itemRemovido.quantidade_modalidade;
            
            for (const outroItem of outrosItensResult.rows) {
              const percentual = Number(outroItem.valor_repasse || 0) / totalRepasse;
              const quantidadeAdicional = Math.round(quantidadeParaRedistribuir * percentual);
              const novaQuantidade = Number(outroItem.quantidade_modalidade) + quantidadeAdicional;
              const novoValor = novaQuantidade * Number(outroItem.preco_unitario);
              
              // Atualizar o item
              await client.query(`
                UPDATE faturamento_itens
                SET quantidade_modalidade = $1,
                    valor_total = $2,
                    percentual_modalidade = (
                      SELECT (quantidade_modalidade * 100.0 / 
                        (SELECT SUM(quantidade_modalidade) 
                         FROM faturamento_itens 
                         WHERE faturamento_id = $3 
                           AND contrato_id = $4 
                           AND produto_id = $5))
                      FROM faturamento_itens
                      WHERE id = $6
                    )
                WHERE id = $6
              `, [
                novaQuantidade,
                novoValor,
                faturamentoId,
                contratoId,
                itemRemovido.produto_id,
                outroItem.id
              ]);
              
              // Se o consumo foi registrado, atualizar também o saldo
              if (consumoRegistrado) {
                console.log(`🔄 Atualizando consumo: +${quantidadeAdicional} para modalidade ${outroItem.modalidade_id} do produto ${itemRemovido.produto_nome}`);
                
                const updateConsumoResult = await client.query(`
                  UPDATE contrato_produtos_modalidades cpm
                  SET quantidade_consumida = cpm.quantidade_consumida + $1
                  FROM contrato_produtos cp
                  WHERE cpm.contrato_produto_id = cp.id
                    AND cp.contrato_id = $2
                    AND cp.produto_id = $3
                    AND cpm.modalidade_id = $4
                    AND cpm.ativo = true
                  RETURNING cpm.id
                `, [
                  quantidadeAdicional,
                  contratoId,
                  itemRemovido.produto_id,
                  outroItem.modalidade_id
                ]);
                
                // Registrar no histórico a redistribuição
                if (updateConsumoResult.rows.length > 0) {
                  await client.query(`
                    INSERT INTO movimentacoes_consumo_modalidade (
                      contrato_produto_modalidade_id,
                      quantidade,
                      tipo_movimentacao,
                      observacao,
                      usuario_id
                    )
                    VALUES ($1, $2, 'CONSUMO', $3, $4)
                  `, [
                    updateConsumoResult.rows[0].id,
                    quantidadeAdicional,
                    `Faturamento #${faturamentoId} - Redistribuição de ${itemRemovido.modalidade_nome}`,
                    1
                  ]);
                }
              }
            }
          }
        }
      }
      
      // Excluir os itens da modalidade removida
      await client.query(`
        DELETE FROM faturamento_itens
        WHERE faturamento_id = $1
          AND contrato_id = $2
          AND modalidade_id = $3
      `, [faturamentoId, contratoId, modalidadeId]);
      
      // Recalcular o valor total do faturamento
      const totalResult = await client.query(`
        SELECT COALESCE(SUM(valor_total), 0) as total
        FROM faturamento_itens
        WHERE faturamento_id = $1
      `, [faturamentoId]);
      
      const novoTotal = totalResult.rows[0].total;
      
      await client.query(`
        UPDATE faturamentos
        SET valor_total = $1
        WHERE id = $2
      `, [novoTotal, faturamentoId]);
      
      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Registra o consumo de um item específico do faturamento
   */
  static async registrarConsumoItem(
    faturamentoId: number,
    itemId: number,
    usuarioId: number = 1
  ): Promise<void> {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Buscar o item do faturamento
      const itemResult = await client.query(`
        SELECT 
          fi.id,
          fi.contrato_id,
          fi.produto_id,
          fi.modalidade_id,
          fi.quantidade_modalidade,
          fi.consumo_registrado,
          p.nome as produto_nome,
          m.nome as modalidade_nome,
          c.numero as contrato_numero
        FROM faturamento_itens fi
        JOIN produtos p ON p.id = fi.produto_id
        JOIN modalidades m ON m.id = fi.modalidade_id
        JOIN contratos c ON c.id = fi.contrato_id
        WHERE fi.id = $1 AND fi.faturamento_id = $2
        FOR UPDATE
      `, [itemId, faturamentoId]);
      
      if (itemResult.rows.length === 0) {
        throw new Error('Item do faturamento não encontrado');
      }
      
      const item = itemResult.rows[0];
      
      if (item.consumo_registrado) {
        throw new Error(`Consumo do item "${item.produto_nome}" já foi registrado`);
      }
      
      // Atualizar saldo
      const updateResult = await client.query(`
        UPDATE contrato_produtos_modalidades cpm
        SET quantidade_consumida = cpm.quantidade_consumida + $1
        FROM contrato_produtos cp
        WHERE cpm.contrato_produto_id = cp.id
          AND cp.contrato_id = $2
          AND cp.produto_id = $3
          AND cpm.modalidade_id = $4
          AND cpm.ativo = true
        RETURNING cpm.id
      `, [
        item.quantidade_modalidade,
        item.contrato_id,
        item.produto_id,
        item.modalidade_id
      ]);
      
      if (updateResult.rows.length === 0) {
        throw new Error(
          `Erro ao registrar consumo: Produto "${item.produto_nome}" / ` +
          `Modalidade "${item.modalidade_nome}" não encontrado no contrato ${item.contrato_numero}`
        );
      }
      
      // Registrar no histórico
      await client.query(`
        INSERT INTO movimentacoes_consumo_modalidade (
          contrato_produto_modalidade_id,
          quantidade,
          tipo_movimentacao,
          observacao,
          usuario_id
        )
        VALUES ($1, $2, 'CONSUMO', $3, $4)
      `, [
        updateResult.rows[0].id,
        item.quantidade_modalidade,
        `Faturamento #${faturamentoId} - Item #${itemId} - ${item.produto_nome}`,
        usuarioId
      ]);
      
      // Marcar item como consumido
      const updateItemResult = await client.query(`
        UPDATE faturamento_itens
        SET consumo_registrado = true,
            data_consumo = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, consumo_registrado, data_consumo
      `, [itemId]);
      
      console.log('✅ Item marcado como consumido:', updateItemResult.rows[0]);
      
      await client.query('COMMIT');
      console.log('✅ Transação commitada com sucesso!');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reverte o consumo de um item específico do faturamento
   */
  static async reverterConsumoItem(
    faturamentoId: number,
    itemId: number,
    usuarioId: number = 1
  ): Promise<void> {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Buscar o item do faturamento
      const itemResult = await client.query(`
        SELECT 
          fi.id,
          fi.contrato_id,
          fi.produto_id,
          fi.modalidade_id,
          fi.quantidade_modalidade,
          fi.consumo_registrado,
          p.nome as produto_nome,
          m.nome as modalidade_nome,
          c.numero as contrato_numero
        FROM faturamento_itens fi
        JOIN produtos p ON p.id = fi.produto_id
        JOIN modalidades m ON m.id = fi.modalidade_id
        JOIN contratos c ON c.id = fi.contrato_id
        WHERE fi.id = $1 AND fi.faturamento_id = $2
        FOR UPDATE
      `, [itemId, faturamentoId]);
      
      if (itemResult.rows.length === 0) {
        throw new Error('Item do faturamento não encontrado');
      }
      
      const item = itemResult.rows[0];
      
      if (!item.consumo_registrado) {
        throw new Error(`Consumo do item "${item.produto_nome}" não foi registrado ainda`);
      }
      
      // Restaurar saldo
      const updateResult = await client.query(`
        UPDATE contrato_produtos_modalidades cpm
        SET quantidade_consumida = cpm.quantidade_consumida - $1
        FROM contrato_produtos cp
        WHERE cpm.contrato_produto_id = cp.id
          AND cp.contrato_id = $2
          AND cp.produto_id = $3
          AND cpm.modalidade_id = $4
          AND cpm.ativo = true
        RETURNING cpm.id
      `, [
        item.quantidade_modalidade,
        item.contrato_id,
        item.produto_id,
        item.modalidade_id
      ]);
      
      if (updateResult.rows.length === 0) {
        throw new Error(
          `Erro ao reverter consumo: Produto "${item.produto_nome}" / ` +
          `Modalidade "${item.modalidade_nome}" não encontrado no contrato ${item.contrato_numero}`
        );
      }
      
      // Apagar o registro de consumo do histórico
      // Não criamos um registro de estorno, apenas removemos o registro original
      await client.query(`
        DELETE FROM movimentacoes_consumo_modalidade
        WHERE id IN (
          SELECT id 
          FROM movimentacoes_consumo_modalidade
          WHERE contrato_produto_modalidade_id = $1
            AND tipo_movimentacao = 'CONSUMO'
            AND observacao LIKE $2
          ORDER BY created_at DESC
          LIMIT 1
        )
      `, [
        updateResult.rows[0].id,
        `%Faturamento #${faturamentoId}%Item #${itemId}%`
      ]);
      
      // Desmarcar item como consumido
      await client.query(`
        UPDATE faturamento_itens
        SET consumo_registrado = false,
            data_consumo = NULL
        WHERE id = $1
      `, [itemId]);
      
      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Registra o consumo do faturamento nos saldos dos contratos (TODOS os itens)
   */
  static async registrarConsumo(faturamentoId: number): Promise<void> {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Verificar se o faturamento existe
      const faturamentoResult = await client.query(`
        SELECT f.id, f.status 
        FROM faturamentos f
        JOIN pedidos p ON f.pedido_id = p.id
        WHERE f.id = $1 
          AND p.tenant_id = get_current_tenant_id()
      `, [faturamentoId]);
      
      if (faturamentoResult.rows.length === 0) {
        throw new Error('Faturamento não encontrado');
      }
      
      const faturamento = faturamentoResult.rows[0];
      
      if (faturamento.status === 'consumido') {
        throw new ConsumoJaRegistradoError(faturamentoId);
      }
      
      // Buscar itens do faturamento
      const itensResult = await client.query(`
        SELECT 
          fi.contrato_id,
          fi.produto_id,
          fi.modalidade_id,
          fi.quantidade_modalidade,
          p.nome as produto_nome,
          m.nome as modalidade_nome
        FROM faturamento_itens fi
        JOIN produtos p ON p.id = fi.produto_id
        JOIN modalidades m ON m.id = fi.modalidade_id
        WHERE fi.faturamento_id = $1
      `, [faturamentoId]);
      
      // Atualizar consumo para cada item
      for (const item of itensResult.rows) {
        const updateResult = await client.query(`
          UPDATE contrato_produtos_modalidades cpm
          SET quantidade_consumida = cpm.quantidade_consumida + $1
          FROM contrato_produtos cp
          WHERE cpm.contrato_produto_id = cp.id
            AND cp.contrato_id = $2
            AND cp.produto_id = $3
            AND cpm.modalidade_id = $4
            AND cpm.ativo = true
          RETURNING cpm.id
        `, [
          item.quantidade_modalidade,
          item.contrato_id,
          item.produto_id,
          item.modalidade_id
        ]);
        
        if (updateResult.rows.length === 0) {
          throw new Error(
            `Erro ao registrar consumo: Produto "${item.produto_nome}" / Modalidade "${item.modalidade_nome}" não encontrado no contrato`
          );
        }
        
        // Registrar no histórico de movimentações
        const contratoProduModalidadeId = updateResult.rows[0].id;
        
        await client.query(`
          INSERT INTO movimentacoes_consumo_modalidade (
            contrato_produto_modalidade_id,
            quantidade,
            tipo_movimentacao,
            observacao,
            usuario_id
          )
          VALUES ($1, $2, 'CONSUMO', $3, $4)
        `, [
          contratoProduModalidadeId,
          item.quantidade_modalidade,
          `Faturamento #${faturamentoId} - Consumo registrado`,
          1 // TODO: Pegar do token de autenticação
        ]);
      }
      
      // Atualizar status do faturamento para 'consumido'
      await client.query(
        'UPDATE faturamentos SET status = $1 WHERE id = $2',
        ['consumido', faturamentoId]
      );
      
      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}