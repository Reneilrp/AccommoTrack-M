import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Pencil, Save } from 'lucide-react';
import adminService from '../../services/adminService';

export default function SystemSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tenantPaymentsDisabled, setTenantPaymentsDisabled] = useState(true);
  const [reservationFeeDisabled, setReservationFeeDisabled] = useState(true);
  const [initialSettings, setInitialSettings] = useState({
    tenantPaymentsDisabled: true,
    reservationFeeDisabled: true,
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
      };

      setTenantPaymentsDisabled(nextSettings.tenantPaymentsDisabled);
      setReservationFeeDisabled(nextSettings.reservationFeeDisabled);
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
      });

      if (!response?.success) {
        throw new Error(response?.error || response?.message || 'Failed to save settings');
      }

      setInitialSettings({
        tenantPaymentsDisabled,
        reservationFeeDisabled,
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
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-transparent dark:bg-gray-900 p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Settings</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Control temporary booking and payment platform switches.
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

            <div className="pt-2 flex items-center gap-3">
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
