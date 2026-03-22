import { Request, Response } from 'express';
import db from '../../../database';
import { obterPeriodoUsuario } from '../../../utils/periodoHelper';

const query = db.query.bind(db);

// Listar cardápios
export async function listarCardapiosModalidade(req: Request, res: Response) {
  try {
    const { modalidade_id, mes, ano, ativo } = req.query;
    const userId = (req as any).user?.id;
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
        COUNT(DISTINCT crd.id) as total_refeicoes,
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
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Erro ao listar cardápios:', error);
    res.status(500).json({ message: 'Erro ao listar cardápios' });
  }
}

// Buscar cardápio por ID
export async function buscarCardapioModalidade(req: Request, res: Response) {
  try {
    const { id } = req.params;

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

    res.json(result.rows[0]);
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
  } catch (error) {
    console.error('❌ Erro ao remover cardápio:', error);
    res.status(500).json({ message: 'Erro ao remover cardápio' });
  }
}

// Listar refeições do cardápio
export async function listarRefeicoesCardapio(req: Request, res: Response) {
  try {
    const { cardapioId } = req.params;

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

    res.json(result.rows);
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
  } catch (error: any) {
    console.error('❌ Erro ao adicionar refeição:', error);
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Já existe uma refeição deste tipo neste dia' });
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
  } catch (error) {
    console.error('❌ Erro ao remover refeição:', error);
    res.status(500).json({ message: 'Erro ao remover refeição' });
  }
}
