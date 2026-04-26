import { Request, Response } from 'express';
import db from '../../../database';
import { cacheService } from '../../../utils/cacheService';
import { obterPeriodoUsuario } from '../../../utils/periodoUsuarioHelper';

const query = db.query.bind(db);

// Listar cardápios
export async function listarCardapiosModalidade(req: Request, res: Response) {
  try {
    const { modalidade_id, mes, ano, ativo } = req.query;
    const cacheKey = `cardapios:list:${modalidade_id || 'all'}:${mes || 'all'}:${ano || 'all'}:${ativo || 'all'}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return res.json(cached);

    const userId = req.user?.id;
    const periodoId = await obterPeriodoUsuario(userId);

    let sql = `
      SELECT 
        cm.id,
        cm.nome,
        cm.mes,
        cm.ano,
        cm.ativo,
        cm.observacao,
        cm.nutricionista_id,
        cm.data_aprovacao_nutricionista,
        cm.observacoes_nutricionista,
        cm.created_at,
        cm.updated_at,
        cm.periodo_id,
        n.nome as nutricionista_nome,
        n.crn as nutricionista_crn,
        n.crn_regiao as nutricionista_crn_regiao,
        p.ano as periodo_ano,
        (
          SELECT COUNT(DISTINCT (crd2.dia, crd2.tipo_refeicao))
          FROM cardapio_refeicoes_dia crd2
          WHERE crd2.cardapio_modalidade_id = cm.id
        ) as total_refeicoes,
        COUNT(DISTINCT crd.dia) as total_dias,
        ARRAY_AGG(DISTINCT cjm.modalidade_id) FILTER (WHERE cjm.modalidade_id IS NOT NULL) as modalidades_ids,
        STRING_AGG(DISTINCT m.nome, ', ' ORDER BY m.nome) FILTER (WHERE m.nome IS NOT NULL) as modalidades_nomes
      FROM cardapios_modalidade cm
      LEFT JOIN nutricionistas n ON cm.nutricionista_id = n.id
      LEFT JOIN cardapio_refeicoes_dia crd ON cm.id = crd.cardapio_modalidade_id
      LEFT JOIN periodos p ON cm.periodo_id = p.id
      LEFT JOIN cardapio_modalidades cjm ON cm.id = cjm.cardapio_id
      LEFT JOIN modalidades m ON cjm.modalidade_id = m.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (periodoId) {
      sql += ` AND cm.periodo_id = $${paramCount++}`;
      params.push(periodoId);
    }

    if (modalidade_id) {
      sql += ` AND cjm.modalidade_id = $${paramCount++}`;
      params.push(modalidade_id);
    }

    if (mes) {
      sql += ` AND cm.mes = $${paramCount++}`;
      params.push(mes);
    }

    if (ano) {
      sql += ` AND cm.ano = $${paramCount++}`;
      params.push(ano);
    }

    if (ativo !== undefined) {
      sql += ` AND cm.ativo = $${paramCount++}`;
      params.push(ativo === 'true');
    }

    sql += ` GROUP BY cm.id, cm.nome, cm.mes, cm.ano, cm.ativo, cm.observacao, cm.nutricionista_id, cm.data_aprovacao_nutricionista, cm.observacoes_nutricionista, cm.created_at, cm.updated_at, cm.periodo_id, n.nome, n.crn, n.crn_regiao, p.ano`;
    sql += ` ORDER BY cm.ano DESC, cm.mes DESC, cm.nome`;

    const result = await query(sql, params);
    const response = { success: true, data: result.rows, total: result.rows.length };
    await cacheService.set(cacheKey, response, cacheService.TTL.list);
    res.json(response);
  } catch (error) {
    console.error('❌ Erro ao listar cardápios:', error);
    res.status(500).json({ message: 'Erro ao listar cardápios' });
  }
}

