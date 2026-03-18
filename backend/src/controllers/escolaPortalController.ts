import { Request, Response } from "express";
import db from "../database";
import { asyncHandler, ValidationError } from "../utils/errorHandler";

export const getDashboardEscola = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  
  console.log('🔍 [PORTAL ESCOLA] Usuário do token:', JSON.stringify(user, null, 2));
  
  if (!user.escola_id) {
    console.log('❌ [PORTAL ESCOLA] Usuário não tem escola_id no token');
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
  const user = (req as any).user;
  
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
  const user = (req as any).user;
  const { guiaId } = req.params;
  
  if (!user.escola_id) {
    throw new ValidationError('Usuário não está associado a uma escola');
  }

  const result = await db.query(`
    SELECT 
      gpe.*,
      p.nome as produto_nome,
      p.unidade
    FROM guia_produto_escola gpe
    INNER JOIN produtos p ON gpe.produto_id = p.id
    WHERE gpe.guia_id = $1 AND gpe.escola_id = $2
    ORDER BY p.nome
  `, [guiaId, user.escola_id]);

  res.json({ success: true, data: result.rows });
});

export const getCardapiosSemana = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  
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

  // Buscar cardápios do mês atual para as modalidades da escola
  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();

  // Calcular início e fim da semana atual (dias do mês)
  const diaSemana = hoje.getDay();
  const inicioSemana = new Date(hoje);
  inicioSemana.setDate(hoje.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1));
  const fimSemana = new Date(inicioSemana);
  fimSemana.setDate(inicioSemana.getDate() + 6);

  const diaInicioSemana = inicioSemana.getDate();
  const diaFimSemana = fimSemana.getDate();

  const result = await db.query(`
    SELECT 
      cm.id,
      cm.mes,
      cm.ano,
      cm.modalidade_id,
      m.nome as modalidade_nome,
      crd.dia,
      json_agg(
        json_build_object(
          'id', r.id,
          'nome', r.nome,
          'tipo', crd.tipo_refeicao
        ) ORDER BY crd.tipo_refeicao, r.nome
      ) FILTER (WHERE r.id IS NOT NULL) as refeicoes
    FROM cardapios_modalidade cm
    INNER JOIN modalidades m ON cm.modalidade_id = m.id
    INNER JOIN cardapio_refeicoes_dia crd ON cm.id = crd.cardapio_modalidade_id
    LEFT JOIN refeicoes r ON crd.refeicao_id = r.id
    WHERE cm.modalidade_id = ANY($1)
      AND cm.mes = $2
      AND cm.ano = $3
      AND crd.dia >= $4
      AND crd.dia <= $5
      AND crd.ativo = true
    GROUP BY cm.id, cm.mes, cm.ano, cm.modalidade_id, m.nome, crd.dia
    ORDER BY crd.dia, m.nome
  `, [modalidadeIds, mesAtual, anoAtual, diaInicioSemana, diaFimSemana]);

  res.json({ success: true, data: result.rows });
});
