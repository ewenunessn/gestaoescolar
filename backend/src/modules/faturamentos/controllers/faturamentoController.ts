import { Request, Response } from 'express';
import db from '../../../database';
import { obterPeriodoContexto } from '../../../utils/periodoUsuarioHelper';
import {
  ContratoSaldoError,
  estornarConsumoSaldoFaturamentoItem,
  registrarConsumoSaldoFaturamentoItem,
} from '../../contratos/services/contratoSaldoService';
import {
  calcularAlocacaoAutomatica,
  ensureAlocacaoAgriculturaSchema,
  obterConfiguracaoAlocacaoAgricultura,
  salvarConfiguracaoAlocacaoAgricultura,
} from '../services/alocacaoAgriculturaService';

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
  alocacao_agricultura_snapshot?: any;
}

async function atualizarStatusFaturamentoPorItens(client: any, faturamentoId: number) {
  const result = await client.query(`
    SELECT
      COUNT(*)::int as total_itens,
      COUNT(*) FILTER (WHERE consumo_registrado = true)::int as itens_consumidos
    FROM faturamentos_itens
    WHERE faturamento_pedido_id = $1
  `, [faturamentoId]);

  const totalItens = Number(result.rows[0]?.total_itens || 0);
  const itensConsumidos = Number(result.rows[0]?.itens_consumidos || 0);
  const status = totalItens > 0 && totalItens === itensConsumidos ? 'consumido' : 'gerado';

  await client.query(
    'UPDATE faturamentos_pedidos SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [status, faturamentoId]
  );

  return status;
}

async function obterPeriodoSelecionado(req: Request) {
  return obterPeriodoContexto(req.user?.id);
}

async function buscarPedidoPeriodo(client: any, pedidoId: number) {
  const result = await client.query(`
    SELECT p.id, p.status, p.periodo_id, per.fechado
    FROM pedidos p
    LEFT JOIN periodos per ON per.id = p.periodo_id
    WHERE p.id = $1
  `, [pedidoId]);
  return result.rows[0] ?? null;
}

async function validarFaturamentoEditavel(client: any, faturamentoId: number) {
  const result = await client.query(`
    SELECT fp.id, fp.pedido_id, p.periodo_id, per.fechado
    FROM faturamentos_pedidos fp
    JOIN pedidos p ON p.id = fp.pedido_id
    LEFT JOIN periodos per ON per.id = p.periodo_id
    WHERE fp.id = $1
  `, [faturamentoId]);

  const faturamento = result.rows[0];
  if (!faturamento) {
    return { faturamento: null, error: 'Faturamento nao encontrado' };
  }
  if (faturamento.fechado) {
    return { faturamento, error: 'Nao e possivel alterar faturamento de periodo fechado' };
  }
  return { faturamento, error: null };
}

async function estornarItensConsumidosFaturamento(client: any, faturamentoId: number) {
  const result = await client.query(`
    SELECT id
    FROM faturamentos_itens
    WHERE faturamento_pedido_id = $1
      AND COALESCE(consumo_registrado, false) = true
    ORDER BY id
  `, [faturamentoId]);

  for (const item of result.rows) {
    await estornarConsumoSaldoFaturamentoItem(client, {
      faturamentoId,
      itemId: Number(item.id),
    });
  }
}

async function estornarItensConsumidosModalidade(client: any, faturamentoId: number, contratoId: number, modalidadeId: number) {
  const result = await client.query(`
    SELECT fi.id
    FROM faturamentos_itens fi
    JOIN pedido_itens pi ON pi.id = fi.pedido_item_id
    JOIN contrato_produtos cp ON cp.id = pi.contrato_produto_id
    WHERE fi.faturamento_pedido_id = $1
      AND cp.contrato_id = $2
      AND fi.modalidade_id = $3
      AND COALESCE(fi.consumo_registrado, false) = true
    ORDER BY fi.id
  `, [faturamentoId, contratoId, modalidadeId]);

  for (const item of result.rows) {
    await estornarConsumoSaldoFaturamentoItem(client, {
      faturamentoId,
      itemId: Number(item.id),
    });
  }
}

