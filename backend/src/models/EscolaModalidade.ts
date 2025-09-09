// Modelo de EscolaModalidade para PostgreSQL
const db = require("../database");

export interface EscolaModalidade {
  id: number;
  escola_id: number;
  modalidade_id: number;
  quantidade_alunos: number;
  created_at?: string;
  updated_at?: string;
}

export async function createEscolaModalidadeTable() {
  // Tabela já criada via migração PostgreSQL
  // Esta função é mantida para compatibilidade
  console.log('Tabela escola_modalidades já existe no PostgreSQL');
}

export async function getEscolaModalidades(): Promise<EscolaModalidade[]> {
  try {
    const lista = await db.all(
      "SELECT * FROM escola_modalidades ORDER BY id"
    );
    return lista;
  } catch (error) {
    console.error('Erro ao buscar escola-modalidades:', error);
    throw error;
  }
}

export async function getEscolaModalidadeById(
  id: number
): Promise<EscolaModalidade | null> {
  try {
    const item = await db.get(
      "SELECT * FROM escola_modalidades WHERE id = $1",
      [id]
    );
    return item || null;
  } catch (error) {
    console.error('Erro ao buscar escola-modalidade por ID:', error);
    throw error;
  }
}

export async function createEscolaModalidade(
  data: Omit<EscolaModalidade, "id" | "created_at" | "updated_at">
): Promise<EscolaModalidade> {
  try {
    const result = await db.query(
      `INSERT INTO escola_modalidades (escola_id, modalidade_id, quantidade_alunos) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [data.escola_id, data.modalidade_id, data.quantidade_alunos]
    );
    
    if (result.rows.length === 0) {
      throw new Error("Falha ao criar associação escola-modalidade");
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Erro ao criar escola-modalidade:', error);
    throw error;
  }
}

export async function updateEscolaModalidade(
  id: number,
  data: Partial<Omit<EscolaModalidade, "id" | "created_at" | "updated_at">>
): Promise<EscolaModalidade | null> {
  try {
    const result = await db.query(
      `UPDATE escola_modalidades SET 
         escola_id = COALESCE($1, escola_id),
         modalidade_id = COALESCE($2, modalidade_id),
         quantidade_alunos = COALESCE($3, quantidade_alunos),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [data.escola_id, data.modalidade_id, data.quantidade_alunos, id]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Erro ao atualizar escola-modalidade:', error);
    throw error;
  }
}

export async function deleteEscolaModalidade(id: number): Promise<boolean> {
  try {
    const result = await db.query(
      "DELETE FROM escola_modalidades WHERE id = $1 RETURNING id",
      [id]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Erro ao deletar escola-modalidade:', error);
    throw error;
  }
}

export async function getEscolaModalidadesByEscola(
  escola_id: number
): Promise<EscolaModalidade[]> {
  try {
    const lista = await db.all(
      "SELECT * FROM escola_modalidades WHERE escola_id = $1 ORDER BY id",
      [escola_id]
    );
    return lista;
  } catch (error) {
    console.error('Erro ao buscar escola-modalidades por escola:', error);
    throw error;
  }
}
