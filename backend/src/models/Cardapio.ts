// Modelo de Cardápio para PostgreSQL
const db = require("../database");

export interface Cardapio {
  id: number;
  nome: string;
  descricao?: string;
  periodo_dias: number;
  data_inicio: string; // ISO Date
  data_fim: string; // ISO Date
  modalidade_id?: number;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CardapioRefeicao {
  id: number;
  cardapio_id: number;
  refeicao_id: number;
  modalidade_id: number;
  frequencia_mensal: number;
  created_at?: string;
  updated_at?: string;
}

export async function createCardapioTable() {
  // Tabela já criada via migração PostgreSQL
  // Esta função é mantida para compatibilidade
  console.log('Tabela cardapios já existe no PostgreSQL');
}

// Funções CRUD Cardápio usando PostgreSQL
export async function getCardapios() {
  try {
    const result = await db.query("SELECT * FROM cardapios ORDER BY created_at DESC");
    return result.rows;
  } catch (error) {
    console.error('Erro ao buscar cardápios:', error);
    throw error;
  }
}

export async function getCardapioById(id: number) {
  try {
    const result = await db.query("SELECT * FROM cardapios WHERE id = $1", [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Erro ao buscar cardápio por ID:', error);
    throw error;
  }
}

export async function createCardapio(cardapio: Omit<Cardapio, "id" | "created_at" | "updated_at">) {
  try {
    const result = await db.query(
      `INSERT INTO cardapios (nome, descricao, periodo_dias, data_inicio, data_fim, ativo) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [
        cardapio.nome,
        cardapio.descricao,
        cardapio.periodo_dias,
        cardapio.data_inicio,
        cardapio.data_fim,
        cardapio.ativo,
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Erro ao criar cardápio:', error);
    throw error;
  }
}

export async function updateCardapio(id: number, cardapio: Partial<Omit<Cardapio, "id" | "created_at" | "updated_at">>) {
  try {
    const result = await db.query(
      `UPDATE cardapios 
       SET nome = $1, descricao = $2, periodo_dias = $3, data_inicio = $4, data_fim = $5, ativo = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 
       RETURNING *`,
      [
        cardapio.nome,
        cardapio.descricao,
        cardapio.periodo_dias,
        cardapio.data_inicio,
        cardapio.data_fim,
        cardapio.ativo,
        id,
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Erro ao atualizar cardápio:', error);
    throw error;
  }
}

export async function deleteCardapio(id: number) {
  try {
    const result = await db.query(`DELETE FROM cardapios WHERE id = $1 RETURNING *`, [id]);
    return result.rows[0];
  } catch (error) {
    console.error('Erro ao deletar cardápio:', error);
    throw error;
  }
}

// Funções CRUD CardapioRefeicao usando PostgreSQL
export async function getCardapioRefeicoes(cardapio_id: number) {
  try {
    const result = await db.query(
      `SELECT cr.*, r.nome as refeicao_nome, r.tipo as refeicao_tipo, m.nome as modalidade_nome
       FROM cardapio_refeicoes cr
       LEFT JOIN refeicoes r ON cr.refeicao_id = r.id
       LEFT JOIN modalidades m ON cr.modalidade_id = m.id
       WHERE cr.cardapio_id = $1
       ORDER BY r.tipo, r.nome`,
      [cardapio_id]
    );
    return result.rows;
  } catch (error) {
    console.error('Erro ao buscar refeições do cardápio:', error);
    throw error;
  }
}

export async function addCardapioRefeicao(data: Omit<CardapioRefeicao, "id" | "created_at" | "updated_at">) {
  try {
    const result = await db.query(
      `INSERT INTO cardapio_refeicoes (cardapio_id, refeicao_id, modalidade_id, frequencia_mensal) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [
        data.cardapio_id,
        data.refeicao_id,
        data.modalidade_id,
        data.frequencia_mensal,
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Erro ao adicionar refeição ao cardápio:', error);
    throw error;
  }
}

export async function updateCardapioRefeicao(
  id: number,
  data: Partial<Omit<CardapioRefeicao, "id" | "created_at" | "updated_at">>
) {
  try {
    const result = await db.query(
      `UPDATE cardapio_refeicoes 
       SET cardapio_id = $1, refeicao_id = $2, modalidade_id = $3, frequencia_mensal = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 
       RETURNING *`,
      [
        data.cardapio_id,
        data.refeicao_id,
        data.modalidade_id,
        data.frequencia_mensal,
        id,
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Erro ao atualizar refeição do cardápio:', error);
    throw error;
  }
}

export async function deleteCardapioRefeicao(id: number) {
  try {
    const result = await db.query(`DELETE FROM cardapio_refeicoes WHERE id = $1 RETURNING *`, [id]);
    return result.rows[0];
  } catch (error) {
    console.error('Erro ao deletar refeição do cardápio:', error);
    throw error;
  }
}

// Função para buscar cardápio com suas refeições
export async function getCardapioComRefeicoes(id: number) {
  try {
    const cardapio = await getCardapioById(id);
    if (!cardapio) return null;

    const refeicoes = await getCardapioRefeicoes(id);
    
    return {
      ...cardapio,
      refeicoes
    };
  } catch (error) {
    console.error('Erro ao buscar cardápio com refeições:', error);
    throw error;
  }
}
