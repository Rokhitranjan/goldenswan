import api from './api';

export const staffService = {
  async getStaff(params = {}) {
    const response = await api.get('/staff/', { params });
    return response.data;
  },

  async createStaff(data) {
    const response = await api.post('/staff/', data);
    return response.data;
  },

  async getAttendance(date) {
    const response = await api.get('/attendance/', { params: { date } });
    return response.data;
  },

  async markAttendance(data) {
    const response = await api.post('/attendance/', data);
    return response.data;
  },

  async getAttendanceStats(date) {
    const response = await api.get('/attendance/stats/', { params: { date } });
    return response.data;
  },
};
