import api from "./http";

// Email dispatch API - data only
export const dispatchApi = {
  // Send email
  dispatchEmail: async (formData) => {
    return api.post('/emails/send', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Get email statistics
  getEmailStats: async (period = '30d') => {
    return api.get('/emails/stats', { params: { period } });
  },

  // Get email history
  getEmailHistory: async (params) => {
    return api.get('/emails/history', { params });
  },

  // Get specific email
  getEmail: async (id) => {
    return api.get(`/emails/${id}`);
  },

  // Resend email
  resendEmail: async (id) => {
    return api.post(`/emails/${id}/resend`);
  },

  // Delete email
  deleteEmail: async (id) => {
    return api.delete(`/emails/${id}`);
  }
};

// Finance API (for documents) - data only
export const financeApi = {
  getRegistry: async () => {
    return api.get('/finance/registry');
  },

  getInvoices: async () => {
    return api.get('/finance/invoices');
  },

  getQuotations: async () => {
    return api.get('/finance/quotations');
  },

  getReceipts: async () => {
    return api.get('/finance/receipts');
  },

  getServices: async () => {
    return api.get('/finance/services');
  },

  getClients: async () => {
    return api.get('/finance/clients');
  }
};

// Email signatures API - data only
export const emailApi = {
  getSignatures: async () => {
    return api.get('/email-signatures');
  },

  createSignature: async (signatureData) => {
    return api.post('/email-signatures', signatureData);
  },

  updateSignature: async (id, signatureData) => {
    return api.put(`/email-signatures/${id}`, signatureData);
  },

  deleteSignature: async (id) => {
    return api.delete(`/email-signatures/${id}`);
  }
};

export default api;
