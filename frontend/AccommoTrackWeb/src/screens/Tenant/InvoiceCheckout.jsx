import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { ArrowLeft, CreditCard, Wallet, Landmark, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import PriceRow from '../../components/Shared/PriceRow';
import toast from 'react-hot-toast';

export default function InvoiceCheckout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/tenant/payments/${id}`);
      setInvoice(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  const handlePayMongoSource = async (method) => {
    setProcessing(true);
    try {
      const res = await api.post(`/tenant/invoices/${id}/paymongo-source`, {
        method: method,
        return_url: window.location.origin + '/wallet?payment_refresh=true'
      });
      
      const { source } = res.data;
      const checkoutUrl = source.data.attributes.redirect.checkout_url;
      
      // Redirect user to PayMongo checkout
      window.location.href = checkoutUrl;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate payment');
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
          onClick={() => navigate('/wallet')} 
          className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm"
        >
          Return to Wallet
        </button>
      </div>
    );
  }

  const amount = invoice.amount_cents ? invoice.amount_cents / 100 : invoice.amount;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <button 
        onClick={() => navigate('/wallet')}
        className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6 transition-colors font-bold text-sm uppercase tracking-widest"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Wallet
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-300 dark:border-gray-700 overflow-hidden">
        <div className="p-8 md:p-10 border-b border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div>
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-black rounded-full uppercase tracking-widest border border-green-200 dark:border-green-800">
                Secure Checkout
              </span>
              <h1 className="text-3xl font-black text-gray-900 dark:text-white mt-4 uppercase tracking-tight leading-tight">
                {invoice.propertyName || 'Property Payment'}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-xs font-bold mt-1 uppercase tracking-tighter">Reference: {invoice.referenceNo || `INV-${invoice.id}`}</p>
            </div>
            <div className="text-left md:text-right bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-300 dark:border-gray-700 shadow-md md:shadow-none md:border-none md:bg-transparent">
              <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Total Amount Due</p>
              <p className="text-4xl font-black text-green-600 dark:text-green-400">
                <PriceRow amount={amount} />
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 md:p-10">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center text-green-600 dark:text-green-400">
              <CreditCard className="w-5 h-5" />
            </div>
            Select Payment Method
          </h3>
          
          <div className="grid grid-cols-1 gap-4">
            {/* GCash */}
            <button
              onClick={() => handlePayMongoSource('gcash')}
              disabled={processing}
              className="flex items-center justify-between p-6 border-2 border-gray-300 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-all group disabled:opacity-50 active:scale-[0.99] text-left shadow-sm hover:shadow-md"
            >
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                  <Wallet className="w-7 h-7" />
                </div>
                <div>
                  <p className="font-black text-gray-900 dark:text-white text-lg uppercase tracking-tight">GCash</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Instant payment via GCash wallet</p>
                </div>
              </div>
              <div className="w-6 h-6 rounded-full border-2 border-gray-200 dark:border-gray-600 group-hover:border-blue-500 flex items-center justify-center transition-colors">
                <div className="w-3 h-3 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            </button>

            {/* Maya */}
            <button
              onClick={() => handlePayMongoSource('paymaya')}
              disabled={processing}
              className="flex items-center justify-between p-6 border-2 border-gray-300 dark:border-gray-700 rounded-xl hover:border-green-500 dark:hover:border-green-500 hover:bg-green-50/30 dark:hover:bg-green-900/20 transition-all group disabled:opacity-50 active:scale-[0.99] text-left shadow-sm hover:shadow-md"
            >
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform">
                  <Wallet className="w-7 h-7" />
                </div>
                <div>
                  <p className="font-black text-gray-900 dark:text-white text-lg uppercase tracking-tight">Maya</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Pay securely with Maya account</p>
                </div>
              </div>
              <div className="w-6 h-6 rounded-full border-2 border-gray-200 dark:border-gray-600 group-hover:border-green-500 flex items-center justify-center transition-colors">
                <div className="w-3 h-3 bg-green-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            </button>

            {/* GrabPay */}
            <button
              onClick={() => handlePayMongoSource('grab_pay')}
              disabled={processing}
              className="flex items-center justify-between p-6 border-2 border-gray-300 dark:border-gray-700 rounded-xl hover:border-green-600 dark:hover:border-green-600 hover:bg-green-50/30 dark:hover:bg-green-900/20 transition-all group disabled:opacity-50 active:scale-[0.99] text-left shadow-sm hover:shadow-md"
            >
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-green-700 dark:text-green-400 group-hover:scale-110 transition-transform">
                  <Wallet className="w-7 h-7" />
                </div>
                <div>
                  <p className="font-black text-gray-900 dark:text-white text-lg uppercase tracking-tight">GrabPay</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Direct payment using GrabPay credits</p>
                </div>
              </div>
              <div className="w-6 h-6 rounded-full border-2 border-gray-200 dark:border-gray-600 group-hover:border-green-600 flex items-center justify-center transition-colors">
                <div className="w-3 h-3 bg-green-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            </button>
          </div>

          <div className="mt-10 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-300 dark:border-gray-700 shadow-md flex items-start gap-4">
            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
              Transactions are encrypted and processed by PayMongo. By proceeding, you agree to our <span className="text-green-600 dark:text-green-400 font-bold underline cursor-pointer">Payment Terms</span> and confirm this is a valid accommodation payment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
