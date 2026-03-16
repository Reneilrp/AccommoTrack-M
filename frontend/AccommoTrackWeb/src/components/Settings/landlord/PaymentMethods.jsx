import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';
import {
  CreditCard,
  Save,
  AlertCircle,
  RefreshCw,
  Building2,
  Lock,
  Loader2,
  WifiOff,
} from 'lucide-react';

// ─── Reusable Toggle Switch ───────────────────────────────────────────────────
function ToggleSwitch({ checked, onChange, disabled = false, id }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
        ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}
        ${checked ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
          ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PaymentMethods({ user, onUpdate }) {
  // ── Global settings state ──────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [connectingPaymongo, setConnectingPaymongo] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [allowed, setAllowed] = useState(user?.payment_methods_settings?.allowed || ['cash']);
  const [details, setDetails] = useState(user?.payment_methods_settings?.details || {});

  // ── Per-property state ─────────────────────────────────────────────────────
  const [properties, setProperties] = useState([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  // pendingPayments tracks unsaved toggle state per property { [propertyId]: string[] }
  const [pendingPayments, setPendingPayments] = useState({});
  const [savingId, setSavingId] = useState(null); // property id currently being saved

  const payMongoStatus = user?.paymongo_verification_status || 'not_connected';
  const isPayMongoActive = payMongoStatus === 'verified';

  // ── Sync global settings if user prop updates ──────────────────────────────
  useEffect(() => {
    if (user?.payment_methods_settings) {
      setAllowed(user.payment_methods_settings.allowed || ['cash']);
      setDetails(user.payment_methods_settings.details || {});
    }
  }, [user]);

  // ── Fetch properties on mount ──────────────────────────────────────────────
  const loadProperties = useCallback(async () => {
    try {
      setPropertiesLoading(true);
      const res = await api.get('/landlord/properties');
      const raw = res.data?.data || res.data || [];
      const list = Array.isArray(raw) ? raw : [];

      const mapped = list.map((p) => ({
        id: p.id,
        title: p.title || 'Untitled Property',
        city: p.city || '',
        // Default to ['cash'] if not set — unverified landlords always start cash-only
        accepted_payments: Array.isArray(p.accepted_payments) && p.accepted_payments.length > 0
          ? p.accepted_payments
          : ['cash'],
      }));

      setProperties(mapped);
      const initial = {};
      mapped.forEach((p) => { initial[p.id] = [...p.accepted_payments]; });
      setPendingPayments(initial);
    } catch (err) {
      toast.error('Failed to load properties');
    } finally {
      setPropertiesLoading(false);
    }
  }, []);

  useEffect(() => { loadProperties(); }, [loadProperties]);

  // ── Per-property helpers ───────────────────────────────────────────────────
  const isDirty = (propertyId) => {
    const saved = properties.find((p) => p.id === propertyId)?.accepted_payments ?? [];
    const pending = pendingPayments[propertyId] ?? [];
    if (saved.length !== pending.length) return true;
    return !saved.every((m) => pending.includes(m));
  };

  const handlePropertyToggle = (propertyId, method) => {
    if (method === 'online' && !isPayMongoActive) return;
    setPendingPayments((prev) => {
      const current = prev[propertyId] ?? ['cash'];
      if (current.includes(method)) {
        if (method === 'cash' && current.length === 1) return prev; // cash must always remain
        return { ...prev, [propertyId]: current.filter((m) => m !== method) };
      }
      return { ...prev, [propertyId]: [...current, method] };
    });
  };

  const savePropertyPayments = async (propertyId) => {
    const updated = pendingPayments[propertyId] ?? ['cash'];
    setSavingId(propertyId);
    try {
      await api.put(`/landlord/properties/${propertyId}`, { accepted_payments: updated });
      setProperties((prev) =>
        prev.map((p) => p.id === propertyId ? { ...p, accepted_payments: [...updated] } : p)
      );
      toast.success('Payment methods saved');
    } catch (err) {
      const saved = properties.find((p) => p.id === propertyId)?.accepted_payments ?? ['cash'];
      setPendingPayments((prev) => ({ ...prev, [propertyId]: [...saved] }));
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSavingId(null);
    }
  };

  // ── Global settings handlers ───────────────────────────────────────────────
  const refreshUser = async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/me');
      if (onUpdate && res.data?.user) {
        onUpdate(res.data.user);
        toast.success('Status updated');
      }
    } catch (e) {
      toast.error('Failed to refresh status');
    } finally {
      setRefreshing(false);
    }
  };

  const handleConnectPayMongo = async () => {
    toast('PayMongo online payment onboarding is currently being set up. We will notify you once it is available.', { icon: 'ℹ️' });
  };

  const handleToggle = (method) => {
    setAllowed(prev => {
      if (prev.includes(method)) return prev.filter(m => m !== method);
      return [...prev, method];
    });
  };

  const handleDetailChange = (key, value) => {
    setDetails(prev => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      const payload = {
        payment_methods_settings: { allowed, details }
      };
      await api.put('/me', payload);
      toast.success('Payment settings saved');
      if (onUpdate) {
        onUpdate({ ...user, payment_methods_settings: payload.payment_methods_settings });
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Global Payment Settings ──────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <CreditCard className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Payment Methods</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Global settings shown to tenants across all your properties</p>
          </div>
        </div>

        <div className="space-y-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">Select the payment methods you accept from tenants. These will be shown to tenants when they book a room.</p>

          {/* Online (PayMongo) Option */}
          <div className="flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="flex items-start gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <input
                type="checkbox"
                id="pm_online"
                checked={allowed.includes('online')}
                onChange={() => handleToggle('online')}
                disabled={!isPayMongoActive}
                className="mt-1 w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              />
              <label htmlFor="pm_online" className={`flex-1 ${isPayMongoActive ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                <span className="block font-medium text-gray-900 dark:text-white">Online Payment (GCash, Maya, etc.)</span>
                <span className="block text-sm text-gray-500 dark:text-gray-400">Accept credit/debit cards and e-wallets via PayMongo.</span>
              </label>
            </div>

            {!isPayMongoActive && (
              <div className="px-4 pb-4 pl-12">
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800/50 rounded-lg flex flex-col gap-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-yellow-800 dark:text-yellow-300 font-medium">
                      Your online payments are disabled until your PayMongo verification is complete.
                      {user?.paymongo_child_id && ` Current status: ${payMongoStatus.replace('_', ' ')}`}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={handleConnectPayMongo}
                      disabled={connectingPaymongo || !user?.is_verified}
                      className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-bold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {connectingPaymongo ? 'Loading...' : user?.paymongo_child_id ? 'Complete Onboarding' : 'Connect to PayMongo'}
                    </button>
                    {user?.paymongo_child_id && (
                      <button
                        onClick={refreshUser}
                        disabled={refreshing}
                        className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-md transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh Status
                      </button>
                    )}
                  </div>
                  {!user?.is_verified && (
                    <p className="text-[10px] text-yellow-700 dark:text-yellow-400">
                      * Admin verification must be completed first.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Cash Option */}
          <div className="flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <input
              type="checkbox"
              id="pm_cash"
              checked={allowed.includes('cash')}
              onChange={() => handleToggle('cash')}
              className="mt-1 w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded cursor-pointer"
            />
            <label htmlFor="pm_cash" className="flex-1 cursor-pointer">
              <span className="block font-medium text-gray-900 dark:text-white">Cash Payment</span>
              <span className="block text-sm text-gray-500 dark:text-gray-400">Tenants pay in person (e.g., at the property or office).</span>
            </label>
          </div>

          {/* GCash Option */}
          <div className="flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="flex items-start gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <input
                type="checkbox"
                id="pm_gcash"
                checked={allowed.includes('gcash')}
                onChange={() => handleToggle('gcash')}
                className="mt-1 w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded cursor-pointer"
              />
              <label htmlFor="pm_gcash" className="flex-1 cursor-pointer">
                <span className="block font-medium text-gray-900 dark:text-white">GCash</span>
                <span className="block text-sm text-gray-500 dark:text-gray-400">Receive payments via GCash transfer.</span>
              </label>
            </div>
            {allowed.includes('gcash') && (
              <div className="px-4 pb-4 pl-12">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GCash Name & Number</label>
                <input
                  type="text"
                  placeholder="e.g. Juan Cruz 0917-123-4567"
                  value={details.gcash_info || ''}
                  onChange={(e) => handleDetailChange('gcash_info', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-green-500 focus:border-green-500 shadow-sm sm:text-sm"
                />
              </div>
            )}
          </div>

          {/* Bank Transfer Option */}
          <div className="flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="flex items-start gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <input
                type="checkbox"
                id="pm_bank"
                checked={allowed.includes('bank_transfer')}
                onChange={() => handleToggle('bank_transfer')}
                className="mt-1 w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded cursor-pointer"
              />
              <label htmlFor="pm_bank" className="flex-1 cursor-pointer">
                <span className="block font-medium text-gray-900 dark:text-white">Bank Transfer</span>
                <span className="block text-sm text-gray-500 dark:text-gray-400">Receive payments via direct bank deposit or transfer.</span>
              </label>
            </div>
            {allowed.includes('bank_transfer') && (
              <div className="px-4 pb-4 pl-12">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bank Account Details</label>
                <textarea
                  placeholder="e.g. BDO: Juan Cruz - 1234 5678 9012"
                  value={details.bank_info || ''}
                  onChange={(e) => handleDetailChange('bank_info', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-green-500 focus:border-green-500 shadow-sm sm:text-sm h-20"
                />
              </div>
            )}
          </div>

          {/* Other Instructions */}
          <div className="flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="flex items-start gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <input
                type="checkbox"
                id="pm_other"
                checked={allowed.includes('other')}
                onChange={() => handleToggle('other')}
                className="mt-1 w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded cursor-pointer"
              />
              <label htmlFor="pm_other" className="flex-1 cursor-pointer">
                <span className="block font-medium text-gray-900 dark:text-white">Other Instructions</span>
                <span className="block text-sm text-gray-500 dark:text-gray-400">Provide custom instructions for other manual methods.</span>
              </label>
            </div>
            {allowed.includes('other') && (
              <div className="px-4 pb-4 pl-12">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Instructions</label>
                <textarea
                  placeholder="e.g. Pay at the main office lobby, 9 AM - 5 PM."
                  value={details.other_info || ''}
                  onChange={(e) => handleDetailChange('other_info', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-green-500 focus:border-green-500 shadow-sm sm:text-sm h-20"
                />
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
            <button
              onClick={saveSettings}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving Changes...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Per-Property Payment Settings ───────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Per-Property Payment Methods</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Control which payment options are available for each individual property</p>
          </div>
        </div>

        {/* Info banner */}
        <div className="mb-5 mt-3 flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg">
          <AlertCircle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Cash is always enabled by default. Online payments require a verified PayMongo account.
            {!isPayMongoActive && (
              <span className="text-yellow-600 dark:text-yellow-400 font-medium"> Your account is not yet PayMongo verified — online payments are locked on all properties.</span>
            )}
          </p>
        </div>

        {propertiesLoading ? (
          <div className="flex items-center justify-center py-12 gap-3 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading properties…</span>
          </div>
        ) : properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
            <WifiOff className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No properties found.</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Add a property first to configure its payment methods.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Column header row (desktop) */}
            <div className="hidden sm:grid sm:grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 pb-1">
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Property</span>
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide w-20 text-center">Cash</span>
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide w-20 text-center">Online</span>
              <span className="w-20" />
            </div>

            {properties.map((property) => {
              const pending = pendingPayments[property.id] ?? property.accepted_payments;
              const cashOn = pending.includes('cash');
              const onlineOn = pending.includes('online');
              const cashOnly = pending.length === 1 && cashOn;
              const dirty = isDirty(property.id);
              const isSaving = savingId === property.id;

              return (
                <div
                  key={property.id}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  {/* Property info */}
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{property.title}</p>
                    {property.city && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{property.city}</p>
                    )}
                  </div>

                  {/* Cash toggle */}
                  <div className="flex flex-row sm:flex-col items-center gap-2 sm:gap-1 w-full sm:w-20">
                    <span className="text-xs text-gray-500 dark:text-gray-400 sm:hidden w-16">Cash</span>
                    <ToggleSwitch
                      id={`cash-${property.id}`}
                      checked={cashOn}
                      onChange={() => handlePropertyToggle(property.id, 'cash')}
                      disabled={cashOnly}
                    />
                  </div>

                  {/* Online toggle */}
                  <div className="flex flex-row sm:flex-col items-center gap-2 sm:gap-1 w-full sm:w-20">
                    <span className="text-xs text-gray-500 dark:text-gray-400 sm:hidden w-16">Online</span>
                    <div className="flex flex-col items-center gap-1">
                      <ToggleSwitch
                        id={`online-${property.id}`}
                        checked={onlineOn}
                        onChange={() => handlePropertyToggle(property.id, 'online')}
                        disabled={!isPayMongoActive}
                      />
                      {!isPayMongoActive && (
                        <div className="hidden sm:flex items-center gap-1 mt-0.5">
                          <Lock className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">Verify PayMongo</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Per-property Save button */}
                  <div className="flex justify-end sm:justify-center sm:w-20">
                    <button
                      onClick={() => savePropertyPayments(property.id)}
                      disabled={!dirty || isSaving}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-md hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isSaving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      {isSaving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
