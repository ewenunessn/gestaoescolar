import api from './api';

export interface Institution {
  id: string;
  slug: string;
  name: string;
  legal_name?: string;
  document_number?: string;
  type: 'prefeitura' | 'secretaria' | 'organizacao' | 'empresa';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  email?: string;
  phone?: string;
  website?: string;
  address_street?: string;
  address_number?: string;
  address_city?: string;
  address_state?: string;
  address_zipcode?: string;
  settings?: any;
  limits?: {
    max_tenants?: number;
    max_users?: number;
    max_schools?: number;
  };
  created_at?: string;
  updated_at?: string;
}

export interface ProvisionData {
  institution: {
    name: string;
    slug: string;
    legal_name?: string;
    document_number?: string;
    type?: string;
    email?: string;
    phone?: string;
    address?: {
      street?: string;
      number?: string;
      city?: string;
      state?: string;
      zipcode?: string;
    };
  };
  tenant: {
    name: string;
    slug: string;
    subdomain?: string;
  };
  admin: {
    nome: string;
    email: string;
    senha: string;
  };
}

export const institutionService = {
  // Provisionar instituição completa
  async provisionComplete(data: ProvisionData) {
    const response = await api.post('/provisioning/complete', data);
    return response.data;
  },

  // Listar instituições
  async list(filters?: { status?: string; type?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    
    const response = await api.get(`/institutions?${params.toString()}`);
    return response.data;
  },

  // Buscar instituição por ID
  async getById(id: string) {
    const response = await api.get(`/institutions/${id}`);
    return response.data;
  },

  // Buscar instituição por slug
  async getBySlug(slug: string) {
    const response = await api.get(`/institutions/slug/${slug}`);
    return response.data;
  },

  // Atualizar instituição
  async update(id: string, data: Partial<Institution>) {
    const response = await api.put(`/institutions/${id}`, data);
    return response.data;
  },

  // Desativar instituição
  async delete(id: string) {
    const response = await api.delete(`/institutions/${id}`);
    return response.data;
  },

  // Estatísticas da instituição
  async getStats(id: string) {
    const response = await api.get(`/institutions/${id}/stats`);
    return response.data;
  },

  // Usuários da instituição
  async getUsers(id: string) {
    const response = await api.get(`/institutions/${id}/users`);
    return response.data;
  },

  async addUser(id: string, data: { user_id: number; role: string }) {
    const response = await api.post(`/institutions/${id}/users`, data);
    return response.data;
  },

  async removeUser(id: string, userId: number) {
    const response = await api.delete(`/institutions/${id}/users/${userId}`);
    return response.data;
  },

  // Tenants da instituição
  async getTenants(id: string) {
    const response = await api.get(`/institutions/${id}/tenants`);
    return response.data;
  },

  async createTenant(id: string, data: { name: string; slug: string; subdomain?: string }) {
    const response = await api.post(`/provisioning/institutions/${id}/tenants`, data);
    return response.data;
  },

  // Criar usuário na instituição
  async createUser(id: string, data: any) {
    const response = await api.post(`/provisioning/institutions/${id}/users`, data);
    return response.data;
  },

  // Hierarquia completa
  async getHierarchy(id: string) {
    const response = await api.get(`/provisioning/institutions/${id}/hierarchy`);
    return response.data;
  },
};
