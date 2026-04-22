import React, { useState, useEffect, useCallback, memo } from 'react';
import { tenantService } from '../../services/tenantService';
import { Package, ShoppingBag, Loader2 } from 'lucide-react';
import { showSuccess, showError } from '../../utils/toast';
import AddonRequestItem from './components/Addons/AddonRequestItem';
import AddonCard from './components/Addons/AddonCard';
import CustomAddonForm from './components/Addons/CustomAddonForm';

const Addons = () => {
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

  const loadAddons = useCallback(async () => {
    setLoading(true);
    try {
      const [addonRes, reqRes] = await Promise.all([
        tenantService.getAvailableAddons(),
        tenantService.getAddonRequests(),
      ]);

      if (addonRes.success) {
        const addonList = addonRes.data.available || addonRes.data || [];
        setAddons(Array.isArray(addonList) ? addonList : []);
        
        const initialQtys = {};
        (Array.isArray(addonList) ? addonList : []).forEach(a => { initialQtys[a.id] = 1; });
        setQtys(prev => ({ ...initialQtys, ...prev }));
      } else if (addonRes.status === 404) {
        setNoBooking(true);
      }

      if (reqRes.success) {
        const pending = reqRes.data.pending || [];
        const active = reqRes.data.active || [];
        setRequests([...pending, ...active]);
      }
    } catch (err) {
      console.error('Load addons error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAddons(); }, [loadAddons]);

  const handleQtyChange = useCallback((id, val) => {
    setQtys(prev => ({ ...prev, [id]: val }));
  }, []);

  const handleNoteChange = useCallback((id, val) => {
    setNotes(prev => ({ ...prev, [id]: val }));
  }, []);

  const handleCustomChange = useCallback((field, val) => {
    setCustomData(prev => ({ ...prev, [field]: val }));
  }, []);

  const onRequest = async (addon, isCustom = false) => {
    const normalizeNote = (value) => String(value || '').trim() || null;
    const normalizeSuggestedPrice = (value) => {
      const numericValue = Number(String(value ?? '').trim());
      return (Number.isFinite(numericValue) && numericValue >= 0) ? numericValue : null;
    };

    const payload = isCustom
      ? {
          is_custom: true,
          name: customData.name.trim(),
          addon_type: customData.addon_type,
          price_type: customData.price_type,
          quantity: 1,
          note: normalizeNote(customData.note),
          suggested_price: normalizeSuggestedPrice(customData.suggested_price),
        }
      : {
          addon_id: addon.id,
          quantity: qtys[addon.id] || 1,
          note: normalizeNote(notes[addon.id]),
        };

    setSubmittingId(isCustom ? 'custom' : addon.id);
    const res = await tenantService.requestAddon(payload);
    if (res.success) {
      showSuccess('Add-on request submitted!');
      if (isCustom) {
        setShowCustomForm(false);
        setCustomData({ name: '', addon_type: 'rental', price_type: 'monthly', note: '', suggested_price: '' });
      } else {
        setNotes(prev => ({ ...prev, [addon.id]: '' }));
      }
      await loadAddons();
    } else {
      showError(res.error || 'Failed to request addon');
    }
    setSubmittingId(null);
  };

  const onCancelRequest = useCallback(async (req) => {
    const id = req.id || req.request_id;
    if (!id || !window.confirm('Cancel this add-on request?')) return;

    setCancelingId(id);
    const res = await tenantService.cancelAddonRequest(id);
    if (res.success) {
      showSuccess('Request cancelled');
      await loadAddons();
    } else {
      showError(res.error || 'Failed to cancel');
    }
    setCancelingId(null);
  }, [loadAddons]);

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
              <AddonRequestItem 
                key={r.id} 
                request={r} 
                onCancel={onCancelRequest} 
                cancelingId={cancelingId} 
              />
            ))}
          </div>
        </div>
      )}

      {/* Custom Request */}
      <CustomAddonForm 
        show={showCustomForm}
        onShow={() => setShowCustomForm(true)}
        onCancel={() => setShowCustomForm(false)}
        data={customData}
        onChange={handleCustomChange}
        onSubmit={() => onRequest(null, true)}
        isSubmitting={submittingId === 'custom'}
      />

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
              <AddonCard 
                key={addon.id}
                addon={addon}
                qty={qtys[addon.id] || 1}
                note={notes[addon.id] || ''}
                onQtyChange={handleQtyChange}
                onNoteChange={handleNoteChange}
                onRequest={onRequest}
                isSubmitting={submittingId === addon.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(Addons);