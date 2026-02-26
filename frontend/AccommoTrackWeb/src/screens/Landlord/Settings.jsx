import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Clock, ShieldCheck, Palette, User, Bell, Lock, Users, Receipt, CreditCard } from 'lucide-react';
import api, { getImageUrl } from '../../utils/api';
import MyProfile from '../../components/Settings/landlord/MyProfile';
import Notifications from '../../components/Settings/landlord/Notifications';
import Security from '../../components/Settings/landlord/Security';
import CareTakerAccess from '../../components/Settings/landlord/CareTakerAccess';
import PaymentMethods from '../../components/Settings/landlord/PaymentMethods';
import VerificationStatus from './VerificationStatus';
import AppearanceTab from '../../components/Settings/AppearanceTab';
import { useUIState } from '../../contexts/UIStateContext';

const CARETAKER_PERMISSION_FIELDS = [
  { key: 'bookings', label: 'Bookings', description: 'View booking requests, statuses, and payment updates.', defaultValue: true },
  { key: 'tenants', label: 'Tenants', description: 'See tenant profiles, room assignments, and contact info.', defaultValue: true },
  { key: 'messages', label: 'Messages', description: 'Monitor inbox conversations with prospects and tenants.', defaultValue: true },
  { key: 'rooms', label: 'Room Management', description: 'Allow caretakers to edit room availability and assignments.', defaultValue: false },
];

const createCaretakerPermissionDefaults = () => {
  const defaults = CARETAKER_PERMISSION_FIELDS.reduce((acc, field) => { acc[field.key] = field.defaultValue; return acc; }, {});
  defaults.properties = false;
  return defaults;
};

const createCaretakerEditState = () => ({ open: false, assignmentId: null, caretakerName: '', permissions: createCaretakerPermissionDefaults(), propertyIds: [], saving: false, error: '' });

const serializeCaretakerPermissions = (permissions) => ({
  can_view_bookings: Boolean(permissions.bookings),
  can_view_messages: Boolean(permissions.messages),
  can_view_tenants: Boolean(permissions.tenants),
  can_view_rooms: Boolean(permissions.rooms),
  can_view_properties: Boolean(permissions.properties)
});

const VALID_TABS = ['profile', 'notifications', 'security', 'caretaker', 'payments', 'verification', 'appearance'];
const ensureValidTab = (tab) => (VALID_TABS.includes(tab) ? tab : 'profile');

