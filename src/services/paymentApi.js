import api from './http';

// Payment API functions
export const paymentApi = {
  // Get all payments
  getPayments: async (params = {}) => {
    const response = await api.get('/payments', { params });
    return response.data;
  },

  // Get single payment
  getPayment: async (id) => {
    const response = await api.get(`/payments/${id}`);
    return response.data;
  },

  // Create payment
  createPayment: async (paymentData) => {
    const response = await api.post('/payments', paymentData);
    return response.data;
  },

  // Update payment
  updatePayment: async (id, paymentData) => {
    const response = await api.put(`/payments/${id}`, paymentData);
    return response.data;
  },

  // Delete payment
  deletePayment: async (id) => {
    const response = await api.delete(`/payments/${id}`);
    return response.data;
  },

  // Get payment statistics
  getPaymentStats: async () => {
    const response = await api.get('/payments/stats');
    return response.data;
  }
};

// Invoice API functions (for payment relations)
export const invoiceApi = {
  getInvoices: async (params = {}) => {
    const response = await api.get('/invoices', { params });
    return response.data;
  },

  getInvoice: async (id) => {
    const response = await api.get(`/invoices/${id}`);
    return response.data;
  }
};

// Client API functions (for payment relations)
export const clientApi = {
  getClients: async (params = {}) => {
    const response = await api.get('/clients', { params });
    return response.data;
  },

  getClient: async (id) => {
    const response = await api.get(`/clients/${id}`);
    return response.data;
  }
};

export default api;
