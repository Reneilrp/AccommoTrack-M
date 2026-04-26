import React, { useState, useEffect, useCallback } from 'react';
import { showSuccess, showError } from '../../../utils/toast';
import { tenantService } from '../../../services/tenantService';
import { getImageUrl } from '../../../utils/api';
import { hasAnyValidationError, normalizeNameInput, validateProfileNameField } from '../../../utils/nameValidation';
import { SkeletonProfileTab } from '../../Shared/Skeleton';
import { useUIState } from '../../../contexts/UIStateContext';
import { CircleUser, Camera } from 'lucide-react';

const ProfileTab = ({ onUserUpdate }) => {
  const { uiState, updateData } = useUIState();
  const cachedProfile = uiState.data?.profile;

  const [loading, setLoading] = useState(!cachedProfile);
  const [saving, setSaving] = useState(false);
  const [nameErrors, setNameErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    phone: '',
    profile_image: null,

    // Tenant Fields
    date_of_birth: '',
    sex: '', // The actual value stored
    identified_as: '',
    current_address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
  });

  const mapDataToForm = useCallback((data) => {
    setFormData({
      first_name: data.first_name || '',
      middle_name: data.middle_name || '',
      last_name: data.last_name || '',
      email: data.email || '',
      phone: data.phone || '',
      date_of_birth: data.date_of_birth || '',
      sex: data.sex || '',
      identified_as: data.identified_as || '',
      current_address: data.tenant_profile?.current_address || '',
      emergency_contact_name: data.tenant_profile?.emergency_contact_name || '',
      emergency_contact_phone: data.tenant_profile?.emergency_contact_phone || '',
      emergency_contact_relationship: data.tenant_profile?.emergency_contact_relationship || '',
      profile_image: null, // Reset file input
    });

    if (data.profile_image) {
      // In ProfileTab, data.profile_image might already be a full URL from getProfile or just a path
      setImagePreview(getImageUrl(data.profile_image));
    } else {
      setImagePreview(null);
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      // Use loading state only if we don't have cached data yet
      const hasCache = !!uiState.data?.profile;
      if (!hasCache) setLoading(true);

      const res = await tenantService.getProfile();

      if (res.success) {
        mapDataToForm(res.data);
        updateData('profile', res.data);
      } else {
        throw new Error(res.error || 'Failed to fetch profile');
      }

    } catch (error) {
      console.error('Failed to load profile', error);
      showError('Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  }, [mapDataToForm, updateData, uiState.data?.profile]);

  // Effect 1: Hydrate from cache whenever it changes
  useEffect(() => {
    if (cachedProfile) {
      mapDataToForm(cachedProfile);
    }
  }, [cachedProfile, mapDataToForm]);

  // Effect 2: Fetch fresh data once on mount
  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const NAME_FIELDS = ['first_name', 'middle_name', 'last_name'];
  const NAME_LABELS = {
    first_name: 'First name',
    middle_name: 'Middle name',
    last_name: 'Last name',
  };
  const PHONE_REGEX = /^(09|\+639)\d{9}$/;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (NAME_FIELDS.includes(name)) {
      const normalizedValue = normalizeNameInput(value);
      setFormData(prev => ({ ...prev, [name]: normalizedValue }));
      setNameErrors(prev => ({
        ...prev,
        [name]: validateProfileNameField(normalizedValue, {
          required: name === 'first_name' || name === 'last_name',
          label: NAME_LABELS[name] || 'Name',
        }),
      }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'phone') {
      if (value && !PHONE_REGEX.test(value)) {
        setNameErrors(prev => ({ ...prev, phone: 'Must be a valid PH mobile number (e.g. 09123456789 or +639123456789).' }));
      } else {
        setNameErrors(prev => ({ ...prev, phone: '' }));
      }
    }
  };



  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, profile_image: file }));
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nextNameErrors = {
      first_name: validateProfileNameField(formData.first_name, { required: true, label: 'First name' }),
      middle_name: validateProfileNameField(formData.middle_name, { required: false, label: 'Middle name' }),
      last_name: validateProfileNameField(formData.last_name, { required: true, label: 'Last name' }),
      phone: formData.phone && !PHONE_REGEX.test(formData.phone)
        ? 'Must be a valid PH mobile number (e.g. 09123456789 or +639123456789).'
        : '',
    };

    setNameErrors(prev => ({ ...prev, ...nextNameErrors }));

    if (hasAnyValidationError(nextNameErrors)) {
      showError('Please fix the name errors before saving.');
      return;
    }

    setSaving(true);

    try {
      const hasImageUpdate = formData.profile_image instanceof File;
      let payload;

      if (hasImageUpdate) {
        // Use FormData for image upload
        payload = new FormData();
        Object.keys(formData).forEach(key => {
          if (formData[key] !== null && formData[key] !== undefined && key !== 'email') {
            if (NAME_FIELDS.includes(key)) {
              payload.append(key, normalizeNameInput(formData[key]));
            } else if ((key === 'sex' || key === 'identified_as') && !formData[key]) {
               // Skip empty enums
            } else {
              payload.append(key, formData[key]);
            }
          }
        });
      } else {
        // Use standard JSON for text updates (much more stable)
        payload = {};
        Object.keys(formData).forEach(key => {
          if (key === 'profile_image' || key === 'email') return;
          
          if (NAME_FIELDS.includes(key)) {
            payload[key] = normalizeNameInput(formData[key]);
          } else if ((key === 'sex' || key === 'identified_as') && !formData[key]) {
            payload[key] = null;
          } else {
            payload[key] = formData[key];
          }
        });
      }

      const res = await tenantService.updateProfile(payload);

      if (!res.success) {
        throw new Error(res.error || 'Update failed');
      }

      // Propagate the updated user up to App.jsx (updates header avatar, etc.)
      const updatedUser = res.data?.user || res.data;
      if (onUserUpdate && updatedUser) {
        onUserUpdate(updatedUser);
      }

      showSuccess('Profile updated successfully!');
      setIsEditing(false);

      // Refetch to ensure all cached data is synced
      fetchProfile();
    } catch (error) {
      console.error('Update failed', error);
      showError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <SkeletonProfileTab />;

  const toggleEdit = () => {
    if (isEditing) {
      // Cancelled: Revert changes by refetching
      fetchProfile();
    }
    setIsEditing(!isEditing);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-all">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Personal Information</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
          >
            Edit Profile
          </button>
        )}
      </div>




      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Profile Image */}
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-gray-600 shadow-sm">
              {imagePreview ? (
                <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-500">
                  <CircleUser className="w-12 h-12" />
                </div>
              )}
            </div>
            <label className={`absolute bottom-0 right-0 bg-white dark:bg-gray-800 rounded-full p-2 shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 ${!isEditing ? 'hidden' : 'cursor-pointer'}`}>
              <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} disabled={!isEditing} />
              <Camera className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </label>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Profile Photo</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Update your profile picture.</p>
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">First Name</label>
            <input
              type="text"
              name="first_name"
              maxLength={20}
              value={formData.first_name}
              onChange={handleChange}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
            />
            {nameErrors.first_name && <p className="mt-2 text-xs text-red-500">{nameErrors.first_name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Last Name</label>
            <input
              type="text"
              name="last_name"
              maxLength={20}
              value={formData.last_name}
              onChange={handleChange}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
            />
            {nameErrors.last_name && <p className="mt-2 text-xs text-red-500">{nameErrors.last_name}</p>}
          </div>

          {/* Sex Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Sex</label>
            <select
              name="sex"
              value={formData.sex}
              onChange={handleChange}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
            >
              <option value="" disabled hidden>Sex</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          {/* Pronouns Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Pronouns <span className="text-gray-500 text-xs font-normal">(e.g., He/Him, She/Her)</span></label>
            <input
              type="text"
              name="identified_as"
              maxLength={50}
              value={formData.identified_as}
              onChange={handleChange}
              disabled={!isEditing}
              placeholder="How do you identify?"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Date of Birth</label>
            <input
              type="date"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
              disabled={!isEditing}
              max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
              onKeyDown={(e) => e.preventDefault()}
              onClick={(e) => isEditing && e.target.showPicker?.()}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Phone Number</label>
            <input
              type="tel"
              name="phone"
              maxLength={13}
              value={formData.phone}
              onChange={handleChange}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
            />
            {nameErrors.phone && <p className="mt-2 text-xs text-red-500">{nameErrors.phone}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Email Address</label>
            <input
              type="email"
              value={formData.email || ''}
              disabled
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Your email is used for account verification and OTP.</p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Current Address</label>
            <input
              type="text"
              name="current_address"
              maxLength={150}
              value={formData.current_address}
              onChange={handleChange}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
              placeholder="House no., Street, City, Province"
            />
          </div>
        </div>

        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Emergency Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Contact Name</label>
              <input
                type="text"
                name="emergency_contact_name"
                value={formData.emergency_contact_name}
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Relationship</label>
              <input
                type="text"
                name="emergency_contact_relationship"
                value={formData.emergency_contact_relationship}
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Contact Phone</label>
              <input
                type="tel"
                name="emergency_contact_phone"
                value={formData.emergency_contact_phone}
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
              />
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="flex justify-end pt-4 gap-4">
            <button
              type="button"
              onClick={toggleEdit}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || Object.values(nameErrors).some(e => e)}
              className={`px-6 py-2 bg-green-600 text-white rounded-lg font-medium shadow-sm hover:bg-green-700 transition-colors ${(saving || Object.values(nameErrors).some(e => e)) ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default ProfileTab;