const detalhesFaturamentoQuery = `
  SELECT
    fp.id as faturamento_id,
    fp.id as id,
    fp.pedido_id,
    p.numero as pedido_numero,
    p.data_pedido,
    p.competencia_mes_ano,
    fp.data_faturamento,
    fp.observacoes as faturamento_observacoes,
    fp.observacoes,
    fp.status,
    fp.usuario_id,
    fp.created_at,
    fp.updated_at,
    u.nome as usuario_nome,
    fi.id as item_id,
    fi.pedido_item_id,
    fi.modalidade_id,
    m.nome as modalidade_nome,
    categorias_financeiras.ids[1] as categoria_financeira_id,
    categorias_financeiras.nomes as categoria_financeira_nome,
    categorias_financeiras.codigos as modalidade_codigo_financeiro,
    COALESCE(categorias_financeiras.valor_repasse, 0) as modalidade_repasse,
    fi.quantidade_alocada,
    fi.preco_unitario,
    COALESCE(fi.valor_total, fi.quantidade_alocada * fi.preco_unitario) as valor_total,
    fi.consumo_registrado,
    fi.data_consumo,
    prod.id as produto_id,
    prod.nome as produto_nome,
    COALESCE(um.codigo, prod.unidade_distribuicao, 'UN') as unidade,
    pi.quantidade as quantidade_pedido,
    cp.contrato_id,
    c.numero as contrato_numero,
    f.id as fornecedor_id,
    f.nome as fornecedor_nome,
    f.cnpj as fornecedor_cnpj,
    COALESCE(f.tipo_fornecedor, 'empresa') as fornecedor_tipo
  FROM faturamentos_pedidos fp
  JOIN pedidos p ON fp.pedido_id = p.id
  LEFT JOIN usuarios u ON fp.usuario_id = u.id
  LEFT JOIN faturamentos_itens fi ON fp.id = fi.faturamento_pedido_id
  LEFT JOIN modalidades m ON fi.modalidade_id = m.id
  LEFT JOIN LATERAL (
    SELECT
      ARRAY_AGG(cfmv.id ORDER BY cfmv.nome) as ids,
      STRING_AGG(cfmv.nome, ', ' ORDER BY cfmv.nome) as nomes,
      STRING_AGG(cfmv.codigo_financeiro, ', ' ORDER BY cfmv.nome) FILTER (WHERE cfmv.codigo_financeiro IS NOT NULL) as codigos,
      SUM(COALESCE(cfmv.valor_repasse, 0)) as valor_repasse
    FROM modalidade_categorias_financeiras mcf
    JOIN categorias_financeiras_modalidade cfmv ON cfmv.id = mcf.categoria_financeira_id
    WHERE mcf.modalidade_id = m.id
      AND mcf.ativo = true
      AND cfmv.ativo = true
  ) categorias_financeiras ON true
  LEFT JOIN pedido_itens pi ON fi.pedido_item_id = pi.id
  LEFT JOIN contrato_produtos cp ON pi.contrato_produto_id = cp.id
  LEFT JOIN produtos prod ON cp.produto_id = prod.id
  LEFT JOIN unidades_medida um ON prod.unidade_medida_id = um.id
  LEFT JOIN contratos c ON cp.contrato_id = c.id
  LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
`;

async function buscarModalidadesParaAlocacao(client: any, modalidadeIds?: number[]) {
  const params: any[] = [];
  let filtro = '';

  if (modalidadeIds && modalidadeIds.length > 0) {
    params.push(modalidadeIds);
    filtro = 'AND m.id = ANY($1::int[])';
  }

  const result = await client.query(`
    SELECT
      m.id,
      m.nome,
      COALESCE(categorias_financeiras.valor_repasse, 0) as valor_repasse,
      categorias_financeiras.codigos as codigo_financeiro
    FROM modalidades m
    LEFT JOIN LATERAL (
      SELECT
        SUM(COALESCE(cfmv.valor_repasse, 0)) as valor_repasse,
        STRING_AGG(cfmv.codigo_financeiro, ', ' ORDER BY cfmv.nome) FILTER (WHERE cfmv.codigo_financeiro IS NOT NULL) as codigos
      FROM modalidade_categorias_financeiras mcf
      JOIN categorias_financeiras_modalidade cfmv ON cfmv.id = mcf.categoria_financeira_id
      WHERE mcf.modalidade_id = m.id
        AND mcf.ativo = true
        AND cfmv.ativo = true
    ) categorias_financeiras ON true
    WHERE m.ativo = true
      ${filtro}
    ORDER BY m.nome
  `, params);

  return result.rows.map((row: any) => ({
    id: Number(row.id),
    nome: row.nome,
    valor_repasse: Number(row.valor_repasse || 0),
    codigo_financeiro: row.codigo_financeiro,
  }));
}

