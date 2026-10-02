import api from './api';

export const reportService = {
  async getSummary(startDate, endDate) {
    const response = await api.get('/reports/summary/', { params: { start_date: startDate, end_date: endDate } });
    return response.data;
  },

  async downloadExcel(module) {
    const response = await api.get('/reports/export/excel/', {
      params: { module },
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `goldenswan_${module}_report.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  async downloadPdf(module) {
    const response = await api.get('/reports/export/pdf/', {
      params: { module },
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `goldenswan_${module}_report.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
};
