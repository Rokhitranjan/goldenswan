import api from './api';

export const paymentService = {
  async getPayments(params = {}) {
    const response = await api.get('/payments/', { params });
    return response.data;
  },

  async recordPayment(paymentData) {
    const response = await api.post('/payments/', paymentData);
    return response.data;
  },

  async getBookingPayments(bookingId) {
    const response = await api.get(`/payments/by-booking/${bookingId}/`);
    return response.data;
  },
};
