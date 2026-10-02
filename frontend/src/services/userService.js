import api from './api';

export const userService = {
  async getUsers(params = {}) {
    const response = await api.get('/users/', { params });
    return response.data;
  },

  async createUser(userData) {
    const response = await api.post('/users/', userData);
    return response.data;
  },

  async updateUser(userId, userData) {
    const response = await api.put(`/users/${userId}/`, userData);
    return response.data;
  },

  async deleteUser(userId) {
    const response = await api.delete(`/users/${userId}/`);
    return response.data;
  },
};
