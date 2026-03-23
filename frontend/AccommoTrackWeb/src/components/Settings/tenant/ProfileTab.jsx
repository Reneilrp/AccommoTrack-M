import React, { useState, useEffect } from 'react';
import { tenantService } from '../../../services/tenantService';
import { getImageUrl } from '../../../utils/api';
import { SkeletonProfileTab } from '../../Shared/Skeleton';
import { useUIState } from '../../../contexts/UIStateContext';
import { CircleUser, Camera } from 'lucide-react';

const ProfileTab = ({ onUserUpdate }) => {
  const { uiState, updateData } = useUIState();
  const cachedProfile = uiState.data?.profile;

  const [loading, setLoading] = useState(!cachedProfile);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [nameErrors, setNameErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  
  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    phone: '',
    profile_image: null,
    
    // Tenant Fields
    date_of_birth: '',
    gender: '', // The actual value stored
    identified_as: '',
    current_address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
  });

  useEffect(() => {
    if (cachedProfile) {
      mapDataToForm(cachedProfile);
    }
    fetchProfile();
  }, []);

  const mapDataToForm = (data) => {
    // Extract gender from preferences
    let prefs = data.tenant_profile?.preference || {};
    if (typeof prefs === 'string') {
      try { prefs = JSON.parse(prefs); } catch (e) { prefs = {}; }
    }

    const backendGender = data.gender || prefs.gender || '';

    setFormData({
      first_name: data.first_name || '',
      middle_name: data.middle_name || '',
      last_name: data.last_name || '',
      phone: data.phone || '',
      date_of_birth: data.date_of_birth || '',
      gender: backendGender,
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
  };

  const fetchProfile = async () => {
    try {
      if (!cachedProfile) setLoading(true);
      const data = await tenantService.getProfile();
      
      mapDataToForm(data);
      updateData('profile', data);
      
    } catch (error) {
      console.error('Failed to load profile', error);
      setMessage({ type: 'error', text: 'Failed to load profile data.' });
    } finally {
      setLoading(false);
    }
  };

  const NAME_FIELDS = ['first_name', 'middle_name', 'last_name'];
  const NAME_REGEX = /^[\p{L}\s'\-]+$/u;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (NAME_FIELDS.includes(name)) {
      if (value && !NAME_REGEX.test(value)) {
        setNameErrors(prev => ({ ...prev, [name]: 'Only letters, spaces, hyphens and apostrophes are allowed.' }));
      } else {
        setNameErrors(prev => ({ ...prev, [name]: '' }));
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
    if (Object.values(nameErrors).some(e => e)) {
      setMessage({ type: 'error', text: 'Please fix the name errors before saving.' });
      return;
    }
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        // Skip profile_image if it's null (not changed)
        if (key === 'profile_image') {
          if (formData[key] instanceof File) {
            data.append(key, formData[key]);
          }
          return;
        }

        // Always send every field (including empty strings) so the backend
        // can clear nullable fields like middle_name, gender, phone, etc.
        if (formData[key] !== null && formData[key] !== undefined) {
          data.append(key, formData[key]);
        }
      });
      
      const response = await tenantService.updateProfile(data);
      
      // Propagate the updated user up to App.jsx (updates header avatar, etc.)
      // App.jsx's handleUserUpdate handles both setUser() and localStorage correctly.
      if (onUserUpdate && response.user) {
        onUserUpdate(response.user);
      }

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);
      
      // Refetch to ensure all cached data is synced
      fetchProfile();
    } catch (error) {
      console.error('Update failed', error);
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
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
    setMessage({ type: '', text: '' });
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
      
      {message.text && (
        <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
          {message.text}
        </div>
      )}

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
          
          {/* Gender Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Gender</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
            >
              <option value="">Select Gender</option>
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
              value={formData.phone}
              onChange={handleChange}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Current Address</label>
            <input
              type="text"
              name="current_address"
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
