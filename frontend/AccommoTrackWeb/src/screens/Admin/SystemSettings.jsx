import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Pencil, Save, Smartphone, Wallet, CalendarDays, Cog, RefreshCw, ShieldAlert, Key, Eye, EyeOff } from 'lucide-react';
import adminService from '../../services/adminService';
import { cacheManager } from '../../utils/cache';

export default function SystemSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [tenantPaymentsDisabled, setTenantPaymentsDisabled] = useState(true);
  const [invoicePaymongoDisabled, setInvoicePaymongoDisabled] = useState(true);
  const [reservationFeeDisabled, setReservationFeeDisabled] = useState(true);
  const [mobileLatestVersion, setMobileLatestVersion] = useState('1.0.0');
  const [mobileDownloadUrl, setMobileDownloadUrl] = useState('https://accommotrack.me/downloads/AccommoTrack.apk');
  const [mobileForceUpdate, setMobileForceUpdate] = useState(true);
  const [systemForcedNow, setSystemForcedNow] = useState('');
  const [clearingCache, setClearingCache] = useState(false);
  
  const [tempForcedNow, setTempForcedNow] = useState('');
  const [isSystemTimeForced, setIsSystemTimeForced] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: ''
  });
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.new_password_confirmation) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordForm.new_password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setUpdatingPassword(true);
    try {
      const response = await adminService.updatePassword(passwordForm);
      if (!response?.success) {
        throw new Error(response?.error || response?.message || 'Failed to update password');
      }
      toast.success(response?.message || 'Password updated successfully');
      setPasswordForm({ current_password: '', new_password: '', new_password_confirmation: '' });
      setIsEditingPassword(false);
    } catch (error) {
      toast.error(error?.message || 'Failed to update password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const [initialSettings, setInitialSettings] = useState({
    tenantPaymentsDisabled: true,
    invoicePaymongoDisabled: true,
    reservationFeeDisabled: true,
    mobileLatestVersion: '1.0.0',
    mobileDownloadUrl: 'https://accommotrack.me/downloads/AccommoTrack.apk',
    mobileForceUpdate: true,
    systemForcedNow: '',
  });

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await adminService.getPaymentControlSettings();
      if (!response?.success) {
        throw new Error(response?.error || response?.message || 'Failed to load settings');
      }

      const nextSettings = {
        tenantPaymentsDisabled: Boolean(response.data?.tenantPaymentsDisabled),
        invoicePaymongoDisabled: Boolean(response.data?.invoicePaymongoDisabled),
        reservationFeeDisabled: Boolean(response.data?.reservationFeeDisabled),
        mobileLatestVersion: response.data?.mobileLatestVersion || '1.0.0',
        mobileDownloadUrl: response.data?.mobileDownloadUrl || 'https://accommotrack.me/downloads/AccommoTrack.apk',
        mobileForceUpdate: Boolean(response.data?.mobileForceUpdate),
        systemForcedNow: response.data?.systemForcedNow || '',
      };

      setTenantPaymentsDisabled(nextSettings.tenantPaymentsDisabled);
      setInvoicePaymongoDisabled(nextSettings.invoicePaymongoDisabled);
      setReservationFeeDisabled(nextSettings.reservationFeeDisabled);
      setMobileLatestVersion(nextSettings.mobileLatestVersion);
      setMobileDownloadUrl(nextSettings.mobileDownloadUrl);
      setMobileForceUpdate(nextSettings.mobileForceUpdate);
      setSystemForcedNow(nextSettings.systemForcedNow);
      setTempForcedNow(nextSettings.systemForcedNow ? nextSettings.systemForcedNow.slice(0, 16) : '');
      setIsSystemTimeForced(Boolean(nextSettings.systemForcedNow));
      setInitialSettings(nextSettings);
      setIsEditing(false);
    } catch (error) {
      toast.error(error?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await adminService.updatePaymentControlSettings({
        tenantPaymentsDisabled,
        invoicePaymongoDisabled,
        reservationFeeDisabled,
        mobileLatestVersion,
        mobileDownloadUrl,
        mobileForceUpdate,
        systemForcedNow,
      });

      if (!response?.success) {
        throw new Error(response?.error || response?.message || 'Failed to save settings');
      }

      setInitialSettings({
        tenantPaymentsDisabled,
        invoicePaymongoDisabled,
        reservationFeeDisabled,
        mobileLatestVersion,
        mobileDownloadUrl,
        mobileForceUpdate,
        systemForcedNow,
      });
      setIsEditing(false);
      toast.success(response?.message || 'Settings updated');
    } catch (error) {
      toast.error(error?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      const response = await adminService.clearGlobalCache();
      if (!response?.success) {
        throw new Error(response?.error || response?.message || 'Failed to clear cache');
      }
      // Also wipe this browser's localStorage cache so the admin's own
      // browser doesn't serve stale property data after the server is purged.
      cacheManager.clearAll();
      toast.success('Global cache cleared successfully!');
    } catch (error) {
      toast.error(error?.message || 'Failed to clear cache');
    } finally {
      setClearingCache(false);
    }
  };

  const handleCancelEdit = () => {
    setTenantPaymentsDisabled(initialSettings.tenantPaymentsDisabled);
    setInvoicePaymongoDisabled(initialSettings.invoicePaymongoDisabled);
    setReservationFeeDisabled(initialSettings.reservationFeeDisabled);
    setMobileLatestVersion(initialSettings.mobileLatestVersion);
    setMobileDownloadUrl(initialSettings.mobileDownloadUrl);
    setMobileForceUpdate(initialSettings.mobileForceUpdate);
    setSystemForcedNow(initialSettings.systemForcedNow);
    setTempForcedNow(initialSettings.systemForcedNow ? initialSettings.systemForcedNow.slice(0, 16) : '');
    setIsSystemTimeForced(Boolean(initialSettings.systemForcedNow));
    setIsEditing(false);
  };

  const handleForceTime = () => {
    if (!tempForcedNow) {
      toast.error('Please select a date and time first');
      return;
    }
    setSystemForcedNow(tempForcedNow);
    setIsSystemTimeForced(true);
    toast.success('Forced time staged. Click "Save Changes" to apply.');
  };

  const handleResetTime = () => {
    setSystemForcedNow('');
    setTempForcedNow('');
    setIsSystemTimeForced(false);
    toast.success('System time reset staged. Click "Save Changes" to apply.');
  };

  return (
    <div className="min-h-screen bg-transparent p-4 md:p-6 space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Cog className="w-8 h-8 text-brand-500" />
          System Settings
        </h1>
        <p className="text-base text-gray-600 dark:text-gray-400 mt-2">
          Control platform-wide payment restrictions and configure mobile application requirements.
        </p>
      </div>

      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-6 md:p-8 space-y-8">
        {loading ? (
          <div className="flex items-center justify-center p-8 text-gray-600 dark:text-gray-300">
            <Loader2 className="w-6 h-6 animate-spin mr-3 text-brand-500" />
            <span className="font-medium">Loading system configurations...</span>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Global Controls Section */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <Wallet className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Financial Controls</h2>
              </div>
              
              <div className="space-y-4">
                {/* Toggle Item */}
                <div className={`p-5 rounded-xl border transition-all duration-200 ${tenantPaymentsDisabled ? 'bg-orange-50/50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-800' : 'bg-gray-50/50 border-gray-100 dark:bg-gray-800/30 dark:border-gray-700/50'}`}>
                  <label className="flex items-start justify-between gap-6 cursor-pointer">
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 dark:text-white">Disable Tenant Payments</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
                        Instantly blocks all tenant payment capability across the platform. Disables PayMongo endpoints and manual offline payment submissions.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      disabled={!isEditing || saving}
                      onClick={() => setTenantPaymentsDisabled(!tenantPaymentsDisabled)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                        !isEditing || saving ? 'opacity-50 cursor-not-allowed' : ''
                      } ${tenantPaymentsDisabled ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${tenantPaymentsDisabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </label>
                </div>

                <div className={`p-5 rounded-xl border transition-all duration-200 ${invoicePaymongoDisabled ? 'bg-orange-50/50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-800' : 'bg-gray-50/50 border-gray-100 dark:bg-gray-800/30 dark:border-gray-700/50'}`}>
                  <label className="flex items-start justify-between gap-6 cursor-pointer">
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 dark:text-white">Disable Invoice PayMongo Checkout</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
                        Blocks card, GCash, and other PayMongo invoice checkout paths for tenants and landlords while keeping manual/offline submissions available.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      disabled={!isEditing || saving}
                      onClick={() => setInvoicePaymongoDisabled(!invoicePaymongoDisabled)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                        !isEditing || saving ? 'opacity-50 cursor-not-allowed' : ''
                      } ${invoicePaymongoDisabled ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${invoicePaymongoDisabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </label>
                </div>
                
                {/* Toggle Item */}
                <div className={`p-5 rounded-xl border transition-all duration-200 ${reservationFeeDisabled ? 'bg-orange-50/50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-800' : 'bg-gray-50/50 border-gray-100 dark:bg-gray-800/30 dark:border-gray-700/50'}`}>
                  <label className="flex items-start justify-between gap-6 cursor-pointer">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                        <p className="font-bold text-gray-900 dark:text-white">Disable Reservation Fees</p>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
                        Suppresses the reservation-fee requirement globally during booking creation, allowing users to book bypassing initial payment gateways.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      disabled={!isEditing || saving}
                      onClick={() => setReservationFeeDisabled(!reservationFeeDisabled)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                        !isEditing || saving ? 'opacity-50 cursor-not-allowed' : ''
                      } ${reservationFeeDisabled ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${reservationFeeDisabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </label>
                </div>
              </div>
            </section>

            {/* Mobile App Management Section */}
            <section className="pt-8 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-6">
                <Smartphone className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Mobile App Management</h2>
              </div>
              
              <div className="space-y-6 bg-brand-50/30 dark:bg-transparent dark:border dark:border-gray-800 rounded-xl p-5 md:p-6">
                <label className="flex items-start justify-between gap-6 cursor-pointer">
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 dark:text-white">Enable Force Update Lock</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
                      If enabled, users running an app version beneath the minimum threshold will be locked out and forced to download the new `.apk`. Disable to allow soft updates.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    disabled={!isEditing || saving}
                    onClick={() => setMobileForceUpdate(!mobileForceUpdate)}
                    className={`relative mt-1 inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                      !isEditing || saving ? 'opacity-50 cursor-not-allowed' : ''
                    } ${mobileForceUpdate ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${mobileForceUpdate ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </label>

                <div className="grid md:grid-cols-2 gap-6 pt-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">
                      Minimum Allowed App Version
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        className="w-16 text-center rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-base focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all shadow-sm disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-gray-900"
                        value={mobileLatestVersion.split('.')[0] || '1'}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9]/g, '');
                          const parts = mobileLatestVersion.split('.');
                          setMobileLatestVersion(`${v || '0'}.${parts[1] || '0'}.${parts[2] || '0'}`);
                        }}
                        disabled={!isEditing || saving}
                      />
                      <span className="text-gray-400 dark:text-gray-500 font-bold text-xl">.</span>
                      <input
                        type="text"
                        className="w-16 text-center rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-base focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all shadow-sm disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-gray-900"
                        value={mobileLatestVersion.split('.')[1] || '0'}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9]/g, '');
                          const parts = mobileLatestVersion.split('.');
                          setMobileLatestVersion(`${parts[0] || '1'}.${v || '0'}.${parts[2] || '0'}`);
                        }}
                        disabled={!isEditing || saving}
                      />
                      <span className="text-gray-400 dark:text-gray-500 font-bold text-xl">.</span>
                      <input
                        type="text"
                        className="w-16 text-center rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-base focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all shadow-sm disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-gray-900"
                        value={mobileLatestVersion.split('.')[2] || '0'}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9]/g, '');
                          const parts = mobileLatestVersion.split('.');
                          setMobileLatestVersion(`${parts[0] || '1'}.${parts[1] || '0'}.${v || '0'}`);
                        }}
                        disabled={!isEditing || saving}
                      />
                    </div>
                    <div className="flex justify-between w-[220px] px-1 mt-1">
                      <span className="text-[10px] text-brand-600/70 dark:text-brand-400/70 font-semibold tracking-wider uppercase text-center w-16">Major</span>
                      <span className="text-[10px] text-brand-600/70 dark:text-brand-400/70 font-semibold tracking-wider uppercase text-center w-16">Minor</span>
                      <span className="text-[10px] text-brand-600/70 dark:text-brand-400/70 font-semibold tracking-wider uppercase text-center w-16">Patch</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Must follow semantic versioning. 
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-900 dark:text-white">
                      APK Download URL
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all shadow-sm disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-gray-900"
                      value={mobileDownloadUrl}
                      onChange={(e) => setMobileDownloadUrl(e.target.value)}
                      disabled={!isEditing || saving}
                      placeholder="https://..."
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      The hosted link where users can download the latest `.apk`.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* System Time Management Section */}
            <section className="pt-8 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-6">
                <CalendarDays className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">System Time Override</h2>
              </div>
              
              <div className={`p-6 rounded-xl border transition-all duration-200 ${isSystemTimeForced ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800' : 'bg-gray-50/50 border-gray-100 dark:bg-gray-800/30 dark:border-gray-700/50'}`}>
                <div className="space-y-4">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      Override Global "Current Time"
                      {isSystemTimeForced && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-[10px] text-white uppercase font-black tracking-wider">Active Override</span>
                      )}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
                      Force the entire platform to behave as if it's a specific date/time. Useful for testing automated billing, due dates, and expirations. 
                      <span className="block mt-2 font-medium text-amber-600 dark:text-amber-400">⚠️ CAUTION: This affects all users and operations.</span>
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-end gap-4 pt-2">
                    <div className="flex-1 w-full sm:w-auto">
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Set Target Time</label>
                      <input
                        type="datetime-local"
                        className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all shadow-sm disabled:opacity-50"
                        value={tempForcedNow}
                        onChange={(e) => setTempForcedNow(e.target.value)}
                        disabled={!isEditing || saving}
                      />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={handleForceTime}
                        disabled={!isEditing || saving || !tempForcedNow}
                        className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold transition-all disabled:opacity-50 disabled:grayscale shadow-md"
                      >
                        Stage Override
                      </button>
                      <button
                        onClick={handleResetTime}
                        disabled={!isEditing || saving || !isSystemTimeForced}
                        className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-bold transition-all disabled:opacity-50"
                      >
                        Reset to Real Time
                      </button>
                    </div>
                  </div>
                  
                  {isSystemTimeForced && (
                    <div className="pt-2">
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                        Current Force Target: <strong className="font-bold">{new Date(systemForcedNow).toLocaleString()}</strong>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Security Management Section */}
            <section className="pt-8 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-4">
                <Key className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Security Settings</h2>
              </div>
              <div className="p-5 rounded-xl border border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Update Password</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Change your administrator account password.</p>
                  </div>
                  {!isEditingPassword && (
                    <button
                      onClick={() => setIsEditingPassword(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium transition-colors shadow-sm"
                    >
                      <Pencil className="w-4 h-4" />
                      Change Password
                    </button>
                  )}
                </div>

                {isEditingPassword && (
                  <form onSubmit={handleUpdatePassword} className="space-y-4 mt-4 bg-white dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          required
                          className="w-full pl-3 pr-10 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500"
                          value={passwordForm.current_password}
                          onChange={e => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                          disabled={updatingPassword}
                        />
                        <button
                          type="button"
                          tabIndex="-1"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          required
                          className="w-full pl-3 pr-10 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500"
                          value={passwordForm.new_password}
                          onChange={e => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                          disabled={updatingPassword}
                        />
                        <button
                          type="button"
                          tabIndex="-1"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          className="w-full pl-3 pr-10 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500"
                          value={passwordForm.new_password_confirmation}
                          onChange={e => setPasswordForm({ ...passwordForm, new_password_confirmation: e.target.value })}
                          disabled={updatingPassword}
                        />
                        <button
                          type="button"
                          tabIndex="-1"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={updatingPassword}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm transition-colors shadow-sm disabled:opacity-60"
                      >
                        {updatingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Update Password
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingPassword(false);
                          setPasswordForm({ current_password: '', new_password: '', new_password_confirmation: '' });
                        }}
                        disabled={updatingPassword}
                        className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </section>

            {/* Cache Management Section */}
            <section className="pt-8 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Cache Management</h2>
              </div>
              <div className="p-5 rounded-xl border border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Clear Global Cache</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    Purges the Cloudflare edge cache and the backend application cache. Use this when property visibility changes aren't reflecting immediately for guests.
                  </p>
                </div>
                <button
                  onClick={handleClearCache}
                  disabled={clearingCache || loading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors disabled:opacity-60 shadow-sm whitespace-nowrap flex-shrink-0"
                >
                  {clearingCache
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <RefreshCw className="w-4 h-4" />}
                  {clearingCache ? 'Clearing...' : 'Clear Cache'}
                </button>
              </div>
            </section>

            {/* Actions */}
            <div className="pt-8 flex items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    disabled={loading || saving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold transition-colors disabled:opacity-60 shadow-sm"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit Configuration
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold transition-colors disabled:opacity-60 shadow-sm"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Changes
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="px-5 py-2.5 rounded-lg font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors disabled:opacity-60 shadow-sm"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={loadSettings}
                disabled={loading || saving}
                className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Reload state
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
