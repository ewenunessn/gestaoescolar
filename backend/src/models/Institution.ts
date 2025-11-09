import { Pool } from 'pg';

export interface Institution {
  id: string;
  slug: string;
  name: string;
  legal_name?: string;
  document_number?: string;
  type: 'prefeitura' | 'secretaria' | 'organizacao' | 'empresa';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  
  // Contact
  email?: string;
  phone?: string;
  website?: string;
  
  // Address
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_zipcode?: string;
  address_country?: string;
  
  // Settings
  settings?: any;
  limits?: {
    max_tenants?: number;
    max_users?: number;
    max_schools?: number;
  };
  metadata?: any;
  
  created_at?: Date;
  updated_at?: Date;
}

export interface InstitutionUser {
  id: string;
  institution_id: string;
  user_id: number;
  role: 'institution_admin' | 'manager' | 'user';
  permissions?: any;
  status: 'active' | 'inactive' | 'suspended';
  created_at?: Date;
  updated_at?: Date;
}

export interface InstitutionContract {
  id: string;
  institution_id: string;
  contract_number: string;
  contract_type: 'service' | 'license' | 'trial';
  status: 'active' | 'inactive' | 'expired' | 'cancelled';
  start_date: Date;
  end_date?: Date;
  value?: number;
  payment_frequency?: 'monthly' | 'quarterly' | 'yearly' | 'one_time';
  features?: any;
  limits?: any;
  notes?: string;
  metadata?: any;
  created_at?: Date;
  updated_at?: Date;
}

export class InstitutionModel {
  constructor(private db: Pool) {}

  // Create institution
  async create(data: Partial<Institution>): Promise<Institution> {
    const query = `
      INSERT INTO institutions (
        slug, name, legal_name, document_number, type, status,
        email, phone, website,
        address_street, address_number, address_complement,
        address_neighborhood, address_city, address_state,
        address_zipcode, address_country,
        settings, limits, metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
      )
      RETURNING *
    `;
    
    const values = [
      data.slug,
      data.name,
      data.legal_name,
      data.document_number,
      data.type || 'prefeitura',
      data.status || 'pending',
      data.email,
      data.phone,
      data.website,
      data.address_street,
      data.address_number,
      data.address_complement,
      data.address_neighborhood,
      data.address_city,
      data.address_state,
      data.address_zipcode,
      data.address_country || 'BR',
      JSON.stringify(data.settings || {}),
      JSON.stringify(data.limits || { max_tenants: 5, max_users: 100, max_schools: 50 }),
      JSON.stringify(data.metadata || {})
    ];
    
    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  // Get institution by ID
  async findById(id: string): Promise<Institution | null> {
    const query = 'SELECT * FROM institutions WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  // Get institution by slug
  async findBySlug(slug: string): Promise<Institution | null> {
    const query = 'SELECT * FROM institutions WHERE slug = $1';
    const result = await this.db.query(query, [slug]);
    return result.rows[0] || null;
  }

  // Get institution by document number
  async findByDocument(documentNumber: string): Promise<Institution | null> {
    const query = 'SELECT * FROM institutions WHERE document_number = $1';
    const result = await this.db.query(query, [documentNumber]);
    return result.rows[0] || null;
  }

  // List all institutions
  async findAll(filters?: { status?: string; type?: string }): Promise<Institution[]> {
    let query = 'SELECT * FROM institutions WHERE 1=1';
    const values: any[] = [];
    let paramCount = 1;

    if (filters?.status) {
      query += ` AND status = $${paramCount}`;
      values.push(filters.status);
      paramCount++;
    }

    if (filters?.type) {
      query += ` AND type = $${paramCount}`;
      values.push(filters.type);
      paramCount++;
    }

    query += ' ORDER BY name';
    
    const result = await this.db.query(query, values);
    return result.rows;
  }

  // Update institution
  async update(id: string, data: Partial<Institution>): Promise<Institution | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    const updateableFields = [
      'name', 'legal_name', 'document_number', 'type', 'status',
      'email', 'phone', 'website',
      'address_street', 'address_number', 'address_complement',
      'address_neighborhood', 'address_city', 'address_state',
      'address_zipcode', 'address_country',
      'settings', 'limits', 'metadata', 'plan_id'
    ];

    for (const field of updateableFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = $${paramCount}`);
        values.push(['settings', 'limits', 'metadata'].includes(field) 
          ? JSON.stringify(data[field]) 
          : data[field]
        );
        paramCount++;
      }
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const query = `
      UPDATE institutions 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows[0] || null;
  }

  // Delete institution (soft delete by setting status to inactive)
  async delete(id: string): Promise<boolean> {
    const query = `
      UPDATE institutions 
      SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    const result = await this.db.query(query, [id]);
    return result.rowCount > 0;
  }

  // Get institution statistics
  async getStats(institutionId: string): Promise<any> {
    const query = `
      SELECT 
        i.id,
        i.name,
        i.status,
        COUNT(DISTINCT t.id) as total_tenants,
        COUNT(DISTINCT iu.user_id) as total_users,
        COUNT(DISTINCT e.id) as total_schools
      FROM institutions i
      LEFT JOIN tenants t ON t.institution_id = i.id
      LEFT JOIN institution_users iu ON iu.institution_id = i.id AND iu.status = 'active'
      LEFT JOIN escolas e ON e.tenant_id IN (SELECT id FROM tenants WHERE institution_id = i.id)
      WHERE i.id = $1
      GROUP BY i.id, i.name, i.status
    `;
    
    const result = await this.db.query(query, [institutionId]);
    return result.rows[0] || null;
  }

  // Add user to institution
  async addUser(institutionId: string, userId: number, role: string = 'user'): Promise<InstitutionUser> {
    const query = `
      INSERT INTO institution_users (institution_id, user_id, role, status)
      VALUES ($1, $2, $3, 'active')
      ON CONFLICT (institution_id, user_id) 
      DO UPDATE SET role = $3, status = 'active', updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const result = await this.db.query(query, [institutionId, userId, role]);
    return result.rows[0];
  }

  // Remove user from institution
  async removeUser(institutionId: string, userId: number): Promise<boolean> {
    const query = `
      UPDATE institution_users 
      SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
      WHERE institution_id = $1 AND user_id = $2
    `;
    const result = await this.db.query(query, [institutionId, userId]);
    return result.rowCount > 0;
  }

  // Get institution users
  async getUsers(institutionId: string): Promise<any[]> {
    const query = `
      SELECT 
        iu.*,
        u.nome as user_name,
        u.email as user_email,
        u.tipo as user_type
      FROM institution_users iu
      JOIN usuarios u ON u.id = iu.user_id
      WHERE iu.institution_id = $1 AND iu.status = 'active'
      ORDER BY u.nome
    `;
    
    const result = await this.db.query(query, [institutionId]);
    return result.rows;
  }

  // Get institution tenants
  async getTenants(institutionId: string): Promise<any[]> {
    const query = `
      SELECT * FROM tenants 
      WHERE institution_id = $1 
      ORDER BY name
    `;
    
    const result = await this.db.query(query, [institutionId]);
    return result.rows;
  }
}
