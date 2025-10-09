import { Request, Response } from 'express';
const db = require('../../../database');

/**
 * Controller para gerenciar saldos de contratos por modalidade
 */
class SaldoContratosModalidadesController {
  /**
   * Lista todos os produtos de contratos com todas as modalidades
   * Mesmo que não tenham saldos cadastrados
   * GET /api/saldo-contratos-modalidades
   */
  async listarSaldosModalidades(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 50,
        status,
        contrato_numero,
        produto_nome,
        fornecedor_id,
        modalidade_id
      } = req.query;

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      // Primeiro, buscar os produtos paginados (produtos únicos)
      let produtosQuery = `
        SELECT DISTINCT cp.id as contrato_produto_id
        FROM contrato_produtos cp
        JOIN contratos c ON cp.contrato_id = c.id
        JOIN produtos p ON cp.produto_id = p.id
        JOIN fornecedores f ON c.fornecedor_id = f.id
        WHERE cp.ativo = true
          AND c.ativo = true
      `;

      const produtosParams: any[] = [];
      let produtosParamIndex = 1;

      if (contrato_numero) {
        produtosQuery += ` AND c.numero ILIKE $${produtosParamIndex}`;
        produtosParams.push(`%${contrato_numero}%`);
        produtosParamIndex++;
      }

      if (produto_nome) {
        produtosQuery += ` AND p.nome ILIKE $${produtosParamIndex}`;
        produtosParams.push(`%${produto_nome}%`);
        produtosParamIndex++;
      }

      if (fornecedor_id) {
        produtosQuery += ` AND f.id = $${produtosParamIndex}`;
        produtosParams.push(parseInt(fornecedor_id as string));
        produtosParamIndex++;
      }

      produtosQuery += ` ORDER BY cp.id`;
      produtosQuery += ` LIMIT $${produtosParamIndex} OFFSET $${produtosParamIndex + 1}`;
      produtosParams.push(parseInt(limit as string), offset);

      const produtosPaginados = await db.query(produtosQuery, produtosParams);
      const produtoIds = produtosPaginados.rows.map((r: any) => r.contrato_produto_id);

