import api from './api';

export const planService = {
  async list() {
    const response = await api.get('/plans');
    return response.data;
  },

  async getById(id: string) {
    const response = await api.get(`/plans/${id}`);
    return response.data;
  },
};
