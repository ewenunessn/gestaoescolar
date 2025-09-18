// User model para PostgreSQL
const db = require("../../../database");

export interface User {
  id: number;
  nome: string;
  email: string;
  senha: string;
  tipo: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// Criar tabela de usuários
export async function createUserTable(): Promise<void> {
  try {
    const result = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'usuarios'
      )
    `);
    
    if (!result.rows[0].exists) {
      console.log('🔧 Criando tabela usuarios...');
      await db.query(`
        CREATE TABLE usuarios (
          id SERIAL PRIMARY KEY,
          nome VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          senha VARCHAR(255) NOT NULL,
          tipo VARCHAR(50) NOT NULL DEFAULT 'usuario',
          ativo BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Tabela usuarios criada com sucesso!');
    }
  } catch (error) {
    console.error('❌ Erro ao criar tabela usuarios:', error);
    throw error;
  }
}

// Buscar usuário por email
export async function findUserByEmail(email: string): Promise<User | undefined> {
  try {
    const result = await db.get('SELECT * FROM usuarios WHERE email = $1', [email]);
    return result;
  } catch (error) {
    console.error('❌ Erro ao buscar usuário por email:', error);
    throw error;
  }
}

// Criar novo usuário
export async function createUser(user: Omit<User, "id" | "created_at" | "updated_at">): Promise<User> {
  try {
    const result = await db.query(`
      INSERT INTO usuarios (nome, email, senha, tipo, ativo) 
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [user.nome, user.email, user.senha, user.tipo, user.ativo ?? true]);
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error);
    throw error;
  }
}

// Buscar usuário por ID
export async function findUserById(id: number): Promise<User | undefined> {
  try {
    const result = await db.get('SELECT * FROM usuarios WHERE id = $1', [id]);
    return result;
  } catch (error) {
    console.error('❌ Erro ao buscar usuário por ID:', error);
    throw error;
  }
}

// Atualizar usuário
export async function updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
  try {
    const fields = Object.keys(updates).filter(key => key !== 'id');
    const values = fields.map(field => updates[field]);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    if (fields.length === 0) {
      throw new Error('Nenhum campo para atualizar');
    }
    
    const result = await db.query(`
      UPDATE usuarios 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id, ...values]);
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ Erro ao atualizar usuário:', error);
    throw error;
  }
}

// Listar usuários
export async function getAllUsers(): Promise<User[]> {
  try {
    const result = await db.all('SELECT * FROM usuarios ORDER BY nome');
    return result;
  } catch (error) {
    console.error('❌ Erro ao listar usuários:', error);
    throw error;
  }
}

// Deletar usuário (soft delete)
export async function deleteUser(id: number): Promise<boolean> {
  try {
    const result = await db.query(`
      UPDATE usuarios 
      SET ativo = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);
    
    return result.rowCount > 0;
  } catch (error) {
    console.error('❌ Erro ao deletar usuário:', error);
    throw error;
  }
}

// Verificar se email já existe
export async function emailExists(email: string, excludeId?: number): Promise<boolean> {
  try {
    let query = 'SELECT COUNT(*) as count FROM usuarios WHERE email = $1';
    let params = [email];
    
    if (excludeId) {
      query += ' AND id != $2';
      params.push(excludeId.toString());
    }
    
    const result = await db.query(query, params);
    return result.rows[0].count > 0;
  } catch (error) {
    console.error('❌ Erro ao verificar email:', error);
    throw error;
  }
}

// Resetar sequência da tabela usuarios
export async function resetUserSequence(): Promise<void> {
  try {
    await db.query(`
      SELECT setval('usuarios_id_seq', COALESCE((SELECT MAX(id) FROM usuarios), 0) + 1);
    `);
    console.log('✅ Sequência da tabela usuarios resetada com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao resetar sequência:', error);
    throw error;
  }
}
