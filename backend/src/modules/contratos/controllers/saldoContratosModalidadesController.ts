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

      // Primeiro, buscar os produtos paginados (produtos únicos por nome)
      let produtosQuery = `
        SELECT DISTINCT p.nome as produto_nome, 
               array_agg(DISTINCT cp.id) as contrato_produto_ids
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

      produtosQuery += ` GROUP BY p.nome`;
      produtosQuery += ` ORDER BY p.nome`;
      produtosQuery += ` LIMIT $${produtosParamIndex} OFFSET $${produtosParamIndex + 1}`;
      produtosParams.push(parseInt(limit as string), offset);

      const produtosPaginados = await db.query(produtosQuery, produtosParams);
      const produtoIds = produtosPaginados.rows.flatMap((r: any) => r.contrato_produto_ids);

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
          cp.id as contrato_produto_id,
          p.nome as produto_nome,
          cp.unidade,
          c.numero as contrato_numero,
          c.id as contrato_id,
          f.nome as fornecedor_nome,
          f.id as fornecedor_id,
          cp.preco_unitario,
          cp.quantidade_contratada,
          m.id as modalidade_id,
          m.nome as modalidade_nome,
          COALESCE(cpm.quantidade_inicial, 0) as quantidade_inicial,
          COALESCE(cpm.quantidade_consumida, 0) as quantidade_consumida,
          COALESCE(cpm.quantidade_disponivel, 0) as quantidade_disponivel,
          COALESCE(cpm.ativo, false) as modalidade_ativa,
          cpm.id as saldo_id,
          (COALESCE(cpm.quantidade_disponivel, 0) * cp.preco_unitario) as valor_disponivel
        FROM contrato_produtos cp
        JOIN contratos c ON cp.contrato_id = c.id
        JOIN produtos p ON cp.produto_id = p.id
        JOIN fornecedores f ON c.fornecedor_id = f.id
        CROSS JOIN modalidades m
        LEFT JOIN contrato_produtos_modalidades cpm ON (
          cpm.contrato_produto_id = cp.id AND cpm.modalidade_id = m.id
        )
        WHERE cp.id = ANY($1)
          AND cp.ativo = true
          AND c.ativo = true
          AND m.ativo = true
      `;

      const queryParams: any[] = [produtoIds];
      let paramIndex = 2;

      if (modalidade_id) {
        query += ` AND m.id = $${paramIndex}`;
        queryParams.push(parseInt(modalidade_id as string));
        paramIndex++;
      }

      if (status) {
        if (status === 'disponivel') {
          query += ` AND COALESCE(cpm.quantidade_disponivel, 0) > 0`;
        } else if (status === 'esgotado') {
          query += ` AND COALESCE(cpm.quantidade_disponivel, 0) = 0`;
        } else if (status === 'baixo_estoque') {
          query += ` AND COALESCE(cpm.quantidade_disponivel, 0) > 0 AND COALESCE(cpm.quantidade_disponivel, 0) <= 10`;
        }
      }

      query += ` ORDER BY p.nome, m.nome`;

      const result = await db.query(query, queryParams);

      // Contar total de produtos únicos para paginação
      let countQuery = `
        SELECT COUNT(DISTINCT p.nome) as total
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

      // Calcular estatísticas
      const estatisticas = {
        total_itens: result.rows.length,
        itens_disponiveis: result.rows.filter((r: any) => r.quantidade_disponivel > 0).length,
        itens_baixo_estoque: result.rows.filter((r: any) => r.quantidade_disponivel > 0 && r.quantidade_disponivel <= 10).length,
        itens_esgotados: result.rows.filter((r: any) => r.quantidade_disponivel === 0).length,
        quantidade_inicial_total: result.rows.reduce((sum: number, r: any) => sum + parseFloat(r.quantidade_inicial || 0), 0),
        quantidade_consumida_total: result.rows.reduce((sum: number, r: any) => sum + parseFloat(r.quantidade_consumida || 0), 0),
        quantidade_disponivel_total: result.rows.reduce((sum: number, r: any) => sum + parseFloat(r.quantidade_disponivel || 0), 0),
        valor_total_disponivel: result.rows.reduce((sum: number, r: any) => sum + parseFloat(r.valor_disponivel || 0), 0)
      };

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string))
        },
        estatisticas
      });

    } catch (error) {
      console.error('❌ Erro ao listar saldos de modalidades:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Cadastra ou atualiza saldo por modalidade
   * POST /api/saldo-contratos-modalidades
   */
  async cadastrarSaldoModalidade(req: Request, res: Response): Promise<void> {
    try {
      const { contrato_produto_id, modalidade_id, quantidade_inicial } = req.body;

      // Verificar se já existe um registro
      const existingResult = await db.query(`
        SELECT id FROM contrato_produtos_modalidades 
        WHERE contrato_produto_id = $1 AND modalidade_id = $2
      `, [contrato_produto_id, modalidade_id]);

      if (existingResult.rows.length > 0) {
        // Atualizar registro existente
        const updateResult = await db.query(`
          UPDATE contrato_produtos_modalidades 
          SET quantidade_inicial = $1,
              quantidade_disponivel = $1 - quantidade_consumida,
              ativo = true,
              updated_at = CURRENT_TIMESTAMP
          WHERE contrato_produto_id = $2 AND modalidade_id = $3
          RETURNING *
        `, [quantidade_inicial, contrato_produto_id, modalidade_id]);

        res.json({
          success: true,
          message: 'Saldo atualizado com sucesso',
          data: updateResult.rows[0]
        });
      } else {
        // Criar novo registro
        const insertResult = await db.query(`
          INSERT INTO contrato_produtos_modalidades 
          (contrato_produto_id, modalidade_id, quantidade_inicial, quantidade_consumida, ativo, created_at)
          VALUES ($1, $2, $3, 0, true, CURRENT_TIMESTAMP)
          RETURNING *
        `, [contrato_produto_id, modalidade_id, quantidade_inicial]);

        res.json({
          success: true,
          message: 'Saldo cadastrado com sucesso',
          data: insertResult.rows[0]
        });
      }

    } catch (error) {
      console.error('❌ Erro ao cadastrar saldo por modalidade:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Lista modalidades disponíveis
   * GET /api/saldo-contratos-modalidades/modalidades
   */
  async listarModalidades(req: Request, res: Response): Promise<void> {
    try {
      const result = await db.query(`
        SELECT id, nome, codigo_financeiro, valor_repasse, ativo
        FROM modalidades 
        WHERE ativo = true
        ORDER BY nome
      `);

      res.json({
        success: true,
        data: result.rows
      });

    } catch (error) {
      console.error('❌ Erro ao listar modalidades:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Lista produtos de contratos disponíveis
   * GET /api/saldo-contratos-modalidades/produtos-contratos
   */
  async listarProdutosContratos(req: Request, res: Response): Promise<void> {
    try {
      const result = await db.query(`
        SELECT 
          cp.id,
          cp.contrato_id,
          cp.produto_id,
          cp.preco_unitario,
          cp.quantidade_contratada,
          c.numero as contrato_numero,
          c.data_inicio,
          c.data_fim,
          p.nome as produto_nome,
          cp.unidade,
          f.nome as fornecedor_nome
        FROM contrato_produtos cp
        JOIN contratos c ON cp.contrato_id = c.id
        JOIN produtos p ON cp.produto_id = p.id
        JOIN fornecedores f ON c.fornecedor_id = f.id
        WHERE cp.ativo = true AND c.ativo = true
        ORDER BY c.numero, p.nome
      `);

      res.json({
        success: true,
        data: result.rows
      });

    } catch (error) {
      console.error('❌ Erro ao listar produtos de contratos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Lista resumo de alunos por modalidade
   * GET /api/saldo-contratos-modalidades/resumo-alunos
   */
  async listarResumoAlunos(req: Request, res: Response): Promise<void> {
    try {
      const result = await db.query(`
        SELECT 
          m.id as modalidade_id,
          m.nome as modalidade_nome,
          m.codigo_financeiro,
          COALESCE(SUM(em.quantidade_alunos), 0) as total_alunos,
          COUNT(em.id) as total_escolas,
          m.ativo
        FROM modalidades m
        LEFT JOIN escola_modalidades em ON m.id = em.modalidade_id
        WHERE m.ativo = true
        GROUP BY m.id, m.nome, m.codigo_financeiro, m.ativo
        ORDER BY m.nome
      `);

      res.json({
        success: true,
        data: result.rows
      });

    } catch (error) {
      console.error('❌ Erro ao listar resumo de alunos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Registra consumo de uma modalidade
   * POST /api/saldo-contratos-modalidades/:id/consumir
   */
  async registrarConsumoModalidade(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { quantidade, observacao, data_consumo, usuario_id } = req.body;

      // Validar quantidade
      if (!quantidade || quantidade <= 0) {
        res.status(400).json({
          success: false,
          message: 'Quantidade inválida'
        });
        return;
      }

      // Buscar o saldo atual
      const saldoResult = await db.query(`
        SELECT 
          id,
          contrato_produto_id,
          modalidade_id,
          quantidade_inicial,
          quantidade_consumida,
          quantidade_disponivel
        FROM contrato_produtos_modalidades
        WHERE id = $1
      `, [id]);

      if (saldoResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Saldo de modalidade não encontrado'
        });
        return;
      }

      const saldo = saldoResult.rows[0];

      // Verificar se há quantidade disponível
      if (parseFloat(saldo.quantidade_disponivel) < quantidade) {
        res.status(400).json({
          success: false,
          message: `Quantidade insuficiente. Disponível: ${saldo.quantidade_disponivel}`
        });
        return;
      }

      // Atualizar o saldo (quantidade_disponivel é uma coluna gerada automaticamente)
      const novaQuantidadeConsumida = parseFloat(saldo.quantidade_consumida) + quantidade;

      await db.query(`
        UPDATE contrato_produtos_modalidades
        SET quantidade_consumida = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [novaQuantidadeConsumida, id]);

      // Buscar o registro atualizado para retornar os valores corretos
      const saldoAtualizadoResult = await db.query(`
        SELECT quantidade_consumida, quantidade_disponivel
        FROM contrato_produtos_modalidades
        WHERE id = $1
      `, [id]);

      const saldoAtualizado = saldoAtualizadoResult.rows[0];

      // Registrar no histórico
      try {
        // Criar tabela de histórico se não existir
        await db.query(`
          CREATE TABLE IF NOT EXISTS contrato_produtos_modalidades_historico (
            id SERIAL PRIMARY KEY,
            contrato_produto_modalidade_id INTEGER NOT NULL REFERENCES contrato_produtos_modalidades(id) ON DELETE CASCADE,
            quantidade DECIMAL(10,2) NOT NULL,
            data_consumo DATE NOT NULL,
            observacao TEXT,
            usuario_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Inserir registro no histórico
        await db.query(`
          INSERT INTO contrato_produtos_modalidades_historico 
          (contrato_produto_modalidade_id, quantidade, data_consumo, observacao, usuario_id)
          VALUES ($1, $2, $3, $4, $5)
        `, [id, quantidade, data_consumo || new Date().toISOString().split('T')[0], observacao, usuario_id]);
      } catch (histError) {
        console.error('⚠️ Erro ao registrar histórico (não crítico):', histError);
      }

      res.json({
        success: true,
        message: 'Consumo registrado com sucesso',
        data: {
          id: saldo.id,
          quantidade_consumida: saldoAtualizado.quantidade_consumida,
          quantidade_disponivel: saldoAtualizado.quantidade_disponivel
        }
      });

    } catch (error) {
      console.error('❌ Erro ao registrar consumo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Busca histórico de consumos de uma modalidade
   * GET /api/saldo-contratos-modalidades/:id/historico
   */
  async buscarHistoricoConsumoModalidade(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Buscar informações da modalidade
      const saldoResult = await db.query(`
        SELECT 
          cpm.id,
          cpm.contrato_produto_id,
          cpm.modalidade_id,
          p.nome as produto_nome,
          cp.unidade,
          m.nome as modalidade_nome,
          c.numero as contrato_numero
        FROM contrato_produtos_modalidades cpm
        JOIN contrato_produtos cp ON cpm.contrato_produto_id = cp.id
        JOIN produtos p ON cp.produto_id = p.id
        JOIN contratos c ON cp.contrato_id = c.id
        JOIN modalidades m ON cpm.modalidade_id = m.id
        WHERE cpm.id = $1
      `, [id]);

      if (saldoResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Saldo de modalidade não encontrado'
        });
        return;
      }

      // Buscar histórico de consumos
      const historicoResult = await db.query(`
        SELECT 
          id,
          quantidade,
          data_consumo,
          observacao,
          usuario_id,
          created_at
        FROM contrato_produtos_modalidades_historico
        WHERE contrato_produto_modalidade_id = $1
        ORDER BY data_consumo DESC, created_at DESC
      `, [id]);

      res.json({
        success: true,
        data: {
          modalidade: saldoResult.rows[0],
          historico: historicoResult.rows
        }
      });

    } catch (error) {
      console.error('❌ Erro ao buscar histórico:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Exclui um registro de consumo do histórico
   * DELETE /api/saldo-contratos-modalidades/:id/consumo/:consumoId
   */
  async excluirConsumoModalidade(req: Request, res: Response): Promise<void> {
    try {
      const { id, consumoId } = req.params;

      // Buscar o consumo para obter a quantidade
      const consumoResult = await db.query(`
        SELECT 
          id,
          contrato_produto_modalidade_id,
          quantidade
        FROM contrato_produtos_modalidades_historico
        WHERE id = $1 AND contrato_produto_modalidade_id = $2
      `, [consumoId, id]);

      if (consumoResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Registro de consumo não encontrado'
        });
        return;
      }

      const consumo = consumoResult.rows[0];

      // Reverter a quantidade consumida no saldo
      await db.query(`
        UPDATE contrato_produtos_modalidades
        SET quantidade_consumida = quantidade_consumida - $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [consumo.quantidade, id]);

      // Excluir o registro do histórico
      await db.query(`
        DELETE FROM contrato_produtos_modalidades_historico
        WHERE id = $1
      `, [consumoId]);

      res.json({
        success: true,
        message: 'Consumo excluído com sucesso'
      });

    } catch (error) {
      console.error('❌ Erro ao excluir consumo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
}

export const saldoContratosModalidadesController = new SaldoContratosModalidadesController();

// Exportar métodos individuais para compatibilidade com rotas
export const listarSaldosModalidades = saldoContratosModalidadesController.listarSaldosModalidades.bind(saldoContratosModalidadesController);
export const cadastrarSaldoModalidade = saldoContratosModalidadesController.cadastrarSaldoModalidade.bind(saldoContratosModalidadesController);
export const listarModalidades = saldoContratosModalidadesController.listarModalidades.bind(saldoContratosModalidadesController);
export const listarProdutosContratos = saldoContratosModalidadesController.listarProdutosContratos.bind(saldoContratosModalidadesController);
export const listarResumoAlunos = saldoContratosModalidadesController.listarResumoAlunos.bind(saldoContratosModalidadesController);
export const registrarConsumoModalidade = saldoContratosModalidadesController.registrarConsumoModalidade.bind(saldoContratosModalidadesController);
export const buscarHistoricoConsumoModalidade = saldoContratosModalidadesController.buscarHistoricoConsumoModalidade.bind(saldoContratosModalidadesController);
export const excluirConsumoModalidade = saldoContratosModalidadesController.excluirConsumoModalidade.bind(saldoContratosModalidadesController);

export default saldoContratosModalidadesController;