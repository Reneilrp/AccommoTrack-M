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
  const [paymentAmount, setPaymentAmount] = useState('');
  const [remainingBalance, setRemainingBalance] = useState(0);

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/tenant/payments/${id}`);
      const invData = res.data;
      setInvoice(invData);
      
      const totalAmount = invData.amount_cents ? invData.amount_cents / 100 : Number(invData.amount || 0);
      const paidAmount = invData.transactions
        ?.filter(tx => tx.status === 'succeeded' || tx.status === 'paid')
        .reduce((sum, tx) => sum + (tx.amount_cents ? tx.amount_cents / 100 : Number(tx.amount || 0)), 0) || 0;
        
      const balance = Math.max(0, totalAmount - paidAmount);
      setRemainingBalance(balance);
      setPaymentAmount(balance.toString());
      
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  const handlePayMongoSource = async (method) => {
    const amountToPay = Number(paymentAmount);
    if (isNaN(amountToPay) || amountToPay <= 0) {
      return toast.error('Please enter a valid amount');
    }
    if (amountToPay > remainingBalance) {
      return toast.error(`Amount cannot exceed the remaining balance of ₱${remainingBalance.toLocaleString()}`);
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
          onClick={() => navigate('/payments')} 
          className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm"
        >
          Return to Billing
        </button>
      </div>
    );
  }

  const isFullyPaid = remainingBalance <= 0;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <button 
        onClick={() => navigate('/payments')}
        className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6 transition-colors font-bold text-sm uppercase tracking-wider"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Billing
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-300 dark:border-gray-700 overflow-hidden">
        <div className="p-8 md:p-10 border-b border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div>
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-full uppercase tracking-wider border border-green-200 dark:border-green-800">
                Secure Checkout
              </span>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-4 uppercase tracking-tight leading-tight">
                {invoice.propertyName || 'Property Payment'}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-xs font-bold mt-1 uppercase">Reference: {invoice.referenceNo || `INV-${invoice.id}`}</p>
            </div>
            <div className="text-left md:text-right bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-300 dark:border-gray-700 shadow-md md:shadow-none md:border-none md:bg-transparent">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Remaining Balance</p>
              <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                <PriceRow amount={remainingBalance} />
              </p>
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
                className="py-3 px-8 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm inline-block"
              >
                View History
              </button>
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
                    className="w-full pl-10 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-lg font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                    placeholder="Enter amount to pay"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
                  You can pay the full remaining balance of ₱{remainingBalance.toLocaleString()} or enter a partial amount.
                </p>
              </div>

              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
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
                  <p className="font-bold text-gray-900 dark:text-white text-lg uppercase tracking-tight">GCash</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Instant payment via GCash wallet</p>
                </div>
              </div>
              <div className="w-6 h-6 rounded-full border-2 border-gray-200 dark:border-gray-600 group-hover:border-blue-500 flex items-center justify-center transition-colors">
                <div className="w-3 h-3 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
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
                  <p className="font-bold text-gray-900 dark:text-white text-lg uppercase tracking-tight">GrabPay</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Direct payment using GrabPay credits</p>
                </div>
              </div>
              <div className="w-6 h-6 rounded-full border-2 border-gray-200 dark:border-gray-600 group-hover:border-blue-500 flex items-center justify-center transition-colors">
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
