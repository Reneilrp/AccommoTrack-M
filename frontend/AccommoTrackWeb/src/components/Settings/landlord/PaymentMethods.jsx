import React, { useState, useEffect } from 'react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';
import { CreditCard, Save } from 'lucide-react';

export default function PaymentMethods({ user, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [allowed, setAllowed] = useState(user.payment_methods_settings?.allowed || ['cash']);
  const [details, setDetails] = useState(user.payment_methods_settings?.details || {});

  // Sync state if user prop updates (e.g. after a re-fetch)
  useEffect(() => {
    if (user.payment_methods_settings) {
      setAllowed(user.payment_methods_settings.allowed || ['cash']);
      setDetails(user.payment_methods_settings.details || {});
    }
  }, [user]);

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
        payment_methods_settings: {
          allowed,
          details
        }
      };
      
      // Use the /me endpoint which accepts PUT/POST for profile updates
      const res = await api.put('/me', payload);
      
      toast.success('Payment settings saved');
      if (onUpdate) {
        // Optimistically update the user object in parent
        onUpdate({ 
           ...user, 
           payment_methods_settings: payload.payment_methods_settings 
        });
      }
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
          <CreditCard className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Payment Methods</h2>
      </div>

      <div className="space-y-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">Select the payment methods you accept from tenants. These will be shown to tenants when they book a room.</p>

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
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">This info will be displayed to tenants during booking.</p>
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
  );
}
