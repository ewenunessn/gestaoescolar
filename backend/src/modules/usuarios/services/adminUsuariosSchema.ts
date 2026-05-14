import db from "../../../database";

export async function ensureAdminTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS funcoes (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(100) NOT NULL UNIQUE,
      descricao TEXT,
      ativo BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS funcao_permissoes (
      id SERIAL PRIMARY KEY,
      funcao_id INTEGER NOT NULL REFERENCES funcoes(id) ON DELETE CASCADE,
      modulo_id INTEGER NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
      nivel_permissao_id INTEGER NOT NULL REFERENCES niveis_permissao(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(funcao_id, modulo_id)
    )
  `);

  await db.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS funcao_id INTEGER REFERENCES funcoes(id) ON DELETE SET NULL`);
}
