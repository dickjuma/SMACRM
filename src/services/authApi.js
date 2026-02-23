import api, { publicApi } from "./http";

let profileRequestPromise = null;
let profileCache = null;
let profileCacheAt = 0;
const PROFILE_CACHE_TTL_MS = 60 * 1000;

const clearProfileCache = () => {
  profileRequestPromise = null;
  profileCache = null;
  profileCacheAt = 0;
};

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
  getProfile: async (options = {}) => {
    const force = Boolean(options?.force);
    const now = Date.now();

    if (!force && profileCache && now - profileCacheAt < PROFILE_CACHE_TTL_MS) {
      return profileCache;
    }

    if (!force && profileRequestPromise) {
      return profileRequestPromise;
    }

    profileRequestPromise = api
      .get('/auth/profile')
      .then((response) => {
        const data = response.data?.data || {};
        profileCache = data;
        profileCacheAt = Date.now();
        return data;
      })
      .finally(() => {
        profileRequestPromise = null;
      });

    return profileRequestPromise;
  },

  // Update user profile
  updateProfile: async (profileData) => {
    const response = await api.put('/auth/profile', profileData);
    clearProfileCache();
    return response.data?.data || {};
  },

  // Upload profile photo
  uploadProfileAvatar: async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.post('/auth/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    clearProfileCache();
    return response.data?.data || {};
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
