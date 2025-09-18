const db = require("../database");

export interface Fornecedor {
  id: number;
  nome: string;
  cnpj: string;
  email?: string;
  ativo: boolean;
}

export async function createFornecedorTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS fornecedores (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(255) NOT NULL,
      cnpj VARCHAR(18) NOT NULL,
      email VARCHAR(255),
      ativo BOOLEAN NOT NULL DEFAULT true
    )
  `);
}

export async function insertFornecedor(fornecedor: Omit<Fornecedor, "id">) {
  const result = await db.query(
    `INSERT INTO fornecedores (nome, cnpj, email, ativo) VALUES ($1, $2, $3, $4) RETURNING *`,
    [
      fornecedor.nome,
      fornecedor.cnpj,
      fornecedor.email || null,
      fornecedor.ativo,
    ]
  );
  return result.rows[0];
}

export async function getFornecedores() {
  const result = await db.query(`SELECT * FROM fornecedores ORDER BY nome`);
  return result.rows as Fornecedor[];
}

export async function getFornecedorById(id: number) {
  const result = await db.query(`SELECT * FROM fornecedores WHERE id = $1`, [id]);
  return result.rows[0] as Fornecedor;
}

export async function updateFornecedor(id: number, fornecedor: Partial<Fornecedor>) {
  // Build dynamic query based on provided fields
  const fields = [];
  const values = [];
  let paramIndex = 1;
  
  if (fornecedor.nome !== undefined) {
    fields.push(`nome = $${paramIndex++}`);
    values.push(fornecedor.nome);
  }
  if (fornecedor.cnpj !== undefined) {
    fields.push(`cnpj = $${paramIndex++}`);
    values.push(fornecedor.cnpj);
  }
  if (fornecedor.email !== undefined) {
    fields.push(`email = $${paramIndex++}`);
    values.push(fornecedor.email || null);
  }
  if (fornecedor.ativo !== undefined) {
    fields.push(`ativo = $${paramIndex++}`);
    values.push(fornecedor.ativo);
  }
  
  if (fields.length === 0) {
    throw new Error('Nenhum campo para atualizar');
  }
  
  values.push(id);
  
  const query = `UPDATE fornecedores SET ${fields.join(', ')} WHERE id = $${paramIndex}`;
  console.log('Update query:', query, 'Values:', values);
  
  await db.query(query, values);
}

export async function deleteFornecedor(id: number) {
  await db.query(`DELETE FROM fornecedores WHERE id = $1`, [id]);
}