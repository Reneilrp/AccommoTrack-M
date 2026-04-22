import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { showError } from '../../utils/toast';
import systemToggleService from '../../services/systemToggleService';
import paymentService from '../../services/paymentService';
import InvoiceSummary from './components/Checkout/InvoiceSummary';
import PaymentMethods from './components/Checkout/PaymentMethods';

const DEFAULT_TOGGLES = systemToggleService.getDefaults();

export default function InvoiceCheckout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [toggles, setToggles] = useState(DEFAULT_TOGGLES);

  const loadInvoice = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/invoices/${id}`);
      if (res.data) setInvoice(res.data);
      
      const configRes = await systemToggleService.getToggles();
      if (configRes.success) setToggles(configRes.data);
    } catch (_err) {
      showError('Failed to load invoice');
      navigate('/payments');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { loadInvoice(); }, [loadInvoice]);

  const handlePayment = async (method) => {
    setProcessing(true);
    try {
      if (method === 'paymongo') {
        const res = await paymentService.createPaymongoCheckout({ invoice_id: id });
        if (res.success && res.data.checkout_url) {
           window.location.href = res.data.checkout_url;
        } else {
           showError(res.error || 'Checkout failed');
        }
      } else {
        // Handle GCash Manual...
        navigate(`/payments/manual-verify/${id}`);
      }
    } catch (_err) {
      showError('Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-sm border dark:border-gray-700 hover:scale-110 transition-all">
            <ArrowLeft className="w-5 h-5 text-green-600" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Checkout</h1>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Complete your secure payment</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-8">
             <PaymentMethods 
               onSelect={handlePayment}
               processing={processing}
               disabled={toggles.tenantPaymentsDisabled}
               paymongoDisabled={toggles.invoicePaymongoDisabled}
               gcashDisabled={toggles.manualGcashReservationDisabled}
             />

             {toggles.tenantPaymentsDisabled && (
               <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                    Payments are currently undergoing maintenance. Please try again later or contact support.
                  </p>
               </div>
             )}
          </div>

          <div className="lg:col-span-2">
             <InvoiceSummary 
               invoice={invoice} 
               addonLines={invoice?.metadata?.addons || []} 
             />
          </div>
        </div>
      </div>
    </div>
  );
}