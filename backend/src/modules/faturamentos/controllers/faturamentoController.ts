import { Request, Response } from 'express';
import db from '../../../database';

interface ItemFaturamento {
  pedido_item_id: number;
  modalidade_id: number;
  quantidade_alocada: number;
  preco_unitario: number;
}

interface FaturamentoInput {
  pedido_id: number;
  observacoes?: string;
  itens: ItemFaturamento[];
}

// Criar faturamento
// IMPORTANTE: Esta função NÃO altera o status do pedido
// O status só deve ser alterado pelo módulo de recebimentos quando os itens forem recebidos
export async function criarFaturamento(req: Request, res: Response) {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');

    const { pedido_id, observacoes, itens }: FaturamentoInput = req.body;
    const usuarioId = req.user?.id || 1;

    // Validações
    if (!pedido_id) {
      return res.status(400).json({
        success: false,
        message: 'Pedido é obrigatório'
      });
    }

    // Permitir criar faturamento vazio (sem itens)
    if (!itens) {
      return res.status(400).json({
        success: false,
        message: 'Array de itens é obrigatório (pode ser vazio)'
      });
    }

    // Verificar se pedido existe e capturar status inicial
    const pedidoCheck = await client.query(
      'SELECT id, status FROM pedidos WHERE id = $1',
      [pedido_id]
    );

    if (pedidoCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }

    const statusInicial = pedidoCheck.rows[0].status;

    // Validar quantidades alocadas não excedem quantidade do pedido
    for (const item of itens) {
      const itemCheck = await client.query(`
        SELECT 
          pi.quantidade,
          COALESCE(SUM(fi.quantidade_alocada), 0) as ja_alocado
        FROM pedido_itens pi
        LEFT JOIN faturamentos_itens fi ON pi.id = fi.pedido_item_id
        WHERE pi.id = $1 AND pi.pedido_id = $2
        GROUP BY pi.id, pi.quantidade
      `, [item.pedido_item_id, pedido_id]);

      if (itemCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: `Item ${item.pedido_item_id} não encontrado no pedido`
        });
      }

      const { quantidade, ja_alocado } = itemCheck.rows[0];
      const disponivel = parseFloat(quantidade) - parseFloat(ja_alocado);

      if (parseFloat(item.quantidade_alocada.toString()) > disponivel) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Item ${item.pedido_item_id}: quantidade alocada (${item.quantidade_alocada}) excede disponível (${disponivel})`
        });
      }
    }

    // Criar faturamento (cabeçalho)
    const faturamentoResult = await client.query(`
      INSERT INTO faturamentos_pedidos (pedido_id, usuario_id, observacoes)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [pedido_id, usuarioId, observacoes]);

    const faturamentoId = faturamentoResult.rows[0].id;

    // Inserir itens do faturamento (se houver)
    const itensInseridos = [];
    if (itens.length > 0) {
      for (const item of itens) {
        const itemResult = await client.query(`
          INSERT INTO faturamentos_itens (
            faturamento_pedido_id,
            pedido_item_id,
            modalidade_id,
            quantidade_alocada,
            preco_unitario
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `, [
          faturamentoId,
          item.pedido_item_id,
          item.modalidade_id,
          item.quantidade_alocada,
          item.preco_unitario
        ]);

        itensInseridos.push(itemResult.rows[0]);
      }
    }

    await client.query('COMMIT');

    // Verificação de segurança: garantir que o status do pedido não foi alterado
    // O status só deve mudar quando houver recebimento, não ao criar faturamento
    const pedidoFinalCheck = await client.query(
      'SELECT status FROM pedidos WHERE id = $1',
      [pedido_id]
    );
    
    if (pedidoFinalCheck.rows[0].status !== statusInicial) {
      console.warn(`⚠️  AVISO: Status do pedido ${pedido_id} foi alterado durante criação de faturamento!`);
      console.warn(`   Status anterior: ${statusInicial}`);
      console.warn(`   Status atual: ${pedidoFinalCheck.rows[0].status}`);
    }

    res.status(201).json({
      success: true,
      message: 'Faturamento criado com sucesso',
      data: {
        faturamento: faturamentoResult.rows[0],
        itens: itensInseridos
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao criar faturamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar faturamento',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  } finally {
    client.release();
  }
}

// Listar faturamentos de um pedido
export async function listarFaturamentosPedido(req: Request, res: Response) {
  try {
    const { pedidoId } = req.params;

    const faturamentos = await db.query(`
      SELECT * FROM vw_faturamentos_detalhados
      WHERE pedido_id = $1
      ORDER BY data_faturamento DESC, modalidade_nome, produto_nome
    `, [pedidoId]);

    res.json({
      success: true,
      data: faturamentos.rows
    });
  } catch (error) {
    console.error('❌ Erro ao listar faturamentos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar faturamentos',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Buscar resumo de faturamento por modalidades
export async function resumoFaturamentoPedido(req: Request, res: Response) {
  try {
    const { pedidoId } = req.params;

    const resumo = await db.query(`
      SELECT * FROM vw_faturamentos_resumo_modalidades
      WHERE pedido_id = $1
      ORDER BY modalidade_nome
    `, [pedidoId]);

    res.json({
      success: true,
      data: resumo.rows
    });
  } catch (error) {
    console.error('❌ Erro ao buscar resumo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar resumo de faturamento',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Buscar detalhes de um faturamento específico
export async function buscarFaturamento(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const faturamento = await db.query(`
      SELECT * FROM vw_faturamentos_detalhados
      WHERE faturamento_id = $1
      ORDER BY modalidade_nome, produto_nome
    `, [id]);

    if (faturamento.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Faturamento não encontrado'
      });
    }

    res.json({
      success: true,
      data: faturamento.rows
    });
  } catch (error) {
    console.error('❌ Erro ao buscar faturamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar faturamento',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Atualizar faturamento existente
export async function atualizarFaturamento(req: Request, res: Response) {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { observacoes, itens }: { observacoes?: string; itens: ItemFaturamento[] } = req.body;

    if (!itens) {
      return res.status(400).json({
        success: false,
        message: 'Array de itens é obrigatório (pode ser vazio)'
      });
    }

    const faturamentoCheck = await client.query(
      'SELECT pedido_id FROM faturamentos_pedidos WHERE id = $1',
      [id]
    );

    if (faturamentoCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Faturamento não encontrado'
      });
    }

    const pedido_id = faturamentoCheck.rows[0].pedido_id;

    // Validar quantidades (excluindo o faturamento atual)
    for (const item of itens) {
      const itemCheck = await client.query(`
        SELECT 
          pi.quantidade,
          COALESCE(SUM(CASE WHEN fp.id != $3 THEN fi.quantidade_alocada ELSE 0 END), 0) as ja_alocado
        FROM pedido_itens pi
        LEFT JOIN faturamentos_itens fi ON pi.id = fi.pedido_item_id
        LEFT JOIN faturamentos_pedidos fp ON fi.faturamento_pedido_id = fp.id
        WHERE pi.id = $1 AND pi.pedido_id = $2
        GROUP BY pi.id, pi.quantidade
      `, [item.pedido_item_id, pedido_id, id]);

      if (itemCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: `Item ${item.pedido_item_id} não encontrado no pedido`
        });
      }

      const { quantidade, ja_alocado } = itemCheck.rows[0];
      const disponivel = parseFloat(quantidade) - parseFloat(ja_alocado);

      if (parseFloat(item.quantidade_alocada.toString()) > disponivel) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Item ${item.pedido_item_id}: quantidade alocada (${item.quantidade_alocada}) excede disponível (${disponivel})`
        });
      }
    }

    await client.query(`
      UPDATE faturamentos_pedidos 
      SET observacoes = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [observacoes, id]);

    await client.query('DELETE FROM faturamentos_itens WHERE faturamento_pedido_id = $1', [id]);

    const itensInseridos = [];
    if (itens.length > 0) {
      for (const item of itens) {
        const itemResult = await client.query(`
          INSERT INTO faturamentos_itens (
            faturamento_pedido_id,
            pedido_item_id,
            modalidade_id,
            quantidade_alocada,
            preco_unitario
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `, [id, item.pedido_item_id, item.modalidade_id, item.quantidade_alocada, item.preco_unitario]);

        itensInseridos.push(itemResult.rows[0]);
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Faturamento atualizado com sucesso',
      data: { faturamento_id: id, itens: itensInseridos }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao atualizar faturamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar faturamento',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  } finally {
    client.release();
  }
}

// Deletar faturamento
export async function deletarFaturamento(req: Request, res: Response) {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Verificar se faturamento existe
    const faturamentoCheck = await client.query(
      'SELECT id FROM faturamentos_pedidos WHERE id = $1',
      [id]
    );

    if (faturamentoCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Faturamento não encontrado'
      });
    }

    // Deletar itens (cascade já faz isso, mas explicitamos para clareza)
    await client.query('DELETE FROM faturamentos_itens WHERE faturamento_pedido_id = $1', [id]);
    
    // Deletar faturamento
    await client.query('DELETE FROM faturamentos_pedidos WHERE id = $1', [id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Faturamento deletado com sucesso'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao deletar faturamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar faturamento',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  } finally {
    client.release();
  }
}

// Relatório: Resumo de faturamento por tipo de fornecedor e modalidade
export async function relatorioTipoFornecedorModalidade(req: Request, res: Response) {
  try {
    const { faturamentoId } = req.params;

    const resultado = await db.query(`
      SELECT * FROM vw_faturamento_tipo_fornecedor_modalidade
      WHERE faturamento_id = $1
      ORDER BY tipo_fornecedor, modalidade_nome
    `, [faturamentoId]);

    res.json({
      success: true,
      data: resultado.rows
    });
  } catch (error) {
    console.error('❌ Erro ao buscar relatório:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar relatório',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
