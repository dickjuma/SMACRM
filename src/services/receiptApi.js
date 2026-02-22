import api from './http';

// Receipt API functions
export const receiptApi = {
  // Get all receipts
  getReceipts: async (params = {}) => {
    const response = await api.get('/receipts', { params });
    return response.data;
  },

  // Get single receipt
  getReceipt: async (id) => {
    const response = await api.get(`/receipts/${id}`);
    return response.data;
  },

  // Create receipt
  createReceipt: async (receiptData) => {
    const response = await api.post('/receipts', receiptData);
    return response.data;
  },

  // Update receipt
  updateReceipt: async (id, receiptData) => {
    const response = await api.put(`/receipts/${id}`, receiptData);
    return response.data;
  },

  // Delete receipt
  deleteReceipt: async (id) => {
    const response = await api.delete(`/receipts/${id}`);
    return response.data;
  },

  // Get receipt statistics
  getReceiptStats: async () => {
    const response = await api.get('/receipts/stats');
    return response.data;
  }
};

// Client API functions (for receipt relations)
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