async function resolverModalidadesBaseAlocacao(client: any, modalidadeBaseIds: number[]) {
  const modalidades = await buscarModalidadesParaAlocacao(client);

  if (modalidadeBaseIds.length > 0) {
    const ids = new Set(modalidadeBaseIds.map(Number));
    return modalidades.filter((modalidade: any) => ids.has(Number(modalidade.id)));
  }

  const porCodigoFnde = modalidades.filter((modalidade: any) =>
    String(modalidade.codigo_financeiro || modalidade.nome || '').toUpperCase().includes('FNDE')
  );
  if (porCodigoFnde.length > 0) return porCodigoFnde;

  const maior = modalidades.reduce((maior: any | null, modalidade: any) => {
    if (!maior || Number(modalidade.valor_repasse || 0) > Number(maior.valor_repasse || 0)) return modalidade;
    return maior;
  }, null);

  return maior ? [maior] : [];
}

export async function obterConfiguracaoAlocacaoAutomatica(req: Request, res: Response) {
  try {
    const config = await obterConfiguracaoAlocacaoAgricultura();
    const modalidades = await buscarModalidadesParaAlocacao(db);
    const modalidadesBase = await resolverModalidadesBaseAlocacao(db, config.modalidade_base_ids);

    res.json({
      success: true,
      data: {
        config,
        modalidades_base_resolvidas: modalidadesBase,
        modalidades,
      },
    });
  } catch (error) {
    console.error('Erro ao obter configuracao de alocacao automatica:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao obter configuracao de alocacao automatica',
    });
  }
}

export async function atualizarConfiguracaoAlocacaoAutomatica(req: Request, res: Response) {
  try {
    const config = await salvarConfiguracaoAlocacaoAgricultura(req.body || {});
    const modalidadesBase = await resolverModalidadesBaseAlocacao(db, config.modalidade_base_ids);

    res.json({
      success: true,
      data: {
        config,
        modalidades_base_resolvidas: modalidadesBase,
      },
    });
  } catch (error) {
    console.error('Erro ao atualizar configuracao de alocacao automatica:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao atualizar configuracao de alocacao automatica',
    });
  }
}

