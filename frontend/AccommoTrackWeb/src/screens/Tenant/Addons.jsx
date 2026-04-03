import React, { useState, useEffect } from 'react';
import { tenantService } from '../../services/tenantService';
import { Package, Plus, Minus, X, Loader2, Send, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Addons() {
  const [addons, setAddons] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noBooking, setNoBooking] = useState(false);
  const [qtys, setQtys] = useState({});
  const [notes, setNotes] = useState({});
  const [submittingId, setSubmittingId] = useState(null);
  const [cancelingId, setCancelingId] = useState(null);

  // Custom request form
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customData, setCustomData] = useState({
    name: '', addon_type: 'rental', price_type: 'monthly', note: '', suggested_price: ''
  });

  useEffect(() => { loadAddons(); }, []);

  const normalizeNote = (value) => {
    const trimmed = String(value || '').trim();
    return trimmed || null;
  };

  const normalizeSuggestedPrice = (value) => {
    const raw = String(value ?? '').trim();
    if (!raw) return null;

    const numericValue = Number(raw);
    if (!Number.isFinite(numericValue) || numericValue < 0) return null;

    return numericValue;
  };

  const loadAddons = async () => {
    setLoading(true);
    try {
      const [res, reqRes] = await Promise.allSettled([
        tenantService.getAvailableAddons?.() || Promise.resolve({ success: false }),
        tenantService.getAddonRequests?.() || Promise.resolve({ success: false }),
      ]);

      const addonRes = res.status === 'fulfilled' ? res.value : {};
      if (addonRes.success && addonRes.data) {
        const addonList = addonRes.data.available || addonRes.data || [];
        setAddons(Array.isArray(addonList) ? addonList : []);
        const initial = {};
        (Array.isArray(addonList) ? addonList : []).forEach(a => { initial[a.id] = 1; });
        setQtys(initial);
      } else if (res.status === 'rejected') {
        // Fix #5: Check HTTP status on the actual axios error, not on the resolved value
        const httpStatus = res.reason?.response?.status;
        if (httpStatus === 404) setNoBooking(true);
      }

      const reqResult = reqRes.status === 'fulfilled' ? reqRes.value : {};
      if (reqResult.success && reqResult.data) {
        const pending = reqResult.data.pending || [];
        const active = reqResult.data.active || [];
        setRequests([...pending, ...active]);
      }
    } catch (err) {
      console.error('Load addons error', err);
    } finally {
      setLoading(false);
    }
  };

  const onRequest = async (addon, isCustom = false) => {
    const normalizedSuggestedPrice = normalizeSuggestedPrice(customData.suggested_price);

    const payload = isCustom
      ? {
          is_custom: true,
          name: customData.name.trim(),
          addon_type: customData.addon_type,
          price_type: customData.price_type,
          quantity: 1,
          note: normalizeNote(customData.note),
          ...(normalizedSuggestedPrice !== null
            ? { suggested_price: normalizedSuggestedPrice }
            : {}),
        }
      : {
          addon_id: addon.id,
          quantity: qtys[addon.id] || 1,
          note: normalizeNote(notes[addon.id]),
        };

    setSubmittingId(isCustom ? 'custom' : addon.id);
    try {
      const res = await tenantService.requestAddon(payload);
      if (res.success) {
        toast.success('Add-on request submitted!');
        setShowCustomForm(false);
        setCustomData({ name: '', addon_type: 'rental', price_type: 'monthly', note: '', suggested_price: '' });
        await loadAddons();
      } else {
        toast.error(res.error || 'Failed to request addon');
      }
    } catch {
      toast.error('Failed to request addon');
    } finally {
      setSubmittingId(null);
    }
  };

  const onCancelRequest = async (req) => {
    const id = req.id || req.request_id;
    if (!id) return;
    if (!window.confirm('Cancel this add-on request?')) return;

    setCancelingId(id);
    try {
      const res = await tenantService.cancelAddonRequest(id);
      if (res.success) {
        toast.success('Request cancelled');
        await loadAddons();
      } else {
        toast.error(res.error || 'Failed to cancel');
      }
    } catch {
      toast.error('Failed to cancel');
    } finally {
      setCancelingId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    );
  }

  if (noBooking) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-gray-500 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No Active Booking</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
            You need an active booking to request add-ons. Book a room first and come back here to enhance your stay.
          </p>
        </div>
      </div>
    );
  }

  const STATUS_BADGE = {
    pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    approved: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    active: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    rejected: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add-ons & Usage Fees</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Request extra services or items for your current stay.
        </p>
      </div>

      {/* Your Requests */}
      {requests.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your Requests</h3>
          <div className="space-y-4">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{r.addon?.name || 'Add-on'}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Qty: {r.quantity || 1} • {r.addon?.price ? `₱${Number(r.addon.price).toLocaleString()}` : 'Free'}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-2.5 py-2 rounded-full text-xs font-semibold uppercase ${STATUS_BADGE[r.status] || STATUS_BADGE.pending}`}>
                    {r.status || 'pending'}
                  </span>
                  {(r.status === 'pending') && (
                    <button
                      onClick={() => onCancelRequest(r)}
                      disabled={cancelingId === r.id}
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                    >
                      {cancelingId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    </button>
                  )}
                  {(r.status === 'active' || r.status === 'approved') && (
                    <button
                      onClick={() => onCancelRequest(r)}
                      disabled={cancelingId === r.id}
                      title="Cancel for next month"
                      className="text-xs px-2 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-700 transition-colors font-semibold"
                    >
                      {cancelingId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancel (Next Month)'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Request */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        {!showCustomForm ? (
          <button
            onClick={() => setShowCustomForm(true)}
            className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
          >
            <Plus className="w-5 h-5" /> Request something specific...
          </button>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Custom Request</h3>
            <input
              placeholder="Item name (e.g. Desk Lamp)"
              value={customData.name}
              onChange={(e) => setCustomData({ ...customData, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
                <select
                  value={customData.addon_type}
                  onChange={(e) => setCustomData({ ...customData, addon_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="rental">Rental</option>
                  <option value="fee">Usage Fee</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Billing</label>
                <select
                  value={customData.price_type}
                  onChange={(e) => setCustomData({ ...customData, price_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="monthly">Monthly</option>
                  <option value="one_time">One-time</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Suggested Price (₱) <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 500"
                value={customData.suggested_price}
                onChange={(e) => setCustomData({ ...customData, suggested_price: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <textarea
              placeholder="Notes for landlord..."
              value={customData.note}
              onChange={(e) => setCustomData({ ...customData, note: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <div className="flex justify-end gap-4">
              <button onClick={() => setShowCustomForm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                Cancel
              </button>
              <button
                onClick={() => onRequest(null, true)}
                disabled={!customData.name || submittingId === 'custom'}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {submittingId === 'custom' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit Request
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Available Add-ons */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Available Add-ons</h3>
        {addons.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
            <ShoppingBag className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No add-ons available for this property yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addons.map((addon) => (
              <div key={addon.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col">
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{addon.name}</h4>
                    <span className="text-green-600 dark:text-green-400 font-bold text-sm">
                      {addon.price ? `₱${Number(addon.price).toLocaleString()}` : 'Free'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{addon.description || 'No description.'}</p>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <input
                    placeholder="Add a note (optional)..."
                    value={notes[addon.id] || ''}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [addon.id]: e.target.value }))}
                    className="w-full px-4 py-2 mb-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQtys((prev) => ({ ...prev, [addon.id]: Math.max(1, (prev[addon.id] || 1) - 1) }))}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        <Minus className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                      </button>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white w-6 text-center">{qtys[addon.id] || 1}</span>
                      <button
                        onClick={() => setQtys((prev) => ({ ...prev, [addon.id]: (prev[addon.id] || 1) + 1 }))}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        <Plus className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                      </button>
                    </div>
                    <button
                      onClick={() => onRequest(addon)}
                      disabled={submittingId === addon.id}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {submittingId === addon.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Request'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
