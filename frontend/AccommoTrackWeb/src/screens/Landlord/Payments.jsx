import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, FileDown } from 'lucide-react';
import { showSuccess, showError } from '../../utils/toast';
import paymentService from '../../services/paymentService';
import invoiceService from '../../services/invoiceService';
import { SkeletonStatCard, SkeletonTableRow } from '../../components/Shared/Skeleton';
import { useUIState } from '../../contexts/UIStateContext';
import PaymentStats from './components/Payments/PaymentStats';
import PaymentFilters from './components/Payments/PaymentFilters';
import PaymentTableRow from './components/Payments/PaymentTableRow';
import PaymentDetailModal from './components/Payments/PaymentDetailModal';
import RefundModal from './components/Payments/RefundModal';
import RecordManualPaymentModal from './components/Payments/RecordManualPaymentModal';

const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function Payments({ _user }) {
  const { uiState, updateData } = useUIState();
  const cachedData = uiState.data?.landlord_payments;

  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [payments, setPayments] = useState(cachedData?.payments || []);
  const [stats, setStats] = useState(cachedData?.stats || { totalRevenue: 0, pendingAmount: 0, collectedAmount: 0, overdueAmount: 0 });
  const [loading, setLoading] = useState(!cachedData);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      // Using invoiceService for landlord view if paymentService is more tenant-focused
      const res = await invoiceService.getInvoices({
        status: filterStatus !== 'all' ? filterStatus : undefined,
        search: searchQuery
      });
      
      if (res.success) {
        setPayments(res.data.items || res.data || []);
        
        // Mock stats if not available from a dedicated endpoint
        const statsRes = await invoiceService.getStats();
        if (statsRes.success) {
          setStats(statsRes.data);
          updateData('landlord_payments', { payments: res.data.items, stats: statsRes.data });
        }
      }
    } catch (_err) {
      showError('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, searchQuery, updateData]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleApprove = async () => {
    setProcessing(true);
    const res = await invoiceService.approvePayment(selectedPayment.id);
    if (res.success) {
      showSuccess('Payment approved');
      fetchPayments();
      setShowDetailModal(false);
    } else {
      showError(res.error);
    }
    setProcessing(false);
  };

  const handleReject = async (reason) => {
    setProcessing(true);
    const res = await invoiceService.rejectPayment(selectedPayment.id, { reason });
    if (res.success) {
      showSuccess('Payment rejected');
      fetchPayments();
      setShowDetailModal(false);
    } else {
      showError(res.error);
    }
    setProcessing(false);
  };

  const handleRefund = async (data) => {
    setProcessing(true);
    const res = await invoiceService.refundPayment(selectedPayment.id, data);
    if (res.success) {
      showSuccess('Refund processed successfully');
      fetchPayments();
      setShowRefundModal(false);
      setShowDetailModal(false);
    } else {
      showError(res.error);
    }
    setProcessing(false);
  };

  const handleManualPayment = async (data) => {
    setProcessing(true);
    const res = await invoiceService.recordManualPayment(selectedPayment.id, data);
    if (res.success) {
      showSuccess('Manual payment recorded');
      fetchPayments();
      setShowManualModal(false);
      setShowDetailModal(false);
    } else {
      showError(res.error);
    }
    setProcessing(false);
  };

  const handlePrint = (payment) => {
    const url = invoiceService.getReceiptUrl(payment.id);
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment & Invoices</h1>
          <p className="text-sm text-gray-500">Monitor collections, approve GCash payments, and issue receipts.</p>
        </div>
        <div className="flex items-center gap-2">
           <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 transition-all">
             <FileDown className="w-4 h-4" /> Export
           </button>
           <button onClick={fetchPayments} className="p-2 text-gray-400 hover:text-green-600 transition-colors">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <PaymentStats stats={stats} />
      
      <PaymentFilters 
        filterStatus={filterStatus}
        onStatusChange={setFilterStatus}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Invoice</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tenant / Room</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Method</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading && payments.length === 0 ? (
                [...Array(5)].map((_, i) => <SkeletonTableRow key={i} columns={6} />)
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">No payment records found.</td>
                </tr>
              ) : (
                payments.map((p) => (
                  <PaymentTableRow 
                    key={p.id} 
                    payment={p} 
                    onView={() => { setSelectedPayment(p); setShowDetailModal(true); }}
                    onPrint={handlePrint}
                    getStatusColor={(s) => paymentService.getStatusColor(s)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PaymentDetailModal 
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        payment={selectedPayment}
        canManage={true}
        onApprove={handleApprove}
        onReject={() => handleReject('Rejected by landlord.')}
        onPrint={() => handlePrint(selectedPayment)}
        onOpenRefund={() => setShowRefundModal(true)}
        onOpenManual={() => setShowManualModal(true)}
        formatDate={formatDate}
        getStatusColor={(s) => paymentService.getStatusColor(s)}
        processing={processing}
      />

      <RefundModal 
        isOpen={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        payment={selectedPayment}
        onSubmit={handleRefund}
        submitting={processing}
        formatDate={formatDate}
      />

      <RecordManualPaymentModal 
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        invoice={selectedPayment}
        onSubmit={handleManualPayment}
        submitting={processing}
      />
    </div>
  );
}