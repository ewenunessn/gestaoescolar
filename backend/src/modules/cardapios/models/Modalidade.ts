// Modelo de Modalidade para PostgreSQL
const db = require("../../../database");

export interface Modalidade {
  id: number;
  nome: string;
  descricao?: string;
  ativo: boolean;
  valor_repasse: number;
  created_at?: string;
  updated_at?: string;
}

export async function createModalidadeTable() {
  // Tabela já criada via migração PostgreSQL
  // Esta função é mantida para compatibilidade
  console.log('Tabela modalidades já existe no PostgreSQL');
}

export async function getModalidades(): Promise<Modalidade[]> {
  try {
    const modalidades = await db.all(`
      SELECT 
        id,
        nome,
        descricao,
        ativo,
        COALESCE(valor_repasse, 0.00) as valor_repasse,
        created_at,
        updated_at
      FROM modalidades 
      ORDER BY nome
    `);
    return modalidades;
  } catch (error) {
    console.error('Erro ao buscar modalidades:', error);
    throw error;
  }
}

export async function getModalidadeById(
  id: number
): Promise<Modalidade | null> {
  try {
    const modalidade = await db.get(
      "SELECT * FROM modalidades WHERE id = $1",
      [id]
    );
    return modalidade || null;
  } catch (error) {
    console.error('Erro ao buscar modalidade por ID:', error);
    throw error;
  }
}

export async function createModalidade(
  modalidade: Omit<Modalidade, "id" | "created_at" | "updated_at">
): Promise<Modalidade> {
  try {
    const result = await db.query(
      `INSERT INTO modalidades (nome, descricao, ativo, valor_repasse) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [
        modalidade.nome,
        modalidade.descricao || null,
        modalidade.ativo !== undefined ? modalidade.ativo : true,
        modalidade.valor_repasse || 0.00
      ]
    );
    
    if (result.rows.length === 0) {
      throw new Error("Falha ao criar a modalidade.");
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Erro ao criar modalidade:', error);
    throw error;
  }
}

export async function updateModalidade(
  id: number,
  dados: Partial<Omit<Modalidade, "id" | "created_at" | "updated_at">>
): Promise<Modalidade | null> {
  try {
    const result = await db.query(
      `UPDATE modalidades SET 
         nome = COALESCE($1, nome),
         descricao = COALESCE($2, descricao),
         ativo = COALESCE($3, ativo),
         valor_repasse = COALESCE($4, valor_repasse),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [
        dados.nome,
        dados.descricao,
        dados.ativo,
        dados.valor_repasse,
        id
      ]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Erro ao atualizar modalidade:', error);
    throw error;
  }
}

export async function deleteModalidade(id: number): Promise<boolean> {
  try {
    const result = await db.query(
      "DELETE FROM modalidades WHERE id = $1 RETURNING id",
      [id]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Erro ao deletar modalidade:', error);
    throw error;
  }
}