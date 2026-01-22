// Modelo de Produto para o módulo estoque
export interface Produto {
  id: number;
  nome: string;
  unidade: string;
  categoria?: string;
  ativo?: boolean;
}

// Função para buscar produto por ID
export async function getProdutoById(id: number): Promise<Produto | null> {
  const db = require("../../../database");
  
  try {
    const result = await db.query(
      'SELECT id, nome, categoria, ativo FROM produtos WHERE id = $1',
      [id]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    return null;
  }
}

export default {
  getProdutoById
};