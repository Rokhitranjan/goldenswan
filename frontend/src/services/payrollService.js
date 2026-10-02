import api from './api';

export const payrollService = {
  async getPayroll(year, month) {
    const response = await api.get('/payroll/', { params: { year, month } });
    return response.data;
  },

  async processPayroll(data) {
    const response = await api.post('/payroll/process/', data);
    return response.data;
  },

  async markPaid(payrollId, paymentMode = 'BANK_TRANSFER') {
    const response = await api.post(`/payroll/${payrollId}/pay/`, { payment_mode: paymentMode });
    return response.data;
  },
};
