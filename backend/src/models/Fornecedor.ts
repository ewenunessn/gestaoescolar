const db = require("../database");

export interface Fornecedor {
  id: number;
  nome: string;
  cnpj: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  ativo: boolean;
  sla_entrega_dias?: number;
  taxa_cumprimento?: number;
  // avaliacao_qualidade?: number; - removido com módulo de controle de qualidade
  condicoes_pagamento?: string;
  desconto_volume?: number;
  minimo_compra?: number;
  horario_funcionamento?: string;
  dias_entrega?: string;
  contato_responsavel?: string;
  taxa_cumprimento_prazo?: number;
  observacoes?: string;
  data_ultima_avaliacao?: string;
  total_pedidos?: number;
  total_valor_pedidos?: number;
  media_tempo_entrega?: number;
}

export async function createFornecedorTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS fornecedores (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(255) NOT NULL,
      cnpj VARCHAR(18) NOT NULL,
      endereco TEXT,
      telefone VARCHAR(20),
      email VARCHAR(255),
      ativo BOOLEAN NOT NULL DEFAULT true,
      sla_entrega_dias INTEGER DEFAULT 7,
      taxa_cumprimento DECIMAL(5,2) DEFAULT 100.00,
      -- avaliacao_qualidade DECIMAL(3,2) DEFAULT 5.00, -- removido com módulo de controle de qualidade
      condicoes_pagamento TEXT,
      desconto_volume DECIMAL(5,2),
      minimo_compra DECIMAL(10,2),
      horario_funcionamento TEXT,
      dias_entrega TEXT,
      contato_responsavel VARCHAR(255),
      taxa_cumprimento_prazo DECIMAL(5,2) DEFAULT 100.00,
      observacoes TEXT,
      data_ultima_avaliacao TIMESTAMP,
      total_pedidos INTEGER DEFAULT 0,
      total_valor_pedidos DECIMAL(12,2) DEFAULT 0.00,
      media_tempo_entrega DECIMAL(5,2)
    )
  `);
}

export async function insertFornecedor(fornecedor: Omit<Fornecedor, "id">) {
  const result = await db.query(
    `INSERT INTO fornecedores (nome, cnpj, endereco, telefone, email, ativo, contato_responsavel) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      fornecedor.nome,
      fornecedor.cnpj,
      fornecedor.endereco || null,
      fornecedor.telefone || null,
      fornecedor.email || null,
      fornecedor.ativo,
      fornecedor.contato_responsavel || null,
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
  if (fornecedor.contato_responsavel !== undefined) {
    fields.push(`contato_responsavel = $${paramIndex++}`);
    values.push(fornecedor.contato_responsavel || null);
  }
  if (fornecedor.email !== undefined) {
    fields.push(`email = $${paramIndex++}`);
    values.push(fornecedor.email || null);
  }
  if (fornecedor.telefone !== undefined) {
    fields.push(`telefone = $${paramIndex++}`);
    values.push(fornecedor.telefone || null);
  }
  if (fornecedor.endereco !== undefined) {
    fields.push(`endereco = $${paramIndex++}`);
    values.push(fornecedor.endereco || null);
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