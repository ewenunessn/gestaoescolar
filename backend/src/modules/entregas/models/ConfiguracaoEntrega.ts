const db = require("../../../database");

export interface ConfiguracaoEntrega {
  id: number;
  guia_id: number;
  rotas_selecionadas: number[];
  itens_selecionados: number[];
  ativa: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateConfiguracaoData {
  guia_id: number;
  rotas_selecionadas: number[];
  itens_selecionados: number[];
  ativa: boolean;
}

class ConfiguracaoEntregaModel {
  // Criar tabela se não existir
  async criarTabela(): Promise<void> {
    try {
      const result = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'configuracao_entregas'
        )
      `);
      
      if (!result.rows[0].exists) {
        console.log('🔧 Criando tabela configuracao_entregas...');
        await db.query(`
          CREATE TABLE configuracao_entregas (
            id SERIAL PRIMARY KEY,
            guia_id INTEGER NOT NULL,
            rotas_selecionadas INTEGER[] NOT NULL DEFAULT '{}',
            itens_selecionados INTEGER[] NOT NULL DEFAULT '{}',
            ativa BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('✅ Tabela configuracao_entregas criada com sucesso!');
      }
    } catch (error) {
      console.error('❌ Erro ao criar tabela configuracao_entregas:', error);
      throw error;
    }
  }

  // Buscar configuração ativa
  async buscarConfiguracaoAtiva(): Promise<ConfiguracaoEntrega | null> {
    try {
      await this.criarTabela(); // Garantir que a tabela existe
      
      const result = await db.query(`
        SELECT * FROM configuracao_entregas 
        WHERE ativa = true 
        ORDER BY updated_at DESC 
        LIMIT 1
      `);
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Erro ao buscar configuração ativa:', error);
      throw error;
    }
  }

  // Criar nova configuração
  async criarConfiguracao(data: CreateConfiguracaoData): Promise<ConfiguracaoEntrega> {
    try {
      await this.criarTabela(); // Garantir que a tabela existe
      
      // Desativar todas as configurações anteriores
      await db.query(`
        UPDATE configuracao_entregas 
        SET ativa = false, updated_at = CURRENT_TIMESTAMP
        WHERE ativa = true
      `);
      
      // Criar nova configuração ativa
      const result = await db.query(`
        INSERT INTO configuracao_entregas (
          guia_id, 
          rotas_selecionadas, 
          itens_selecionados, 
          ativa
        ) 
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [
        data.guia_id,
        data.rotas_selecionadas,
        data.itens_selecionados,
        data.ativa
      ]);
      
      return result.rows[0];
    } catch (error) {
      console.error('❌ Erro ao criar configuração:', error);
      throw error;
    }
  }

  // Atualizar configuração existente
  async atualizarConfiguracao(id: number, data: Partial<CreateConfiguracaoData>): Promise<ConfiguracaoEntrega> {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      if (data.guia_id !== undefined) {
        fields.push(`guia_id = $${paramCount}`);
        values.push(data.guia_id);
        paramCount++;
      }

      if (data.rotas_selecionadas !== undefined) {
        fields.push(`rotas_selecionadas = $${paramCount}`);
        values.push(data.rotas_selecionadas);
        paramCount++;
      }

      if (data.itens_selecionados !== undefined) {
        fields.push(`itens_selecionados = $${paramCount}`);
        values.push(data.itens_selecionados);
        paramCount++;
      }

      if (data.ativa !== undefined) {
        fields.push(`ativa = $${paramCount}`);
        values.push(data.ativa);
        paramCount++;
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const result = await db.query(`
        UPDATE configuracao_entregas 
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `, values);

      return result.rows[0];
    } catch (error) {
      console.error('❌ Erro ao atualizar configuração:', error);
      throw error;
    }
  }

  // Deletar configuração
  async deletarConfiguracao(id: number): Promise<boolean> {
    try {
      const result = await db.query(`
        DELETE FROM configuracao_entregas 
        WHERE id = $1
      `, [id]);

      return result.rowCount > 0;
    } catch (error) {
      console.error('❌ Erro ao deletar configuração:', error);
      throw error;
    }
  }

  // Listar todas as configurações
  async listarConfiguracoes(): Promise<ConfiguracaoEntrega[]> {
    try {
      await this.criarTabela(); // Garantir que a tabela existe
      
      const result = await db.query(`
        SELECT * FROM configuracao_entregas 
        ORDER BY created_at DESC
      `);

      return result.rows;
    } catch (error) {
      console.error('❌ Erro ao listar configurações:', error);
      throw error;
    }
  }
}

export default new ConfiguracaoEntregaModel();