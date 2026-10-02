import api from './api';

export const expenseService = {
  async getDailyExpenses(params = {}) {
    const response = await api.get('/expenses/', { params });
    return response.data;
  },

  async createDailyExpense(data) {
    const response = await api.post('/expenses/', data);
    return response.data;
  },

  async deleteDailyExpense(id) {
    const response = await api.delete(`/expenses/${id}/`);
    return response.data;
  },

  async getExpenseCategories() {
    const response = await api.get('/expense-categories/');
    return response.data;
  },

  async createExpenseCategory(data) {
    const response = await api.post('/expense-categories/', data);
    return response.data;
  },

  async getCategorySummary() {
    const response = await api.get('/expenses/categories-summary/');
    return response.data;
  },

  // Site Expenses & Vendors
  async getVendors() {
    const response = await api.get('/vendors/');
    return response.data;
  },

  async createVendor(data) {
    const response = await api.post('/vendors/', data);
    return response.data;
  },

  async getSiteExpenses(params = {}) {
    const response = await api.get('/site-expenses/', { params });
    return response.data;
  },

  async createSiteExpense(data) {
    const response = await api.post('/site-expenses/', data);
    return response.data;
  },

  async getSiteExpenseStats() {
    const response = await api.get('/site-expenses/stats/');
    return response.data;
  },
};
