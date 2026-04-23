import api, { normalizeResponse, normalizeError } from './api.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Decimal from "../utils/decimal.js";

const normalizeAmount = (value) => {
  if (value === null || value === undefined) return 0;
  try {
    return new Decimal(value).toNumber();
  } catch (err) {
    return 0;
  }
};

const ProfileService = {
  /**
   * Determine the correct profile endpoint based on the logged-in user's role.
   * Tenants → /tenant/profile  (TenantSettingsController)
   * Landlord/Caretaker → /me  (AuthController)
   */
  async _getProfileEndpoint() {
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        if (user.role === 'landlord' || user.role === 'caretaker') {
          return '/me';
        }
      }
    } catch (_e) { /* ignore – fall through to tenant default */ }
    return '/tenant/profile';
  },

  /**
   * Get current user profile
   */
  async getProfile() {
    try {
      // Use tenant-specific profile endpoint if it's a tenant, otherwise fallback to /me
      const response = await api.get('/tenant/profile').catch(() => api.get('/me'));
      const res = normalizeResponse(response);
      if (res.success && res.data?.user) {
        res.data = res.data.user;
      }
      if (res.success && res.data?.wallet_balance !== undefined) {
        res.data.wallet_balance = normalizeAmount(res.data.wallet_balance);
      }
      return res;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return normalizeError(error);
    }
  },

  /**
   * Get authenticated user payload from /me (includes canonical role)
   */
  async getCurrentUser() {
    try {
      const response = await api.get('/me');
      const res = normalizeResponse(response);
      if (res.success && res.data?.user) {
        res.data = res.data.user;
      }
      if (res.success) {
        res.status = response.status;
      }
      return res;
    } catch (error) {
      console.error('Error fetching current user:', error);
      return normalizeError(error);
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
      // Use /me for landlords/caretakers, /tenant/profile for tenants
      const endpoint = await this._getProfileEndpoint();
      
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
        response = await api.post(endpoint, formData);
      } else {
        // Regular JSON update without image
        response = await api.put(endpoint, profileData);
      }
      
      const res = normalizeResponse(response);
      if (res.success) {
        res.message = response.data?.message || 'Profile updated successfully';
        if (res.data?.user) {
          res.data = res.data.user;
        }
        if (res.data?.wallet_balance !== undefined) {
          res.data.wallet_balance = normalizeAmount(res.data.wallet_balance);
        }
      }
      return res;
    } catch (error) {
      console.error('Error updating profile:', error);
      return normalizeError(error);
    }
  },

  /**
   * Update settings specifically (notifications, etc)
   */
  async updateSettings(settings) {
    try {
      const endpoint = await this._getProfileEndpoint();
      const response = await api.put(endpoint, settings);
      const res = normalizeResponse(response);
      if (res.success) {
        res.message = 'Settings updated successfully';
        if (res.data?.user) {
          res.data = res.data.user;
        }
      }
      return res;
    } catch (error) {
      console.error('Error updating settings:', error);
      return normalizeError(error);
    }
  },

  /**
   * Update tenant preferences and lifestyle using the same payload shape as web.
   * @param {Object} preferenceData
   */
  async updateTenantPreferences(preferenceData) {
    try {
      const formData = new FormData();
      formData.append('preference[room_preference]', preferenceData?.room_preference || '');
      formData.append('preference[budget_range]', preferenceData?.budget_range || '');
      formData.append('preference[attitude]', preferenceData?.attitude || '');
      formData.append('preference[behavior]', preferenceData?.behavior || '');
      formData.append('preference[lifestyle_notes]', preferenceData?.lifestyle_notes || '');
      formData.append(
        'preference[custom_preferences]',
        JSON.stringify(Array.isArray(preferenceData?.custom_preferences) ? preferenceData.custom_preferences : []),
      );
      formData.append('_method', 'PUT');

      const response = await api.post('/tenant/profile', formData);
      const res = normalizeResponse(response);
      if (res.success) {
        res.message = response.data?.message || 'Preferences updated successfully';
        if (res.data?.user) {
          res.data = res.data.user;
        }
      }
      return res;
    } catch (error) {
      console.error('Error updating tenant preferences:', error);
      return normalizeError(error);
    }
  },

  /**
   * Change password
   * @param {Object} passwordData - { current_password, new_password, new_password_confirmation }
   */
  async changePassword(passwordData) {
    try {
      const response = await api
        .post('/tenant/change-password', passwordData)
        .catch(async (error) => {
          const status = error?.response?.status;
          if (status === 404 || status === 405) {
            return api.post('/change-password', passwordData);
          }
          throw error;
        });
      const res = normalizeResponse(response);
      if (res.success) {
        res.message = response.data?.message || 'Password changed successfully';
      }
      return res;
    } catch (error) {
      console.error('Error changing password:', error);
      return normalizeError(error);
    }
  },

  /**
   * Tenant: send OTP to enable two-factor authentication
   */
  async sendTenantTwoFactorOtp() {
    try {
      const response = await api.post('/tenant/security/two-factor/send-otp');
      const res = normalizeResponse(response);
      if (res.success) {
        res.message = response.data?.message || 'Verification code sent to your email address.';
        res.twoFactor = response.data?.two_factor || null;
        if (res.data?.user) {
          res.data = res.data.user;
        }
      }
      return res;
    } catch (error) {
      console.error('Error sending tenant 2FA OTP:', error);
      return normalizeError(error);
    }
  },

  /**
   * Tenant: verify two-factor authentication OTP
   */
  async verifyTenantTwoFactorOtp(emailOtpCode) {
    try {
      const response = await api.post('/tenant/security/two-factor/verify-otp', {
        email_otp_code: emailOtpCode,
      });
      const res = normalizeResponse(response);
      if (res.success) {
        res.message = response.data?.message || 'Two-factor authentication enabled successfully.';
        res.twoFactor = response.data?.two_factor || null;
        if (res.data?.user) {
          res.data = res.data.user;
        }
      }
      return res;
    } catch (error) {
      console.error('Error verifying tenant 2FA OTP:', error);
      return normalizeError(error);
    }
  },

  /**
   * Tenant: disable two-factor authentication
   */
  async disableTenantTwoFactor() {
    try {
      const response = await api.post('/tenant/security/two-factor/disable');
      const res = normalizeResponse(response);
      if (res.success) {
        res.message = response.data?.message || 'Two-factor authentication has been disabled.';
        res.twoFactor = response.data?.two_factor || null;
        if (res.data?.user) {
          res.data = res.data.user;
        }
      }
      return res;
    } catch (error) {
      console.error('Error disabling tenant 2FA:', error);
      return normalizeError(error);
    }
  },

  /**
   * Tenant: get two-factor authentication status
   */
  async getTenantTwoFactorStatus() {
    try {
      const response = await api.get('/tenant/security/two-factor');
      const res = normalizeResponse(response);
      if (res.success) {
        res.message = response.data?.message || 'Two-factor authentication status retrieved successfully.';
        res.twoFactor = response.data?.two_factor || null;
      }
      return res;
    } catch (error) {
      console.error('Error fetching tenant 2FA status:', error);
      return normalizeError(error);
    }
  },

  /**
   * Landlord only: send email recovery OTP from Settings > Security
   */
  async sendLandlordEmailRecoveryOtp() {
    try {
      const response = await api.post('/landlord/security/email-recovery/send-otp');
      const res = normalizeResponse(response);
      if (res.success) {
        res.message = response.data?.message || 'Verification code sent to your email address.';
        res.emailRecovery = response.data?.email_recovery || null;
        if (res.data?.user) {
          res.data = res.data.user;
        }
      }
      return res;
    } catch (error) {
      console.error('Error sending landlord email recovery OTP:', error);
      return normalizeError(error);
    }
  },

  /**
   * Landlord only: verify email recovery OTP from Settings > Security
   */
  async verifyLandlordEmailRecoveryOtp(emailOtpCode) {
    try {
      const response = await api.post('/landlord/security/email-recovery/verify-otp', {
        email_otp_code: emailOtpCode,
      });
      const res = normalizeResponse(response);
      if (res.success) {
        res.message = response.data?.message || 'Email recovery verified successfully.';
        res.emailRecovery = response.data?.email_recovery || null;
        if (res.data?.user) {
          res.data = res.data.user;
        }
      }
      return res;
    } catch (error) {
      console.error('Error verifying landlord email recovery OTP:', error);
      return normalizeError(error);
    }
  },

  /**
   * Landlord only: disable email recovery from Settings > Security
   */
  async disableLandlordEmailRecovery() {
    try {
      const response = await api.post('/landlord/security/email-recovery/disable');
      const res = normalizeResponse(response);
      if (res.success) {
        res.message = response.data?.message || 'Email recovery has been disabled.';
        res.emailRecovery = response.data?.email_recovery || null;
        if (res.data?.user) {
          res.data = res.data.user;
        }
      }
      return res;
    } catch (error) {
      console.error('Error disabling landlord email recovery:', error);
      return normalizeError(error);
    }
  },

  /**
   * Get landlord verification status
   */
  async getVerificationStatus() {
    try {
      const response = await api.get('/landlord/my-verification');
      return normalizeResponse(response);
    } catch (error) {
      if (error.response?.status === 404) {
        return {
          success: true,
          data: { status: 'not_submitted' },
          error: null
        };
      }
      return normalizeError(error);
    }
  },

  /**
   * Get allowed valid ID types
   */
  async getValidIdTypes() {
    try {
      const response = await api.get('/valid-id-types');
      return normalizeResponse(response);
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
      const response = await api.post('/landlord/resubmit-verification', formData);
      const res = normalizeResponse(response);
      if (res.success) {
        res.status = response.status;
      }
      return res;
    } catch (error) {
      console.error('Verification resubmission failed:', error);
      return normalizeError(error);
    }
  },

  /**
   * Tenant landlord registration flow (keeps account in tenant mode while pending approval)
   */
  async registerAsLandlord(formData) {
    try {
      const response = await api.post('/tenant/register-landlord', formData);
      const res = normalizeResponse(response);
      if (res.success) {
        res.message = response.data?.message || 'Landlord registration submitted successfully';
        res.status = response.status;
      }
      return res;
    } catch (error) {
      console.error('Tenant landlord registration failed:', error);
      return normalizeError(error);
    }
  },

  /**
   * Get PayMongo onboarding URL for landlord
   */
  async getPayMongoOnboardingUrl() {
    try {
      const response = await api.get('/landlord/paymongo/onboarding');
      return normalizeResponse(response);
    } catch (error) {
      console.error('Error getting PayMongo onboarding URL:', error);
      return normalizeError(error);
    }
  },

  /**
   * Switch user role (Landlord <-> Tenant)
   * @param {string} role - 'landlord' or 'tenant'
   */
  async switchRole(role, payload = {}) {
    try {
      const response = await api.post('/switch-role', { role, ...payload });
      const res = normalizeResponse(response);
      if (res.success) {
        res.message = response.data?.message || 'Role switched successfully';
        res.status = response.status;
        if (res.data?.user) {
          res.data = res.data.user;
        }
      }
      return res;
    } catch (error) {
      console.error('Error switching role:', error);
      return normalizeError(error);
    }
  }
};

export default ProfileService;