      // Se não há produtos, retornar vazio
      if (produtoIds.length === 0) {
        res.json({
          success: true,
          data: [],
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: 0,
            totalPages: 0
          },
          estatisticas: {
            total_itens: 0,
            itens_disponiveis: 0,
            itens_baixo_estoque: 0,
            itens_esgotados: 0,
            quantidade_inicial_total: 0,
            quantidade_consumida_total: 0,
            quantidade_disponivel_total: 0,
            valor_total_disponivel: 0
          }
        });
        return;
      }

      // Agora buscar todas as modalidades para esses produtos
      let query = `
        SELECT 
          COALESCE(cpm.id, 0) as id,
          cp.id as contrato_produto_id,
          m.id as modalidade_id,
          COALESCE(cpm.quantidade_inicial, 0) as quantidade_inicial,
          COALESCE(cpm.quantidade_consumida, 0) as quantidade_consumida,
          COALESCE(cpm.quantidade_disponivel, 0) as quantidade_disponivel,
          COALESCE(cpm.ativo, true) as ativo,
          cpm.created_at,
          cpm.updated_at,
          
          cp.contrato_id,
          cp.produto_id,
          cp.quantidade_contratada as quantidade_contrato,
          cp.preco_unitario,
          cp.saldo as saldo_contrato,
          
          c.numero as contrato_numero,
          c.data_inicio,
          c.data_fim,
          c.status as contrato_status,
          
          p.nome as produto_nome,
          p.unidade,
          
          m.nome as modalidade_nome,
          m.codigo_financeiro as modalidade_codigo_financeiro,
          m.valor_repasse as modalidade_valor_repasse,
          
          f.id as fornecedor_id,
          f.nome as fornecedor_nome,
          
          (COALESCE(cpm.quantidade_disponivel, 0) * cp.preco_unitario) as valor_disponivel,
          
          CASE 
            WHEN COALESCE(cpm.quantidade_disponivel, 0) <= 0 THEN 'ESGOTADO'
            WHEN COALESCE(cpm.quantidade_disponivel, 0) <= (COALESCE(cpm.quantidade_inicial, 0) * 0.1) THEN 'BAIXO_ESTOQUE'
            ELSE 'DISPONIVEL'
          END as status
          
        FROM contrato_produtos cp
        CROSS JOIN modalidades m
        LEFT JOIN contrato_produtos_modalidades cpm 
          ON cp.id = cpm.contrato_produto_id 
          AND m.id = cpm.modalidade_id
        JOIN contratos c ON cp.contrato_id = c.id
        JOIN produtos p ON cp.produto_id = p.id
        JOIN fornecedores f ON c.fornecedor_id = f.id
        WHERE cp.id = ANY($1)
          AND m.ativo = true
      `;

      const queryParams: any[] = [produtoIds];
      let queryParamIndex = 2;

      if (status) {
        query += ` AND (CASE 
            WHEN COALESCE(cpm.quantidade_disponivel, 0) <= 0 THEN 'ESGOTADO'
            WHEN COALESCE(cpm.quantidade_disponivel, 0) <= (COALESCE(cpm.quantidade_inicial, 0) * 0.1) THEN 'BAIXO_ESTOQUE'
            ELSE 'DISPONIVEL'
          END) = $${queryParamIndex}`;
        queryParams.push(status);
        queryParamIndex++;
      }

      if (modalidade_id) {
        query += ` AND m.id = $${queryParamIndex}`;
        queryParams.push(parseInt(modalidade_id as string));
        queryParamIndex++;
      }

      query += ` ORDER BY c.numero, p.nome, m.nome`;

      const result = await db.query(query, queryParams);

      // Count query - contar produtos únicos ao invés de linhas
      let countQuery = `
        SELECT COUNT(DISTINCT cp.id) as total
        FROM contrato_produtos cp
        JOIN contratos c ON cp.contrato_id = c.id
        JOIN produtos p ON cp.produto_id = p.id
        JOIN fornecedores f ON c.fornecedor_id = f.id
        WHERE cp.ativo = true
          AND c.ativo = true
      `;

      const countParams: any[] = [];
      let countParamIndex = 1;

      if (contrato_numero) {
        countQuery += ` AND c.numero ILIKE $${countParamIndex}`;
        countParams.push(`%${contrato_numero}%`);
        countParamIndex++;
      }

      if (produto_nome) {
        countQuery += ` AND p.nome ILIKE $${countParamIndex}`;
        countParams.push(`%${produto_nome}%`);
        countParamIndex++;
      }

      if (fornecedor_id) {
        countQuery += ` AND f.id = $${countParamIndex}`;
        countParams.push(parseInt(fornecedor_id as string));
        countParamIndex++;
      }

      const countResult = await db.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      // Estatísticas
      const statsQuery = `
        SELECT 
          COUNT(*) as total_itens,
          COUNT(CASE WHEN (CASE 
            WHEN COALESCE(cpm.quantidade_disponivel, 0) <= 0 THEN 'ESGOTADO'
            WHEN COALESCE(cpm.quantidade_disponivel, 0) <= (COALESCE(cpm.quantidade_inicial, 0) * 0.1) THEN 'BAIXO_ESTOQUE'
            ELSE 'DISPONIVEL'
          END) = 'DISPONIVEL' THEN 1 END) as itens_disponiveis,
          COUNT(CASE WHEN (CASE 
            WHEN COALESCE(cpm.quantidade_disponivel, 0) <= 0 THEN 'ESGOTADO'
            WHEN COALESCE(cpm.quantidade_disponivel, 0) <= (COALESCE(cpm.quantidade_inicial, 0) * 0.1) THEN 'BAIXO_ESTOQUE'
            ELSE 'DISPONIVEL'
          END) = 'BAIXO_ESTOQUE' THEN 1 END) as itens_baixo_estoque,
          COUNT(CASE WHEN (CASE 
            WHEN COALESCE(cpm.quantidade_disponivel, 0) <= 0 THEN 'ESGOTADO'
            WHEN COALESCE(cpm.quantidade_disponivel, 0) <= (COALESCE(cpm.quantidade_inicial, 0) * 0.1) THEN 'BAIXO_ESTOQUE'
            ELSE 'DISPONIVEL'
          END) = 'ESGOTADO' THEN 1 END) as itens_esgotados,
          SUM(COALESCE(cpm.quantidade_inicial, 0)) as quantidade_inicial_total,
          SUM(COALESCE(cpm.quantidade_consumida, 0)) as quantidade_consumida_total,
          SUM(COALESCE(cpm.quantidade_disponivel, 0)) as quantidade_disponivel_total,
          SUM(COALESCE(cpm.quantidade_disponivel, 0) * cp.preco_unitario) as valor_total_disponivel
        FROM contrato_produtos cp
        CROSS JOIN modalidades m
        LEFT JOIN contrato_produtos_modalidades cpm 
          ON cp.id = cpm.contrato_produto_id 
          AND m.id = cpm.modalidade_id
        JOIN contratos c ON cp.contrato_id = c.id
        JOIN produtos p ON cp.produto_id = p.id
        JOIN fornecedores f ON c.fornecedor_id = f.id
        WHERE cp.ativo = true
          AND c.ativo = true
          AND m.ativo = true
      `;

      // Construir a parte adicional do WHERE para estatísticas
      let statsWhereAdditional = '';
      const statsParams: any[] = [];
      let statsParamIndex = 1;

      if (contrato_numero) {
        statsWhereAdditional += ` AND c.numero ILIKE $${statsParamIndex}`;
        statsParams.push(`%${contrato_numero}%`);
        statsParamIndex++;
      }

      if (produto_nome) {
        statsWhereAdditional += ` AND p.nome ILIKE $${statsParamIndex}`;
        statsParams.push(`%${produto_nome}%`);
        statsParamIndex++;
      }

      if (fornecedor_id) {
        statsWhereAdditional += ` AND f.id = $${statsParamIndex}`;
        statsParams.push(parseInt(fornecedor_id as string));
        statsParamIndex++;
      }

      const statsResult = await db.query(statsQuery + statsWhereAdditional, statsParams);

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string))
        },
        estatisticas: {
          total_itens: parseInt(statsResult.rows[0].total_itens || 0),
          itens_disponiveis: parseInt(statsResult.rows[0].itens_disponiveis || 0),
          itens_baixo_estoque: parseInt(statsResult.rows[0].itens_baixo_estoque || 0),
          itens_esgotados: parseInt(statsResult.rows[0].itens_esgotados || 0),
          quantidade_inicial_total: parseFloat(statsResult.rows[0].quantidade_inicial_total || 0),
          quantidade_consumida_total: parseFloat(statsResult.rows[0].quantidade_consumida_total || 0),
          quantidade_disponivel_total: parseFloat(statsResult.rows[0].quantidade_disponivel_total || 0),
          valor_total_disponivel: parseFloat(statsResult.rows[0].valor_total_disponivel || 0)
        }
      });

    } catch (error: any) {
      console.error('Erro ao listar saldos por modalidade:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Lista modalidades disponíveis
   */
  async listarModalidades(req: Request, res: Response): Promise<void> {
    try {
      const query = `
        SELECT id, nome, codigo_financeiro, valor_repasse
        FROM modalidades
        WHERE ativo = true
        ORDER BY nome
      `;

      const result = await db.query(query);
      res.json({ success: true, data: result.rows });

    } catch (error: any) {
      console.error('Erro ao listar modalidades:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  /**
   * Lista produtos de contratos disponíveis
   */
  async listarProdutosContratos(req: Request, res: Response): Promise<void> {
    try {
      const query = `
        SELECT 
          cp.id, cp.contrato_id, cp.produto_id, cp.preco_unitario,
          c.numero as contrato_numero, c.data_inicio, c.data_fim,
          p.nome as produto_nome, p.unidade,
          f.nome as fornecedor_nome
        FROM contrato_produtos cp
        JOIN contratos c ON cp.contrato_id = c.id
        JOIN produtos p ON cp.produto_id = p.id
        JOIN fornecedores f ON c.fornecedor_id = f.id
        WHERE cp.ativo = true AND c.ativo = true AND c.status = 'ativo'
        ORDER BY c.numero, p.nome
      `;

      const result = await db.query(query);
      res.json({ success: true, data: result.rows });

    } catch (error: any) {
      console.error('Erro ao listar produtos de contratos:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  /**
   * Cadastra ou atualiza saldo inicial por modalidade
   */
  async cadastrarSaldoModalidade(req: Request, res: Response): Promise<void> {
    try {
      const { contrato_produto_id, modalidade_id, quantidade_inicial } = req.body;

      if (!contrato_produto_id || !modalidade_id || quantidade_inicial === undefined) {
        res.status(400).json({ success: false, message: 'Contrato produto, modalidade e quantidade inicial são obrigatórios' });
        return;
      }

      if (quantidade_inicial < 0) {
        res.status(400).json({ success: false, message: 'Quantidade inicial não pode ser negativa' });
        return;
      }

      // Buscar a quantidade contratada do produto
      const contratoResult = await db.query(`
        SELECT cp.quantidade_contratada, p.nome as produto_nome
        FROM contrato_produtos cp
        JOIN produtos p ON cp.produto_id = p.id
        WHERE cp.id = $1
      `, [contrato_produto_id]);

      if (contratoResult.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Produto do contrato não encontrado' });
        return;
      }

      const quantidadeContratada = parseFloat(contratoResult.rows[0].quantidade_contratada);
      const produtoNome = contratoResult.rows[0].produto_nome;

      // Calcular a soma das outras modalidades (excluindo a atual)
      const somaOutrasResult = await db.query(`
        SELECT COALESCE(SUM(quantidade_inicial), 0) as soma_outras
        FROM contrato_produtos_modalidades
        WHERE contrato_produto_id = $1 AND modalidade_id != $2
      `, [contrato_produto_id, modalidade_id]);

      const somaOutras = parseFloat(somaOutrasResult.rows[0].soma_outras);
      const somaTotal = somaOutras + quantidade_inicial;

      // Validar se a soma total não excede a quantidade contratada
      if (somaTotal > quantidadeContratada) {
        res.status(400).json({
          success: false,
          message: `A soma das modalidades (${somaTotal.toFixed(2)}) não pode exceder a quantidade contratada de ${produtoNome} (${quantidadeContratada.toFixed(2)})`,
          detalhes: {
            quantidade_contratada: quantidadeContratada,
            soma_outras_modalidades: somaOutras,
            quantidade_solicitada: quantidade_inicial,
            soma_total: somaTotal,
            disponivel_para_distribuir: quantidadeContratada - somaOutras
          }
        });
        return;
      }

      const existeResult = await db.query(`
        SELECT id FROM contrato_produtos_modalidades 
        WHERE contrato_produto_id = $1 AND modalidade_id = $2
      `, [contrato_produto_id, modalidade_id]);

      let result;

      if (existeResult.rows.length > 0) {
        result = await db.query(`
          UPDATE contrato_produtos_modalidades 
          SET quantidade_inicial = $1, updated_at = CURRENT_TIMESTAMP
          WHERE contrato_produto_id = $2 AND modalidade_id = $3
          RETURNING *
        `, [quantidade_inicial, contrato_produto_id, modalidade_id]);
      } else {
        result = await db.query(`
          INSERT INTO contrato_produtos_modalidades 
          (contrato_produto_id, modalidade_id, quantidade_inicial)
          VALUES ($1, $2, $3)
          RETURNING *
        `, [contrato_produto_id, modalidade_id, quantidade_inicial]);
      }

      res.json({
        success: true,
        message: existeResult.rows.length > 0 ? 'Saldo atualizado com sucesso' : 'Saldo cadastrado com sucesso',
        data: result.rows[0]
      });

    } catch (error: any) {
      console.error('Erro ao cadastrar saldo por modalidade:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  /**
   * Registra consumo por modalidade
   */
  async registrarConsumoModalidade(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { quantidade, observacao, usuario_id, data_consumo } = req.body;

      if (!quantidade || quantidade <= 0) {
        res.status(400).json({ success: false, message: 'Quantidade deve ser maior que zero' });
        return;
      }

      if (!usuario_id) {
        res.status(400).json({ success: false, message: 'ID do usuário é obrigatório' });
        return;
      }

      const saldoResult = await db.query(`
        SELECT * FROM contrato_produtos_modalidades WHERE id = $1
      `, [id]);

      if (saldoResult.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Saldo por modalidade não encontrado' });
        return;
      }

      const saldo = saldoResult.rows[0];

      if (quantidade > saldo.quantidade_disponivel) {
        res.status(400).json({ success: false, message: `Saldo insuficiente. Disponível: ${saldo.quantidade_disponivel}` });
        return;
      }

      const client = await db.pool.connect();

      try {
        await client.query('BEGIN');

        // Se data_consumo foi fornecida, usar ela, senão usar a data atual
        if (data_consumo) {
          await client.query(`
            INSERT INTO movimentacoes_consumo_modalidade 
            (contrato_produto_modalidade_id, quantidade, tipo_movimentacao, observacao, usuario_id, created_at)
            VALUES ($1, $2, 'CONSUMO', $3, $4, $5)
          `, [id, quantidade, observacao || 'Consumo registrado', usuario_id, data_consumo]);
        } else {
          await client.query(`
            INSERT INTO movimentacoes_consumo_modalidade 
            (contrato_produto_modalidade_id, quantidade, tipo_movimentacao, observacao, usuario_id)
            VALUES ($1, $2, 'CONSUMO', $3, $4)
          `, [id, quantidade, observacao || 'Consumo registrado', usuario_id]);
        }

        await client.query(`
          UPDATE contrato_produtos_modalidades 
          SET quantidade_consumida = quantidade_consumida + $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [quantidade, id]);

        await client.query('COMMIT');

        res.json({ success: true, message: 'Consumo registrado com sucesso' });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error: any) {
      console.error('Erro ao registrar consumo por modalidade:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  /**
   * Exclui um registro de consumo por modalidade
   */
  async excluirConsumoModalidade(req: Request, res: Response): Promise<void> {
    try {
      const { id, consumoId } = req.params;

      // Buscar o consumo para obter a quantidade
      const consumoResult = await db.query(`
        SELECT * FROM movimentacoes_consumo_modalidade 
        WHERE id = $1 AND contrato_produto_modalidade_id = $2
      `, [consumoId, id]);

      if (consumoResult.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Registro de consumo não encontrado' });
        return;
      }

      const consumo = consumoResult.rows[0];
      const client = await db.pool.connect();

      try {
        await client.query('BEGIN');

        // Excluir o registro de consumo
        await client.query(`
          DELETE FROM movimentacoes_consumo_modalidade WHERE id = $1
        `, [consumoId]);

        // Atualizar a quantidade consumida no saldo
        await client.query(`
          UPDATE contrato_produtos_modalidades 
          SET quantidade_consumida = quantidade_consumida - $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [consumo.quantidade, id]);

        await client.query('COMMIT');

        res.json({ success: true, message: 'Consumo excluído com sucesso' });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error: any) {
      console.error('Erro ao excluir consumo por modalidade:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }

  /**
   * Busca histórico de consumos por modalidade
   */
  async buscarHistoricoConsumoModalidade(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const query = `
        SELECT 
          mcm.id, mcm.quantidade, mcm.tipo_movimentacao, mcm.observacao,
          mcm.created_at as data_consumo,
          u.nome as responsavel_nome
        FROM movimentacoes_consumo_modalidade mcm
        LEFT JOIN usuarios u ON mcm.usuario_id = u.id
        WHERE mcm.contrato_produto_modalidade_id = $1
        ORDER BY mcm.created_at DESC
      `;

      const result = await db.query(query, [id]);
      res.json({ success: true, data: result.rows });

    } catch (error: any) {
      console.error('Erro ao buscar histórico de consumo por modalidade:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
    }
  }
}

export const listarSaldosModalidades = new SaldoContratosModalidadesController().listarSaldosModalidades;
export const listarModalidades = new SaldoContratosModalidadesController().listarModalidades;
export const listarProdutosContratos = new SaldoContratosModalidadesController().listarProdutosContratos;
export const cadastrarSaldoModalidade = new SaldoContratosModalidadesController().cadastrarSaldoModalidade;
export const registrarConsumoModalidade = new SaldoContratosModalidadesController().registrarConsumoModalidade;
export const buscarHistoricoConsumoModalidade = new SaldoContratosModalidadesController().buscarHistoricoConsumoModalidade;
export const excluirConsumoModalidade = new SaldoContratosModalidadesController().excluirConsumoModalidade;
