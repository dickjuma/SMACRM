import api from './http'; // Assuming this is your pre-configured axios instance

const extractPayload = (response) => response?.data || response || {};

const authApi = {
  /**
   * Retrieves the user profile.
   * @param {object} options - Optional parameters.
   * @param {boolean} options.force - If true, forces a refresh of the profile data.
   * @returns {Promise<object>} - A promise that resolves to the user profile data.
   */
  getProfile: (options = {}) => {
    const { force } = options;
    const url = force ? '/auth/profile?force=true' : '/auth/profile';
    return api.get(url)
      .then(extractPayload)
      .catch(error => {
        console.error("Failed to fetch profile:", error);
        throw error; // Re-throw to allow components to handle the error
      });
  },

  /**
   * Updates the user profile.
   * @param {object} payload - The data to update in the profile.
   * @returns {Promise<object>} - A promise that resolves to the updated user profile data.
   */
  updateProfile: (payload) => {
    return api.put('/auth/profile', payload)
      .then(extractPayload)
      .catch(error => {
        console.error("Failed to update profile:", error);
        throw error;
      });
  },

  /**
   * Uploads a new avatar for the user profile.
   * @param {File} file - The image file to upload.
   * @returns {Promise<object>} - A promise that resolves to the updated user profile data with the new avatar.
   */
  uploadProfileAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/auth/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
      .then(extractPayload)
      .catch(error => {
        console.error("Failed to upload avatar:", error);
        throw error;
      });
  },
};

export { authApi };