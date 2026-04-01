const express = require('express');
const router = express.Router();
const pool = require('../db');

// Listar todos os tipos de refeição
router.get('/', async (req, res) => {
  try {
    const { ativo } = req.query;
    
    let query = 'SELECT * FROM tipos_refeicao';
    const params = [];
    
    if (ativo !== undefined) {
      query += ' WHERE ativo = $1';
      params.push(ativo === 'true');
    }
    
    query += ' ORDER BY ordem ASC, horario ASC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar tipos de refeição:', err);
    res.status(500).json({ error: 'Erro ao listar tipos de refeição' });
  }
});

// Buscar tipo de refeição por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM tipos_refeicao WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tipo de refeição não encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar tipo de refeição:', err);
    res.status(500).json({ error: 'Erro ao buscar tipo de refeição' });
  }
});

// Criar novo tipo de refeição
router.post('/', async (req, res) => {
  try {
    const { nome, chave, horario, ordem } = req.body;
    
    if (!nome || !chave || !horario) {
      return res.status(400).json({ error: 'Nome, chave e horário são obrigatórios' });
    }
    
    // Verificar se a chave já existe
    const existente = await pool.query(
      'SELECT id FROM tipos_refeicao WHERE chave = $1',
      [chave]
    );
    
    if (existente.rows.length > 0) {
      return res.status(400).json({ error: 'Já existe um tipo de refeição com esta chave' });
    }
    
    const result = await pool.query(
      `INSERT INTO tipos_refeicao (nome, chave, horario, ordem, ativo)
       VALUES ($1, $2, $3, $4, true)
       RETURNING *`,
      [nome, chave, horario, ordem || 0]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar tipo de refeição:', err);
    res.status(500).json({ error: 'Erro ao criar tipo de refeição' });
  }
});

// Atualizar tipo de refeição
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, chave, horario, ordem, ativo } = req.body;
    
    // Verificar se existe
    const existe = await pool.query(
      'SELECT id FROM tipos_refeicao WHERE id = $1',
      [id]
    );
    
    if (existe.rows.length === 0) {
      return res.status(404).json({ error: 'Tipo de refeição não encontrado' });
    }
    
    // Verificar se a chave já existe em outro registro
    if (chave) {
      const existente = await pool.query(
        'SELECT id FROM tipos_refeicao WHERE chave = $1 AND id != $2',
        [chave, id]
      );
      
      if (existente.rows.length > 0) {
        return res.status(400).json({ error: 'Já existe um tipo de refeição com esta chave' });
      }
    }
    
    const result = await pool.query(
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
  } catch (err) {
    console.error('Erro ao atualizar tipo de refeição:', err);
    res.status(500).json({ error: 'Erro ao atualizar tipo de refeição' });
  }
});

// Deletar tipo de refeição
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se está sendo usado em algum cardápio
    const emUso = await pool.query(
      'SELECT COUNT(*) as count FROM cardapio_modalidade_refeicoes WHERE tipo_refeicao = (SELECT chave FROM tipos_refeicao WHERE id = $1)',
      [id]
    );
    
    if (parseInt(emUso.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir este tipo de refeição pois está sendo usado em cardápios' 
      });
    }
    
    const result = await pool.query(
      'DELETE FROM tipos_refeicao WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tipo de refeição não encontrado' });
    }
    
    res.json({ message: 'Tipo de refeição excluído com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar tipo de refeição:', err);
    res.status(500).json({ error: 'Erro ao deletar tipo de refeição' });
  }
});

module.exports = router;
