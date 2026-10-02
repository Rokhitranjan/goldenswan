import api from './api';

export const roomService = {
  async getRooms(params = {}) {
    const response = await api.get('/rooms/', { params });
    return response.data;
  },

  async getRoomById(id) {
    const response = await api.get(`/rooms/${id}/`);
    return response.data;
  },

  async createRoom(roomData) {
    const response = await api.post('/rooms/', roomData);
    return response.data;
  },

  async updateRoom(id, roomData) {
    const response = await api.patch(`/rooms/${id}/`, roomData);
    return response.data;
  },

  async updateRoomStatus(id, status) {
    const response = await api.patch(`/rooms/${id}/status/`, { status });
    return response.data;
  },

  async getRoomTypes() {
    const response = await api.get('/room-types/');
    return response.data;
  },

  async getStatusCounts() {
    const response = await api.get('/rooms/status-counts/');
    return response.data;
  },
};
