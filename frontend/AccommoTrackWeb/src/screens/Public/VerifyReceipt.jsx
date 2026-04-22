import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import { ShieldCheck, ShieldAlert, Flag, Loader2, CheckCircle2, Clock, MapPin, User, Receipt } from 'lucide-react';

const VerifyReceipt = () => {
  const { reference } = useParams();
  const [searchParams] = useSearchParams();
  const signature = searchParams.get('sig');

  const [loading, setLoading] = useState(true);
  const [verifiedData, setVerifiedData] = useState(null);
  const [_error, setError] = useState(null);

  // Dispute form state
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeForm, setDisputeForm] = useState({
    reporter_name: '',
    reporter_email: '',
    message: '',
  });
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [disputeSuccess, setDisputeSuccess] = useState(false);

  useEffect(() => {
    const verifyDocument = async () => {
      if (!reference || !signature) {
        setError('Incomplete verification link. Please scan the original QR code again.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await api.get(`/public/receipts/${reference}/verify?sig=${signature}`, {
          headers: { 'X-Skip-Auth-Redirect': '1' }
        });
        if (response.data.success) {
          setVerifiedData(response.data.data);
        } else {
          setError(response.data.message || 'Verification failed.');
        }
      } catch (err) {
        console.error('Verification error:', err);
        setError(err.response?.data?.message || 'This document could not be verified. It may be forged or tampered with.');
      } finally {
        setLoading(false);
      }
    };

    verifyDocument();
  }, [reference, signature]);

  const handleDisputeSubmit = async (e) => {
    e.preventDefault();
    setSubmittingDispute(true);
    try {
      await api.post('/public/receipts/report', {
        receipt_reference: reference,
        ...disputeForm
      });
      setDisputeSuccess(true);
      setShowDisputeForm(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit report. Please try again.');
    } finally {
      setSubmittingDispute(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="space-y-4">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
          <p className="text-slate-600 font-bold animate-pulse uppercase tracking-widest text-sm">Verifying Document Registry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center p-6 py-12">
      <div className="max-w-md w-full space-y-8">
        {/* Brand Header */}
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tighter text-slate-900">
            Accommo<span className="text-indigo-600">Track</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-bold mt-1 uppercase tracking-[0.2em]">Official Document Registry</p>
        </div>

        {verifiedData ? (
          /* SUCCESS STATE */
          <div className="bg-white rounded-[2rem] shadow-2xl shadow-indigo-100 border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-700">
            <div className="bg-emerald-500 p-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-xl mb-6 border border-white/30">
                <ShieldCheck className="text-white w-12 h-12" />
              </div>
              <h2 className="text-white text-2xl font-black tracking-tight">Verified Receipt</h2>
              <p className="text-emerald-50 text-sm font-medium mt-1">Authenticity cryptographically confirmed</p>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 gap-8">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Receipt Reference</p>
                  <p className="text-lg font-mono font-bold text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-100">{verifiedData.reference}</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Document Status</p>
                    <div className="flex items-center gap-2 text-emerald-600 font-black text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>PAID</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date Confirmed</p>
                    <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>{new Date(verifiedData.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-slate-100"></div>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 border border-slate-100">
                      <User className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Verified Tenant</p>
                      <p className="text-slate-900 font-bold">{verifiedData.tenant_name}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 border border-slate-100">
                      <MapPin className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Issuing Property</p>
                      <p className="text-slate-900 font-bold">{verifiedData.property_title}</p>
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-3xl p-6 text-white flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Final Amount</p>
                      <p className="text-3xl font-black tracking-tighter">₱{verifiedData.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                      <Receipt className="w-6 h-6 text-emerald-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="px-8 pb-8">
               <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold text-center italic">
                    Certified Record: {new Date(verifiedData.certified_at).toLocaleString()}
                  </p>
               </div>
            </div>
          </div>
        ) : (
          /* ERROR / FORGERY STATE */
          <div className="bg-white rounded-[2rem] shadow-2xl shadow-red-100 border border-red-50 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="bg-red-500 p-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-xl mb-6 border border-white/30">
                <ShieldAlert className="text-white w-12 h-12" />
              </div>
              <h2 className="text-white text-2xl font-black tracking-tight uppercase">Security Alert</h2>
              <p className="text-red-50 text-sm font-medium mt-1">Unrecognized or Tampered Document</p>
            </div>
            <div className="p-10 text-center space-y-6">
              <p className="text-slate-600 font-medium leading-relaxed">
                The cryptographic signature for reference <strong className="text-slate-900 font-bold">"{reference}"</strong> is invalid. This document is not recognized by our registry and may be an unauthorized forgery.
              </p>
              <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                 <p className="text-xs text-red-600 font-bold">
                    System warning: Physical documents matching this reference should be treated as fraudulent until reported.
                 </p>
              </div>
            </div>
          </div>
        )}

        {/* Dispute Section */}
        {!disputeSuccess ? (
          <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
            {!showDisputeForm ? (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shrink-0">
                    <Flag className="text-slate-400 w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm uppercase tracking-tight">Report an Issue</h3>
                    <p className="text-slate-500 text-xs font-medium">Spotted a discrepancy?</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowDisputeForm(true)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black transition-all shadow-lg active:scale-95 uppercase tracking-wider"
                >
                  Start Report
                </button>
              </div>
            ) : (
              <form onSubmit={handleDisputeSubmit} className="space-y-5 animate-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-3 mb-2">
                   <button type="button" onClick={() => setShowDisputeForm(false)} className="text-indigo-600 font-black text-xs uppercase">Cancel</button>
                   <div className="h-px flex-1 bg-slate-100"></div>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Your Name</label>
                    <input 
                      type="text" 
                      required 
                      value={disputeForm.reporter_name}
                      onChange={e => setDisputeForm({...disputeForm, reporter_name: e.target.value})}
                      placeholder="Enter full name" 
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Email Address</label>
                    <input 
                      type="email" 
                      required 
                      value={disputeForm.reporter_email}
                      onChange={e => setDisputeForm({...disputeForm, reporter_email: e.target.value})}
                      placeholder="your@email.com"
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Describe the Concern</label>
                  <textarea 
                    required 
                    rows="3" 
                    value={disputeForm.message}
                    onChange={e => setDisputeForm({...disputeForm, message: e.target.value})}
                    placeholder="Describe what is wrong with the document..."
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  disabled={submittingDispute}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-100 active:scale-95 disabled:opacity-50"
                >
                  {submittingDispute ? 'Processing Submission...' : 'Submit Certified Dispute'}
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-6 rounded-[2rem] flex flex-col items-center gap-3 animate-in zoom-in duration-500">
             <CheckCircle2 className="w-8 h-8" />
             <p className="font-black text-sm uppercase tracking-widest text-center leading-relaxed">
               Dispute received.<br/>Reference ID: {reference} is flagged for investigation.
             </p>
          </div>
        )}

        <div className="text-center">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
            &copy; {new Date().getFullYear()} AccommoTrack Management System
          </p>
          <p className="text-slate-300 text-[9px] mt-1 font-medium italic">
            Tampering with official documents is a violation of system terms of service.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyReceipt;