// Buscar cardápio por ID
export async function buscarCardapioModalidade(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const cached = await cacheService.get(`cardapios:${id}`);
    if (cached) return res.json(cached);

    const result = await query(`
      SELECT 
        cm.*,
        n.nome as nutricionista_nome,
        n.crn as nutricionista_crn,
        n.crn_regiao as nutricionista_crn_regiao,
        ARRAY_AGG(DISTINCT cjm.modalidade_id) FILTER (WHERE cjm.modalidade_id IS NOT NULL) as modalidades_ids,
        STRING_AGG(DISTINCT m.nome, ', ' ORDER BY m.nome) FILTER (WHERE m.nome IS NOT NULL) as modalidades_nomes
      FROM cardapios_modalidade cm
      LEFT JOIN nutricionistas n ON cm.nutricionista_id = n.id
      LEFT JOIN cardapio_modalidades cjm ON cm.id = cjm.cardapio_id
      LEFT JOIN modalidades m ON cjm.modalidade_id = m.id
      WHERE cm.id = $1
      GROUP BY cm.id, n.nome, n.crn, n.crn_regiao
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Cardápio não encontrado' });
    }

    const response = { success: true, data: result.rows[0] };
    await cacheService.set(`cardapios:${id}`, response, cacheService.TTL.single);
    res.json(response);
  } catch (error) {
    console.error('❌ Erro ao buscar cardápio:', error);
    res.status(500).json({ message: 'Erro ao buscar cardápio' });
  }
}

// Criar cardápio
export async function criarCardapioModalidade(req: Request, res: Response) {
  try {
    const { modalidades_ids, nome, mes, ano, observacao, ativo, nutricionista_id, data_aprovacao_nutricionista, observacoes_nutricionista } = req.body;

    if (!modalidades_ids || modalidades_ids.length === 0 || !nome || !mes || !ano) {
      return res.status(400).json({ message: 'Campos obrigatórios: modalidades_ids (array), nome, mes, ano' });
    }

    const result = await query(`
      INSERT INTO cardapios_modalidade (nome, mes, ano, observacao, ativo, nutricionista_id, data_aprovacao_nutricionista, observacoes_nutricionista)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [nome, mes, ano, observacao, ativo !== false, nutricionista_id || null, data_aprovacao_nutricionista || null, observacoes_nutricionista || null]);

    const cardapioId = result.rows[0].id;

    for (const modalidadeId of modalidades_ids) {
      await query(`
        INSERT INTO cardapio_modalidades (cardapio_id, modalidade_id)
        VALUES ($1, $2)
        ON CONFLICT (cardapio_id, modalidade_id) DO NOTHING
      `, [cardapioId, modalidadeId]);
    }

    const cardapioCompleto = await query(`
      SELECT 
        cm.*,
        ARRAY_AGG(DISTINCT cjm.modalidade_id) as modalidades_ids,
        STRING_AGG(DISTINCT m.nome, ', ' ORDER BY m.nome) as modalidades_nomes
      FROM cardapios_modalidade cm
      LEFT JOIN cardapio_modalidades cjm ON cm.id = cjm.cardapio_id
      LEFT JOIN modalidades m ON cjm.modalidade_id = m.id
      WHERE cm.id = $1
      GROUP BY cm.id
    `, [cardapioId]);

    res.status(201).json(cardapioCompleto.rows[0]);
    cacheService.invalidateEntity('cardapios');
  } catch (error: any) {
    console.error('❌ Erro ao criar cardápio:', error);
    res.status(500).json({ message: 'Erro ao criar cardápio' });
  }
}

