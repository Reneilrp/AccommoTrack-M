import React, { memo } from 'react';
import { X, Receipt, FileText, CheckCircle, XCircle, RotateCcw, AlertCircle, ShieldCheck, ShieldX, PhilippinePeso } from 'lucide-react';
import PriceRow from '../../../../components/Shared/PriceRow';

const PaymentDetailModal = ({ 
  isOpen, 
  onClose, 
  payment, 
  onApprove, 
  onReject, 
  onOpenRefund, 
  onOpenManual, 
  onPrint,
  formatDate,
  getStatusColor,
  canManage,
  processing 
}) => {
  if (!isOpen || !payment) return null;

  const isPending = ['pending', 'unpaid', 'awaiting verification', 'pending_verification'].includes(payment.status?.toLowerCase());
  const isPaid = ['paid', 'succeeded'].includes(payment.status?.toLowerCase());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">Invoice Details</h3>
            <p className="text-xs text-gray-500 mt-1">Inv #{payment.invoice_number || payment.id}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
          {/* Summary Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Amount</p>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                <PriceRow amount={payment.total_amount} />
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Status</p>
              <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase border ${getStatusColor(payment.status)}`}>
                {payment.status.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tenant & Room</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{payment.user?.first_name} {payment.user?.last_name}</p>
              <p className="text-xs text-gray-500">{payment.property?.title} · Room {payment.room?.room_number}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Date</p>
                <p className="text-sm font-medium dark:text-white">{formatDate(payment.created_at)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Method</p>
                <p className="text-sm font-medium dark:text-white">{payment.method || 'N/A'}</p>
              </div>
            </div>
            {payment.reference_number && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Reference No.</p>
                <p className="text-sm font-mono font-bold dark:text-white">{payment.reference_number}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {canManage && (
            <div className="pt-6 border-t border-gray-100 dark:border-gray-700 space-y-3">
              {isPending && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    onClick={onApprove}
                    disabled={processing}
                    className="flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-500/20"
                  >
                    <ShieldCheck className="w-4 h-4" /> Approve
                  </button>
                  <button
                    onClick={onReject}
                    disabled={processing}
                    className="flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold"
                  >
                    <ShieldX className="w-4 h-4" /> Reject
                  </button>
                </div>
              )}

              {isPaid && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    onClick={onPrint}
                    className="flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
                  >
                    <FileText className="w-4 h-4" /> Print Receipt
                  </button>
                  <button
                    onClick={onOpenRefund}
                    className="flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold"
                  >
                    <RotateCcw className="w-4 h-4" /> Issue Refund
                  </button>
                </div>
              )}

              {isPending && !payment.method && (
                <button
                  onClick={onOpenManual}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold"
                >
                  <PhilippinePeso className="w-4 h-4" /> Record Manual Payment
                </button>
              )}
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 dark:bg-gray-700/30 text-right">
          <button onClick={onClose} className="px-6 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 rounded-xl font-bold shadow-sm">Close</button>
        </div>
      </div>
    </div>
  );
};

export default memo(PaymentDetailModal);