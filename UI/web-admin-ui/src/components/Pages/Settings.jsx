import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clock } from 'lucide-react';
import api, { getImageUrl } from '../../utils/api';

const CARETAKER_PERMISSION_FIELDS = [
  {
    key: 'bookings',
    label: 'Bookings',
    description: 'View booking requests, statuses, and payment updates.',
    defaultValue: true,
  },
  {
    key: 'tenants',
    label: 'Tenants',
    description: 'See tenant profiles, room assignments, and contact info.',
    defaultValue: true,
  },
  {
    key: 'messages',
    label: 'Messages',
    description: 'Monitor inbox conversations with prospects and tenants.',
    defaultValue: true,
  },
  {
    key: 'rooms',
    label: 'Room Management',
    description: 'Allow caretakers to edit room availability and assignments.',
    defaultValue: false,
  },
];

const createCaretakerPermissionDefaults = () => {
  const defaults = CARETAKER_PERMISSION_FIELDS.reduce((acc, field) => {
    acc[field.key] = field.defaultValue;
    return acc;
  }, {});

  // Hidden modules default to false
  defaults.properties = false;
  return defaults;
};

const createCaretakerEditState = () => ({
  open: false,
  assignmentId: null,
  caretakerName: '',
  permissions: createCaretakerPermissionDefaults(),
  propertyIds: [],
  saving: false,
  error: ''
});

const mapPermissionsFromEntry = (entryPermissions = {}) => {
  const mapped = createCaretakerPermissionDefaults();
  CARETAKER_PERMISSION_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(entryPermissions, field.key)) {
      mapped[field.key] = Boolean(entryPermissions[field.key]);
    }
  });
  mapped.properties = Boolean(entryPermissions.properties);
  return mapped;
};

const serializeCaretakerPermissions = (permissions) => ({
  can_view_bookings: Boolean(permissions.bookings),
  can_view_messages: Boolean(permissions.messages),
  can_view_tenants: Boolean(permissions.tenants),
  can_view_rooms: Boolean(permissions.rooms),
  can_view_properties: Boolean(permissions.properties)
});

const VALID_TABS = ['profile', 'notifications', 'security', 'delegates', 'billing'];

const ensureValidTab = (tab) => (VALID_TABS.includes(tab) ? tab : 'profile');