export async function previewAlocacaoAutomatica(req: Request, res: Response) {
  try {
    const {
      pedido_id,
      pedido_item_ids,
      modalidade_ids,
      faturamento_id,
      alocacoes_atuais = [],
    } = req.body || {};

    if (!pedido_id || !Array.isArray(pedido_item_ids) || pedido_item_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'pedido_id e pedido_item_ids sao obrigatorios' });
    }
    if (!Array.isArray(modalidade_ids) || modalidade_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'modalidade_ids e obrigatorio' });
    }

    await ensureAlocacaoAgriculturaSchema();

    const alocacoesAtuaisPorItem = new Map<number, number>();
    for (const alocacao of alocacoes_atuais) {
      const itemId = Number(alocacao?.pedido_item_id);
      if (!itemId) continue;
      alocacoesAtuaisPorItem.set(
        itemId,
        (alocacoesAtuaisPorItem.get(itemId) || 0) + Number(alocacao?.quantidade_alocada || 0)
      );
    }

    const itensResult = await db.query(`
      SELECT
        pi.id as pedido_item_id,
        pi.contrato_produto_id,
        prod.nome as produto_nome,
        COALESCE(um.codigo, prod.unidade_distribuicao, 'UN') as unidade,
        pi.quantidade as quantidade_pedido,
        pi.preco_unitario,
        COALESCE(f.tipo_fornecedor, 'empresa') as tipo_fornecedor,
        COALESCE(SUM(CASE
          WHEN fp.id IS NULL THEN 0
          WHEN $3::int IS NOT NULL AND fp.id = $3::int THEN 0
          ELSE fi.quantidade_alocada
        END), 0) as ja_alocado_db
      FROM pedido_itens pi
      JOIN contrato_produtos cp ON cp.id = pi.contrato_produto_id
      JOIN contratos c ON c.id = cp.contrato_id
      JOIN fornecedores f ON f.id = c.fornecedor_id
      JOIN produtos prod ON prod.id = cp.produto_id
      LEFT JOIN unidades_medida um ON um.id = prod.unidade_medida_id
      LEFT JOIN faturamentos_itens fi ON fi.pedido_item_id = pi.id
      LEFT JOIN faturamentos_pedidos fp ON fp.id = fi.faturamento_pedido_id
      WHERE pi.pedido_id = $1
        AND pi.id = ANY($2::int[])
      GROUP BY pi.id, pi.contrato_produto_id, prod.nome, um.codigo, prod.unidade_distribuicao, pi.quantidade, pi.preco_unitario, f.tipo_fornecedor
      ORDER BY prod.nome, pi.id
    `, [pedido_id, pedido_item_ids, faturamento_id ? Number(faturamento_id) : null]);

    const itens = itensResult.rows.map((row: any) => {
      const quantidadePedido = Number(row.quantidade_pedido || 0);
      const jaAlocadoDb = Number(row.ja_alocado_db || 0);
      const jaAlocadoAtual = alocacoesAtuaisPorItem.get(Number(row.pedido_item_id)) || 0;

      return {
        pedido_item_id: Number(row.pedido_item_id),
        contrato_produto_id: Number(row.contrato_produto_id),
        produto_nome: row.produto_nome,
        unidade: row.unidade || 'UN',
        quantidade_pedido: quantidadePedido,
        quantidade_disponivel: Math.max(quantidadePedido - jaAlocadoDb - jaAlocadoAtual, 0),
        preco_unitario: Number(row.preco_unitario || 0),
        tipo_fornecedor: row.tipo_fornecedor || 'empresa',
      };
    });

    const config = await obterConfiguracaoAlocacaoAgricultura();
    const modalidades = await buscarModalidadesParaAlocacao(db, modalidade_ids.map(Number));
    const modalidadesBase = await resolverModalidadesBaseAlocacao(db, config.modalidade_base_ids);
    const resultado = calcularAlocacaoAutomatica({
      config,
      modalidadesBase,
      modalidades,
      itens,
    });

    res.json({
      success: true,
      data: {
        ...resultado,
        snapshot: {
          regra: resultado.regra,
          modalidades_base: resultado.modalidades_base,
          resumo: resultado.resumo,
          gerado_em: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Erro ao calcular alocacao automatica:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao calcular alocacao automatica',
    });
  }
}

