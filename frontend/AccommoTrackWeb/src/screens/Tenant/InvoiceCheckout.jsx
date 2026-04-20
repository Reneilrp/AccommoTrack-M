import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { ArrowLeft, CreditCard, Wallet, Landmark, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import PriceRow from '../../components/Shared/PriceRow';
import { showSuccess, showError } from '../../utils/toast';
import systemToggleService from '../../services/systemToggleService';
import paymentService from '../../services/paymentService';

const DEFAULT_TOGGLES = systemToggleService.getDefaults();

const REFUND_SETTLED_STATUSES = new Set([
  'succeeded',
  'paid',
  'partially_refunded',
  'refunded',
]);

const toPositiveInteger = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.round(parsed);
};

const normalizeInvoiceAddonLines = (invoice) => {
  const lines = [];

  const metadataAddonsRaw = invoice?.metadata?.addons;
  const metadataAddons = Array.isArray(metadataAddonsRaw)
    ? metadataAddonsRaw
    : (metadataAddonsRaw && typeof metadataAddonsRaw === 'object' ? Object.values(metadataAddonsRaw) : []);

  const metadataAddonIds = new Set();

  metadataAddons.forEach((addon, idx) => {
    const amountCents = toPositiveInteger(addon?.amount_cents ?? addon?.price_cents ?? addon?.price);
    if (!amountCents) return;

    const quantity = Math.max(1, toPositiveInteger(addon?.quantity) || 1);
    const addonId = addon?.addon_id ?? addon?.id ?? null;
    if (addonId !== null && addonId !== undefined) {
      metadataAddonIds.add(String(addonId));
    }

    lines.push({
      key: `meta-${addonId ?? idx}`,
      addonId: addonId ?? null,
      name: addon?.addon_name || addon?.name || 'Add-on',
      quantity,
      amountCents,
    });
  });

  const bookingAddons = Array.isArray(invoice?.booking?.addons) ? invoice.booking.addons : [];
  bookingAddons.forEach((addon, idx) => {
    const addonId = addon?.id ?? addon?.addon_id ?? null;
    if (addonId !== null && addonId !== undefined && metadataAddonIds.has(String(addonId))) {
      return;
    }

    const quantity = Math.max(1, toPositiveInteger(addon?.pivot?.quantity ?? addon?.quantity) || 1);
    const unitPrice = Number(addon?.pivot?.price_at_booking ?? addon?.price_at_booking ?? addon?.price ?? 0);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) return;

    lines.push({
      key: `booking-${addon?.pivot?.id ?? addonId ?? idx}`,
      addonId: addonId ?? null,
      name: addon?.name || addon?.addon_name || 'Add-on',
      quantity,
      amountCents: Math.round(unitPrice * 100 * quantity),
    });
  });

  return lines;
};

