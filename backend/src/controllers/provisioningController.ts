import { Request, Response } from 'express';
import { InstitutionProvisioningService } from '../services/institutionProvisioningService';
import db from '../database';

const provisioningService = new InstitutionProvisioningService(db.pool);

export class ProvisioningController {
  /**
   * Complete provisioning: Institution + Tenant + Admin User
   * POST /api/provisioning/complete
   */
  async provisionComplete(req: Request, res: Response) {
    const data = req.body;
    
    try {
      // Validate required fields
      if (!data.institution?.name || !data.institution?.slug) {
        return res.status(400).json({
          success: false,
          message: 'Dados da instituição são obrigatórios (name, slug)'
        });
      }

      if (!data.tenant?.name || !data.tenant?.slug) {
        return res.status(400).json({
          success: false,
          message: 'Dados do tenant são obrigatórios (name, slug)'
        });
      }

      if (!data.admin?.nome || !data.admin?.email || !data.admin?.senha) {
        return res.status(400).json({
          success: false,
          message: 'Dados do administrador são obrigatórios (nome, email, senha)'
        });
      }

      const result = await provisioningService.provisionComplete(data);

      res.status(201).json(result);
    } catch (error: any) {
      console.error('Erro no provisionamento completo:', error);
      console.error('Stack trace:', error.stack);
      console.error('Dados recebidos:', JSON.stringify(data, null, 2));
      
      // Handle specific errors
      if (error.message?.includes('duplicate key')) {
        return res.status(400).json({
          success: false,
          message: 'Slug, email ou CNPJ já está em uso',
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erro ao provisionar instituição',
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Create additional tenant for institution
   * POST /api/provisioning/institutions/:institutionId/tenants
   */
  async createTenant(req: Request, res: Response) {
    try {
      const { institutionId } = req.params;
      const tenantData = req.body;
      const userId = (req as any).user?.id;

      if (!tenantData.name || !tenantData.slug) {
        return res.status(400).json({
          success: false,
          message: 'Nome e slug do tenant são obrigatórios'
        });
      }

      const result = await provisioningService.createTenant(
        institutionId,
        tenantData,
        userId
      );

      res.status(201).json(result);
    } catch (error) {
      console.error('Erro ao criar tenant:', error);
      
      if (error.message?.includes('Limite')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      if (error.message?.includes('duplicate key')) {
        return res.status(400).json({
          success: false,
          message: 'Slug ou subdomínio já está em uso'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erro ao criar tenant',
        error: error.message
      });
    }
  }

  /**
   * Create user for institution
   * POST /api/provisioning/institutions/:institutionId/users
   */
  async createUser(req: Request, res: Response) {
    try {
      const { institutionId } = req.params;
      const userData = req.body;
      const creatorUserId = (req as any).systemAdmin?.id || (req as any).user?.id;

      if (!userData.nome || !userData.email || !userData.senha) {
        return res.status(400).json({
          success: false,
          message: 'Nome, email e senha são obrigatórios'
        });
      }

      const result = await provisioningService.createUser(
        institutionId,
        userData,
        creatorUserId
      );

      res.status(201).json(result);
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      
      if (error.message?.includes('Limite')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      if (error.message?.includes('duplicate key')) {
        return res.status(400).json({
          success: false,
          message: 'Email já está em uso'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erro ao criar usuário',
        error: error.message
      });
    }
  }

  /**
   * Get complete institution hierarchy
   * GET /api/provisioning/institutions/:institutionId/hierarchy
   */
  async getHierarchy(req: Request, res: Response) {
    try {
      const { institutionId } = req.params;

      const hierarchy = await provisioningService.getHierarchy(institutionId);

      if (!hierarchy) {
        return res.status(404).json({
          success: false,
          message: 'Instituição não encontrada'
        });
      }

      res.json({
        success: true,
        data: hierarchy
      });
    } catch (error) {
      console.error('Erro ao buscar hierarquia:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar hierarquia',
        error: error.message
      });
    }
  }
}

export default new ProvisioningController();
