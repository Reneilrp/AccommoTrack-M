import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Pencil, Save, Smartphone } from 'lucide-react';
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
    <div className="min-h-screen bg-transparent dark:bg-gray-900 p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Settings</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Control temporary booking and payment platform switches and app version requirements.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6 space-y-6 max-w-3xl">
        {loading ? (
          <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading settings...
          </div>
        ) : (
          <>
            <label className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Disable Tenant Payments</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Blocks tenant payment submissions (PayMongo and tenant offline submission endpoints).
                </p>
              </div>
              <input
                type="checkbox"
                className="mt-1 h-5 w-5"
                checked={tenantPaymentsDisabled}
                onChange={(e) => setTenantPaymentsDisabled(e.target.checked)}
                disabled={!isEditing || saving}
              />
            </label>

            <label className="flex items-start justify-between gap-4 border-t border-gray-200 dark:border-gray-700 pt-6">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Disable Reservation Fee</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Suppresses reservation-fee requirement during booking creation.
                </p>
              </div>
              <input
                type="checkbox"
                className="mt-1 h-5 w-5"
                checked={reservationFeeDisabled}
                onChange={(e) => setReservationFeeDisabled(e.target.checked)}
                disabled={!isEditing || saving}
              />
            </label>

            {/* Mobile App Management Section */}
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
              <div className="flex items-center gap-2 mb-4">
                <Smartphone className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Mobile App Management</h2>
              </div>
              
              <div className="space-y-5 pl-7">
                <label className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Enable Force Update Lock</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      If enabled, users with older versions will lock up on startup and be forced to download the new version. If disabled, they will not be locked out.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5"
                    checked={mobileForceUpdate}
                    onChange={(e) => setMobileForceUpdate(e.target.checked)}
                    disabled={!isEditing || saving}
                  />
                </label>

                <div className="grid gap-3">
                  <label className="block">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Minimum Allowed App Version</span>
                    <input
                      type="text"
                      className="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-brand-500 focus:border-brand-500 disabled:opacity-50"
                      value={mobileLatestVersion}
                      onChange={(e) => setMobileLatestVersion(e.target.value)}
                      disabled={!isEditing || saving}
                      placeholder="e.g. 1.0.0"
                    />
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Must follow semantic versioning. The app uses this to determine if it is outdated.
                  </p>
                </div>

                <div className="grid gap-3">
                  <label className="block">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">APK Download URL</span>
                    <input
                      type="text"
                      className="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-brand-500 focus:border-brand-500 disabled:opacity-50"
                      value={mobileDownloadUrl}
                      onChange={(e) => setMobileDownloadUrl(e.target.value)}
                      disabled={!isEditing || saving}
                      placeholder="e.g. https://accommotrack.me/downloads/AccommoTrack.apk"
                    />
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    The public link where the latest APK is hosted. Users tap "Download Update" to land here.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-2 border-t border-gray-200 dark:border-gray-700 flex items-center gap-3">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  disabled={loading || saving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold disabled:opacity-60"
                >
                  <Pencil className="w-4 h-4" />
                  Edit Settings
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Settings
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </>
              )}
              <button
                onClick={loadSettings}
                disabled={loading || saving}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
              >
                Reload
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