// Criar faturamento
// IMPORTANTE: Esta função NÃO altera o status do pedido
// O status só deve ser alterado pelo módulo de recebimentos quando os itens forem recebidos
export async function criarFaturamento(req: Request, res: Response) {
  const client = await db.pool.connect();
  
  try {
    const { pedido_id, observacoes, itens, alocacao_agricultura_snapshot }: FaturamentoInput = req.body;
    const usuarioId = req.user?.id;
    if (!usuarioId) return res.status(401).json({ success: false, message: 'Usuário não autenticado' });

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

    await client.query('BEGIN');
    await ensureAlocacaoAgriculturaSchema(client);

    // Verificar se pedido existe e capturar status inicial
    const pedido = await buscarPedidoPeriodo(client, pedido_id);

    if (!pedido) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }
    if (pedido.fechado) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Nao e possivel criar faturamento em periodo fechado'
      });
    }
    const periodoSelecionado = await obterPeriodoSelecionado(req);
    if (periodoSelecionado?.id && pedido.periodo_id && Number(periodoSelecionado.id) !== Number(pedido.periodo_id)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Pedido pertence a outro periodo'
      });
    }

    const statusInicial = pedido.status;

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
      INSERT INTO faturamentos_pedidos (pedido_id, usuario_id, observacoes, alocacao_agricultura_snapshot)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [pedido_id, usuarioId, observacoes, alocacao_agricultura_snapshot ? JSON.stringify(alocacao_agricultura_snapshot) : null]);

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
    const periodo = await obterPeriodoSelecionado(req);

    const faturamentos = await db.query(`
      ${detalhesFaturamentoQuery}
      WHERE fp.pedido_id = $1
        ${periodo?.id ? 'AND p.periodo_id = $2' : ''}
      ORDER BY data_faturamento DESC, modalidade_nome NULLS LAST, produto_nome NULLS LAST
    `, periodo?.id ? [pedidoId, periodo.id] : [pedidoId]);

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
    const periodo = await obterPeriodoSelecionado(req);

    const resumo = await db.query(`
      SELECT v.* FROM vw_faturamentos_resumo_modalidades v
      JOIN pedidos p ON p.id = v.pedido_id
      WHERE v.pedido_id = $1
        ${periodo?.id ? 'AND p.periodo_id = $2' : ''}
      ORDER BY modalidade_nome
    `, periodo?.id ? [pedidoId, periodo.id] : [pedidoId]);

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
      ${detalhesFaturamentoQuery}
      WHERE fp.id = $1
      ORDER BY modalidade_nome NULLS LAST, produto_nome NULLS LAST
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
    const { id } = req.params;
    const { observacoes, itens, alocacao_agricultura_snapshot }: { observacoes?: string; itens: ItemFaturamento[]; alocacao_agricultura_snapshot?: any } = req.body;

    if (!itens) {
      return res.status(400).json({
        success: false,
        message: 'Array de itens é obrigatório (pode ser vazio)'
      });
    }

    await client.query('BEGIN');
    await ensureAlocacaoAgriculturaSchema(client);

    const { faturamento, error: periodoError } = await validarFaturamentoEditavel(client, Number(id));

    if (!faturamento) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Faturamento não encontrado'
      });
    }
    if (periodoError) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: periodoError });
    }

    const pedido_id = faturamento.pedido_id;

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
      SET observacoes = $1,
          alocacao_agricultura_snapshot = COALESCE($3::jsonb, alocacao_agricultura_snapshot),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [observacoes, id, alocacao_agricultura_snapshot ? JSON.stringify(alocacao_agricultura_snapshot) : null]);

    await estornarItensConsumidosFaturamento(client, Number(id));
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
    const statusCode = error instanceof ContratoSaldoError ? error.statusCode : 500;
    res.status(statusCode).json({
      success: false,
      message: error instanceof ContratoSaldoError ? error.message : 'Erro ao atualizar faturamento',
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

    const { faturamento, error: periodoError } = await validarFaturamentoEditavel(client, Number(id));

    if (!faturamento) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Faturamento não encontrado'
      });
    }
    if (periodoError) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: periodoError });
    }

    // Deletar itens (cascade já faz isso, mas explicitamos para clareza)
    await estornarItensConsumidosFaturamento(client, Number(id));
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
    const statusCode = error instanceof ContratoSaldoError ? error.statusCode : 500;
    res.status(statusCode).json({
      success: false,
      message: error instanceof ContratoSaldoError ? error.message : 'Erro ao deletar faturamento',
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

export async function obterResumoFaturamento(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const faturamentoResult = await db.query(`
      SELECT
        fp.*,
        p.numero as pedido_numero,
        u.nome as usuario_nome,
        COALESCE(SUM(fi.valor_total), 0) as valor_total
      FROM faturamentos_pedidos fp
      JOIN pedidos p ON p.id = fp.pedido_id
      LEFT JOIN usuarios u ON u.id = fp.usuario_id
      LEFT JOIN faturamentos_itens fi ON fi.faturamento_pedido_id = fp.id
      WHERE fp.id = $1
      GROUP BY fp.id, p.numero, u.nome
    `, [id]);

    if (faturamentoResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Faturamento nao encontrado' });
    }

    const itensResult = await db.query(`
      SELECT
        fi.id as faturamento_item_id,
        fi.pedido_item_id,
        fi.modalidade_id,
        m.nome as modalidade_nome,
        categorias_financeiras.codigos as modalidade_codigo_financeiro,
        cp.contrato_id,
        c.numero as contrato_numero,
        f.id as fornecedor_id,
        f.nome as fornecedor_nome,
        f.cnpj as fornecedor_cnpj,
        prod.id as produto_id,
        prod.nome as produto_nome,
        COALESCE(um.codigo, prod.unidade_distribuicao, 'UN') as unidade,
        fi.quantidade_alocada as quantidade_total,
        fi.preco_unitario,
        COALESCE(fi.valor_total, fi.quantidade_alocada * fi.preco_unitario) as valor_total,
        fi.consumo_registrado,
        fi.data_consumo
      FROM faturamentos_itens fi
      JOIN modalidades m ON m.id = fi.modalidade_id
      LEFT JOIN LATERAL (
        SELECT
          STRING_AGG(cfmv.codigo_financeiro, ', ' ORDER BY cfmv.nome) FILTER (WHERE cfmv.codigo_financeiro IS NOT NULL) as codigos
        FROM modalidade_categorias_financeiras mcf
        JOIN categorias_financeiras_modalidade cfmv ON cfmv.id = mcf.categoria_financeira_id
        WHERE mcf.modalidade_id = m.id
          AND mcf.ativo = true
          AND cfmv.ativo = true
      ) categorias_financeiras ON true
      JOIN pedido_itens pi ON pi.id = fi.pedido_item_id
      JOIN contrato_produtos cp ON cp.id = pi.contrato_produto_id
      JOIN contratos c ON c.id = cp.contrato_id
      JOIN fornecedores f ON f.id = c.fornecedor_id
      JOIN produtos prod ON prod.id = cp.produto_id
      LEFT JOIN unidades_medida um ON um.id = prod.unidade_medida_id
      WHERE fi.faturamento_pedido_id = $1
      ORDER BY f.nome, c.numero, m.nome, prod.nome
    `, [id]);

    const contratosMap = new Map<number, any>();
    for (const item of itensResult.rows) {
      if (!contratosMap.has(item.contrato_id)) {
        contratosMap.set(item.contrato_id, {
          contrato_id: item.contrato_id,
          contrato_numero: item.contrato_numero,
          fornecedor_id: item.fornecedor_id,
          fornecedor_nome: item.fornecedor_nome,
          fornecedor_cnpj: item.fornecedor_cnpj,
          modalidades: [],
          quantidade_total: 0,
          valor_total: 0,
        });
      }

      const contrato = contratosMap.get(item.contrato_id);
      let modalidade = contrato.modalidades.find((m: any) => m.modalidade_id === item.modalidade_id);
      if (!modalidade) {
        modalidade = {
          modalidade_id: item.modalidade_id,
          modalidade_nome: item.modalidade_nome,
          modalidade_codigo_financeiro: item.modalidade_codigo_financeiro,
          itens: [],
          quantidade_total: 0,
          valor_total: 0,
        };
        contrato.modalidades.push(modalidade);
      }

      const quantidade = Number(item.quantidade_total || 0);
      const valor = Number(item.valor_total || 0);
      modalidade.itens.push({
        faturamento_item_id: item.faturamento_item_id,
        produto_id: item.produto_id,
        produto_nome: item.produto_nome,
        unidade: item.unidade,
        quantidade_total: quantidade,
        preco_unitario: Number(item.preco_unitario || 0),
        valor_total: valor,
        consumo_registrado: item.consumo_registrado,
        data_consumo: item.data_consumo,
      });
      modalidade.quantidade_total += quantidade;
      modalidade.valor_total += valor;
      contrato.quantidade_total += quantidade;
      contrato.valor_total += valor;
    }

    res.json({
      success: true,
      data: {
        faturamento: faturamentoResult.rows[0],
        contratos: Array.from(contratosMap.values()),
      },
    });
  } catch (error) {
    console.error('Erro ao obter resumo do faturamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter resumo do faturamento',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}

export async function atualizarStatusFaturamento(req: Request, res: Response) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { status } = req.body;

    if (!['gerado', 'consumido', 'cancelado'].includes(status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Status invalido' });
    }

    const { faturamento, error: periodoError } = await validarFaturamentoEditavel(client, Number(id));
    if (!faturamento) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Faturamento nao encontrado' });
    }
    if (periodoError) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: periodoError });
    }

    if (status === 'cancelado') {
      await estornarItensConsumidosFaturamento(client, Number(id));
    }

    const result = await client.query(
      'UPDATE faturamentos_pedidos SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Faturamento nao encontrado' });
    }

    await client.query('COMMIT');
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar status do faturamento:', error);
    const statusCode = error instanceof ContratoSaldoError ? error.statusCode : 500;
    res.status(statusCode).json({
      success: false,
      message: error instanceof ContratoSaldoError ? error.message : 'Erro ao atualizar status do faturamento'
    });
  } finally {
    client.release();
  }
}

