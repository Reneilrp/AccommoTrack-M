import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Pencil, Save, Smartphone, Wallet, CalendarDays, Cog } from 'lucide-react';
import adminService from '../../services/adminService';

export default function SystemSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [tenantPaymentsDisabled, setTenantPaymentsDisabled] = useState(true);
  const [reservationFeeDisabled, setReservationFeeDisabled] = useState(true);
  const [mobileLatestVersion, setMobileLatestVersion] = useState('1.0.0');
  const [mobileDownloadUrl, setMobileDownloadUrl] = useState('https://accommotrack.me/downloads/AccommoTrack.apk');
  const [mobileForceUpdate, setMobileForceUpdate] = useState(true);

  const [initialSettings, setInitialSettings] = useState({
    tenantPaymentsDisabled: true,
    reservationFeeDisabled: true,
    mobileLatestVersion: '1.0.0',
    mobileDownloadUrl: 'https://accommotrack.me/downloads/AccommoTrack.apk',
    mobileForceUpdate: true,
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
        reservationFeeDisabled: Boolean(response.data?.reservationFeeDisabled),
        mobileLatestVersion: response.data?.mobileLatestVersion || '1.0.0',
        mobileDownloadUrl: response.data?.mobileDownloadUrl || 'https://accommotrack.me/downloads/AccommoTrack.apk',
        mobileForceUpdate: Boolean(response.data?.mobileForceUpdate),
      };

      setTenantPaymentsDisabled(nextSettings.tenantPaymentsDisabled);
      setReservationFeeDisabled(nextSettings.reservationFeeDisabled);
      setMobileLatestVersion(nextSettings.mobileLatestVersion);
      setMobileDownloadUrl(nextSettings.mobileDownloadUrl);
      setMobileForceUpdate(nextSettings.mobileForceUpdate);
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
        reservationFeeDisabled,
        mobileLatestVersion,
        mobileDownloadUrl,
        mobileForceUpdate,
      });

      if (!response?.success) {
        throw new Error(response?.error || response?.message || 'Failed to save settings');
      }

      setInitialSettings({
        tenantPaymentsDisabled,
        reservationFeeDisabled,
        mobileLatestVersion,
        mobileDownloadUrl,
        mobileForceUpdate,
      });
      setIsEditing(false);
      toast.success(response?.message || 'Settings updated');
    } catch (error) {
      toast.error(error?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setTenantPaymentsDisabled(initialSettings.tenantPaymentsDisabled);
    setReservationFeeDisabled(initialSettings.reservationFeeDisabled);
    setMobileLatestVersion(initialSettings.mobileLatestVersion);
    setMobileDownloadUrl(initialSettings.mobileDownloadUrl);
    setMobileForceUpdate(initialSettings.mobileForceUpdate);
    setIsEditing(false);
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
