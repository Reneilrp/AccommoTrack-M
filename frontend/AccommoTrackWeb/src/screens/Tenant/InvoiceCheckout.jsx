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
      <div className="max-w-md mx-auto mt-10 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-100 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Error</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{error || 'Invoice not found'}</p>
        <button onClick={() => navigate('/wallet')} className="px-6 py-2 bg-gray-100 rounded-lg font-medium">Back to Wallet</button>
      </div>
    );
  }

  const amount = invoice.amount_cents ? invoice.amount_cents / 100 : invoice.amount;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <button 
        onClick={() => navigate('/wallet')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Wallet
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-8 border-b border-gray-50 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase tracking-wider">
                Invoice Checkout
              </span>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {invoice.propertyName || 'Property Payment'}
              </h1>
              <p className="text-gray-500 text-sm mt-1">Ref: {invoice.referenceNo || `INV-${invoice.id}`}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Amount Due</p>
              <p className="text-3xl font-black text-gray-900 dark:text-white">
                <PriceRow amount={amount} />
              </p>
            </div>
          </div>
        </div>

        <div className="p-8">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Select Payment Method</h3>
          
          <div className="grid grid-cols-1 gap-4">
            {/* GCash */}
            <button
              onClick={() => handlePayMongoSource('gcash')}
              disabled={processing}
              className="flex items-center justify-between p-5 border-2 border-gray-100 dark:border-gray-700 rounded-2xl hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/30 transition-all group disabled:opacity-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                  <Wallet className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900 dark:text-white">GCash</p>
                  <p className="text-sm text-gray-500">Pay using your GCash wallet</p>
                </div>
              </div>
              <div className="w-6 h-6 rounded-full border-2 border-gray-200 group-hover:border-blue-500 flex items-center justify-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            </button>

            {/* Maya */}
            <button
              onClick={() => handlePayMongoSource('paymaya')}
              disabled={processing}
              className="flex items-center justify-between p-5 border-2 border-gray-100 dark:border-gray-700 rounded-2xl hover:border-green-500 dark:hover:border-green-500 hover:bg-green-50/30 transition-all group disabled:opacity-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
                  <Wallet className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900 dark:text-white">Maya</p>
                  <p className="text-sm text-gray-500">Pay using your Maya account</p>
                </div>
              </div>
              <div className="w-6 h-6 rounded-full border-2 border-gray-200 group-hover:border-green-500 flex items-center justify-center">
                <div className="w-3 h-3 bg-green-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            </button>

            {/* GrabPay */}
            <button
              onClick={() => handlePayMongoSource('grab_pay')}
              disabled={processing}
              className="flex items-center justify-between p-5 border-2 border-gray-100 dark:border-gray-700 rounded-2xl hover:border-green-600 dark:hover:border-green-600 hover:bg-green-50/30 transition-all group disabled:opacity-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-700 group-hover:scale-110 transition-transform">
                  <Wallet className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900 dark:text-white">GrabPay</p>
                  <p className="text-sm text-gray-500">Pay using GrabPay</p>
                </div>
              </div>
              <div className="w-6 h-6 rounded-full border-2 border-gray-200 group-hover:border-green-600 flex items-center justify-center">
                <div className="w-3 h-3 bg-green-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            </button>
          </div>

          <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-gray-400 mt-0.5" />
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Your payment is processed securely via PayMongo. By proceeding, you agree to the terms of service and recognize that this transaction is for your accommodation stay.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