export default function InvoiceCheckout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [remainingBalance, setRemainingBalance] = useState(0);
  const [pendingOffline, setPendingOffline] = useState(0);
  const [offlineDetails, setOfflineDetails] = useState({ method: '', reference: '', notes: '', show: false, proofImage: null });
  const [proofImagePreview, setProofImagePreview] = useState(null);
  const [tenantPaymentsTempDisabled, setTenantPaymentsTempDisabled] = useState(DEFAULT_TOGGLES.tenantPaymentsDisabled);
  const [invoicePaymongoDisabled, setInvoicePaymongoDisabled] = useState(DEFAULT_TOGGLES.invoicePaymongoDisabled);
  const [manualGcashReservationDisabled, setManualGcashReservationDisabled] = useState(DEFAULT_TOGGLES.manualGcashReservationDisabled);
  const [walletBalance, setWalletBalance] = useState(0);

  const loadInvoice = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/tenant/payments/${id}`);
      const invData = res.data;
      setInvoice(invData);

      const totalCents = invData.amount_cents ?? Math.round(Number(invData.amount || 0) * 100);
      
      const paidCents = invData.transactions
        ?.filter(tx => REFUND_SETTLED_STATUSES.has(String(tx?.status || '').toLowerCase()))
        .reduce((sum, tx) => {
          const txAmountCents = Number(tx?.amount_cents ?? 0);
          const txRefundedCents = Number(tx?.refunded_amount_cents ?? 0);

          if (txAmountCents > 0) {
            return sum + Math.max(0, txAmountCents - txRefundedCents);
          }

          const txAmount = Number(tx?.amount || 0);
          return sum + Math.round(txAmount * 100);
        }, 0) || 0;

      const pendingOfflineCents = invData.transactions
        ?.filter(tx => tx.status === 'pending_offline')
        .reduce((sum, tx) => sum + (tx.amount_cents ?? Math.round(Number(tx.amount || 0) * 100)), 0) || 0;

      const balance = Math.max(0, totalCents - paidCents) / 100;
      setRemainingBalance(balance);
      setPendingOffline(pendingOfflineCents / 100);
      setPaymentAmount(balance.toString());

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  // Load property-specific wallet balance
  useEffect(() => {
    let mounted = true;
    const propertyId = invoice?.property_id || invoice?.booking?.property_id;
    if (!propertyId) return;

    paymentService.getPropertyCreditBalance(propertyId).then((result) => {
      if (!mounted) return;
      if (result.success) {
        setWalletBalance(result.data || 0);
      }
    }).catch(() => {
      // Non-critical
    });
    return () => { mounted = false; };
  }, [invoice?.id, invoice?.property_id, invoice?.booking?.property_id, id]);

  useEffect(() => {
    let mounted = true;
    systemToggleService.getToggles().then((result) => {
      if (!mounted || !result?.data) return;
      setTenantPaymentsTempDisabled(Boolean(result.data.tenantPaymentsDisabled));
      setInvoicePaymongoDisabled(Boolean(result.data.invoicePaymongoDisabled));
      setManualGcashReservationDisabled(Boolean(result.data.manualGcashReservationDisabled));
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handlePayMongoSource = async (method) => {
    if (processing) return;

    if (String(invoice?.status || '').toLowerCase() === 'pending_verification') {
      return showError('This invoice is awaiting manual payment verification. Online checkout is temporarily disabled to prevent duplicate payments.');
    }

    if (invoicePaymongoDisabled) {
      return showError('Online invoice payments are temporarily unavailable while payment compliance updates are in progress.');
    }

    if (tenantPaymentsTempDisabled) {
      return showError('Tenant payments are temporarily unavailable while payment compliance updates are in progress.');
    }

    const amountToPay = Number(paymentAmount);
    if (isNaN(amountToPay) || amountToPay <= 0) {
      return showError('Please enter a valid amount');
    }

    const prop = invoice?.property || invoice?.booking?.property;
    const allowPartial = prop?.allow_partial_payments !== 0 && prop?.allow_partial_payments !== false;
    if (!allowPartial && amountToPay !== remainingBalance) {
      return showError('Partial payments are disabled. Please pay the exact remaining balance.');
    }

    if (amountToPay > remainingBalance) {
      return showError(`Amount cannot exceed the remaining balance of ₱${remainingBalance.toLocaleString()}`);
    }

    setProcessing(true);
    try {
      const res = await api.post(`/tenant/invoices/${id}/paymongo-source`, {
        method: method,
        amount: amountToPay,
        return_url: window.location.origin + '/payments?payment_refresh=true'
      });

      const { source } = res.data;
      const checkoutUrl = source.data.attributes.redirect.checkout_url;

      // Redirect user to PayMongo checkout
      window.location.href = checkoutUrl;
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to initiate payment');
      setProcessing(false);
    }
  };

  const handleWalletCreditPayment = async () => {
    if (processing) return;

    if (tenantPaymentsTempDisabled) {
      return showError('Tenant payments are temporarily unavailable while payment compliance updates are in progress.');
    }

    const amountToPay = Math.min(remainingBalance, walletBalance);
    
    if (amountToPay <= 0) {
      return showError('No remaining balance or wallet credits available.');
    }

    const amountCents = Math.round(amountToPay * 100);

    setProcessing(true);
    try {
      const result = await paymentService.applyWalletCredit(id, amountCents);
      if (result.success) {
        showSuccess('Wallet credits applied successfully!');
        navigate('/payments');
      } else {
        showError(result.error || 'Failed to apply wallet credits');
      }
    } catch (_err) {
      showError('Failed to apply wallet credits');
    } finally {
      setProcessing(false);
    }
  };

  const handleProofImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showError('Image size must be less than 10MB');
        return;
      }
      setOfflineDetails({ ...offlineDetails, proofImage: file });
      setProofImagePreview(URL.createObjectURL(file));
    }
  };

  const handleOfflinePayment = async () => {
    if (processing) return;

    if (tenantPaymentsTempDisabled) {
      return showError('Tenant payments are temporarily unavailable while payment compliance updates are in progress.');
    }

    const amountToPay = Number(paymentAmount);
    if (isNaN(amountToPay) || amountToPay <= 0) {
      return showError('Please enter a valid amount');
    }

    const prop = invoice?.property || invoice?.booking?.property;
    const allowPartial = prop?.allow_partial_payments !== 0 && prop?.allow_partial_payments !== false;
    if (!allowPartial && amountToPay !== remainingBalance) {
      return showError('Partial payments are disabled. Please pay the exact remaining balance.');
    }

    const hasProofImage = offlineDetails.proofImage instanceof File;
    if (!hasProofImage) {
      return showError('Please upload a proof of payment image before checkout.');
    }

    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('amount_cents', Math.round(amountToPay * 100));
      formData.append('method', offlineDetails.method);
      if (offlineDetails.reference) formData.append('reference', offlineDetails.reference);
      if (offlineDetails.notes) formData.append('notes', offlineDetails.notes);
      formData.append('proof_image', offlineDetails.proofImage);

      await api.post(`/tenant/invoices/${id}/record-offline`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      showSuccess('Offline payment recorded! Please wait for landlord verification.');
      navigate('/payments');
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-md mx-auto mt-10 p-8 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-red-100 dark:border-red-900/30 text-center animate-in fade-in zoom-in duration-200">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Checkout Error</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">{error || 'Invoice details not found'}</p>
        <button
          onClick={() => navigate('/payments')}
          className="w-full py-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm"
        >
          Return to Billing
        </button>
      </div>
    );
  }

  const isFullyPaid = remainingBalance <= 0;

  // Extract payment settings
  const property = invoice.property || invoice.booking?.property;
  const landlord = property?.landlord;
  const acceptedPayments = property?.accepted_payments || ['cash'];
  const globalSettings = landlord?.payment_methods_settings || { allowed: ['cash'], details: {} };

  const allowPartialPayments = property?.allow_partial_payments !== 0 && property?.allow_partial_payments !== false;
  const isPendingManualVerification = String(invoice?.status || '').toLowerCase() === 'pending_verification';

  const isReservation = String(invoice?.invoice_type || invoice?.type || '').toLowerCase() === 'reservation_fee';

  const showOnline = !tenantPaymentsTempDisabled && !invoicePaymongoDisabled && !isPendingManualVerification && acceptedPayments.includes('online') && globalSettings.allowed?.includes('online');
  const showCash = !tenantPaymentsTempDisabled && acceptedPayments.includes('cash') && globalSettings.allowed?.includes('cash');
  const showManualGcash = !tenantPaymentsTempDisabled && globalSettings.allowed?.includes('gcash') && (!isReservation || !manualGcashReservationDisabled);

  const addonLines = normalizeInvoiceAddonLines(invoice);
  const addonTotalCents = addonLines.reduce((sum, line) => sum + line.amountCents, 0);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <button
        onClick={() => navigate('/payments')}
        className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6 transition-colors font-bold text-sm uppercase tracking-wider"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Billing
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Payment Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-300 dark:border-gray-700 overflow-hidden">
            {tenantPaymentsTempDisabled && (
              <div className="mx-8 mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                Tenant payments are temporarily unavailable while payment compliance updates are in progress.
              </div>
            )}
            {!tenantPaymentsTempDisabled && invoicePaymongoDisabled && (
              <div className="mx-8 mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                Online invoice payments are temporarily unavailable while payment compliance updates are in progress.
              </div>
            )}
            {!tenantPaymentsTempDisabled && !invoicePaymongoDisabled && isPendingManualVerification && (() => {
              const pendingTx = invoice?.transactions?.find(tx => tx.status === 'pending_offline');
              const proofUrl = pendingTx?.gateway_response?.proof_image_url;
              return (
                <div className="mx-8 mt-8 space-y-4">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-start gap-3">
                    <svg className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <div>
                      <p className="font-bold">Awaiting Verification</p>
                      <p className="mt-0.5 text-amber-700">Your payment has been submitted and is pending landlord review. You will be notified once it is approved or rejected.</p>
                      {pendingTx && (
                        <p className="mt-1 text-[11px] font-semibold text-amber-600">
                          Submitted: ₱{(pendingTx.amount_cents / 100).toLocaleString()} via {(pendingTx.method || '').replace('_', ' ')}
                          {pendingTx.gateway_reference ? ` · Ref: ${pendingTx.gateway_reference}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  {proofUrl && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Your Submitted Proof</p>
                      <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="block group">
                        <img
                          src={proofUrl}
                          alt="Your submitted proof of payment"
                          className="w-full max-h-52 object-contain rounded-xl border-2 border-amber-200 dark:border-amber-700 bg-black/5 transition-transform group-hover:scale-[1.01]"
                        />
                        <p className="text-[10px] text-center text-amber-600 dark:text-amber-400 mt-1 italic">Click to open full image</p>
                      </a>
                    </div>
                  )}
                </div>
              );
            })()}
            <div className="p-8 md:p-10 border-b border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30">
              <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div>
                  <span className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-full uppercase tracking-wider border border-green-200 dark:border-green-800">
                    Secure Checkout
                  </span>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-4 uppercase tracking-tight leading-tight">
                    {invoice.propertyName || 'Property Payment'}
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400 text-xs font-bold mt-2 uppercase">Reference: {invoice.referenceNo || `INV-${invoice.id}`}</p>
                </div>
              </div>
            </div>
            <div className="p-8 md:p-10">
              {isFullyPaid ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Invoice Fully Paid</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-8">This invoice has no remaining balance.</p>
                  <button
                    onClick={() => navigate('/payments')}
                    className="py-4 px-8 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm inline-block"
                  >
                    View History
                  </button>
                </div>
              ) : offlineDetails.show ? (
                <div className="animate-in slide-in-from-right duration-300">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Record {offlineDetails.method === 'cash' ? 'Cash' : 'GCash'} Payment</h3>

                  <div className="space-y-6 bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Amount to Pay (₱)</label>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">₱{Number(paymentAmount).toLocaleString()}</div>
                    </div>

                    {offlineDetails.method === 'gcash' && (
                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                          Reference Number
                        </label>
                        <input
                          type="text"
                          value={offlineDetails.reference}
                          onChange={(e) => setOfflineDetails({ ...offlineDetails, reference: e.target.value })}
                          placeholder="Enter GCash reference number"
                          className="w-full px-4 py-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                        Upload Proof of Payment <span className="text-red-500 text-sm">*</span>
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProofImageChange}
                        className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 dark:file:bg-gray-800 dark:file:text-white file:transition-colors"
                      />
                      {proofImagePreview && (
                        <img
                          src={proofImagePreview}
                          alt="Proof of payment preview"
                          className="mt-4 max-h-32 object-contain rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                        Notes / Message (Optional)
                      </label>
                      <textarea
                        value={offlineDetails.notes}
                        onChange={(e) => setOfflineDetails({ ...offlineDetails, notes: e.target.value })}
                        placeholder={offlineDetails.method === 'cash' ? "e.g. Paid at the front desk" : "e.g. Transferred from mobile number ..."}
                        className="w-full px-4 py-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none h-24 resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 mt-8">
                    <button
                      onClick={() => setOfflineDetails({ ...offlineDetails, show: false })}
                      className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleOfflinePayment}
                      disabled={processing || (offlineDetails.method === 'gcash' && !offlineDetails.reference)}
                      className="flex-1 py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {processing ? 'Processing...' : 'Submit Payment'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-8">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                      Amount to Pay (₱)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-bold text-lg">₱</span>
                      <input
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        max={remainingBalance}
                        min={1}
                        disabled={!allowPartialPayments}
                        className={`w-full pl-10 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-lg font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${!allowPartialPayments ? 'opacity-70 cursor-not-allowed' : ''}`}
                        placeholder="Enter amount to pay"
                      />
                    </div>
                    {allowPartialPayments ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
                        You can pay the full remaining balance of ₱{remainingBalance.toLocaleString()} or enter a partial amount.
                      </p>
                    ) : (
                      <p className="text-xs text-amber-600 dark:text-amber-500 mt-2 font-semibold">
                        Partial payments are disabled by the landlord. You must pay the full remaining balance.
                      </p>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-4">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center text-green-600 dark:text-green-400">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    Select Payment Method
                  </h3>

                  <div className="grid grid-cols-1 gap-4">
                    {/* PayMongo Online Options */}
                    {showOnline && (
                      <>
                        <button
                          onClick={() => handlePayMongoSource('gcash')}
                          disabled={processing}
                          className="flex items-center justify-between p-6 border-2 border-gray-300 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-all group disabled:opacity-50 active:scale-[0.99] text-left shadow-sm hover:shadow-md"
                        >
                          <div className="flex items-center gap-6">
                            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                              <Wallet className="w-7 h-7" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 dark:text-white text-lg uppercase tracking-tight">GCash Online</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Instant payment via PayMongo</p>
                            </div>
                          </div>
                          <div className="w-6 h-6 rounded-full border-2 border-gray-200 dark:border-gray-600 group-hover:border-blue-500 flex items-center justify-center transition-colors">
                            <div className="w-3 h-3 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          </div>
                        </button>

                        <button
                          onClick={() => handlePayMongoSource('grab_pay')}
                          disabled={processing}
                          className="flex items-center justify-between p-6 border-2 border-gray-300 dark:border-gray-700 rounded-xl hover:border-green-600 dark:hover:border-green-600 hover:bg-green-50/30 dark:hover:bg-green-900/20 transition-all group disabled:opacity-50 active:scale-[0.99] text-left shadow-sm hover:shadow-md"
                        >
                          <div className="flex items-center gap-6">
                            <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-green-700 dark:text-green-400 group-hover:scale-110 transition-transform">
                              <Wallet className="w-7 h-7" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 dark:text-white text-lg uppercase tracking-tight">GrabPay</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Direct payment via PayMongo</p>
                            </div>
                          </div>
                          <div className="w-6 h-6 rounded-full border-2 border-gray-200 dark:border-gray-600 group-hover:border-green-600 flex items-center justify-center transition-colors">
                            <div className="w-3 h-3 bg-green-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          </div>
                        </button>
                      </>
                    )}

                    {/* Manual GCash */}
                    {showManualGcash && (
                      <button
                        onClick={() => {
                          const parsed = Number(paymentAmount);
                          if (isNaN(parsed) || parsed <= 0) return showError('Please enter a valid amount first.');
                          if (parsed > remainingBalance) return showError(`Amount cannot exceed ₱${remainingBalance.toLocaleString()}`);
                          setOfflineDetails({ method: 'gcash', reference: '', notes: '', show: true });
                        }}
                        disabled={processing}
                        className="flex items-center justify-between p-6 border-2 border-gray-300 dark:border-gray-700 rounded-xl hover:border-blue-400 dark:hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-all group disabled:opacity-50 active:scale-[0.99] text-left shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/10 rounded-xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                            <Landmark className="w-7 h-7" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white text-lg uppercase tracking-tight">Manual GCash</p>
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-2">Pending landlord verification upon upload</p>
                          </div>
                        </div>
                      </button>
                    )}

                    {/* Cash */}
                    {showCash && (
                      <button
                        onClick={() => {
                          const parsed = Number(paymentAmount);
                          if (isNaN(parsed) || parsed <= 0) return showError('Please enter a valid amount first.');
                          if (parsed > remainingBalance) return showError(`Amount cannot exceed ₱${remainingBalance.toLocaleString()}`);
                          setOfflineDetails({ method: 'cash', reference: '', notes: '', show: true });
                        }}
                        disabled={processing}
                        className="flex items-center justify-between p-6 border-2 border-gray-300 dark:border-gray-700 rounded-xl hover:border-green-500 dark:hover:border-green-500 hover:bg-green-50/30 dark:hover:bg-green-900/20 transition-all group disabled:opacity-50 active:scale-[0.99] text-left shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 bg-green-50 dark:bg-green-900/10 rounded-xl flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
                            <Landmark className="w-7 h-7" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white text-lg uppercase tracking-tight">Cash Payment</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Pay in person and record reference</p>
                          </div>
                        </div>
                      </button>
                    )}

                    {/* Wallet Credit */}
                    {!tenantPaymentsTempDisabled && walletBalance > 0 && (
                      <button
                        onClick={handleWalletCreditPayment}
                        disabled={processing}
                        className="flex items-center justify-between p-6 border-2 border-gray-300 dark:border-gray-700 rounded-xl hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-50/30 dark:hover:bg-purple-900/20 transition-all group disabled:opacity-50 active:scale-[0.99] text-left shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                            <Wallet className="w-7 h-7" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white text-lg uppercase tracking-tight">Apply Wallet Credits</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Apply up to ₱{Math.min(remainingBalance, walletBalance).toLocaleString()} from property credits</p>
                            <p className="text-xs text-purple-600 dark:text-purple-400 font-bold mt-1">
                              Available for this property: ₱{walletBalance.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-purple-500/80 dark:text-purple-400/80 mt-2 font-medium italic">
                              *Credits are property-specific and earned from transfers/refunds within this property.
                            </p>
                          </div>
                        </div>
                        <div className="w-6 h-6 rounded-full border-2 border-gray-200 dark:border-gray-600 group-hover:border-purple-500 flex items-center justify-center transition-colors">
                          <div className="w-3 h-3 bg-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                      </button>
                    )}

                    {!showOnline && !showCash && !showManualGcash && walletBalance <= 0 && (
                      <div className="p-8 text-center bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                        <p className="text-gray-500 dark:text-gray-400 font-medium">No payment methods currently available for this property. Please contact the landlord.</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-10 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-300 dark:border-gray-700 shadow-md flex items-start gap-4">
                    <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                      Payments are securely tracked. By proceeding, you agree to our{' '}
                      <a
                        href="/help"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 dark:text-green-400 font-bold underline hover:text-green-700 dark:hover:text-green-300 transition-colors"
                      >
                        Payment Terms
                      </a>{' '}
                      and confirm this is a valid accommodation payment.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-300 dark:border-gray-700 p-6 lg:sticky lg:top-8 order-first lg:order-last">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 uppercase tracking-wide flex items-center gap-2">
            <Landmark className="w-5 h-5 text-green-600 dark:text-green-500" />
            Order Summary
          </h2>

          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Remaining Balance</p>
            <p className="text-4xl font-bold text-green-600 dark:text-green-400">
              <PriceRow amount={remainingBalance} />
            </p>
            {pendingOffline > 0 && (
              <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <p className="text-[11px] text-orange-700 dark:text-orange-400 font-bold leading-snug">
                  Note: ₱{pendingOffline.toLocaleString()} is currently awaiting landlord verification and is not yet deducted from your balance.
                </p>
              </div>
            )}
          </div>

          {invoice.booking && (
            <div className="space-y-4">
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wide">Plan Details</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Plan Type</span>
                    <span className="text-gray-900 dark:text-white font-bold capitalize">
                      {invoice.booking.payment_plan === 'full' ? 'Full Duration' : 'Monthly Rent'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Base Monthly Rate</span>
                    <span className="text-gray-900 dark:text-white font-bold">
                      <PriceRow amount={invoice.booking.monthly_rent} />
                    </span>
                  </div>
                  {addonTotalCents > 0 && (
                    <>
                      <div className="space-y-2">
                        {addonLines.map((line) => (
                          <div key={line.key} className="flex justify-between items-start text-sm">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">
                              {line.name}
                              {line.quantity > 1 ? ` x ${line.quantity}` : ''}
                            </span>
                            <span className="text-gray-900 dark:text-white font-bold">
                              <PriceRow amount={line.amountCents / 100} />
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center text-sm pt-2 border-t border-dashed border-gray-200 dark:border-gray-700">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Add-ons Total</span>
                        <span className="text-gray-900 dark:text-white font-bold">
                          <PriceRow amount={addonTotalCents / 100} />
                        </span>
                      </div>
                    </>
                  )}
                  {(invoice.booking.room?.require_1month_advance ||
                    invoice.booking.property?.require_1month_advance ||
                    invoice.description?.toLowerCase().includes('1 month advance')) && (
                      <div className="pt-4 mt-4 border-t border-dashed border-gray-200 dark:border-gray-700 flex justify-between items-start">
                        <span className="text-gray-600 dark:text-gray-400 text-xs font-medium">
                          1-Month Advance Applied
                        </span>
                        <span className="text-green-600 dark:text-green-400 text-xs font-bold pl-2 text-right">
                          +<PriceRow amount={invoice.booking.monthly_rent} />
                        </span>
                      </div>
                    )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}