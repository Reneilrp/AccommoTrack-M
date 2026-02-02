import React, { useState, useEffect } from 'react';
import { tenantService } from '../../../services/tenantService';
import { getImageUrl } from '../../../utils/api';
import { SkeletonProfileTab } from '../../Shared/Skeleton';

const ProfileTab = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [imagePreview, setImagePreview] = useState(null);
  
  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);

  // 'Male', 'Female', 'Others', or ''
  const [genderMode, setGenderMode] = useState('');

  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    phone: '',
    profile_image: null,
    
    // Tenant Fields
    date_of_birth: '',
    gender: '', // The actual value stored
    current_address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await tenantService.getProfile();
      
      // Extract gender from preferences
      let prefs = data.tenant_profile?.preference || {};
      if (typeof prefs === 'string') {
        try { prefs = JSON.parse(prefs); } catch (e) { prefs = {}; }
      }

      const backendGender = prefs.gender || '';
      let initialMode = '';
      if (backendGender === 'Male' || backendGender === 'Female') {
        initialMode = backendGender;
      } else if (backendGender) {
        initialMode = 'Others';
      }

      setGenderMode(initialMode);

      setFormData(prev => ({
        ...prev,
        first_name: data.first_name || '',
        middle_name: data.middle_name || '',
        last_name: data.last_name || '',
        phone: data.phone || '',
        date_of_birth: data.tenant_profile?.date_of_birth || '',
        gender: backendGender,
        current_address: data.tenant_profile?.current_address || '',
        emergency_contact_name: data.tenant_profile?.emergency_contact_name || '',
        emergency_contact_phone: data.tenant_profile?.emergency_contact_phone || '',
        emergency_contact_relationship: data.tenant_profile?.emergency_contact_relationship || '',
      }));
      
      if (data.profile_image) {
        setImagePreview(getImageUrl(data.profile_image));
      }
    } catch (error) {
      console.error('Failed to load profile', error);
      setMessage({ type: 'error', text: 'Failed to load profile data.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenderSelectChange = (e) => {
    const selectedMode = e.target.value;
    setGenderMode(selectedMode);
    
    // If selecting specific standard options, update the actual data
    if (selectedMode === 'Male' || selectedMode === 'Female') {
        setFormData(prev => ({ ...prev, gender: selectedMode }));
    } else if (selectedMode === 'Others') {
        // Look for existing data if it's not Male/Female, otherwise clear
        if (formData.gender === 'Male' || formData.gender === 'Female') {
            setFormData(prev => ({ ...prev, gender: '' }));
        }
    } else {
        setFormData(prev => ({ ...prev, gender: '' }));
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
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'profile_image' && typeof formData[key] === 'string') return; // Skip if it's the url string
        
        // Handle Gender specially (store in preference)
        if (key === 'gender') {
            if (formData[key]) data.append('preference[gender]', formData[key]);
            return;
        }

        if (formData[key] !== null && formData[key] !== undefined) {
             data.append(key, formData[key]);
        }
      });
      
      await tenantService.updateProfile(data);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Personal Information</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 text-sm font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors"
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
                  <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                )}
            </div>
            <label className={`absolute bottom-0 right-0 bg-white dark:bg-gray-800 rounded-full p-2 shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 ${!isEditing ? 'hidden' : 'cursor-pointer'}`}>
              <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} disabled={!isEditing} />
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
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
              value={formData.first_name}
              onChange={handleChange}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Last Name</label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
            />
          </div>
          
          {/* Gender Section */}
          <div className={`${genderMode === 'Others' ? 'col-span-1' : 'col-span-1'}`}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Gender</label>
             <div className="flex flex-col gap-2">
                <select
                value={genderMode}
                onChange={handleGenderSelectChange}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
                >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Others">Others</option>
                </select>

                {genderMode === 'Others' && (
                    <input
                        type="text"
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        disabled={!isEditing}
                        placeholder="Please specify"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white animate-fadeIn disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
                    />
                )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Date of Birth</label>
            <input
              type="date"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
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
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
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
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
              />
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="flex justify-end pt-4 gap-3">
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
                disabled={saving}
                className={`px-6 py-2 bg-brand-600 text-white rounded-lg font-medium shadow-sm hover:bg-brand-700 transition-colors ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
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
