import api, { publicApi } from "./http";

// Auth API functions
export const authApi = {
  // Login
  login: async (credentials) => {
    const response = await publicApi.post('/auth/login', credentials);
    return response.data;
  },

  // Logout
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  // Refresh token
  refreshToken: async (refreshToken) => {
    const response = await publicApi.post('/auth/refresh-token', { refreshToken });
    return response.data;
  },

  // Validate token
  validateToken: async () => {
    const response = await publicApi.post('/auth/validate-token');
    return response.data;
  },

  // Get user profile
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  // Update user profile
  updateProfile: async (profileData) => {
    const response = await api.put('/auth/profile', profileData);
    return response.data;
  },

  // Upload profile photo
  uploadProfileAvatar: async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.post('/auth/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Change password
  changePassword: async (passwordData) => {
    const response = await api.post('/auth/change-password', passwordData);
    return response.data;
  },

  // Update presence
  updatePresence: async (presenceData) => {
    const response = await api.post('/auth/presence', presenceData);
    return response.data;
  }
};

export default api;
