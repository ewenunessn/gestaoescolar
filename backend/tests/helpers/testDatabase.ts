/**
 * Test database utilities
 * Provides database setup and cleanup for tests
 */

const db = require('../../src/database');

export interface TestUser {
  id: number;
  name: string;
  email: string;
  password?: string;
  role: string;
  permissions: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class TestDatabaseHelper {
  private createdUsers: number[] = [];

  constructor() {
    // Initialize connection if needed
  }


  /**
   * Create test school
   */
  async createTestSchool(name: string = 'Test School'): Promise<any> {
    const school = {
      id: Math.floor(Math.random() * 10000),
      nome: name,
      endereco: 'Test Address',
      telefone: '123456789'
    };

    // Mock the database call since we're using mocked db
    if (db.query && typeof db.query.mockResolvedValue === 'function') {
      db.query.mockResolvedValue({ rows: [school] });
    } else {
      const result = await db.query(`
        INSERT INTO escolas (nome, endereco, telefone)
        VALUES ($1, 'Test Address', '123456789')
        RETURNING *
      `, [name]);
      return result.rows[0];
    }

    return school;
  }

  /**
   * Create test product
   */
  async createTestProduct(name: string = 'Test Product'): Promise<any> {
    const product = {
      id: Math.floor(Math.random() * 10000),
      nome: name,
      categoria: 'Test Category',
      unidade_medida: 'kg'
    };

    // Mock the database call since we're using mocked db
    if (db.query && typeof db.query.mockResolvedValue === 'function') {
      db.query.mockResolvedValue({ rows: [product] });
    } else {
      const result = await db.query(`
        INSERT INTO produtos (nome, categoria, unidade_medida)
        VALUES ($1, 'Test Category', 'kg')
        RETURNING *
      `, [name]);
      return result.rows[0];
    }

    return product;
  }

  /**
   * Clean up all test data
   */
  async cleanup(): Promise<void> {
    try {
      // Delete users
      if (this.createdUsers.length > 0) {
        await db.query(`
          DELETE FROM usuarios WHERE id = ANY($1)
        `, [this.createdUsers]);
      }

      // Reset arrays
      this.createdUsers = [];
    } catch (error) {
      console.error('Error during test cleanup:', error);
    }
  }

  /**
   * Generate UUID for testing
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

export const testDb = new TestDatabaseHelper();