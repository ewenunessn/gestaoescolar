import { Pool } from 'pg';
import { InstitutionModel } from '../models/Institution';
import bcrypt from 'bcryptjs';

interface ProvisionInstitutionData {
  // Institution data
  institution: {
    name: string;
    slug: string;
    legal_name?: string;
    document_number?: string;
    type?: 'prefeitura' | 'secretaria' | 'organizacao' | 'empresa';
    email?: string;
    phone?: string;
    plan_id?: string;
    address?: {
      street?: string;
      number?: string;
      complement?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
      zipcode?: string;
    };
  };
  
  // Admin user
  admin: {
    nome: string;
    email: string;
    senha: string;
  };
}

export class InstitutionProvisioningService {
  private institutionModel: InstitutionModel;

  constructor(private db: Pool) {
    this.institutionModel = new InstitutionModel(db);
  }

  /**
   * Complete provisioning flow:
   * 1. Create institution
   * 2. Create admin user
   * 3. Link user to institution
   */
  async provisionComplete(data: ProvisionInstitutionData): Promise<any> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // 1. Create institution
      const institutionQuery = `
        INSERT INTO institutions (
          slug, name, legal_name, document_number, type, status,
          email, phone, plan_id,
          address_street, address_number, address_complement,
          address_neighborhood, address_city, address_state, address_zipcode
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
      `;
      
      const institutionValues = [
        data.institution.slug,
        data.institution.name,
        data.institution.legal_name,
        data.institution.document_number,
        data.institution.type || 'prefeitura',
        'active',
        data.institution.email,
        data.institution.phone,
        data.institution.plan_id || null,
        data.institution.address?.street,
        data.institution.address?.number,
        data.institution.address?.complement,
        data.institution.address?.neighborhood,
        data.institution.address?.city,
        data.institution.address?.state,
        data.institution.address?.zipcode
      ];
      
      const institutionResult = await client.query(institutionQuery, institutionValues);
      const institution = institutionResult.rows[0];

      // 2. Create admin user (salt 8 para melhor performance no Vercel)
      const hashedPassword = await bcrypt.hash(data.admin.senha, 8);
      
      const userQuery = `
        INSERT INTO usuarios (
          nome, email, senha, tipo, ativo, institution_id
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, nome, email, tipo, ativo, institution_id, created_at
      `;
      
      const userValues = [
        data.admin.nome,
        data.admin.email,
        hashedPassword,
        'admin',
        true,
        institution.id
      ];
      
      const userResult = await client.query(userQuery, userValues);
      const user = userResult.rows[0];