// Editar cardápio
export async function editarCardapioModalidade(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { modalidades_ids, nome, mes, ano, observacao, ativo, nutricionista_id, data_aprovacao_nutricionista, observacoes_nutricionista } = req.body;

    const result = await query(`
      UPDATE cardapios_modalidade
      SET nome = COALESCE($1, nome),
          mes = COALESCE($2, mes),
          ano = COALESCE($3, ano),
          observacao = $4,
          ativo = COALESCE($5, ativo),
          nutricionista_id = $6,
          data_aprovacao_nutricionista = $7,
          observacoes_nutricionista = $8
      WHERE id = $9
      RETURNING *
    `, [nome, mes, ano, observacao, ativo, nutricionista_id || null, data_aprovacao_nutricionista || null, observacoes_nutricionista || null, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Cardápio não encontrado' });
    }

    if (modalidades_ids && Array.isArray(modalidades_ids) && modalidades_ids.length > 0) {
      await query('DELETE FROM cardapio_modalidades WHERE cardapio_id = $1', [id]);
      for (const modalidadeId of modalidades_ids) {
        await query(`
          INSERT INTO cardapio_modalidades (cardapio_id, modalidade_id)
          VALUES ($1, $2)
          ON CONFLICT (cardapio_id, modalidade_id) DO NOTHING
        `, [id, modalidadeId]);
      }
    }

    const cardapioCompleto = await query(`
      SELECT 
        cm.*,
        ARRAY_AGG(DISTINCT cjm.modalidade_id) FILTER (WHERE cjm.modalidade_id IS NOT NULL) as modalidades_ids,
        STRING_AGG(DISTINCT m.nome, ', ' ORDER BY m.nome) FILTER (WHERE m.nome IS NOT NULL) as modalidades_nomes
      FROM cardapios_modalidade cm
      LEFT JOIN cardapio_modalidades cjm ON cm.id = cjm.cardapio_id
      LEFT JOIN modalidades m ON cjm.modalidade_id = m.id
      WHERE cm.id = $1
      GROUP BY cm.id
    `, [id]);

    res.json(cardapioCompleto.rows[0]);
    cacheService.invalidateEntity('cardapios', Number(id));
  } catch (error: any) {
    console.error('❌ Erro ao editar cardápio:', error);
    res.status(500).json({ message: 'Erro ao editar cardápio' });
  }
}

// Remover cardápio
export async function removerCardapioModalidade(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM cardapios_modalidade WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Cardápio não encontrado' });
    }

    res.json({ message: 'Cardápio removido com sucesso' });
    cacheService.invalidateEntity('cardapios', Number(id));
  } catch (error) {
    console.error('❌ Erro ao remover cardápio:', error);
    res.status(500).json({ message: 'Erro ao remover cardápio' });
  }
}

// Listar refeições do cardápio
export async function listarRefeicoesCardapio(req: Request, res: Response) {
  try {
    const { cardapioId } = req.params;

    const cached = await cacheService.get(`cardapios:refeicoes:${cardapioId}`);
    if (cached) return res.json(cached);

    const result = await query(`
      SELECT 
        crd.*,
        r.nome as refeicao_nome,
        r.descricao as refeicao_descricao
      FROM cardapio_refeicoes_dia crd
      LEFT JOIN refeicoes r ON crd.refeicao_id = r.id
      WHERE crd.cardapio_modalidade_id = $1
      ORDER BY crd.dia, crd.tipo_refeicao
    `, [cardapioId]);

    const response = { success: true, data: result.rows, total: result.rows.length };
    await cacheService.set(`cardapios:refeicoes:${cardapioId}`, response, cacheService.TTL.list);
    res.json(response);
  } catch (error) {
    console.error('❌ Erro ao listar refeições:', error);
    res.status(500).json({ message: 'Erro ao listar refeições' });
  }
}

