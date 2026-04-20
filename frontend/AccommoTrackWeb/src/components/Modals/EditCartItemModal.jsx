import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Loader2, Calendar, Bed, ClipboardList, Plus, Minus } from 'lucide-react';
import api from '../../utils/api';
import { useCart } from '../../contexts/CartContext';
import { showSuccess, showError } from '../../utils/toast';
import { getImageUrl, formatApiValidationMessage } from '../../utils/api';

export default function EditCartItemModal({ item, isOpen, onClose }) {
  const { updateItem } = useCart();
  const room = item?.room;
  const property = room?.property;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingPricing, setLoadingPricing] = useState(false);

  // State from item
  const [startDate, setStartDate] = useState(item?.start_date || '');
  const [endDate, setEndDate] = useState(item?.end_date || '');
  const [bedCount, setBedCount] = useState(item?.bed_count || 1);
  const [notes, setNotes] = useState(item?.notes || '');
  const [paymentPlan, setPaymentPlan] = useState(item?.payment_plan || 'monthly');
  const [contractMode, setContractMode] = useState(item?.contract_mode || 'monthly');
  const [selectedBedNumbers, setSelectedBedNumbers] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [pricingPreview, setPricingPreview] = useState(null);

  // Sync state when item changes
  useEffect(() => {
    if (item && isOpen) {
      // Ensure date strings are in YYYY-MM-DD format for input[type="date"]
      // Split by space or 'T' to get just the date part
      setStartDate(item.start_date ? item.start_date.split(/[\sT]/)[0] : '');
      setEndDate(item.end_date ? item.end_date.split(/[\sT]/)[0] : '');
      setBedCount(item.bed_count || 1);
      setNotes(item.notes || '');
      setPaymentPlan(item.payment_plan || 'monthly');
      setContractMode(item.contract_mode || 'monthly');
      
      const beds = item.bed_numbers 
        ? (typeof item.bed_numbers === 'string' ? item.bed_numbers.split(',') : item.bed_numbers) 
        : [];
      setSelectedBedNumbers(beds);
      setTotalPrice(Number(item.price_snapshot || 0));
      setPricingPreview(null);
    }
  }, [item, isOpen]);

  const isProxy = useMemo(() => (item?.occupants?.length || 0) > 0, [item?.occupants]);
  const pricingModel = room?.pricing_model || 'full_room';
  const showBedCountSelector = (pricingModel === 'per_bed' || pricingModel === 'per_pax') && isProxy;

  const resolvedCapacity = parseInt(room?.capacity || 0, 10);
  const resolvedOccupied = parseInt(room?.occupied_count || room?.occupied || 0, 10);
  const bedsRemaining = Math.max(0, resolvedCapacity - resolvedOccupied);

  const isDailyContract = contractMode === 'daily';

  // Fetch Pricing logic (Debounced)
  useEffect(() => {
    if (!room?.id || !startDate) return;

    const fetchPricing = async () => {
      // If daily, must have end date. If monthly, we can preview with 30 days.
      let pricingEndDate = endDate;
      if (!isDailyContract && (!endDate || new Date(endDate) <= new Date(startDate))) {
        const previewEnd = new Date(startDate);
        previewEnd.setDate(previewEnd.getDate() + 30);
        pricingEndDate = previewEnd.toISOString().split("T")[0];
      }

      if (!pricingEndDate || new Date(pricingEndDate) <= new Date(startDate)) {
        setTotalPrice(0);
        return;
      }

      setLoadingPricing(true);
      try {
        const res = await api.get(`/rooms/${room.id}/pricing`, {
          params: {
            start: startDate,
            end: pricingEndDate,
            bed_count: bedCount,
            contract_mode: isDailyContract ? "daily" : "monthly",
          },
        });

        const baseTotal = Number(res.data.base_total ?? res.data.total ?? 0);
        setTotalPrice(baseTotal);
        setPricingPreview(res.data.breakdown);
      } catch (err) {
        console.error('Pricing calculation failed', err);
        setTotalPrice(0);
      } finally {
        setLoadingPricing(false);
      }
    };

    const timer = setTimeout(fetchPricing, 400);
    return () => clearTimeout(timer);
  }, [room?.id, startDate, endDate, bedCount, isDailyContract]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        room_id: room.id,
        bed_count: bedCount,
        bed_numbers: selectedBedNumbers.join(','),
        start_date: startDate,
        end_date: endDate || null,
        notes: notes,
        payment_plan: paymentPlan,
        contract_mode: contractMode,
      };

      const result = await updateItem(item.id, payload);
      if (result.success) {
        showSuccess("Selection updated successfully!");
        onClose();
      } else {
        const validationMessage = formatApiValidationMessage(result.details || result.errors);
        showError(validationMessage || result.error || "Failed to update item");
      }
    } catch (error) {
      console.error("Update failed", error);
      showError("Failed to update item. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Selection</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[280px]">
              {property?.title} - Room {room?.room_number}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto max-h-[70vh] space-y-6">
          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                Move-in Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                Move-out Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none transition-all"
                placeholder={isDailyContract ? "Required" : "Optional"}
              />
            </div>
          </div>

          {/* Bed Count Info */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <Bed className="w-4 h-4" />
              Beds Remaining: <span className="text-green-600 dark:text-green-400 font-bold">{bedsRemaining}</span>
            </p>

            {showBedCountSelector && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Bed className="w-3.5 h-3.5" />
                  Number of Beds
                </label>
                <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-2xl w-fit border border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => setBedCount(Math.max(1, bedCount - 1))}
                    className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    disabled={bedCount <= 1}
                  >
                    <Minus className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </button>
                  <span className="text-xl font-bold text-gray-900 dark:text-white w-8 text-center">{bedCount}</span>
                  <button
                    onClick={() => setBedCount(Math.min(room?.total_beds || 99, bedCount + 1))}
                    className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    disabled={bedCount >= (room?.total_beds || room?.available_beds || 99)}
                  >
                    <Plus className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <ClipboardList className="w-3.5 h-3.5" />
              Notes to Landlord
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Prefer top bunk, bringing a small fridge..."
              className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none transition-all resize-none min-h-[100px]"
            />
          </div>

          {/* Pricing Summary */}
          <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-900/30">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Price</span>
              {loadingPricing ? (
                <Loader2 className="w-4 h-4 animate-spin text-green-600" />
              ) : (
                <span className="text-xl font-bold text-green-600 dark:text-green-400 font-mono">
                  {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(totalPrice)}
                </span>
              )}
            </div>
            {pricingPreview && (
              <p className="text-[10px] text-green-600 dark:text-green-500/70 uppercase tracking-tighter">
                {pricingPreview.months > 0 && `${pricingPreview.months} months `}
                {pricingPreview.remaining_days > 0 && `${pricingPreview.remaining_days} days `}
                included in this calculation.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || totalPrice <= 0}
            className="flex-[2] px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:hover:bg-green-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-600/20 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Selection"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}