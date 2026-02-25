import { Request, Response } from 'express';
import { InstitutionProvisioningService } from '../services/institutionProvisioningService';
import db from '../database';

const provisioningService = new InstitutionProvisioningService(db.pool);

export class ProvisioningController {
  /**
   * Complete provisioning: Institution + Admin User
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
   * Create user for institution
   * POST /api/provisioning/institutions/:institutionId/users
   */
  async createUser(req: Request, res: Response) {
    try {
      const { institutionId } = req.params;
      const userData = req.body;
      const creatorUserId = (req as any).systemAdmin?.id || (req as any).user?.id;

      console.log('📝 [CREATE USER] Dados recebidos:', {
        institutionId,
        userData: { ...userData, senha: '***' },
        creatorUserId,
        headers: req.headers.authorization ? 'Token presente' : 'Sem token'
      });

      if (!userData.nome || !userData.email || !userData.senha) {
        console.log('❌ [CREATE USER] Validação falhou - campos obrigatórios faltando');
        return res.status(400).json({
          success: false,
          message: 'Nome, email e senha são obrigatórios'
        });
      }

      console.log('🔄 [CREATE USER] Chamando provisioningService.createUser...');
      const result = await provisioningService.createUser(
        institutionId,
        userData,
        creatorUserId
      );

      console.log('✅ [CREATE USER] Usuário criado com sucesso:', result.data?.id);
      res.status(201).json(result);
    } catch (error: any) {
      console.error('❌ [CREATE USER] Erro ao criar usuário:', error);
      console.error('❌ [CREATE USER] Mensagem:', error.message);
      console.error('❌ [CREATE USER] Stack:', error.stack);
      console.error('❌ [CREATE USER] Código:', error.code);
      
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
        error: error.message,
        code: error.code,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
