import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams, useLocation } from 'react-router-dom';
import { ShieldCheck, Palette, User, Bell, Lock, Users, CreditCard, ArrowLeftRight } from 'lucide-react';
import api from '../../utils/api';
import MyProfile from '../../components/Settings/landlord/MyProfile';
import Notifications from '../../components/Settings/landlord/Notifications';
import Security from '../../components/Settings/landlord/Security';
import CareTakerAccess from '../../components/Settings/landlord/CareTakerAccess';
import PaymentMethods from '../../components/Settings/landlord/PaymentMethods';
import VerificationStatus from './VerificationStatus';
import AppearanceTab from '../../components/Settings/AppearanceTab';
import SwitchRoleTab from '../../components/Settings/SwitchRoleTab';
import { useUIState } from '../../contexts/UIStateContext';

const VALID_TABS = ['profile', 'notifications', 'security', 'caretaker', 'payments', 'verification', 'appearance', 'switch-role'];
const ensureValidTab = (tab) => (VALID_TABS.includes(tab) ? tab : 'profile');

const createCaretakerPermissionDefaults = () => ({
  bookings: false,
  tenants: false,
  messages: false,
  rooms: false,
  properties: false,
  maintenance: false,
  payments: false
});

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

  const allTabs = [
    { id: 'profile', label: 'My Profile', icon: <User className="w-4 h-4" />, roles: ['landlord', 'caretaker'] },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" />, roles: ['landlord', 'caretaker'] },
    { id: 'security', label: 'Security', icon: <Lock className="w-4 h-4" />, roles: ['landlord', 'caretaker'] },
    { id: 'caretaker', label: 'Caretaker Management', icon: <Users className="w-4 h-4" />, roles: ['landlord'] },
    { id: 'payments', label: 'Payments', icon: <CreditCard className="w-4 h-4" />, roles: ['landlord'] },
    { id: 'verification', label: 'Verification', icon: <ShieldCheck className="w-4 h-4" />, roles: ['landlord'] },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" />, roles: ['landlord', 'caretaker'] },
    { id: 'switch-role', label: 'Switch Role', icon: <ArrowLeftRight className="w-4 h-4" />, roles: ['landlord'] },
  ];

  const visibleTabs = allTabs.filter(tab => tab.roles.includes(normalizedRole));

  // --- Profile State ---
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    dateOfBirth: user?.date_of_birth || ''
  });
  const [profilePhoto, setProfilePhoto] = useState(user?.profile_image || null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  // Sync profileData when user prop changes
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        dateOfBirth: user.date_of_birth || ''
      });
      setProfilePhoto(user.profile_image || null);
    }
  }, [user]);

  // --- Security State ---
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [isEditingSecurity, setIsEditingSecurity] = useState(false);
  const [security, setSecurity] = useState({ twoFactorAuth: false, loginAlerts: true });

  // --- Caretaker State ---
  const [caretakers, setCaretakers] = useState(() => Array.isArray(cachedData?.caretakers) ? cachedData.caretakers : []);
  const [landlordProperties, setLandlordProperties] = useState(() => Array.isArray(cachedData?.landlordProperties) ? cachedData.landlordProperties : []);
  const [caretakerForm, setCaretakerForm] = useState({ first_name: '', middle_name: '', last_name: '', email: '', phone: '', date_of_birth: '', password: '', password_confirmation: '' });
  const [selectedPropertyIds, setSelectedPropertyIds] = useState([]);
  const [caretakerPermissions, setCaretakerPermissions] = useState(createCaretakerPermissionDefaults());
  const [caretakerState, setCaretakerState] = useState({ loading: false, error: '' });

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

  // --- Profile Handlers ---
  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) return toast.error('Image size must be less than 5MB');
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleRemovePhoto = async () => {
    if (photoPreview) {
      setPhotoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    try {
      await api.delete('/me/profile-image');
      setProfilePhoto(null);
      onUserUpdate({ ...user, profile_image: null });
      toast.success('Photo removed');
    } catch (e) {
      toast.error('Failed to remove photo');
    }
  };

  const handleSaveProfile = async () => {
    try {
      const formData = new FormData();
      formData.append('first_name', profileData.firstName);
      formData.append('last_name', profileData.lastName);
      formData.append('phone', profileData.phone);
      formData.append('date_of_birth', profileData.dateOfBirth);
      formData.append('_method', 'PUT');

      if (fileInputRef.current?.files[0]) {
        formData.append('profile_image', fileInputRef.current.files[0]);
      }

      const res = await api.post('/me', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      onUserUpdate(res.data.user);
      setIsEditingProfile(false);
      setPhotoPreview(null);
      toast.success('Profile updated!');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Update failed');
    }
  };

  // --- Security Handlers ---
  const handleUpdatePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) return toast.error('Passwords do not match');
    try {
      await api.post('/change-password', {
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
        new_password_confirmation: passwordData.confirmPassword
      });
      toast.success('Password changed!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsEditingPassword(false);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to change password');
    }
  };

  const handleUpdateSecurity = () => {
    toast.success('Security settings updated!');
    setIsEditingSecurity(false);
  };

  // --- Caretaker Handlers ---
  const fetchCaretakers = async () => {
    setCaretakerState(s => ({ ...s, loading: true }));
    try {
      const [cRes, pRes] = await Promise.all([api.get('/landlord/caretakers'), api.get('/landlord/properties')]);
      
      // The backend returns { caretakers: [...], landlord_properties: [...] }
      const caretakersData = Array.isArray(cRes.data?.caretakers) ? cRes.data.caretakers : [];
      const propertiesData = Array.isArray(pRes.data.data) ? pRes.data.data : (Array.isArray(pRes.data) ? pRes.data : []);
      
      setCaretakers(caretakersData);
      setLandlordProperties(propertiesData);
      updateData('landlord_settings', { caretakers: caretakersData, landlordProperties: propertiesData });
    } catch (e) {
      console.error(e);
    } finally {
      setCaretakerState(s => ({ ...s, loading: false }));
    }
  };

  const handlePermissionToggle = (key) => setCaretakerPermissions(p => ({ ...p, [key]: !p[key] }));
  const resetCaretakerPermissions = () => setCaretakerPermissions(createCaretakerPermissionDefaults());

  const handleCreateCaretaker = async () => {
    setCaretakerState(s => ({ ...s, loading: true }));
    try {
      // Map frontend permission keys to backend 'can_view_*' keys
      const mappedPermissions = {
        can_view_bookings: !!caretakerPermissions.bookings,
        can_view_messages: !!caretakerPermissions.messages,
        can_view_tenants: !!caretakerPermissions.tenants,
        can_view_rooms: !!caretakerPermissions.rooms,
        can_view_properties: !!caretakerPermissions.properties,
        can_manage_maintenance: !!caretakerPermissions.maintenance,
        can_manage_payments: !!caretakerPermissions.payments
      };

      const response = await api.post('/landlord/caretakers', {
        ...caretakerForm,
        property_ids: selectedPropertyIds,
        permissions: mappedPermissions
      });

      const newCaretakerData = response.data.caretaker;
      
      // Transform the response object to match the structure of the existing list
      const transformedCaretaker = {
        id: newCaretakerData.assignment_id,
        caretaker: {
          id: null, // The user ID is not returned from this endpoint
          first_name: newCaretakerData.first_name,
          middle_name: newCaretakerData.middle_name,
          last_name: newCaretakerData.last_name,
          email: newCaretakerData.email,
          phone: newCaretakerData.phone,
          date_of_birth: newCaretakerData.date_of_birth,
          is_active: true,
        },
        permissions: newCaretakerData.permissions,
        assigned_properties: newCaretakerData.assigned_properties,
        assigned_property_ids: newCaretakerData.assigned_properties.map(p => p.id),
        created_at: new Date().toISOString(), // Set current date for immediate display
      };

      setCaretakers(prev => [transformedCaretaker, ...prev]);
      
      toast.success('Caretaker added!');
      setCaretakerForm({ first_name: '', middle_name: '', last_name: '', email: '', phone: '', date_of_birth: '', password: '', password_confirmation: '' });
      setSelectedPropertyIds([]);
      resetCaretakerPermissions();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to add caretaker');
    } finally {
      setCaretakerState(s => ({ ...s, loading: false }));
    }
  };

  const handleUpdateCaretaker = async (id) => {
    setCaretakerState(s => ({ ...s, loading: true }));
    try {
      // Map frontend permission keys to backend 'can_view_*' keys
      const mappedPermissions = {
        can_view_bookings: !!caretakerPermissions.bookings,
        can_view_messages: !!caretakerPermissions.messages,
        can_view_tenants: !!caretakerPermissions.tenants,
        can_view_rooms: !!caretakerPermissions.rooms,
        can_view_properties: !!caretakerPermissions.properties,
        can_manage_maintenance: !!caretakerPermissions.maintenance,
        can_manage_payments: !!caretakerPermissions.payments
      };

      const response = await api.patch(`/landlord/caretakers/${id}`, {
        ...caretakerForm,
        property_ids: selectedPropertyIds,
        permissions: mappedPermissions
      });
      
      const updatedCaretakerData = response.data.caretaker;

      const transformedCaretaker = {
        id: updatedCaretakerData.assignment_id,
        caretaker: {
          id: null, // Not available in response
          first_name: updatedCaretakerData.first_name,
          middle_name: updatedCaretakerData.middle_name,
          last_name: updatedCaretakerData.last_name,
          email: updatedCaretakerData.email,
          phone: updatedCaretakerData.phone,
          date_of_birth: updatedCaretakerData.date_of_birth,
          is_active: true,
        },
        permissions: updatedCaretakerData.permissions,
        assigned_properties: updatedCaretakerData.assigned_properties,
        assigned_property_ids: updatedCaretakerData.assigned_properties.map(p => p.id),
        created_at: new Date().toISOString(), // This will be slightly off, but ok for UI update
      };

      setCaretakers(prev => prev.map(c => c.id === id ? transformedCaretaker : c));
      toast.success('Caretaker updated!');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Update failed');
    } finally {
      setCaretakerState(s => ({ ...s, loading: false }));
    }
  };

  const handleRevokeCaretaker = async (id, reason) => {
    try {
      await api.delete(`/landlord/caretakers/${id}`, { data: { reason } });
      fetchCaretakers();
      toast.success('Access revoked');
    } catch (e) {
      toast.error('Revocation failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <nav className="space-y-1">
              {visibleTabs.map(tab => (
                <button 
                  key={tab.id} 
                  onClick={() => handleTabChange(tab.id)} 
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium flex items-center gap-2 ${activeTab === tab.id ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="lg:col-span-3">
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
              handleRemovePhoto={handleRemovePhoto}
            />
          )}
          {activeTab === 'notifications' && <Notifications />}
          {activeTab === 'security' && (
            <Security 
              user={user} 
              passwordData={passwordData}
              setPasswordData={setPasswordData}
              isEditingPassword={isEditingPassword}
              setIsEditingPassword={setIsEditingPassword}
              handleUpdatePassword={handleUpdatePassword}
              security={security}
              setSecurity={setSecurity}
              isEditingSecurity={isEditingSecurity}
              setIsEditingSecurity={setIsEditingSecurity}
              handleUpdateSecurity={handleUpdateSecurity}
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
              handleUpdateCaretaker={handleUpdateCaretaker}
              handleRevokeCaretaker={handleRevokeCaretaker}
              fetchCaretakers={fetchCaretakers}
              resetCaretakerPermissions={resetCaretakerPermissions}
              handlePermissionToggle={handlePermissionToggle}
            />
          )}
          {activeTab === 'payments' && <PaymentMethods />}
          {activeTab === 'verification' && <VerificationStatus />}
          {activeTab === 'appearance' && <AppearanceTab />}
          {activeTab === 'switch-role' && <SwitchRoleTab />}
        </div>
      </div>
    </div>
  );
}