// Adicionar refeição ao dia
export async function adicionarRefeicaoDia(req: Request, res: Response) {
  try {
    const { cardapioId } = req.params;
    const { refeicao_id, dia, tipo_refeicao, observacao } = req.body;

    if (!refeicao_id || !dia || !tipo_refeicao) {
      return res.status(400).json({ message: 'Campos obrigatórios: refeicao_id, dia, tipo_refeicao' });
    }

    const result = await query(`
      INSERT INTO cardapio_refeicoes_dia (cardapio_modalidade_id, refeicao_id, dia, tipo_refeicao, observacao)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [cardapioId, refeicao_id, dia, tipo_refeicao, observacao]);

    res.status(201).json(result.rows[0]);
    cacheService.invalidateEntity('cardapios', Number(cardapioId));
  } catch (error: any) {
    console.error('❌ Erro ao adicionar refeição:', error);
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Esta preparação já foi adicionada neste dia com este tipo' });
    }
    res.status(500).json({ message: 'Erro ao adicionar refeição' });
  }
}

// Remover refeição do dia
export async function removerRefeicaoDia(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM cardapio_refeicoes_dia WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Refeição não encontrada' });
    }

    res.json({ message: 'Refeição removida com sucesso' });
    cacheService.invalidateEntity('cardapios');
  } catch (error) {
    console.error('❌ Erro ao remover refeição:', error);
    res.status(500).json({ message: 'Erro ao remover refeição' });
  }
}

// Calcular custo do cardápio
export async function calcularCustoCardapio(req: Request, res: Response) {
  try {
    const { cardapioId } = req.params;

    // Buscar cardápio e suas modalidades
    const cardapioResult = await query(`
      SELECT 
        cm.id,
        cm.nome,
        cm.mes,
        cm.ano,
        ARRAY_AGG(DISTINCT cjm.modalidade_id) FILTER (WHERE cjm.modalidade_id IS NOT NULL) as modalidades_ids
      FROM cardapios_modalidade cm
      LEFT JOIN cardapio_modalidades cjm ON cm.id = cjm.cardapio_id
      WHERE cm.id = $1
      GROUP BY cm.id
    `, [cardapioId]);

    if (cardapioResult.rows.length === 0) {
      return res.status(404).json({ message: 'Cardápio não encontrado' });
    }

    const cardapio = cardapioResult.rows[0];
    const modalidadesIds = cardapio.modalidades_ids || [];

    if (modalidadesIds.length === 0) {
      return res.json({
        custo_total: 0,
        total_alunos: 0,
        total_refeicoes: 0,
        detalhes_por_refeicao: [],
        detalhes_por_modalidade: []
      });
    }

    const dataReferenciaAlunos = `${cardapio.ano}-${String(cardapio.mes).padStart(2, '0')}-01`;

    // Buscar quantidade de alunos por modalidade vigente na competencia do cardapio
    const alunosResult = await query(`
      WITH ultima_versao AS (
        SELECT DISTINCT ON (h.escola_id, h.modalidade_id)
          h.escola_id,
          h.modalidade_id,
          h.quantidade_alunos,
          h.vigente_de,
          h.created_at,
          h.id
        FROM escola_modalidades_historico h
        INNER JOIN escolas e ON e.id = h.escola_id
        WHERE h.modalidade_id = ANY($1::int[])
          AND h.vigente_de <= $2::date
          AND e.ativo = true
        ORDER BY h.escola_id, h.modalidade_id, h.vigente_de DESC, h.created_at DESC, h.id DESC
      )
      SELECT
        modalidade_id,
        SUM(quantidade_alunos) as total_alunos
      FROM ultima_versao
      GROUP BY modalidade_id
    `, [modalidadesIds, dataReferenciaAlunos]);

    const alunosPorModalidade: Record<number, number> = {};
    let totalAlunos = 0;
    alunosResult.rows.forEach((row: any) => {
      alunosPorModalidade[row.modalidade_id] = parseInt(row.total_alunos) || 0;
      totalAlunos += parseInt(row.total_alunos) || 0;
    });

    // Buscar refeições do cardápio com produtos e custos por modalidade
    const refeicoesResult = await query(`
      SELECT
        crd.id as refeicao_dia_id,
        crd.dia,
        crd.tipo_refeicao,
        crd.refeicao_id,
        r.nome as refeicao_nome,
        rp.id as refeicao_produto_id,
        rp.produto_id,
        p.nome as produto_nome,
        rp.per_capita as per_capita_padrao,
        rp.tipo_medida,
        COALESCE(um.codigo, 'UN') as unidade,
        COALESCE(p.fator_correcao, 1.0) as fator_correcao,
        COALESCE(p.peso, 1000) as peso_embalagem,
        cjm.modalidade_id,
        COALESCE(rpm.per_capita_ajustado, rp.per_capita) as per_capita,
        COALESCE(cp_lat.preco_unitario, 0) as preco_unitario,
        COALESCE(cp_lat.tipo_fornecedor, 'CONVENCIONAL') as tipo_fornecedor
      FROM cardapio_refeicoes_dia crd
      INNER JOIN refeicoes r ON crd.refeicao_id = r.id
      INNER JOIN cardapio_modalidades cjm ON cjm.cardapio_id = crd.cardapio_modalidade_id
      LEFT JOIN refeicao_produtos rp ON r.id = rp.refeicao_id
      LEFT JOIN produtos p ON rp.produto_id = p.id
      LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
      LEFT JOIN refeicao_produto_modalidade rpm
        ON rpm.refeicao_produto_id = rp.id
        AND rpm.modalidade_id = cjm.modalidade_id
      LEFT JOIN LATERAL (
        SELECT cp.preco_unitario, f.tipo_fornecedor
        FROM contrato_produtos cp
        INNER JOIN contratos c ON c.id = cp.contrato_id
        INNER JOIN fornecedores f ON c.fornecedor_id = f.id
        WHERE cp.produto_id = p.id
          AND c.ativo = true
          AND cp.ativo = true
        ORDER BY c.data_inicio DESC
        LIMIT 1
      ) cp_lat ON p.id IS NOT NULL
      WHERE crd.cardapio_modalidade_id = $1
        AND crd.ativo = true
      ORDER BY crd.dia, crd.tipo_refeicao, cjm.modalidade_id
    `, [cardapioId]);

    // Agrupar por refeição do dia e modalidade
    const refeicoesMap = new Map<string, any>();
    const custosPorTipoFornecedor = new Map<string, number>();
    
    refeicoesResult.rows.forEach((row: any) => {
      // Chave única: refeicao_dia_id + modalidade_id
      const chave = `${row.refeicao_dia_id}_${row.modalidade_id}`;
      
      if (!refeicoesMap.has(chave)) {
        refeicoesMap.set(chave, {
          id: row.refeicao_dia_id,
          dia: row.dia,
          tipo_refeicao: row.tipo_refeicao,
          refeicao_id: row.refeicao_id,
          refeicao_nome: row.refeicao_nome,
          modalidade_id: row.modalidade_id,
          produtos: [],
          custo_por_aluno: 0,
          custo_total: 0
        });
      }

      if (row.produto_id) {
        const refeicao = refeicoesMap.get(chave);
        const perCapita = parseFloat(row.per_capita) || 0;
        const precoUnitario = parseFloat(row.preco_unitario) || 0;
        const fatorCorrecao = parseFloat(row.fator_correcao) || 1.0;
        const pesoEmbalagem = parseFloat(row.peso_embalagem) || 1000;
        const tipoMedida = row.tipo_medida || 'gramas';
        const tipoFornecedor = row.tipo_fornecedor || 'CONVENCIONAL';
        
        // Calcular custo por aluno usando a mesma lógica do cálculo de preparação
        // Per capita líquido × fator de correção = per capita bruto
        const perCapitaBruto = perCapita * fatorCorrecao;
        
        let custoIngrediente = 0;
        
        if (tipoMedida === 'gramas' || tipoMedida === 'mililitros') {
          // Calcular proporção da embalagem usada
          const proporcaoEmbalagem = perCapitaBruto / pesoEmbalagem;
          custoIngrediente = proporcaoEmbalagem * precoUnitario;
        } else {
          // Unidades - assumir que preco_unitario é por unidade
          custoIngrediente = perCapitaBruto * precoUnitario;
        }
        
        refeicao.produtos.push({
          produto_id: row.produto_id,
          produto_nome: row.produto_nome,
          per_capita: perCapita,
          per_capita_bruto: perCapitaBruto,
          tipo_medida: tipoMedida,
          fator_correcao: fatorCorrecao,
          peso_embalagem: pesoEmbalagem,
          preco_unitario: precoUnitario,
          custo_por_aluno: custoIngrediente,
          tipo_fornecedor: tipoFornecedor
        });

        refeicao.custo_por_aluno += custoIngrediente;
      }
    });

    // Calcular custo total por modalidade
    let custoTotal = 0;
    const detalhesRefeicoes: any[] = [];
    const custosPorModalidade = new Map<number, number>();
    
    // Contar refeições únicas (mesmo dia + mesmo tipo = 1 refeição)
    const refeicoesUnicas = new Set<string>();

    refeicoesMap.forEach((refeicao) => {
      const modalidadeId = refeicao.modalidade_id;
      const qtdAlunosModalidade = alunosPorModalidade[modalidadeId] || 0;
      const custoRefeicao = refeicao.custo_por_aluno * qtdAlunosModalidade;
      
      refeicao.custo_total = custoRefeicao;
      refeicao.quantidade_alunos = qtdAlunosModalidade;
      custoTotal += custoRefeicao;
      
      // Acumular custo por modalidade
      const custoAtualModalidade = custosPorModalidade.get(modalidadeId) || 0;
      custosPorModalidade.set(modalidadeId, custoAtualModalidade + custoRefeicao);
      
      // Acumular custo por tipo de fornecedor
      refeicao.produtos.forEach((produto: any) => {
        const tipoFornecedor = produto.tipo_fornecedor || 'CONVENCIONAL';
        const custoProduto = produto.custo_por_aluno * qtdAlunosModalidade;
        const custoAtualTipo = custosPorTipoFornecedor.get(tipoFornecedor) || 0;
        custosPorTipoFornecedor.set(tipoFornecedor, custoAtualTipo + custoProduto);
      });
      
      // Contar refeições únicas: dia + tipo_refeicao
      refeicoesUnicas.add(`${refeicao.dia}-${refeicao.tipo_refeicao}`);
      
      detalhesRefeicoes.push(refeicao);
    });

    // Detalhes por modalidade
    const detalhesPorModalidade = modalidadesIds.map((modalidadeId: number) => {
      const qtdAlunos = alunosPorModalidade[modalidadeId] || 0;
      const custoModalidade = custosPorModalidade.get(modalidadeId) || 0;

      return {
        modalidade_id: modalidadeId,
        quantidade_alunos: qtdAlunos,
        custo_total: custoModalidade
      };
    });

    // Detalhes por tipo de fornecedor
    const detalhesPorTipoFornecedor = Array.from(custosPorTipoFornecedor.entries()).map(([tipo, valor]) => ({
      tipo_fornecedor: tipo,
      valor_total: valor,
      percentual: custoTotal > 0 ? (valor / custoTotal) * 100 : 0
    }));

    res.json({
      custo_total: custoTotal,
      total_alunos: totalAlunos,
      total_refeicoes: refeicoesUnicas.size,
      detalhes_por_refeicao: detalhesRefeicoes,
      detalhes_por_modalidade: detalhesPorModalidade,
      detalhes_por_tipo_fornecedor: detalhesPorTipoFornecedor
    });
  } catch (error) {
    console.error('❌ Erro ao calcular custo do cardápio:', error);
    res.status(500).json({ message: 'Erro ao calcular custo do cardápio' });
  }
}
