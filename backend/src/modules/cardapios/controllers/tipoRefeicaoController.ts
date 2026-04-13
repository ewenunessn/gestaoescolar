import { Request, Response } from 'express';
const db = process.env.VERCEL === '1' ? require('../../../database-vercel') : require('../../../database');
import { cacheService } from '../../../utils/cacheService';

export const listarTiposRefeicao = async (req: Request, res: Response) => {
  try {
    const cached = await cacheService.get('tipos_refeicao:list:all');
    if (cached) return res.json(cached);

    const { ativo } = req.query;

    let query = 'SELECT * FROM tipos_refeicao';
    const params: any[] = [];

    if (ativo !== undefined) {
      query += ' WHERE ativo = $1';
      params.push(ativo === 'true');
    }

    query += ' ORDER BY ordem ASC, horario ASC';

    const result = await db.query(query, params);
    const response = { success: true, data: result.rows, total: result.rows.length };
    await cacheService.set('tipos_refeicao:list:all', response, cacheService.TTL.list);
    res.json(response);
  } catch (err) {
    console.error('Erro ao listar tipos de refeição:', err);
    res.status(500).json({ error: 'Erro ao listar tipos de refeição' });
  }
};

export const buscarTipoRefeicao = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const cached = await cacheService.get(`tipos_refeicao:${id}`);
    if (cached) return res.json(cached);

    const result = await db.query(
      'SELECT * FROM tipos_refeicao WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tipo de refeição não encontrado' });
    }

    const response = { success: true, data: result.rows[0] };
    await cacheService.set(`tipos_refeicao:${id}`, response, cacheService.TTL.single);
    res.json(response);
  } catch (err) {
    console.error('Erro ao buscar tipo de refeição:', err);
    res.status(500).json({ error: 'Erro ao buscar tipo de refeição' });
  }
};

export const criarTipoRefeicao = async (req: Request, res: Response) => {
  try {
    const { nome, chave, horario, ordem } = req.body;
    
    if (!nome || !chave || !horario) {
      return res.status(400).json({ error: 'Nome, chave e horário são obrigatórios' });
    }
    
    // Verificar se a chave já existe
    const existente = await db.query(
      'SELECT id FROM tipos_refeicao WHERE chave = $1',
      [chave]
    );
    
    if (existente.rows.length > 0) {
      return res.status(400).json({ error: 'Já existe um tipo de refeição com esta chave' });
    }
    
    const result = await db.query(
      `INSERT INTO tipos_refeicao (nome, chave, horario, ordem, ativo)
       VALUES ($1, $2, $3, $4, true)
       RETURNING *`,
      [nome, chave, horario, ordem || 0]
    );
    
    res.status(201).json(result.rows[0]);
    cacheService.invalidateEntity('tipos_refeicao');
  } catch (err) {
    console.error('Erro ao criar tipo de refeição:', err);
    res.status(500).json({ error: 'Erro ao criar tipo de refeição' });
  }
};

export const atualizarTipoRefeicao = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nome, chave, horario, ordem, ativo } = req.body;
    
    // Verificar se existe
    const existe = await db.query(
      'SELECT id FROM tipos_refeicao WHERE id = $1',
      [id]
    );
    
    if (existe.rows.length === 0) {
      return res.status(404).json({ error: 'Tipo de refeição não encontrado' });
    }
    
    // Verificar se a chave já existe em outro registro
    if (chave) {
      const existente = await db.query(
        'SELECT id FROM tipos_refeicao WHERE chave = $1 AND id != $2',
        [chave, id]
      );
      
      if (existente.rows.length > 0) {
        return res.status(400).json({ error: 'Já existe um tipo de refeição com esta chave' });
      }
    }
    
    const result = await db.query(
      `UPDATE tipos_refeicao 
       SET nome = COALESCE($1, nome),
           chave = COALESCE($2, chave),
           horario = COALESCE($3, horario),
           ordem = COALESCE($4, ordem),
           ativo = COALESCE($5, ativo),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [nome, chave, horario, ordem, ativo, id]
    );
    
    res.json(result.rows[0]);
    cacheService.invalidateEntity('tipos_refeicao', Number(id));
  } catch (err) {
    console.error('Erro ao atualizar tipo de refeição:', err);
    res.status(500).json({ error: 'Erro ao atualizar tipo de refeição' });
  }
};

export const deletarTipoRefeicao = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar se está sendo usado em algum cardápio
    const emUso = await db.query(
      'SELECT COUNT(*) as count FROM cardapio_refeicoes_dia WHERE tipo_refeicao = (SELECT chave FROM tipos_refeicao WHERE id = $1)',
      [id]
    );

    if (parseInt(emUso.rows[0].count) > 0) {
      return res.status(400).json({
        error: 'Não é possível excluir este tipo de refeição pois está sendo usado em cardápios'
      });
    }

    const result = await db.query(
      'DELETE FROM tipos_refeicao WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tipo de refeição não encontrado' });
    }

    res.json({ message: 'Tipo de refeição excluído com sucesso' });
    cacheService.invalidateEntity('tipos_refeicao', Number(id));
  } catch (err) {
    console.error('Erro ao deletar tipo de refeição:', err);
    res.status(500).json({ error: 'Erro ao deletar tipo de refeição' });
  }
};