export async function registrarConsumoFaturamento(req: Request, res: Response) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;

    const { faturamento, error: periodoError } = await validarFaturamentoEditavel(client, Number(id));
    if (!faturamento) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Faturamento nao encontrado' });
    }
    if (periodoError) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: periodoError });
    }

    const itensResult = await client.query(`
      SELECT id
      FROM faturamentos_itens
      WHERE faturamento_pedido_id = $1
        AND COALESCE(consumo_registrado, false) = false
      ORDER BY id
    `, [id]);

    for (const item of itensResult.rows) {
      await registrarConsumoSaldoFaturamentoItem(client, {
        faturamentoId: Number(id),
        itemId: Number(item.id),
        usuarioId: req.user?.id ?? null,
      });
    }

    const status = await atualizarStatusFaturamentoPorItens(client, Number(id));
    await client.query('COMMIT');

    res.json({ success: true, data: { status } });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao registrar consumo:', error);
    const statusCode = error instanceof ContratoSaldoError ? error.statusCode : 500;
    res.status(statusCode).json({ success: false, message: error instanceof Error ? error.message : 'Erro ao registrar consumo' });
  } finally {
    client.release();
  }
}

export async function registrarConsumoItem(req: Request, res: Response) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { id, itemId } = req.params;

    const { faturamento, error: periodoError } = await validarFaturamentoEditavel(client, Number(id));
    if (!faturamento) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Faturamento nao encontrado' });
    }
    if (periodoError) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: periodoError });
    }

    await registrarConsumoSaldoFaturamentoItem(client, {
      faturamentoId: Number(id),
      itemId: Number(itemId),
      usuarioId: req.user?.id ?? null,
    });

    const status = await atualizarStatusFaturamentoPorItens(client, Number(id));
    await client.query('COMMIT');

    res.json({ success: true, data: { status } });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao registrar consumo do item:', error);
    const statusCode = error instanceof ContratoSaldoError ? error.statusCode : 500;
    res.status(statusCode).json({ success: false, message: error instanceof Error ? error.message : 'Erro ao registrar consumo do item' });
  } finally {
    client.release();
  }
}

