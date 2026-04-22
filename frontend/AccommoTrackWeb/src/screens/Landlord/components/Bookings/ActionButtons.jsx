import React, { memo } from 'react';
import { CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { showError } from '../../../../utils/toast';

const ActionButtons = ({ 
  booking, 
  canApprove, 
  canCancel, 
  onUpdateStatus, 
  onUpdatePayment, 
  onOpenCancelModal,
  onCheckIn 
}) => {
  const { status, paymentStatus } = booking;

  // Render for Cancelled Status
  if (status === 'cancelled') {
    if (paymentStatus === 'refunded') {
      return (
        <div className="w-full p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800 text-sm text-purple-800 dark:text-purple-300 font-medium">
          <strong>Refunded:</strong> This booking has been cancelled and refunded.
        </div>
      );
    } 
    
    if (paymentStatus === 'paid' || paymentStatus === 'partial') {
      if (!canCancel) return <div className="text-sm text-amber-600">Refund actions require cancellation permission.</div>;
      return (
        <button
          onClick={() => onUpdatePayment(booking.id, 'refunded')}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-purple-500/20"
        >
          <CheckCircle className="w-5 h-5" /> Mark as Refunded
        </button>
      );
    }

    return <div className="text-sm text-gray-500 italic text-center font-medium">Booking cancelled (no payment to refund)</div>;
  }

  // Render for Completed Status
  if (status === 'completed') {
    if (!canCancel) return <div className="text-sm text-blue-800">Booking completed.</div>;
    return (
      <button
        onClick={() => onOpenCancelModal(booking)}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 border-2 border-red-600 text-red-600 hover:bg-red-50 rounded-xl font-bold transition-all"
      >
        <XCircle className="w-5 h-5" /> Cancel & Refund
      </button>
    );
  }

  // Render for Partial Completed
  if (status === 'partial-completed') {
    if (!canApprove) return <div className="text-sm text-amber-600">Completion requires approval permission.</div>;
    return (
      <button
        onClick={() => {
          if (window.confirm('Mark this booking as fully completed and paid?')) {
            if (Number(booking.deposit_balance || 0) > 0) {
              showError(`Settle deposit (₱${Number(booking.deposit_balance).toLocaleString()}) first.`);
              return;
            }
            onUpdateStatus(booking.id, 'completed');
          }
        }}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
      >
        <CheckCircle className="w-5 h-5" /> Mark Fully Paid & Completed
      </button>
    );
  }

  // Active / Confirmed Stay
  if (status === 'active' || status === 'confirmed') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {canApprove && (
          <button
            onClick={() => onUpdateStatus(booking.id, 'completed')}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20"
          >
            <CheckCircle className="w-5 h-5" /> Complete Stay
          </button>
        )}
        {canCancel && (
          <button
            onClick={() => onOpenCancelModal(booking)}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 border-2 border-red-600 text-red-600 hover:bg-red-50 rounded-xl font-bold"
          >
            <XCircle className="w-5 h-5" /> Cancel Booking
          </button>
        )}
      </div>
    );
  }

  // Pending Status
  if (status === 'pending' || status === 'pending_reservation') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {canApprove && (
          <button
            onClick={onCheckIn}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-500/20"
          >
            <CheckCircle className="w-5 h-5" /> Confirm & Check-in
          </button>
        )}
        {canCancel && (
          <button
            onClick={() => onOpenCancelModal(booking)}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 border-2 border-red-600 text-red-600 hover:bg-red-50 rounded-xl font-bold"
          >
            <XCircle className="w-5 h-5" /> Reject / Cancel
          </button>
        )}
      </div>
    );
  }

  return null;
};

export default memo(ActionButtons);