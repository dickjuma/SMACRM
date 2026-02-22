import api from './http';

// Quotation API functions
export const quotationApi = {
  // Get all quotations
  getQuotations: async (params = {}) => {
    const response = await api.get('/quotations', { params });
    return response.data;
  },

  // Get single quotation
  getQuotation: async (id) => {
    const response = await api.get(`/quotations/${id}`);
    return response.data;
  },

  // Create quotation
  createQuotation: async (quotationData) => {
    const response = await api.post('/quotations', quotationData);
    return response.data;
  },

  // Update quotation
  updateQuotation: async (id, quotationData) => {
    const response = await api.put(`/quotations/${id}`, quotationData);
    return response.data;
  },

  // Delete quotation
  deleteQuotation: async (id) => {
    const response = await api.delete(`/quotations/${id}`);
    return response.data;
  },

  // Get quotation statistics
  getQuotationStats: async () => {
    const response = await api.get('/quotations/stats');
    return response.data;
  }
};

// Client API functions (for quotation relations)
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

// Product API functions (for quotation items)
export const productApi = {
  getProducts: async (params = {}) => {
    const response = await api.get('/products', { params });
    return response.data;
  },

  getProduct: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  }
};

export default api;