export default function Settings({ user, accessRole = 'landlord', onUserUpdate }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(ensureValidTab(searchParams.get('tab')));
  const normalizedRole = accessRole || user?.role || 'landlord';
  useEffect(() => {
    const paramTab = searchParams.get('tab');
    const nextTab = ensureValidTab(paramTab);

    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    } else if (!paramTab && activeTab !== 'profile') {
      setActiveTab('profile');
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (tab) => {
    const nextTab = ensureValidTab(tab);
    setActiveTab(nextTab);
    const params = new URLSearchParams(searchParams);
    if (!nextTab || nextTab === 'profile') {
      params.delete('tab');
    } else {
      params.set('tab', nextTab);
    }
    setSearchParams(params);
  };
  
  // Initialize profile data with user information
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });

  // Update profile data when user prop changes
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'delegates' && user?.role === 'landlord') {
      fetchCaretakers();
    }
  }, [activeTab, user]);

  const [notifications, setNotifications] = useState({
    emailNewBooking: true,
    emailPayment: true,
    emailMaintenance: false,
    smsPaymentReminder: true,
    smsNewTenant: false,
    pushMessages: true
  });

  const [security, setSecurity] = useState({
    twoFactorAuth: false,
    loginAlerts: true
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [caretakers, setCaretakers] = useState([]);
  const [landlordProperties, setLandlordProperties] = useState([]);
  const [caretakerForm, setCaretakerForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: ''
  });
  const [selectedPropertyIds, setSelectedPropertyIds] = useState([]);
  const [caretakerPermissions, setCaretakerPermissions] = useState(() => createCaretakerPermissionDefaults());
  const [caretakerState, setCaretakerState] = useState({
    loading: false,
    error: '',
    message: '',
    generatedPassword: ''
  });
  const [passwordCountdown, setPasswordCountdown] = useState(0);
  const [caretakerEdit, setCaretakerEdit] = useState(() => createCaretakerEditState());
  const [roomPermissionPrompt, setRoomPermissionPrompt] = useState({ open: false, context: null });
  
  // Edit mode states for each section
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingNotifications, setIsEditingNotifications] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [isEditingSecurity, setIsEditingSecurity] = useState(false);
  
  // Profile photo state
  const [profilePhoto, setProfilePhoto] = useState(user?.profile_image || null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  // Update profile photo when user changes
  useEffect(() => {
    if (user?.profile_image) {
      setProfilePhoto(user.profile_image);
    }
  }, [user]);

  // Auto-hide temporary password after 2 minutes (120 seconds)
  useEffect(() => {
    if (caretakerState.generatedPassword) {
      // Start countdown at 120 seconds (2 minutes)
      setPasswordCountdown(120);
      
      const interval = setInterval(() => {
        setPasswordCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            // Clear the password when countdown reaches 0
            setCaretakerState((prevState) => ({
              ...prevState,
              generatedPassword: '',
              message: ''
            }));
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [caretakerState.generatedPassword]);

  const handleSaveProfile = async () => {
    try {
      const result = await api.put('/me', {
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        phone: profileData.phone
      });

      const updatedUser = result.data.user;
      localStorage.setItem('userData', JSON.stringify(updatedUser));
      onUserUpdate?.(updatedUser);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const handleSaveNotifications = () => {
    console.log('Saving notifications:', notifications);
    alert('Notification preferences updated!');
  };

  // Handle photo file selection
  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle photo upload
  const handlePhotoUpload = async () => {
    if (!fileInputRef.current?.files[0]) {
      alert('Please select a photo first');
      return;
    }

    setIsUploadingPhoto(true);
    const formData = new FormData();
    formData.append('profile_image', fileInputRef.current.files[0]);

    try {
      const response = await api.post('/me', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const updatedUser = response.data.user;
      setProfilePhoto(updatedUser.profile_image);
      setPhotoPreview(null);
      localStorage.setItem('userData', JSON.stringify(updatedUser));
      onUserUpdate?.(updatedUser);
      alert('Profile photo updated successfully!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Handle photo removal
  const handleRemovePhoto = async () => {
    if (!profilePhoto && !photoPreview) return;
    
    if (photoPreview) {
      // Just clear the preview if not yet uploaded
      setPhotoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (!confirm('Are you sure you want to remove your profile photo?')) return;

    try {
      const response = await api.delete('/me/profile-image');
      const updatedUser = response.data.user;
      setProfilePhoto(null);
      localStorage.setItem('userData', JSON.stringify(updatedUser));
      onUserUpdate?.(updatedUser);
      alert('Profile photo removed successfully!');
    } catch (error) {
      console.error('Error removing photo:', error);
      alert('Failed to remove photo. Please try again.');
    }
  };

  const handleUpdatePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      alert('Password must be at least 8 characters long!');
      return;
    }

    try {
      const result = await api.post('/change-password', {
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
        new_password_confirmation: passwordData.confirmPassword
      });

      alert('Password updated successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error updating password:', error);
      const errorMsg = error.response?.data?.message || 'An error occurred. Please try again.';
      alert(errorMsg);
    }
  };

  const fetchCaretakers = async ({ preserveNotice = false } = {}) => {
    setCaretakerState((prev) => ({
      ...prev,
      loading: true,
      error: '',
      message: preserveNotice ? prev.message : ''
    }));
    try {
      const { data } = await api.get('/landlord/caretakers');
      setCaretakers(data.caretakers || []);
      setLandlordProperties(data.landlord_properties || []);
    } catch (error) {
      const err = error.response?.data?.message || 'Failed to load caretaker access.';
      setCaretakerState((prev) => ({ ...prev, error: err }));
    } finally {
      setCaretakerState((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleCaretakerInput = (field, value) => {
    setCaretakerForm((prev) => ({ ...prev, [field]: value }));
    setCaretakerState((prev) => ({ ...prev, error: '', message: '' }));
  };

  const handlePermissionToggle = (key) => {
    if (key === 'rooms' && !caretakerPermissions.rooms) {
      setRoomPermissionPrompt({ open: true, context: 'create' });
      return;
    }

    const field = CARETAKER_PERMISSION_FIELDS.find((item) => item.key === key);
    if (field?.disabled) {
      return;
    }
    setCaretakerPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
    setCaretakerState((prev) => ({ ...prev, error: '', message: '' }));
  };

  const resetCaretakerPermissions = () => {
    setCaretakerPermissions(createCaretakerPermissionDefaults());
    setSelectedPropertyIds([]);
    setCaretakerState((prev) => ({ ...prev, error: '', message: '' }));
  };

  const handlePropertyToggle = (propertyId) => {
    setSelectedPropertyIds((prev) => 
      prev.includes(propertyId) 
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const handleSelectAllProperties = () => {
    if (selectedPropertyIds.length === landlordProperties.length) {
      setSelectedPropertyIds([]);
    } else {
      setSelectedPropertyIds(landlordProperties.map(p => p.id));
    }
  };

  const openCaretakerEditModal = (entry) => {
    setCaretakerEdit({
      open: true,
      assignmentId: entry.id,
      caretakerName: `${entry.caretaker.first_name} ${entry.caretaker.last_name}`.trim(),
      permissions: mapPermissionsFromEntry(entry.permissions || {}),
      propertyIds: entry.assigned_property_ids || [],
      saving: false,
      error: ''
    });
  };

  const closeCaretakerEditModal = () => {
    setCaretakerEdit(createCaretakerEditState());
  };

  const handleCaretakerEditToggle = (key) => {
    if (key === 'rooms' && !caretakerEdit.permissions.rooms) {
      setRoomPermissionPrompt({ open: true, context: 'edit' });
      return;
    }

    setCaretakerEdit((prev) => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: !prev.permissions[key] },
      error: ''
    }));
  };

  const handleEditPropertyToggle = (propertyId) => {
    setCaretakerEdit((prev) => ({
      ...prev,
      propertyIds: prev.propertyIds.includes(propertyId)
        ? prev.propertyIds.filter(id => id !== propertyId)
        : [...prev.propertyIds, propertyId]
    }));
  };

  const handleEditSelectAllProperties = () => {
    setCaretakerEdit((prev) => ({
      ...prev,
      propertyIds: prev.propertyIds.length === landlordProperties.length
        ? []
        : landlordProperties.map(p => p.id)
    }));
  };

  const handleUpdateCaretakerPermissions = async () => {
    if (!caretakerEdit.assignmentId) return;
    setCaretakerEdit((prev) => ({ ...prev, saving: true, error: '' }));
    try {
      await api.patch(`/landlord/caretakers/${caretakerEdit.assignmentId}`, {
        permissions: serializeCaretakerPermissions(caretakerEdit.permissions),
        property_ids: caretakerEdit.propertyIds
      });

      setCaretakerState((prev) => ({
        ...prev,
        message: 'Caretaker permissions updated.',
        error: '',
        generatedPassword: ''
      }));

      closeCaretakerEditModal();
      await fetchCaretakers({ preserveNotice: true });
    } catch (error) {
      const err = error.response?.data?.message || 'Failed to update caretaker permissions.';
      setCaretakerEdit((prev) => ({ ...prev, saving: false, error: err }));
    }
  };

  const handleCreateCaretaker = async () => {
    if (!caretakerForm.first_name || !caretakerForm.last_name || !caretakerForm.email) {
      setCaretakerState((prev) => ({ ...prev, error: 'First name, last name, and email are required.' }));
      return;
    }

    if (caretakerForm.password && caretakerForm.password.length < 8) {
      setCaretakerState((prev) => ({ ...prev, error: 'Caretaker password must be at least 8 characters.' }));
      return;
    }

    if (caretakerForm.password && caretakerForm.password !== caretakerForm.password_confirmation) {
      setCaretakerState((prev) => ({ ...prev, error: 'Caretaker passwords do not match.' }));
      return;
    }

    if (selectedPropertyIds.length === 0 && landlordProperties.length > 0) {
      setCaretakerState((prev) => ({ ...prev, error: 'Please select at least one property for the caretaker to manage.' }));
      return;
    }

    try {
      setCaretakerState((prev) => ({ ...prev, loading: true, error: '', message: '' }));
      const payload = {
        ...caretakerForm,
        permissions: serializeCaretakerPermissions(caretakerPermissions),
        property_ids: selectedPropertyIds
      };

      if (!caretakerForm.password) {
        delete payload.password;
        delete payload.password_confirmation;
      }

      const { data } = await api.post('/landlord/caretakers', payload);
      setCaretakerForm({ first_name: '', last_name: '', email: '', phone: '', password: '', password_confirmation: '' });
      resetCaretakerPermissions();
      setCaretakerState({
        loading: false,
        error: '',
        message: 'Caretaker created. Share the temporary password below.',
        generatedPassword: data.temporary_password || ''
      });
      await fetchCaretakers({ preserveNotice: true });
    } catch (error) {
      const err = error.response?.data?.message || 'Failed to create caretaker.';
      setCaretakerState((prev) => ({ ...prev, loading: false, error: err }));
    }
  };

  const handleResetCaretakerPassword = async (assignmentId) => {
    try {
      setCaretakerState((prev) => ({ ...prev, loading: true, error: '', message: '' }));
      const { data } = await api.post(`/landlord/caretakers/${assignmentId}/reset-password`);
      setCaretakerState({
        loading: false,
        error: '',
        message: 'Password reset successfully. Provide the new password below.',
        generatedPassword: data.temporary_password || ''
      });
    } catch (error) {
      const err = error.response?.data?.message || 'Failed to reset password.';
      setCaretakerState((prev) => ({ ...prev, loading: false, error: err }));
    }
  };

  const handleRevokeCaretaker = async (assignmentId) => {
    if (!window.confirm('Remove this caretaker access?')) {
      return;
    }

    try {
      setCaretakerState((prev) => ({ ...prev, loading: true, error: '', message: '' }));
      await api.delete(`/landlord/caretakers/${assignmentId}`);
      setCaretakerState((prev) => ({ ...prev, loading: false, message: 'Caretaker access removed.', generatedPassword: '' }));
      await fetchCaretakers({ preserveNotice: true });
    } catch (error) {
      const err = error.response?.data?.message || 'Failed to remove caretaker.';
      setCaretakerState((prev) => ({ ...prev, loading: false, error: err }));
    }
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user) return '?';
    const first = user.first_name?.[0] || '';
    const last = user.last_name?.[0] || '';
    return (first + last).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your account and business preferences</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <nav className="space-y-1">
                <button
                  onClick={() => handleTabChange('profile')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                    activeTab === 'profile' ? 'bg-green-50 text-green-600' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  My Profile
                </button>
                <button
                  onClick={() => handleTabChange('notifications')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                    activeTab === 'notifications' ? 'bg-green-50 text-green-600' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Notifications
                </button>
                <button
                  onClick={() => handleTabChange('security')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                    activeTab === 'security' ? 'bg-green-50 text-green-600' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Security
                </button>
                {normalizedRole === 'landlord' && (
                  <button
                    onClick={() => handleTabChange('delegates')}
                    className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                      activeTab === 'delegates' ? 'bg-green-50 text-green-600' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Caretaker Access
                  </button>
                )}
                {normalizedRole === 'landlord' && (
                  <button
                    onClick={() => handleTabChange('billing')}
                    className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                      activeTab === 'billing' ? 'bg-green-50 text-green-600' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Billing
                  </button>
                )}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            {/* My Profile Tab */}
            {activeTab === 'profile' && (
              <div className={`bg-white rounded-xl shadow-sm border p-6 transition-all ${isEditingProfile ? 'border-green-300 ring-2 ring-green-100' : 'border-gray-100'}`}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">My Profile</h2>
                  {!isEditingProfile && (
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors font-medium flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Edit Profile
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left Column - Avatar Only */}
                  <div className="md:col-span-1">
                    <div className={`flex flex-col items-center justify-center h-full p-6 rounded-xl border transition-all ${isEditingProfile ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                      {/* Profile Photo */}
                      <div className="relative mb-4">
                        <div className={`w-32 h-32 rounded-full flex items-center justify-center overflow-hidden transition-all ${isEditingProfile ? 'ring-4 ring-green-300' : ''} ${(photoPreview || profilePhoto) ? '' : (isEditingProfile ? 'bg-green-200' : 'bg-green-100')}`}>
                          {photoPreview || profilePhoto ? (
                            <img 
                              src={photoPreview || getImageUrl(profilePhoto)} 
                              alt="Profile" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-4xl text-green-600 font-semibold">{getUserInitials()}</span>
                          )}
                        </div>
                        {/* Remove photo button */}
                        {isEditingProfile && (photoPreview || profilePhoto) && (
                          <button
                            onClick={handleRemovePhoto}
                            className="absolute -top-1 -right-1 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                            title="Remove photo"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      
                      <h3 className="text-lg font-semibold text-gray-900 text-center">
                        {profileData.firstName} {profileData.lastName}
                      </h3>
                      <p className="text-sm text-gray-500 capitalize">{user?.role || 'Landlord'}</p>
                      
                      {/* Hidden file input */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handlePhotoSelect}
                        accept="image/*"
                        className="hidden"
                      />
                      
                      {isEditingProfile && (
                        <div className="mt-4 flex flex-col gap-2 w-full">
                          {photoPreview ? (
                            <>
                              <button
                                onClick={handlePhotoUpload}
                                disabled={isUploadingPhoto}
                                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                              >
                                {isUploadingPhoto ? (
                                  <>
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    Upload Photo
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setPhotoPreview(null);
                                  if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {profilePhoto ? 'Change Photo' : 'Add Photo'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column - Profile Details */}
                  <div className="md:col-span-2">
                    <div className="space-y-4">
                      {isEditingProfile ? (
                        // Edit Mode - Form inputs with green accent
                        <>
                          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-xs font-medium text-green-700 mb-3 flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              Edit your profile information below
                            </p>
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                                  <input
                                    type="text"
                                    value={profileData.firstName}
                                    onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                                    className="w-full px-4 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                                  <input
                                    type="text"
                                    value={profileData.lastName}
                                    onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                                    className="w-full px-4 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                                <input
                                  type="email"
                                  value={profileData.email}
                                  onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                                  className="w-full px-4 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                                <input
                                  type="tel"
                                  value={profileData.phone}
                                  onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                                  className="w-full px-4 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                                  placeholder="+63 XXX XXX XXXX"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Account Info Card */}
                          <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                            <p className="text-sm font-medium text-blue-900 mb-2">Account Information</p>
                            <div className="flex gap-6">
                              <p className="text-sm text-blue-700">
                                Role: <span className="font-semibold capitalize">{user?.role || 'Landlord'}</span>
                              </p>
                              <p className="text-sm text-blue-700">
                                Member since: <span className="font-semibold">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-2">
                            <button 
                              onClick={() => {
                                // Reset to original user data
                                setProfileData({
                                  firstName: user.first_name || '',
                                  lastName: user.last_name || '',
                                  email: user.email || '',
                                  phone: user.phone || ''
                                });
                                setIsEditingProfile(false);
                              }}
                              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                handleSaveProfile();
                                setIsEditingProfile(false);
                              }}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              Save Changes
                            </button>
                          </div>
                        </>
                      ) : (
                        // View Mode - Clean read-only display
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">First Name</label>
                              <p className="text-gray-900 font-medium text-lg">{profileData.firstName || '-'}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Last Name</label>
                              <p className="text-gray-900 font-medium text-lg">{profileData.lastName || '-'}</p>
                            </div>
                          </div>

                          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Email Address</label>
                            <p className="text-gray-900 font-medium text-lg">{profileData.email || '-'}</p>
                          </div>

                          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Phone Number</label>
                            <p className="text-gray-900 font-medium text-lg">{profileData.phone || '-'}</p>
                          </div>

                          {/* Account Info Card */}
                          <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                            <p className="text-sm font-medium text-blue-900 mb-2">Account Information</p>
                            <div className="flex gap-6">
                              <p className="text-sm text-blue-700">
                                Role: <span className="font-semibold capitalize">{user?.role || 'Landlord'}</span>
                              </p>
                              <p className="text-sm text-blue-700">
                                Member since: <span className="font-semibold">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
                              </p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className={`bg-white rounded-xl shadow-sm border p-6 transition-all ${isEditingNotifications ? 'border-green-300 ring-2 ring-green-100' : 'border-gray-100'}`}>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-gray-900">Notification Preferences</h2>
                    {isEditingNotifications && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                        Editing
                      </span>
                    )}
                  </div>
                  {!isEditingNotifications && (
                    <button
                      onClick={() => setIsEditingNotifications(true)}
                      className="px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors font-medium flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Edit Preferences
                    </button>
                  )}
                </div>
                
                {isEditingNotifications && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-6 flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <p className="text-sm text-green-700">Toggle the switches below to change your notification preferences</p>
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Email Notifications</h3>
                    <div className="space-y-3">
                      {Object.entries(notifications).filter(([key]) => key.startsWith('email')).map(([key, value]) => (
                        <div key={key} className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                          isEditingNotifications ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-100'
                        }`}>
                          <span className="text-sm text-gray-700">
                            {key === 'emailNewBooking' && 'New booking requests'}
                            {key === 'emailPayment' && 'Payment notifications'}
                            {key === 'emailMaintenance' && 'Maintenance requests'}
                          </span>
                          {isEditingNotifications ? (
                            <button
                              type="button"
                              onClick={() => setNotifications({...notifications, [key]: !value})}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                value ? 'bg-green-600' : 'bg-gray-300'
                              }`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                value ? 'translate-x-6' : 'translate-x-1'
                              }`} />
                            </button>
                          ) : (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              value ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                            }`}>
                              {value ? 'Enabled' : 'Disabled'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">SMS Notifications</h3>
                    <div className="space-y-3">
                      {Object.entries(notifications).filter(([key]) => key.startsWith('sms')).map(([key, value]) => (
                        <div key={key} className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                          isEditingNotifications ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-100'
                        }`}>
                          <span className="text-sm text-gray-700">
                            {key === 'smsPaymentReminder' && 'Payment reminders'}
                            {key === 'smsNewTenant' && 'New tenant notifications'}
                          </span>
                          {isEditingNotifications ? (
                            <button
                              type="button"
                              onClick={() => setNotifications({...notifications, [key]: !value})}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                value ? 'bg-green-600' : 'bg-gray-300'
                              }`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                value ? 'translate-x-6' : 'translate-x-1'
                              }`} />
                            </button>
                          ) : (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              value ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                            }`}>
                              {value ? 'Enabled' : 'Disabled'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Push Notifications</h3>
                    <div className="space-y-3">
                      <div className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                        isEditingNotifications ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-100'
                      }`}>
                        <span className="text-sm text-gray-700">New messages</span>
                        {isEditingNotifications ? (
                          <button
                            type="button"
                            onClick={() => setNotifications({...notifications, pushMessages: !notifications.pushMessages})}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              notifications.pushMessages ? 'bg-green-600' : 'bg-gray-300'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              notifications.pushMessages ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            notifications.pushMessages ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {notifications.pushMessages ? 'Enabled' : 'Disabled'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isEditingNotifications && (
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => setIsEditingNotifications(false)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          handleSaveNotifications();
                          setIsEditingNotifications(false);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Save Preferences
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className={`bg-white rounded-xl shadow-sm border p-6 transition-all ${isEditingPassword ? 'border-green-300 ring-2 ring-green-100' : 'border-gray-100'}`}>
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-gray-900">Password</h2>
                      {isEditingPassword && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                          Editing
                        </span>
                      )}
                    </div>
                    {!isEditingPassword && (
                      <button
                        onClick={() => setIsEditingPassword(true)}
                        className="px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors font-medium flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Change Password
                      </button>
                    )}
                  </div>
                  
                  {isEditingPassword ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-xs font-medium text-green-700 mb-4 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          Enter your current and new password below
                        </p>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                            <input
                              type="password"
                              value={passwordData.currentPassword}
                              onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                              className="w-full px-4 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                            <input
                              type="password"
                              value={passwordData.newPassword}
                              onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                              className="w-full px-4 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                            />
                            <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                            <input
                              type="password"
                              value={passwordData.confirmPassword}
                              onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                              className="w-full px-4 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => {
                            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                            setIsEditingPassword(false);
                          }}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => {
                            handleUpdatePassword();
                            setIsEditingPassword(false);
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Password Protected</p>
                          <p className="text-xs text-gray-500">Your account is secured with a password</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className={`bg-white rounded-xl shadow-sm border p-6 transition-all ${isEditingSecurity ? 'border-green-300 ring-2 ring-green-100' : 'border-gray-100'}`}>
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-gray-900">Security Settings</h2>
                      {isEditingSecurity && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                          Editing
                        </span>
                      )}
                    </div>
                    {!isEditingSecurity && (
                      <button
                        onClick={() => setIsEditingSecurity(true)}
                        className="px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors font-medium flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Edit Settings
                      </button>
                    )}
                  </div>

                  {isEditingSecurity && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-6 flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      <p className="text-sm text-green-700">Toggle the switches below to change your security settings</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                      isEditingSecurity ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-100'
                    }`}>
                      <div>
                        <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                        <p className="text-sm text-gray-500">Add an extra layer of security</p>
                      </div>
                      {isEditingSecurity ? (
                        <button
                          type="button"
                          onClick={() => setSecurity({...security, twoFactorAuth: !security.twoFactorAuth})}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            security.twoFactorAuth ? 'bg-green-600' : 'bg-gray-300'
                          }`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            security.twoFactorAuth ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </button>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          security.twoFactorAuth ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {security.twoFactorAuth ? 'Enabled' : 'Disabled'}
                        </span>
                      )}
                    </div>

                    <div className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                      isEditingSecurity ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-100'
                    }`}>
                      <div>
                        <p className="font-medium text-gray-900">Login Alerts</p>
                        <p className="text-sm text-gray-500">Get notified of new logins</p>
                      </div>
                      {isEditingSecurity ? (
                        <button
                          type="button"
                          onClick={() => setSecurity({...security, loginAlerts: !security.loginAlerts})}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            security.loginAlerts ? 'bg-green-600' : 'bg-gray-300'
                          }`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            security.loginAlerts ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </button>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          security.loginAlerts ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {security.loginAlerts ? 'Enabled' : 'Disabled'}
                        </span>
                      )}
                    </div>
                  </div>

                  {isEditingSecurity && (
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-6">
                      <button
                        onClick={() => setIsEditingSecurity(false)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          // Save security settings (you can add API call here)
                          setIsEditingSecurity(false);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Save Changes
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}


            {/* Caretaker Access Tab */}
            {activeTab === 'delegates' && (
              normalizedRole === 'landlord' ? (
                <div className="space-y-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">Create Caretaker Login</h2>
                        <p className="text-sm text-gray-500 mt-1">
                          Generate a proxy account for caretakers. Enable modules below to allow full management inside those areas.
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold">
                        Permission-Based
                      </span>
                    </div>

                    {caretakerState.error && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        {caretakerState.error}
                      </div>
                    )}

                    {caretakerState.message && (
                      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                        {caretakerState.message}
                      </div>
                    )}

                    {caretakerState.generatedPassword && (
                      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-amber-800 font-semibold">Temporary Password</p>
                          <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Hides in {Math.floor(passwordCountdown / 60)}:{String(passwordCountdown % 60).padStart(2, '0')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <code className="px-3 py-1 bg-white border border-amber-200 rounded text-amber-900 font-semibold">
                            {caretakerState.generatedPassword}
                          </code>
                          <button
                            onClick={() => navigator.clipboard.writeText(caretakerState.generatedPassword)}
                            className="text-sm text-amber-700 hover:text-amber-900"
                          >
                            Copy
                          </button>
                        </div>
                        <p className="text-xs text-amber-700">Share this password securely with your caretaker. They will be prompted to change it on first login.</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                        <input
                          type="text"
                          value={caretakerForm.first_name}
                          onChange={(e) => handleCaretakerInput('first_name', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                        <input
                          type="text"
                          value={caretakerForm.last_name}
                          onChange={(e) => handleCaretakerInput('last_name', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                        <input
                          type="email"
                          value={caretakerForm.email}
                          onChange={(e) => handleCaretakerInput('email', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone (optional)</label>
                        <input
                          type="tel"
                          value={caretakerForm.phone}
                          onChange={(e) => handleCaretakerInput('phone', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="e.g. +63 912 345 6789"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Caretaker Password (optional)</label>
                        <input
                          type="password"
                          value={caretakerForm.password}
                          onChange={(e) => handleCaretakerInput('password', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="Leave blank to auto-generate"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                        <input
                          type="password"
                          value={caretakerForm.password_confirmation}
                          onChange={(e) => handleCaretakerInput('password_confirmation', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="Repeat password"
                          disabled={!caretakerForm.password}
                        />
                      </div>
                    </div>

                    <div className="mt-6 border border-gray-200 rounded-xl p-4 bg-gray-50">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">Allowed Modules</h3>
                          <p className="text-xs text-gray-500">Choose what this caretaker can manage inside the landlord portal.</p>
                        </div>
                        <button
                          type="button"
                          onClick={resetCaretakerPermissions}
                          className="text-xs px-3 py-1 border border-gray-300 rounded-lg text-gray-600 hover:bg-white"
                        >
                          Reset to defaults
                        </button>
                      </div>
                      <div className="space-y-3">
                        {CARETAKER_PERMISSION_FIELDS.map((field) => (
                          <label
                            key={field.key}
                            className={`flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200 transition-colors ${
                              field.disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-green-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={caretakerPermissions[field.key]}
                              onChange={() => handlePermissionToggle(field.key)}
                              disabled={field.disabled}
                              className="mt-1 h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                            />
                            <div>
                              <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                {field.label}
                                {field.disabled ? (
                                  <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">Restricted</span>
                                ) : (
                                  !field.defaultValue && (
                                    <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">Optional</span>
                                  )
                                )}
                              </p>
                              <p className="text-xs text-gray-500">{field.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Property Assignment Section */}
                    <div className="mt-6 border border-gray-200 rounded-xl p-4 bg-gray-50">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">Assigned Properties</h3>
                          <p className="text-xs text-gray-500">Select which properties this caretaker can monitor and manage.</p>
                        </div>
                        {landlordProperties.length > 0 && (
                          <button
                            type="button"
                            onClick={handleSelectAllProperties}
                            className="text-xs px-3 py-1 border border-gray-300 rounded-lg text-gray-600 hover:bg-white"
                          >
                            {selectedPropertyIds.length === landlordProperties.length ? 'Deselect All' : 'Select All'}
                          </button>
                        )}
                      </div>
                      
                      {landlordProperties.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          No properties found. Create a property first.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {landlordProperties.map((property) => (
                            <label
                              key={property.id}
                              className={`flex items-center gap-3 p-3 bg-white rounded-lg border transition-colors cursor-pointer ${
                                selectedPropertyIds.includes(property.id)
                                  ? 'border-green-300 bg-green-50'
                                  : 'border-gray-200 hover:border-green-200'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedPropertyIds.includes(property.id)}
                                onChange={() => handlePropertyToggle(property.id)}
                                className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{property.name}</p>
                              </div>
                              {selectedPropertyIds.includes(property.id) && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">Selected</span>
                              )}
                            </label>
                          ))}
                        </div>
                      )}
                      
                      {selectedPropertyIds.length > 0 && (
                        <p className="mt-3 text-xs text-green-600 font-medium">
                          {selectedPropertyIds.length} of {landlordProperties.length} properties selected
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end mt-6">
                      <button
                        onClick={handleCreateCaretaker}
                        disabled={caretakerState.loading}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
                      >
                        {caretakerState.loading ? 'Saving...' : 'Create Caretaker Login'}
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Active Caretakers</h3>
                        <p className="text-sm text-gray-500">Manage who can help with the modules you grant access to.</p>
                      </div>
                      <button
                        onClick={fetchCaretakers}
                        disabled={caretakerState.loading}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
                      >
                        Refresh
                      </button>
                    </div>

                    {caretakerState.loading && caretakers.length === 0 ? (
                      <div className="py-8 text-center text-gray-500">Loading caretakers...</div>
                    ) : caretakers.length === 0 ? (
                      <div className="py-8 text-center text-gray-500">
                        No caretakers yet. Create one above to share access to selected modules.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {caretakers.map((entry) => (
                          <div key={entry.id} className="border border-gray-200 rounded-lg p-4 flex flex-col gap-4">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                              <div>
                                <p className="text-sm font-semibold text-gray-900">
                                  {entry.caretaker.first_name} {entry.caretaker.last_name}
                                </p>
                                <p className="text-sm text-gray-500">{entry.caretaker.email}</p>
                                <p className="text-xs text-gray-400">
                                  Added on {entry.created_at ? new Date(entry.created_at).toLocaleDateString() : 'N/A'}
                                </p>
                                <div className="flex gap-2 mt-2 flex-wrap">
                                  {entry.permissions.bookings && (
                                    <span className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700">Bookings</span>
                                  )}
                                  {entry.permissions.tenants && (
                                    <span className="px-2 py-0.5 text-xs rounded-full bg-green-50 text-green-700">Tenants</span>
                                  )}
                                  {entry.permissions.messages && (
                                    <span className="px-2 py-0.5 text-xs rounded-full bg-purple-50 text-purple-700">Messages</span>
                                  )}
                                  {entry.permissions.rooms && (
                                    <span className="px-2 py-0.5 text-xs rounded-full bg-amber-50 text-amber-700">Rooms</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                <button
                                  onClick={() => openCaretakerEditModal(entry)}
                                  className="px-3 py-2 text-sm border border-green-300 text-green-700 rounded-lg hover:bg-green-50"
                                  disabled={caretakerState.loading}
                                >
                                  Edit Access
                                </button>
                                <button
                                  onClick={() => handleResetCaretakerPassword(entry.id)}
                                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                                  disabled={caretakerState.loading}
                                >
                                  Reset Password
                                </button>
                                {/* TODO: Implement after defense - Activity Log feature */}
                                <button
                                  onClick={() => alert('Activity History - Coming soon! This feature will be implemented after defense.')}
                                  className="px-3 py-2 text-sm border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50"
                                  disabled={caretakerState.loading}
                                >
                                  View Activity
                                </button>
                                <button
                                  onClick={() => handleRevokeCaretaker(entry.id)}
                                  className="px-3 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                                  disabled={caretakerState.loading}
                                >
                                  Revoke Access
                                </button>
                              </div>
                            </div>
                            
                            {/* Assigned Properties */}
                            <div className="border-t border-gray-100 pt-3">
                              <p className="text-xs font-semibold text-gray-600 mb-2">Assigned Properties:</p>
                              {entry.assigned_properties && entry.assigned_properties.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {entry.assigned_properties.map((prop) => (
                                    <span key={prop.id} className="px-2 py-1 text-xs rounded-lg bg-gray-100 text-gray-700 border border-gray-200">
                                      {prop.name}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-400 italic">No properties assigned</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Caretaker Access</h2>
                  <p className="text-gray-600">
                    You are signed in as a caretaker. Landlords control which modules you can use and can update your permissions from their account.
                  </p>
                </div>
              )
            )}

            {/* Billing Tab */}
            {activeTab === 'billing' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Billing & Subscription</h2>
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No active subscription</h3>
                  <p className="text-gray-600 mb-6">Upgrade to premium for advanced features</p>
                  <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
                    View Plans
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {caretakerEdit.open && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between p-5 border-b border-gray-200 sticky top-0 bg-white">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Update Caretaker Access</h3>
                <p className="text-sm text-gray-500">{caretakerEdit.caretakerName}</p>
              </div>
              <button
                onClick={closeCaretakerEditModal}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                disabled={caretakerEdit.saving}
              >
                &times;
              </button>
            </div>

            <div className="p-5 space-y-4">
              {caretakerEdit.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {caretakerEdit.error}
                </div>
              )}

              {/* Permissions */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Allowed Modules</h4>
                <div className="space-y-3">
                  {CARETAKER_PERMISSION_FIELDS.map((field) => (
                    <label
                      key={field.key}
                      className={`flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 transition-colors ${
                        field.disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-green-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={caretakerEdit.permissions[field.key]}
                        onChange={() => handleCaretakerEditToggle(field.key)}
                        disabled={field.disabled}
                        className="mt-1 h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{field.label}</p>
                        <p className="text-xs text-gray-500">{field.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Property Assignment in Edit Modal */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-900">Assigned Properties</h4>
                  {landlordProperties.length > 0 && (
                    <button
                      type="button"
                      onClick={handleEditSelectAllProperties}
                      className="text-xs px-2 py-1 border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
                    >
                      {caretakerEdit.propertyIds.length === landlordProperties.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>
                
                {landlordProperties.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm bg-gray-50 rounded-lg">
                    No properties available
                  </div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {landlordProperties.map((property) => (
                      <label
                        key={property.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                          caretakerEdit.propertyIds.includes(property.id)
                            ? 'border-green-300 bg-green-50'
                            : 'border-gray-200 bg-gray-50 hover:border-green-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={caretakerEdit.propertyIds.includes(property.id)}
                          onChange={() => handleEditPropertyToggle(property.id)}
                          className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                        <span className="text-sm font-medium text-gray-900">{property.name}</span>
                      </label>
                    ))}
                  </div>
                )}
                
                {caretakerEdit.propertyIds.length > 0 && (
                  <p className="mt-2 text-xs text-green-600 font-medium">
                    {caretakerEdit.propertyIds.length} of {landlordProperties.length} properties selected
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-gray-200 sticky bottom-0 bg-white">
              <button
                onClick={closeCaretakerEditModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                disabled={caretakerEdit.saving}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateCaretakerPermissions}
                disabled={caretakerEdit.saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
              >
                {caretakerEdit.saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {roomPermissionPrompt.open && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Enable Room Management?</h3>
            <p className="text-sm text-gray-600 mb-6">Are you sure to enable this? Caretakers will be able to adjust room availability and assignments.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRoomPermissionPrompt({ open: false, context: null })}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setRoomPermissionPrompt({ open: false, context: null });
                  if (roomPermissionPrompt.context === 'create') {
                    setCaretakerPermissions((prev) => ({ ...prev, rooms: true }));
                  } else if (roomPermissionPrompt.context === 'edit') {
                    setCaretakerEdit((prev) => ({
                      ...prev,
                      permissions: { ...prev.permissions, rooms: true }
                    }));
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Enable Access
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}