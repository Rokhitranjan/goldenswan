import api from './api';

export const dashboardService = {
  async getOverview() {
    const response = await api.get('/dashboard/overview/');
    return response.data;
  },

  async getRevenueTrend() {
    const response = await api.get('/dashboard/revenue-trend/');
    return response.data;
  },

  async getRecentActivity() {
    const response = await api.get('/dashboard/recent-activity/');
    return response.data;
  },

  async getNotifications() {
    const response = await api.get('/notifications/');
    return response.data;
  },

  async markAllNotificationsRead() {
    const response = await api.post('/notifications/read-all/');
    return response.data;
  },
};