export default function Settings({ user, accessRole = 'landlord', onUserUpdate }) {
  const { uiState, updateData } = useUIState();
  const cachedData = uiState.data?.landlord_settings;

  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    if (location.state?.tab && VALID_TABS.includes(location.state.tab)) return location.state.tab;
    return ensureValidTab(searchParams.get('tab'));
  });

  const normalizedRole = accessRole || user?.role || 'landlord';

  useEffect(() => {
    if (location.state?.tab && VALID_TABS.includes(location.state.tab)) {
      if (location.state.tab !== activeTab) {
        setActiveTab(location.state.tab);
        const params = new URLSearchParams(searchParams);
        params.set('tab', location.state.tab);
        setSearchParams(params, { replace: true });
      }
      return;
    }
    const paramTab = searchParams.get('tab');
    const nextTab = ensureValidTab(paramTab);
    if (nextTab !== activeTab) setActiveTab(nextTab);
  }, [searchParams, location.state]);

  const handleTabChange = (tab) => {
    const nextTab = ensureValidTab(tab);
    setActiveTab(nextTab);
    const params = new URLSearchParams(searchParams);
    if (nextTab === 'profile') params.delete('tab');
    else params.set('tab', nextTab);
    setSearchParams(params);
  };

  const [profileData, setProfileData] = useState({ firstName: user?.first_name || '', lastName: user?.last_name || '', email: user?.email || '', phone: user?.phone || '' });
  const [security, setSecurity] = useState({ twoFactorAuth: false, loginAlerts: true });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [caretakers, setCaretakers] = useState(cachedData?.caretakers || []);
  const [landlordProperties, setLandlordProperties] = useState(cachedData?.landlordProperties || []);
  const [caretakerForm, setCaretakerForm] = useState({ first_name: '', last_name: '', email: '', phone: '', password: '', password_confirmation: '' });
  const [selectedPropertyIds, setSelectedPropertyIds] = useState([]);
  const [caretakerPermissions, setCaretakerPermissions] = useState(() => createCaretakerPermissionDefaults());
  const [caretakerState, setCaretakerState] = useState({ loading: false, error: '', message: '' });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [isEditingSecurity, setIsEditingSecurity] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(user?.profile_image || null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (activeTab === 'caretaker' && user?.role === 'landlord') fetchCaretakers();
  }, [activeTab]);

  const fetchCaretakers = async () => {
    try {
      if (!cachedData) setCaretakerState(prev => ({ ...prev, loading: true }));
      const { data } = await api.get('/landlord/caretakers');
      setCaretakers(data.caretakers || []);
      setLandlordProperties(data.landlord_properties || []);
      updateData('landlord_settings', { caretakers: data.caretakers, landlordProperties: data.landlord_properties });
      setCaretakerState(prev => ({ ...prev, loading: false }));
    } catch (error) { setCaretakerState(prev => ({ ...prev, loading: false, error: 'Failed to fetch caretakers.' })); }
  };

  const handleSaveProfile = async () => {
    try {
      const result = await api.put('/me', { first_name: profileData.firstName, last_name: profileData.lastName, phone: profileData.phone });
      onUserUpdate?.(result.data.user);
      setIsEditingProfile(false);
      toast.success('Profile updated successfully!');
    } catch (error) { toast.error('Failed to update profile.'); }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoUpload = async () => {
    const formData = new FormData();
    formData.append('profile_image', fileInputRef.current.files[0]);
    try {
      setIsUploadingPhoto(true);
      const res = await api.post('/me', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      onUserUpdate?.(res.data.user);
      setPhotoPreview(null);
      toast.success('Photo updated!');
    } finally { setIsUploadingPhoto(false); }
  };

  const handleCreateCaretaker = async () => {
    try {
      setCaretakerState(prev => ({ ...prev, loading: true, error: '', message: '' }));
      await api.post('/landlord/caretakers', { 
        ...caretakerForm, 
        permissions: serializeCaretakerPermissions(caretakerPermissions), 
        property_ids: selectedPropertyIds 
      });
      
      // Reset state and clear form
      setCaretakerState({ loading: false, error: '', message: '' });
      setCaretakerForm({ first_name: '', last_name: '', email: '', phone: '', password: '', password_confirmation: '' });
      setSelectedPropertyIds([]);
      
      // Refresh the list
      fetchCaretakers();
      
      toast.success('Caretaker account created successfully!');
    } catch (e) { 
      const errorMsg = e.response?.data?.message || 'Failed to create caretaker account.';
      setCaretakerState(prev => ({ ...prev, loading: false, error: errorMsg })); 
      toast.error(errorMsg);
      throw e;
    }
  };

  const handlePermissionToggle = (key) => {
    setCaretakerPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const resetCaretakerPermissions = () => {
    setCaretakerPermissions(createCaretakerPermissionDefaults());
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <nav className="space-y-1">
              {[
                { id: 'profile', label: 'My Profile', icon: <User className="w-4 h-4" /> },
                { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
                { id: 'security', label: 'Security', icon: <Lock className="w-4 h-4" /> },
                { id: 'caretaker', label: 'Caretaker', icon: <Users className="w-4 h-4" /> }
              ].map(tab => (
                <button key={tab.id} onClick={() => handleTabChange(tab.id)} className={`w-full text-left px-4 py-3 rounded-lg font-medium flex items-center gap-2 ${activeTab === tab.id ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  {tab.icon} {tab.label}
                </button>
              ))}
              {normalizedRole === 'landlord' && (
                <>
                  <button onClick={() => handleTabChange('payments')} className={`w-full text-left px-4 py-3 rounded-lg font-medium flex items-center gap-2 ${activeTab === 'payments' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}><CreditCard className="w-4 h-4" /> Payments</button>
                  <button onClick={() => handleTabChange('verification')} className={`w-full text-left px-4 py-3 rounded-lg font-medium flex items-center gap-2 ${activeTab === 'verification' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}><ShieldCheck className="w-4 h-4" /> Verification</button>
                </>
              )}
              <button onClick={() => handleTabChange('appearance')} className={`w-full text-left px-4 py-3 rounded-lg font-medium flex items-center gap-2 ${activeTab === 'appearance' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}><Palette className="w-4 h-4" /> Appearance</button>
            </nav>
          </div>
        </div>

        <div className="lg:col-span-3">
          {activeTab === 'profile' && <MyProfile user={user} profileData={profileData} setProfileData={setProfileData} isEditingProfile={isEditingProfile} setIsEditingProfile={setIsEditingProfile} handleSaveProfile={handleSaveProfile} profilePhoto={profilePhoto} photoPreview={photoPreview} isUploadingPhoto={isUploadingPhoto} fileInputRef={fileInputRef} handlePhotoSelect={handlePhotoSelect} handlePhotoUpload={handlePhotoUpload} />}
          {activeTab === 'notifications' && <Notifications user={user} onUpdate={onUserUpdate} />}
          {activeTab === 'security' && <Security passwordData={passwordData} setPasswordData={setPasswordData} isEditingPassword={isEditingPassword} setIsEditingPassword={setIsEditingPassword} security={security} setSecurity={setSecurity} isEditingSecurity={isEditingSecurity} setIsEditingSecurity={setIsEditingSecurity} />}
          {activeTab === 'caretaker' && (
            <CareTakerAccess 
              caretakers={caretakers} 
              landlordProperties={landlordProperties} 
              selectedPropertyIds={selectedPropertyIds} 
              setSelectedPropertyIds={setSelectedPropertyIds} 
              caretakerState={caretakerState} 
              setCaretakerState={setCaretakerState}
              handleCreateCaretaker={handleCreateCaretaker} 
              caretakerForm={caretakerForm} 
              setCaretakerForm={setCaretakerForm} 
              caretakerPermissions={caretakerPermissions} 
              setCaretakerPermissions={setCaretakerPermissions}
              handlePermissionToggle={handlePermissionToggle}
              resetCaretakerPermissions={resetCaretakerPermissions}
            />
          )}
          {normalizedRole === 'landlord' && activeTab === 'payments' && <PaymentMethods user={user} onUpdate={onUserUpdate} />}
          {normalizedRole === 'landlord' && activeTab === 'verification' && <VerificationStatus />}
          {activeTab === 'appearance' && <AppearanceTab />}
        </div>
      </div>
    </div>
  );
}
