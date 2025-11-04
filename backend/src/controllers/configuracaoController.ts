import { Request, Response } from 'express';
import { setTenantContextFromRequest } from '../utils/tenantContext';
import db from '../database';

interface ConfiguracaoSistema {
  id?: number;
  chave: string;
  valor: string;
  descricao?: string;
  tipo: 'string' | 'boolean' | 'number' | 'json';
  categoria: string;
  created_at?: string;
  updated_at?: string;
}

class ConfiguracaoController {
  constructor() {
    // Usar db diretamente
  }

  // Buscar configuração específica
  async buscarConfiguracao(req: Request, res: Response) {
    try {
      const { chave } = req.params;

      // Configurar contexto de tenant
      await setTenantContextFromRequest(req);

      const query = `
        SELECT * FROM configuracoes_sistema 
        WHERE chave = $1
      `;
      
      const result = await db.query(query, [chave]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Configuração não encontrada' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Erro ao buscar configuração:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Criar nova configuração
  async criarConfiguracao(req: Request, res: Response) {
    try {
      const { chave, valor, descricao, tipo, categoria } = req.body;

      // Configurar contexto de tenant
      await setTenantContextFromRequest(req);

      // Validar se tenant está presente
      if (!req.tenant?.id) {
        return res.status(400).json({ error: 'Contexto de tenant não encontrado' });
      }

      // Verificar se já existe para este tenant
      const existeQuery = 'SELECT id FROM configuracoes_sistema WHERE chave = $1 AND tenant_id = $2';
      const existe = await db.query(existeQuery, [chave, req.tenant.id]);

      if (existe.rows.length > 0) {
        return res.status(400).json({ error: 'Configuração já existe para este tenant' });
      }

      const query = `
        INSERT INTO configuracoes_sistema (chave, valor, descricao, tipo, categoria, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const result = await db.query(query, [
        chave,
        valor,
        descricao || null,
        tipo || 'string',
        categoria || 'geral',
        req.tenant.id
      ]);

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Erro ao criar configuração:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Atualizar configuração
  async atualizarConfiguracao(req: Request, res: Response) {
    try {
      const { chave } = req.params;
      const { valor, descricao } = req.body;

      // Configurar contexto de tenant
      await setTenantContextFromRequest(req);

      const query = `
        UPDATE configuracoes_sistema 
        SET valor = $1, descricao = COALESCE($2, descricao), updated_at = CURRENT_TIMESTAMP
        WHERE chave = $3
        RETURNING *
      `;

      const result = await db.query(query, [valor, descricao, chave]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Configuração não encontrada' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Listar configurações por categoria
  async listarPorCategoria(req: Request, res: Response) {
    try {
      const { categoria } = req.params;

      // Configurar contexto de tenant
      await setTenantContextFromRequest(req);

      const query = `
        SELECT * FROM configuracoes_sistema 
        WHERE categoria = $1
        ORDER BY chave
      `;

      const result = await db.query(query, [categoria]);
      res.json(result.rows);
    } catch (error) {
      console.error('Erro ao listar configurações:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Criar ou atualizar configuração (upsert)
  async salvarConfiguracao(req: Request, res: Response) {
    try {
      const { chave, valor, descricao, tipo, categoria } = req.body;

      // Configurar contexto de tenant
      await setTenantContextFromRequest(req);

      // Validar se tenant está presente
      if (!req.tenant?.id) {
        return res.status(400).json({ error: 'Contexto de tenant não encontrado' });
      }

      const query = `
        INSERT INTO configuracoes_sistema (chave, valor, descricao, tipo, categoria, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (chave, tenant_id) 
        DO UPDATE SET 
          valor = EXCLUDED.valor,
          descricao = COALESCE(EXCLUDED.descricao, configuracoes_sistema.descricao),
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;

      const result = await db.query(query, [
        chave,
        valor,
        descricao || null,
        tipo || 'string',
        categoria || 'geral',
        req.tenant.id
      ]);

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Deletar configuração
  async deletarConfiguracao(req: Request, res: Response) {
    try {
      const { chave } = req.params;

      // Configurar contexto de tenant
      await setTenantContextFromRequest(req);

      const query = 'DELETE FROM configuracoes_sistema WHERE chave = $1 RETURNING *';
      const result = await db.query(query, [chave]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Configuração não encontrada' });
      }

      res.json({ message: 'Configuração deletada com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar configuração:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Listar todas as configurações
  async listarTodas(req: Request, res: Response) {
    try {
      // Configurar contexto de tenant
      await setTenantContextFromRequest(req);

      const query = `
        SELECT * FROM configuracoes_sistema 
        ORDER BY categoria, chave
      `;

      const result = await db.query(query);
      res.json(result.rows);
    } catch (error) {
      console.error('Erro ao listar configurações:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

export default new ConfiguracaoController();