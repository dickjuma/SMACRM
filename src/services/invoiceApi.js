import api from './http';

// Invoice API functions
export const invoiceApi = {
  // Get all invoices
  getInvoices: async (params = {}) => {
    const response = await api.get('/invoices', {
      params: { ...params, _t: Date.now() },
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" }
    });
    return response.data;
  },

  // Get single invoice
  getInvoice: async (id) => {
    const response = await api.get(`/invoices/${id}`, {
      params: { _t: Date.now() },
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" }
    });
    return response.data;
  },

  // Create invoice
  createInvoice: async (invoiceData) => {
    const response = await api.post('/invoices', invoiceData);
    return response.data;
  },

  // Update invoice
  updateInvoice: async (id, invoiceData) => {
    const response = await api.put(`/invoices/${id}`, invoiceData);
    return response.data;
  },

  // Delete invoice
  deleteInvoice: async (id) => {
    const response = await api.delete(`/invoices/${id}`);
    return response.data;
  },

  // Get invoice statistics
  getInvoiceStats: async () => {
    const response = await api.get('/invoices/stats');
    return response.data;
  }
};

// Client API functions (for invoice relations)
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

// Product API functions (for invoice items)
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
