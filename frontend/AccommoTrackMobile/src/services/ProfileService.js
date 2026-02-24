import api from './api';

const ProfileService = {
  /**
   * Get current user profile
   */
  async getProfile() {
    try {
      // Use tenant-specific profile endpoint if it's a tenant, otherwise fallback to /me
      const response = await api.get('/tenant/profile').catch(() => api.get('/me'));
      
      return {
        success: true,
        data: response.data.user || response.data
      };
    } catch (error) {
      console.error('Error fetching profile:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch profile'
      };
    }
  },

  /**
   * Update user profile
   * @param {Object} profileData - Profile data to update
   * @param {Object} image - Selected image from image picker (optional)
   */
  async updateProfile(profileData, image = null) {
    try {
      let response;
      const endpoint = '/tenant/profile';
      
      if (image) {
        // Use FormData for image upload
        const formData = new FormData();
        
        // Append profile data
        Object.keys(profileData).forEach(key => {
          if (profileData[key] !== null && profileData[key] !== undefined) {
            if (typeof profileData[key] === 'object' && !Array.isArray(profileData[key])) {
                formData.append(key, JSON.stringify(profileData[key]));
            } else {
                formData.append(key, profileData[key]);
            }
          }
        });
        
        // Append image
        const filename = image.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formData.append('profile_image', {
          uri: image.uri,
          name: filename,
          type: type,
        });
        
        // Laravel requires POST for FormData with PUT method spoofing
        formData.append('_method', 'PUT');
        response = await api.post(endpoint, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        // Regular JSON update without image
        response = await api.put(endpoint, profileData);
      }
      
      return {
        success: true,
        data: response.data.user || response.data,
        message: response.data.message || 'Profile updated successfully'
      };
    } catch (error) {
      console.error('Error updating profile:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update profile',
        errors: error.response?.data?.errors || {}
      };
    }
  },

  /**
   * Update settings specifically (notifications, etc)
   */
  async updateSettings(settings) {
    try {
      const response = await api.put('/tenant/profile', settings);
      return {
        success: true,
        data: response.data.user || response.data,
        message: 'Settings updated successfully'
      };
    } catch (error) {
      console.error('Error updating settings:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update settings'
      };
    }
  },

  /**
   * Change password
   * @param {Object} passwordData - { current_password, new_password, new_password_confirmation }
   */
  async changePassword(passwordData) {
    try {
      const response = await api.post('/change-password', passwordData);
      return {
        success: true,
        message: response.data.message || 'Password changed successfully'
      };
    } catch (error) {
      console.error('Error changing password:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to change password',
        errors: error.response?.data?.errors || {}
      };
    }
  },

  /**
   * Get landlord verification status
   */
  async getVerificationStatus() {
    try {
      const response = await api.get('/landlord/my-verification');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return {
          success: true,
          data: { status: 'not_submitted' }
        };
      }
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch verification status'
      };
    }
  },

  /**
   * Get allowed valid ID types
   */
  async getValidIdTypes() {
    try {
      const response = await api.get('/valid-id-types');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        data: ['Philippine Passport', "Driver's License", 'PhilSys ID (National ID)', 'UMID'],
        error: 'Failed to fetch ID types'
      };
    }
  },

  /**
   * Resubmit verification documents
   */
  async resubmitVerification(formData) {
    try {
      const response = await api.post('/landlord/resubmit-verification', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Verification resubmission failed:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to resubmit verification'
      };
    }
  }
};

export default ProfileService;
