import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

const ActiveAddonTab = ({ data, onUpdatePrice }) => {
  const { activeAddons, summary } = data || {};
  const [editingPrices, setEditingPrices] = useState({});
  const [savingPriceId, setSavingPriceId] = useState(null);

  const handlePriceChange = (requestId, newPrice) => {
    setEditingPrices(prev => ({
      ...prev,
      [requestId]: newPrice
    }));
  };

  const handleSavePrice = async (item) => {
    const newPrice = editingPrices[item.id];
    if (!newPrice || isNaN(parseFloat(newPrice)) || parseFloat(newPrice) < 0) {
      alert('Please enter a valid price');
      return;
    }

    setSavingPriceId(item.id);
    try {
      await onUpdatePrice(item.booking_id, item.addon_id, parseFloat(newPrice));
      setEditingPrices(prev => {
        const updated = { ...prev };
        delete updated[item.id];
        return updated;
      });
    } catch (error) {
      console.error(error);
    } finally {
      setSavingPriceId(null);
    }
  };

  const cancelEdit = (requestId) => {
    setEditingPrices(prev => {
      const updated = { ...prev };
      delete updated[requestId];
      return updated;
    });
  };

  return (
    <div className="animate-in fade-in duration-300">
      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 rounded-xl p-6 shadow-sm">
            <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-2">
              Active Subscriptions
            </p>
            <p className="text-3xl font-bold text-green-700 dark:text-green-300">
              {summary.totalActive || 0}
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-xl p-6 shadow-sm">
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">
              Monthly Revenue
            </p>
            <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
              ₱{Number(summary.monthlyRevenue || 0).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* List */}
      <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase mb-4 tracking-wider">
        Active Subscriptions List
      </h3>

      {!activeAddons || activeAddons.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          <p className="text-gray-500 dark:text-gray-400">No active add-on subscriptions right now.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tenant</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Recurring Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {activeAddons.map((item) => {
                const isEditing = editingPrices[item.id] !== undefined;
                const displayPrice = isEditing ? editingPrices[item.id] : item.price;
                const isSaving = savingPriceId === item.id;
                const tenantName = item.tenant_name || (item.user ? `${item.user.first_name} ${item.user.last_name}` : 'Tenant');

                return (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-sm text-gray-900 dark:text-white">{tenantName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Room {item.room_number}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-sm text-gray-900 dark:text-white">{item.addon_name || item.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">₱</span>
                          <input
                            type="number"
                            value={displayPrice}
                            onChange={(e) => handlePriceChange(item.id, e.target.value)}
                            className="w-28 pl-7 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none dark:bg-gray-700 transition-colors"
                          />
                        </div>
                        {isEditing && displayPrice !== String(item.price) && (
                          <div className="flex gap-1 animate-in fade-in zoom-in duration-200">
                            <button
                              onClick={() => handleSavePrice(item)}
                              disabled={isSaving}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50"
                            >
                              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                            </button>
                            <button
                              onClick={() => cancelEdit(item.id)}
                              disabled={isSaving}
                              className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 uppercase font-bold tracking-wider">
                        Billed Monthly
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ActiveAddonTab;