export async function reverterConsumoItem(req: Request, res: Response) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { id, itemId } = req.params;

    const { faturamento, error: periodoError } = await validarFaturamentoEditavel(client, Number(id));
    if (!faturamento) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Faturamento nao encontrado' });
    }
    if (periodoError) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: periodoError });
    }

    await estornarConsumoSaldoFaturamentoItem(client, {
      faturamentoId: Number(id),
      itemId: Number(itemId),
    });

    const status = await atualizarStatusFaturamentoPorItens(client, Number(id));
    await client.query('COMMIT');

    res.json({ success: true, data: { status } });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao reverter consumo do item:', error);
    const statusCode = error instanceof ContratoSaldoError ? error.statusCode : 500;
    res.status(statusCode).json({ success: false, message: error instanceof Error ? error.message : 'Erro ao reverter consumo do item' });
  } finally {
    client.release();
  }
}

export async function removerItensModalidade(req: Request, res: Response) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { contrato_id, modalidade_id } = req.body;

    const { faturamento, error: periodoError } = await validarFaturamentoEditavel(client, Number(id));
    if (!faturamento) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Faturamento nao encontrado' });
    }
    if (periodoError) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: periodoError });
    }

    if (!contrato_id || !modalidade_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'contrato_id e modalidade_id sao obrigatorios' });
    }

    await estornarItensConsumidosModalidade(client, Number(id), Number(contrato_id), Number(modalidade_id));

    const result = await client.query(`
      DELETE FROM faturamentos_itens fi
      USING pedido_itens pi, contrato_produtos cp
      WHERE fi.pedido_item_id = pi.id
        AND pi.contrato_produto_id = cp.id
        AND fi.faturamento_pedido_id = $1
        AND cp.contrato_id = $2
        AND fi.modalidade_id = $3
      RETURNING fi.id
    `, [id, contrato_id, modalidade_id]);

    const status = await atualizarStatusFaturamentoPorItens(client, Number(id));
    await client.query('COMMIT');

    res.json({ success: true, data: { removidos: result.rows.length, status } });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao remover itens da modalidade:', error);
    const statusCode = error instanceof ContratoSaldoError ? error.statusCode : 500;
    res.status(statusCode).json({
      success: false,
      message: error instanceof ContratoSaldoError ? error.message : 'Erro ao remover itens da modalidade'
    });
  } finally {
    client.release();
  }
}