      // 3. Link user to institution with admin role
      const institutionUserQuery = `
        INSERT INTO institution_users (
          institution_id, user_id, role, status
        ) VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      
      const institutionUserResult = await client.query(institutionUserQuery, [
        institution.id,
        user.id,
        'institution_admin',
        'active'
      ]);

      // 4. Create audit log
      await client.query(`
        INSERT INTO institution_audit_log (
          institution_id, operation, entity_type, entity_id, new_values, user_id
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        institution.id,
        'CREATE',
        'institution_provisioning',
        institution.id,
        JSON.stringify({
          institution: institution.name,
          admin: user.email
        }),
        user.id
      ]);

      await client.query('COMMIT');

      return {
        success: true,
        message: 'Instituição provisionada com sucesso',
        data: {
          institution: {
            id: institution.id,
            slug: institution.slug,
            name: institution.name,
            status: institution.status
          },
          admin: {
            id: user.id,
            nome: user.nome,
            email: user.email,
            tipo: user.tipo
          }
        }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro no provisionamento:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Create user for institution
  async createUser(institutionId: string, userData: any, creatorUserId: number): Promise<any> {
    console.log('🔧 [SERVICE] createUser iniciado:', { institutionId, creatorUserId });
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      console.log('🔧 [SERVICE] Transação iniciada');

      // Check institution exists and limits
      console.log('🔧 [SERVICE] Verificando instituição...');
      const institutionResult = await client.query(
        'SELECT * FROM institutions WHERE id = $1',
        [institutionId]
      );
      
      if (institutionResult.rows.length === 0) {
        console.log('❌ [SERVICE] Instituição não encontrada:', institutionId);
        throw new Error('Instituição não encontrada');
      }

      const institution = institutionResult.rows[0];
      console.log('✅ [SERVICE] Instituição encontrada:', institution.name);

      // Check user limit
      console.log('🔧 [SERVICE] Verificando limite de usuários...');
      const userCountResult = await client.query(
        'SELECT COUNT(*) as count FROM institution_users WHERE institution_id = $1 AND status = $2',
        [institutionId, 'active']
      );
      
      const userCount = parseInt(userCountResult.rows[0].count);
      const maxUsers = institution.limits?.max_users || 100;
      console.log(`🔧 [SERVICE] Usuários: ${userCount}/${maxUsers}`);

      if (userCount >= maxUsers) {
        console.log('❌ [SERVICE] Limite de usuários atingido');
        throw new Error(`Limite de ${maxUsers} usuários atingido para esta instituição`);
      }

      // Hash password (salt 8 para melhor performance no Vercel)
      console.log('🔧 [SERVICE] Gerando hash da senha...');
      const hashedPassword = await bcrypt.hash(userData.senha, 8);

      // Create user
      console.log('🔧 [SERVICE] Criando usuário no banco...');
      const userQuery = `
        INSERT INTO usuarios (
          nome, email, senha, tipo, ativo, institution_id
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, nome, email, tipo, ativo, institution_id, created_at
      `;
      
      const userValues = [
        userData.nome,
        userData.email,
        hashedPassword,
        userData.tipo || 'usuario',
        true,
        institutionId
      ];
      
      const userResult = await client.query(userQuery, userValues);
      const user = userResult.rows[0];
      console.log('✅ [SERVICE] Usuário criado:', user.id);

      // Link to institution
      console.log('🔧 [SERVICE] Vinculando usuário à instituição...');
      await client.query(`
        INSERT INTO institution_users (
          institution_id, user_id, role, status
        ) VALUES ($1, $2, $3, $4)
      `, [
        institutionId,
        user.id,
        userData.institution_role || 'user',
        'active'
      ]);
      console.log('✅ [SERVICE] Vínculo com instituição criado');

      // Create audit log
      console.log('🔧 [SERVICE] Criando log de auditoria...');
      console.log('🔧 [SERVICE] creatorUserId:', creatorUserId, 'tipo:', typeof creatorUserId);
      await client.query(`
        INSERT INTO institution_audit_log (
          institution_id, operation, entity_type, entity_id, new_values, user_id
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        institutionId,
        'CREATE',
        'user',
        user.id.toString(),
        JSON.stringify({ email: user.email, nome: user.nome }),
        creatorUserId || null // Garantir que seja null se undefined
      ]);
      console.log('✅ [SERVICE] Log de auditoria criado');

      await client.query('COMMIT');
      console.log('✅ [SERVICE] Transação commitada com sucesso');

      return {
        success: true,
        message: 'Usuário criado com sucesso',
        data: user
      };
    } catch (error) {
      console.error('❌ [SERVICE] Erro durante criação:', error);
      await client.query('ROLLBACK');
      console.log('🔄 [SERVICE] Transação revertida');
      throw error;
    } finally {
      client.release();
      console.log('🔧 [SERVICE] Conexão liberada');
    }
  }

  /**
   * Get complete institution hierarchy
   */
  async getHierarchy(institutionId: string): Promise<any> {
    const query = `
      SELECT 
        i.id as institution_id,
        i.name as institution_name,
        i.slug as institution_slug,
        i.status as institution_status,
        json_agg(
          DISTINCT jsonb_build_object(
            'id', u.id,
            'nome', u.nome,
            'email', u.email,
            'tipo', u.tipo,
            'institution_role', iu.role
          )
        ) FILTER (WHERE u.id IS NOT NULL) as users
      FROM institutions i
      LEFT JOIN institution_users iu ON iu.institution_id = i.id AND iu.status = 'active'
      LEFT JOIN usuarios u ON u.id = iu.user_id
      WHERE i.id = $1
      GROUP BY i.id, i.name, i.slug, i.status
    `;
    
    const result = await this.db.query(query, [institutionId]);
    return result.rows[0] || null;
  }
}
