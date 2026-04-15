import { Request, Response } from "express";
import db from '../../../database';
import { asyncHandler, ValidationError } from "../../../utils/errorHandler";

export const getDashboardEscola = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  
  
  if (!user.escola_id) {
    throw new ValidationError('Usuário não está associado a uma escola');
  }

  // Buscar dados da escola
  const escola = await db.query('SELECT * FROM escolas WHERE id = $1', [user.escola_id]);
  
  if (escola.rows.length === 0) {
    throw new ValidationError('Escola não encontrada');
  }

  // Buscar modalidades e quantidade de alunos
  const modalidades = await db.query(`
    SELECT 
      m.id,
      m.nome,
      em.quantidade_alunos
    FROM escola_modalidades em
    INNER JOIN modalidades m ON em.modalidade_id = m.id
    WHERE em.escola_id = $1
    ORDER BY m.nome
  `, [user.escola_id]);

  // Calcular total de alunos
  const totalAlunos = modalidades.rows.reduce((sum, m) => sum + (parseInt(m.quantidade_alunos) || 0), 0);

  // Buscar estatísticas
  const stats = await db.query(`
    SELECT 
      COUNT(DISTINCT gpe.guia_id) as total_guias,
      COUNT(DISTINCT gpe.produto_id) as total_produtos,
      SUM(CASE WHEN gpe.status = 'pendente' OR gpe.status IS NULL THEN 1 ELSE 0 END) as pendentes,
      SUM(CASE WHEN gpe.status = 'entregue' THEN 1 ELSE 0 END) as entregues
    FROM guia_produto_escola gpe
    WHERE gpe.escola_id = $1
  `, [user.escola_id]);

  res.json({
    success: true,
    data: {
      escola: escola.rows[0],
      modalidades: modalidades.rows,
      totalAlunos,
      estatisticas: stats.rows[0]
    }
  });
});

export const getGuiasEscola = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  
  if (!user.escola_id) {
    throw new ValidationError('Usuário não está associado a uma escola');
  }

  const result = await db.query(`
    SELECT 
      g.id as guia_id,
      g.nome as guia_nome,
      g.mes,
      g.ano,
      g.status as guia_status,
      COUNT(gpe.id) as total_itens,
      SUM(CASE WHEN gpe.status = 'pendente' OR gpe.status IS NULL THEN 1 ELSE 0 END) as pendentes,
      SUM(CASE WHEN gpe.status = 'entregue' THEN 1 ELSE 0 END) as entregues
    FROM guias g
    INNER JOIN guia_produto_escola gpe ON g.id = gpe.guia_id
    WHERE gpe.escola_id = $1
    GROUP BY g.id, g.nome, g.mes, g.ano, g.status
    ORDER BY g.ano DESC, g.mes DESC
  `, [user.escola_id]);

  res.json({ success: true, data: result.rows });
});

export const getItensGuiaEscola = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  const { guiaId } = req.params;
  
  if (!user.escola_id) {
    throw new ValidationError('Usuário não está associado a uma escola');
  }

  const result = await db.query(`
    SELECT
      gpe.*,
      p.nome as produto_nome,
      COALESCE(um.codigo, 'UN') as unidade
    FROM guia_produto_escola gpe
    INNER JOIN produtos p ON gpe.produto_id = p.id
    LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
    WHERE gpe.guia_id = $1 AND gpe.escola_id = $2
    ORDER BY p.nome
  `, [guiaId, user.escola_id]);

  res.json({ success: true, data: result.rows });
});

