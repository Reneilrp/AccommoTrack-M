import React, { memo, useState } from 'react';
import { Check, X, BellRing, Loader2 } from 'lucide-react';
import { showError } from '../../../../utils/toast';

const AddonRequestTable = ({ requests, onAction, processingId, actionType }) => {
  const [editingPrices, setEditingPrices] = useState({});

  const handlePriceChange = (requestId, newPrice) => {
    setEditingPrices(prev => ({
      ...prev,
      [requestId]: newPrice
    }));
  };

  const handleApproveWithPrice = (request) => {
    const customPrice = editingPrices[request.id];
    const finalPrice = customPrice !== undefined ? parseFloat(customPrice) : (request.price || request.suggested_price || 0);
    
    if (isNaN(finalPrice) || finalPrice < 0) {
      showError('Please enter a valid price');
      return;
    }

    // Pass the custom price to the handler
    onAction(request.id, request.addon_id, 'approve', finalPrice);
  };

  if (!requests || requests.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <BellRing className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <p className="font-medium">No pending requests.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {requests.map((request) => {
        const defaultPrice = request.price || request.suggested_price || 0;
        const displayPrice = editingPrices[request.id] !== undefined 
          ? editingPrices[request.id] 
          : defaultPrice;

        const isProcessing = processingId === request.id;
        const tenantName = request.tenant_name || (request.user ? `${request.user.first_name} ${request.user.last_name}` : 'Tenant');

        return (
          <div
            key={request.id}
            className="border border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-6 shadow-sm"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 dark:text-white text-lg">
                    {request.addon_name || request.name}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                      request.price_type === "monthly"
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                        : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                    }`}
                  >
                    {request.price_type === "monthly" ? "Monthly" : "One-time"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-700 dark:text-amber-400 font-bold text-xs uppercase">
                    {tenantName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                      {tenantName}{" "}
                      <span className="mx-2 font-normal text-gray-500 dark:text-gray-500">
                        •
                      </span>{" "}
                      <span className="text-amber-700 dark:text-amber-400">
                        Room {request.room_number}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {request.property_title}
                    </p>
                  </div>
                </div>
                {request.note && (
                  <div className="mt-4 p-4 bg-white/50 dark:bg-black/20 rounded-lg border border-amber-100 dark:border-amber-900/20">
                    <p className="text-xs text-gray-600 dark:text-gray-300 italic leading-relaxed">
                      "{request.note}"
                    </p>
                  </div>
                )}
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-500 mt-4 uppercase">
                  Requested: {new Date(request.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right ml-4">
                <div className="mb-3">
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
                    Set Price (₱)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={displayPrice}
                      onChange={(e) => handlePriceChange(request.id, e.target.value)}
                      className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-right font-bold text-green-600 dark:text-green-400 focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-green-400 outline-none"
                      placeholder="0.00"
                    />
                    {request.price_type === "monthly" && (
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-500">/mo</span>
                    )}
                  </div>
                  {editingPrices[request.id] !== undefined && editingPrices[request.id] !== defaultPrice.toString() && (
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 font-medium">
                      Original: ₱{Number(defaultPrice).toLocaleString()}
                    </p>
                  )}
                </div>
                {request.quantity !== null && request.quantity !== undefined && (
                  <p className="text-[10px] font-bold text-gray-500 dark:text-gray-500 mb-3">
                    QTY: {request.quantity}
                  </p>
                )}
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => handleApproveWithPrice(request)}
                    disabled={isProcessing}
                    className="flex items-center gap-2.5 px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-all active:scale-95 shadow-sm disabled:opacity-50"
                  >
                    {isProcessing && actionType === 'approve' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Approve
                  </button>
                  <button
                    onClick={() => onAction(request.id, request.addon_id, "reject")}
                    disabled={isProcessing}
                    className="flex items-center gap-2.5 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isProcessing && actionType === 'reject' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default memo(AddonRequestTable);