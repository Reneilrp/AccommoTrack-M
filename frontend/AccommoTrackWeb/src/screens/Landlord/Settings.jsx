import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Clock, ShieldCheck, Palette, User, Bell, Lock, Users, Receipt, CreditCard } from 'lucide-react';
import api, { getImageUrl } from '../../utils/api';
import MyProfile from '../../components/Settings/landlord/MyProfile';
import Notifications from '../../components/Settings/landlord/Notifications';
import Security from '../../components/Settings/landlord/Security';
import CareTakerAccess from '../../components/Settings/landlord/CareTakerAccess';
// import Billing from '../../components/Settings/landlord/Billing';
import PaymentMethods from '../../components/Settings/landlord/PaymentMethods';
import VerificationStatus from './VerificationStatus';
import AppearanceTab from '../../components/Settings/AppearanceTab';

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

const VALID_TABS = ['profile', 'notifications', 'security', 'caretaker', 'billing', 'payments', 'verification', 'appearance'];

const ensureValidTab = (tab) => (VALID_TABS.includes(tab) ? tab : 'profile');

export default function Settings({ user, accessRole = 'landlord', onUserUpdate }) {
    // Allow toggling caretaker permission checkboxes
    const handlePermissionToggle = (key) => {
      setCaretakerPermissions((prev) => ({
        ...prev,
        [key]: !prev[key],
      }));
    };
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    // Check if there's a tab in location state (from Link navigation)
    if (location.state?.tab && VALID_TABS.includes(location.state.tab)) {
      return location.state.tab;
    }
    return ensureValidTab(searchParams.get('tab'));
  });
  const normalizedRole = accessRole || user?.role || 'landlord';
  useEffect(() => {
    // Handle location state tab (from Link with state)
    if (location.state?.tab && VALID_TABS.includes(location.state.tab)) {
      if (location.state.tab !== activeTab) {
        setActiveTab(location.state.tab);
        // Update URL params to match
        const params = new URLSearchParams(searchParams);
        params.set('tab', location.state.tab);
        setSearchParams(params, { replace: true });
      }
      return;
    }

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
    if (activeTab === 'caretaker' && user?.role === 'landlord') {
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
    message: ''
  });
  // Removed passwordCountdown and generatedPassword logic for caretaker password
  const [caretakerEdit, setCaretakerEdit] = useState(() => createCaretakerEditState());
  const [roomPermissionPrompt, setRoomPermissionPrompt] = useState({ open: false, context: null });
  
  // Edit mode states for each section
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  // Removed isEditingNotifications state; toggles are always available
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [isEditingSecurity, setIsEditingSecurity] = useState(false);
  
  // Profile photo state
  const [profilePhoto, setProfilePhoto] = useState(user?.profile_image || null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  // Define resetCaretakerPermissions to fix ReferenceError
  const resetCaretakerPermissions = () => {
    setCaretakerPermissions(createCaretakerPermissionDefaults());
  };

  // Fix: Define resetCaretakerPermissions and fetchCaretakers to avoid ReferenceError

  // Fetch caretakers for landlord
  const fetchCaretakers = async ({ preserveNotice } = {}) => {
    try {
      setCaretakerState((prev) => ({ ...prev, loading: true, error: preserveNotice ? prev.error : '', message: preserveNotice ? prev.message : '' }));
      const { data } = await api.get('/landlord/caretakers');
      setCaretakers(data.assignments || []);
      setCaretakerState((prev) => ({ ...prev, loading: false }));
    } catch (error) {
      setCaretakerState((prev) => ({ ...prev, loading: false, error: 'Failed to fetch caretakers.' }));
    }
  };

  // Fix: Define resetCaretakerPermissions to avoid ReferenceError

  // Update profile photo when user changes
  useEffect(() => {
    if (user?.profile_image) {
      setProfilePhoto(user.profile_image);
    }
  }, [user]);

  // Removed useEffect for auto-hiding generated password

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
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('An error occurred. Please try again.');
    }
  };

  const handleSaveNotifications = () => {
    console.log('Saving notifications:', notifications);
    toast.success('Notification preferences updated!');
  };

  // Handle photo file selection
  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
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
      toast.error('Please select a photo first');
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
      toast.success('Profile photo updated successfully!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo. Please try again.');
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
    } catch (error) {
      // handle error if needed
    }
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
    if (!caretakerForm.first_name || !caretakerForm.last_name || !caretakerForm.email || !caretakerForm.password || !caretakerForm.password_confirmation) {
      setCaretakerState((prev) => ({ ...prev, error: 'All fields are required.' }));
      return;
    }
    if (caretakerForm.password.length < 8) {
      setCaretakerState((prev) => ({ ...prev, error: 'Caretaker password must be at least 8 characters.' }));
      return;
    }
    if (caretakerForm.password !== caretakerForm.password_confirmation) {
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
      const { data } = await api.post('/landlord/caretakers', payload);
      setCaretakerForm({ first_name: '', last_name: '', email: '', phone: '', password: '', password_confirmation: '' });
      resetCaretakerPermissions();
      setCaretakerState({
        loading: false,
        error: '',
        message: 'Caretaker created successfully.'
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
      await api.post(`/landlord/caretakers/${assignmentId}/reset-password`);
      setCaretakerState({
        loading: false,
        error: '',
        message: 'Password reset successfully.'
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
      setCaretakerState((prev) => ({ ...prev, loading: false, message: 'Caretaker access removed.' }));
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your account and business preferences</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
              <nav className="space-y-1">
                <button
                  onClick={() => handleTabChange('profile')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'profile' ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <User className="w-4 h-4" />
                  My Profile
                </button>
                <button
                  onClick={() => handleTabChange('notifications')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'notifications' ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  Notifications
                </button>
                <button
                  onClick={() => handleTabChange('security')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'security' ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  Security
                </button>
                <button
                  onClick={() => handleTabChange('caretaker')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'caretaker' ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Caretaker
                </button>
                {/* <button
                  onClick={() => handleTabChange('billing')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'billing' ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  Billing
                </button> */}
                <button
                  onClick={() => handleTabChange('payments')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'payments' ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Payment Methods
                </button>
                <button
                  onClick={() => handleTabChange('verification')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'verification' ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  Verification Status
                </button>
                <button
                  onClick={() => handleTabChange('appearance')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'appearance' ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Palette className="w-4 h-4" />
                  Appearance
                </button>
              </nav>
            </div>
          </div>
          {/* Main Content Area */}
          <div className="lg:col-span-3 min-w-0">
            {activeTab === 'profile' && (
              <MyProfile
                user={user}
                profileData={profileData}
                setProfileData={setProfileData}
                isEditingProfile={isEditingProfile}
                setIsEditingProfile={setIsEditingProfile}
                handleSaveProfile={handleSaveProfile}
                profilePhoto={profilePhoto}
                setProfilePhoto={setProfilePhoto}
                photoPreview={photoPreview}
                setPhotoPreview={setPhotoPreview}
                isUploadingPhoto={isUploadingPhoto}
                setIsUploadingPhoto={setIsUploadingPhoto}
                fileInputRef={fileInputRef}
                handlePhotoSelect={handlePhotoSelect}
                handlePhotoUpload={handlePhotoUpload}
                handleRemovePhoto={handleRemovePhoto}
              />
            )}
            {activeTab === 'notifications' && (
              <Notifications notifications={notifications} setNotifications={setNotifications} />
            )}
            {activeTab === 'security' && (
              <Security
                passwordData={passwordData}
                setPasswordData={setPasswordData}
                isEditingPassword={isEditingPassword}
                setIsEditingPassword={setIsEditingPassword}
                handleUpdatePassword={() => {}}
                security={security}
                setSecurity={setSecurity}
                isEditingSecurity={isEditingSecurity}
                setIsEditingSecurity={setIsEditingSecurity}
              />
            )}
            {activeTab === 'caretaker' && (
              <CareTakerAccess
                caretakers={caretakers}
                setCaretakers={setCaretakers}
                caretakerForm={caretakerForm}
                setCaretakerForm={setCaretakerForm}
                caretakerPermissions={caretakerPermissions}
                setCaretakerPermissions={setCaretakerPermissions}
                landlordProperties={landlordProperties}
                selectedPropertyIds={selectedPropertyIds}
                setSelectedPropertyIds={setSelectedPropertyIds}
                caretakerState={caretakerState}
                setCaretakerState={setCaretakerState}
                handleCreateCaretaker={handleCreateCaretaker}
                handleRevokeCaretaker={handleRevokeCaretaker}
                fetchCaretakers={fetchCaretakers}
                resetCaretakerPermissions={resetCaretakerPermissions}
                handlePermissionToggle={handlePermissionToggle}
              />
            )}
            {/* {activeTab === 'billing' && <Billing />} */}
            {activeTab === 'payments' && <PaymentMethods user={user} onUpdate={onUserUpdate} />}
            {activeTab === 'verification' && <VerificationStatus />}
            {activeTab === 'appearance' && <AppearanceTab />}
          </div>
        </div>
      </div>
      {/* ...existing code for modals, etc... */}
    </div>
  );
}