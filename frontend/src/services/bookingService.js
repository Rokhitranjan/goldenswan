import api from './api';

export const bookingService = {
  async getBookings(params = {}) {
    const response = await api.get('/bookings/', { params });
    return response.data;
  },

  async getBookingById(id) {
    const response = await api.get(`/bookings/${id}/`);
    return response.data;
  },

  async createBooking(bookingData) {
    const response = await api.post('/bookings/', bookingData);
    return response.data;
  },

  async checkIn(checkInData) {
    const response = await api.post('/check-in/', checkInData);
    return response.data;
  },

  async checkOut(checkOutData) {
    const response = await api.post('/check-out/', checkOutData);
    return response.data;
  },

  async cancelBooking(id, reason = '') {
    const response = await api.post(`/bookings/${id}/cancel/`, { reason });
    return response.data;
  },

  async getCustomers(search = '') {
    const response = await api.get('/customers/', { params: { search } });
    return response.data;
  },

  async createCustomer(customerData) {
    const response = await api.post('/customers/', customerData);
    return response.data;
  },
};
