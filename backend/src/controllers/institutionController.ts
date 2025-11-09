import { Request, Response } from 'express';
import { InstitutionModel } from '../models/Institution';
import db from '../database';

const institutionModel = new InstitutionModel(db.pool);

export class InstitutionController {
  // Create new institution
  async create(req: Request, res: Response) {
    try {
      const institutionData = req.body;

      // Validate required fields
      if (!institutionData.name || !institutionData.slug) {
        return res.status(400).json({
          success: false,
          message: 'Nome e slug são obrigatórios'
        });
      }

      // Check if slug already exists
      const existingSlug = await institutionModel.findBySlug(institutionData.slug);
      if (existingSlug) {
        return res.status(400).json({
          success: false,
          message: 'Slug já está em uso'
        });
      }

      // Check if document number already exists
      if (institutionData.document_number) {
        const existingDoc = await institutionModel.findByDocument(institutionData.document_number);
        if (existingDoc) {
          return res.status(400).json({
            success: false,
            message: 'CNPJ já está cadastrado'
          });
        }
      }

      const institution = await institutionModel.create(institutionData);

      res.status(201).json({
        success: true,
        message: 'Instituição criada com sucesso',
        data: institution
      });
    } catch (error) {
      console.error('Erro ao criar instituição:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao criar instituição',
        error: error.message
      });
    }
  }

  // Get institution by ID
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const institution = await institutionModel.findById(id);

      if (!institution) {
        return res.status(404).json({
          success: false,
          message: 'Instituição não encontrada'
        });
      }

      res.json({
        success: true,
        data: institution
      });
    } catch (error) {
      console.error('Erro ao buscar instituição:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar instituição',
        error: error.message
      });
    }
  }

  // Get institution by slug
  async getBySlug(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      const institution = await institutionModel.findBySlug(slug);

      if (!institution) {
        return res.status(404).json({
          success: false,
          message: 'Instituição não encontrada'
        });
      }

      res.json({
        success: true,
        data: institution
      });
    } catch (error) {
      console.error('Erro ao buscar instituição:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar instituição',
        error: error.message
      });
    }
  }

  // List all institutions
  async list(req: Request, res: Response) {
    try {
      const { status, type } = req.query;
      
      const filters: any = {};
      if (status) filters.status = status;
      if (type) filters.type = type;

      const institutions = await institutionModel.findAll(filters);

      res.json({
        success: true,
        data: institutions,
        total: institutions.length
      });
    } catch (error) {
      console.error('Erro ao listar instituições:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar instituições',
        error: error.message
      });
    }
  }

  // Update institution
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const institution = await institutionModel.findById(id);
      if (!institution) {
        return res.status(404).json({
          success: false,
          message: 'Instituição não encontrada'
        });
      }

      // Check slug uniqueness if being updated
      if (updateData.slug && updateData.slug !== institution.slug) {
        const existingSlug = await institutionModel.findBySlug(updateData.slug);
        if (existingSlug) {
          return res.status(400).json({
            success: false,
            message: 'Slug já está em uso'
          });
        }
      }

      const updated = await institutionModel.update(id, updateData);

      res.json({
        success: true,
        message: 'Instituição atualizada com sucesso',
        data: updated
      });
    } catch (error) {
      console.error('Erro ao atualizar instituição:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar instituição',
        error: error.message
      });
    }
  }

  // Delete institution
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const institution = await institutionModel.findById(id);
      if (!institution) {
        return res.status(404).json({
          success: false,
          message: 'Instituição não encontrada'
        });
      }

      await institutionModel.delete(id);

      res.json({
        success: true,
        message: 'Instituição desativada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao deletar instituição:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao deletar instituição',
        error: error.message
      });
    }
  }

  // Get institution statistics
  async getStats(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const stats = await institutionModel.getStats(id);
      if (!stats) {
        return res.status(404).json({
          success: false,
          message: 'Instituição não encontrada'
        });
      }

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar estatísticas',
        error: error.message
      });
    }
  }

  // Add user to institution
  async addUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { user_id, role } = req.body;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: 'ID do usuário é obrigatório'
        });
      }

      const institution = await institutionModel.findById(id);
      if (!institution) {
        return res.status(404).json({
          success: false,
          message: 'Instituição não encontrada'
        });
      }

      const institutionUser = await institutionModel.addUser(id, user_id, role || 'user');

      res.status(201).json({
        success: true,
        message: 'Usuário adicionado à instituição',
        data: institutionUser
      });
    } catch (error) {
      console.error('Erro ao adicionar usuário:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao adicionar usuário',
        error: error.message
      });
    }
  }

  // Remove user from institution
  async removeUser(req: Request, res: Response) {
    try {
      const { id, userId } = req.params;

      const institution = await institutionModel.findById(id);
      if (!institution) {
        return res.status(404).json({
          success: false,
          message: 'Instituição não encontrada'
        });
      }

      await institutionModel.removeUser(id, parseInt(userId));

      res.json({
        success: true,
        message: 'Usuário removido da instituição'
      });
    } catch (error) {
      console.error('Erro ao remover usuário:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao remover usuário',
        error: error.message
      });
    }
  }

  // Get institution users
  async getUsers(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const institution = await institutionModel.findById(id);
      if (!institution) {
        return res.status(404).json({
          success: false,
          message: 'Instituição não encontrada'
        });
      }

      const users = await institutionModel.getUsers(id);

      res.json({
        success: true,
        data: users,
        total: users.length
      });
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar usuários',
        error: error.message
      });
    }
  }

  // Get institution tenants
  async getTenants(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const institution = await institutionModel.findById(id);
      if (!institution) {
        return res.status(404).json({
          success: false,
          message: 'Instituição não encontrada'
        });
      }

      const tenants = await institutionModel.getTenants(id);

      res.json({
        success: true,
        data: tenants,
        total: tenants.length
      });
    } catch (error) {
      console.error('Erro ao buscar tenants:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar tenants',
        error: error.message
      });
    }
  }
}

export default new InstitutionController();
