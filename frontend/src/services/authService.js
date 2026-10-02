import api from './api';

export const authService = {
  async login(email, password) {
    const response = await api.post('/auth/login/', { email, password });
    if (response.data.success && response.data.data.tokens) {
      localStorage.setItem('goldenswan_token', response.data.data.tokens.access_token);
      localStorage.setItem('goldenswan_user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me/');
    return response.data;
  },

  async changePassword(oldPassword, newPassword) {
    const response = await api.post('/auth/change-password/', {
      old_password: oldPassword,
      new_password: newPassword,
    });
    return response.data;
  },

  logout() {
    localStorage.removeItem('goldenswan_token');
    localStorage.removeItem('goldenswan_user');
  },

  getUser() {
    const userStr = localStorage.getItem('goldenswan_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated() {
    return !!localStorage.getItem('goldenswan_token');
  },
};
