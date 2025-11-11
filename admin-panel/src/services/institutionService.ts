import api from './api';

export const institutionService = {
  async provisionComplete(data: any) {
    const response = await api.post('/provisioning/complete', data);
    return response.data;
  },

  async list(filters?: any) {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/institutions?${params}`);
    return response.data;
  },

  async getById(id: string) {
    const response = await api.get(`/institutions/${id}`);
    return response.data;
  },

  async update(id: string, data: any) {
    const response = await api.put(`/institutions/${id}`, data);
    return response.data;
  },

  async delete(id: string) {
    const response = await api.delete(`/institutions/${id}`);
    return response.data;
  },

  async getStats(id: string) {
    const response = await api.get(`/institutions/${id}/stats`);
    return response.data;
  },

  async getUsers(id: string) {
    const response = await api.get(`/institutions/${id}/users`);
    return response.data;
  },

  async getTenants(id: string) {
    const response = await api.get(`/institutions/${id}/tenants`);
    return response.data;
  },

  async createTenant(id: string, data: any) {
    const response = await api.post(`/provisioning/institutions/${id}/tenants`, data);
    return response.data;
  },

  async createUser(id: string, data: any) {
    const response = await api.post(`/provisioning/institutions/${id}/users`, data);
    return response.data;
  },

  async getHierarchy(id: string) {
    const response = await api.get(`/provisioning/institutions/${id}/hierarchy`);
    return response.data;
  },

  async removeUser(institutionId: string, userId: number) {
    const response = await api.delete(`/institutions/${institutionId}/users/${userId}`);
    return response.data;
  },
};