export const getCardapiosSemana = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  
  if (!user.escola_id) {
    throw new ValidationError('Usuário não está associado a uma escola');
  }

  // Buscar modalidades da escola
  const modalidades = await db.query(`
    SELECT DISTINCT m.id, m.nome
    FROM escola_modalidades em
    INNER JOIN modalidades m ON em.modalidade_id = m.id
    WHERE em.escola_id = $1
    ORDER BY m.nome
  `, [user.escola_id]);

  if (modalidades.rows.length === 0) {
    return res.json({ success: true, data: [] });
  }

  const modalidadeIds = modalidades.rows.map(m => m.id);

  // Semana atual: segunda-feira até domingo
  // Se hoje é domingo, a "semana" é a próxima (seg a dom)
  const hoje = new Date();
  const diaSemana = hoje.getDay(); // 0=dom, 1=seg...6=sab

  // Dias até a próxima segunda (ou hoje se for segunda)
  const diasAteSegunda = diaSemana === 0 ? 1 : diaSemana === 1 ? 0 : -(diaSemana - 1);
  const inicioSemana = new Date(hoje);
  inicioSemana.setDate(hoje.getDate() + diasAteSegunda);
  const fimSemana = new Date(inicioSemana);
  fimSemana.setDate(inicioSemana.getDate() + 6);

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  // Buscar cardápios da semana usando exclusivamente a tabela de junção cardapio_modalidades
  const result = await db.query(`
    SELECT 
      cm.id,
      cm.mes,
      cm.ano,
      crd.dia,
      STRING_AGG(DISTINCT m.nome, ', ' ORDER BY m.nome) as modalidades_nomes,
      json_agg(
        json_build_object(
          'id', r.id,
          'nome', r.nome,
          'tipo_refeicao', crd.tipo_refeicao
        ) ORDER BY crd.tipo_refeicao, r.nome
      ) FILTER (WHERE r.id IS NOT NULL) as refeicoes
    FROM cardapios_modalidade cm
    INNER JOIN cardapio_modalidades cjm ON cjm.cardapio_id = cm.id
    INNER JOIN modalidades m ON m.id = cjm.modalidade_id
    INNER JOIN cardapio_refeicoes_dia crd ON cm.id = crd.cardapio_modalidade_id
    LEFT JOIN refeicoes r ON crd.refeicao_id = r.id
    WHERE cjm.modalidade_id = ANY($1)
      AND crd.ativo = true
      AND make_date(cm.ano, cm.mes, crd.dia) >= $2::date
      AND make_date(cm.ano, cm.mes, crd.dia) <= $3::date
    GROUP BY cm.id, cm.mes, cm.ano, crd.dia
    ORDER BY cm.ano, cm.mes, crd.dia
  `, [
    modalidadeIds,
    fmt(inicioSemana),
    fmt(fimSemana),
  ]);

  res.json({ success: true, data: result.rows });
});


export const getComprovantesEscola = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  
  if (!user.escola_id) {
    throw new ValidationError('Usuário não está associado a uma escola');
  }

  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  // Buscar comprovantes da escola
  const result = await db.query(`
    SELECT 
      ce.id,
      ce.numero_comprovante,
      ce.data_entrega,
      ce.nome_quem_entregou,
      ce.nome_quem_recebeu,
      ce.observacao,
      ce.status,
      ce.created_at,
      COUNT(DISTINCT ci.id) as total_itens,
      SUM(ci.quantidade_entregue) as total_quantidade
    FROM comprovantes_entrega ce
    LEFT JOIN comprovante_itens ci ON ce.id = ci.comprovante_id
    WHERE ce.escola_id = $1
    GROUP BY ce.id
    ORDER BY ce.data_entrega DESC, ce.created_at DESC
    LIMIT $2 OFFSET $3
  `, [user.escola_id, limit, offset]);

  // Contar total
  const countResult = await db.query(`
    SELECT COUNT(*) as total
    FROM comprovantes_entrega
    WHERE escola_id = $1
  `, [user.escola_id]);

  res.json({
    success: true,
    data: result.rows,
    total: parseInt(countResult.rows[0].total),
    limit,
    offset
  });
});

export const getComprovanteDetalhes = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  const { id } = req.params;
  
  if (!user.escola_id) {
    throw new ValidationError('Usuário não está associado a uma escola');
  }

  // Buscar comprovante
  const comprovante = await db.query(`
    SELECT 
      ce.*,
      e.nome as escola_nome,
      e.endereco as escola_endereco
    FROM comprovantes_entrega ce
    INNER JOIN escolas e ON ce.escola_id = e.id
    WHERE ce.id = $1 AND ce.escola_id = $2
  `, [id, user.escola_id]);

  if (comprovante.rows.length === 0) {
    throw new ValidationError('Comprovante não encontrado');
  }

  // Buscar itens do comprovante
  const itens = await db.query(`
    SELECT 
      ci.*,
      ci.produto_nome,
      ci.unidade
    FROM comprovante_itens ci
    WHERE ci.comprovante_id = $1
    ORDER BY ci.produto_nome
  `, [id]);

  res.json({
    success: true,
    data: {
      ...comprovante.rows[0],
      itens: itens.rows
    }
  });
});
