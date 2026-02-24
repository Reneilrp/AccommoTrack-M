import React, { useState } from 'react';
import { X, Mail, Key, Lock, ArrowRight, CheckCircle, Loader2, ChevronLeft } from 'lucide-react';
import { authService } from '../../services/authServices';
import toast from 'react-hot-toast';

export default function ForgotPasswordModal({ isOpen, onClose }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [passwords, setPasswords] = useState({ password: '', confirm: '' });

  if (!isOpen) return null;

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Please enter your email');
    
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      toast.success('Reset code sent to your email');
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length !== 6) return toast.error('Please enter the 6-digit code');

    setLoading(true);
    try {
      await authService.verifyCode(email, fullCode);
      toast.success('Code verified');
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (passwords.password !== passwords.confirm) return toast.error('Passwords do not match');
    if (passwords.password.length < 8) return toast.error('Password must be at least 8 characters');

    setLoading(true);
    try {
      await authService.resetPassword(email, code.join(''), passwords.password, passwords.confirm);
      toast.success('Password reset successfully! Please login.');
      onClose();
      // Reset state after close
      setTimeout(() => {
        setStep(1);
        setEmail('');
        setCode(['', '', '', '', '', '']);
        setPasswords({ password: '', confirm: '' });
      }, 300);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto focus next input
    if (value && index < 5) {
      document.getElementById(`code-${index + 1}`).focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      document.getElementById(`code-${index - 1}`).focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Reset Password
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 w-full bg-gray-100 dark:bg-gray-700">
          <div 
            className="h-full bg-emerald-500 transition-all duration-300 ease-in-out"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <div className="p-6">
          {/* Step 1: Email */}
          {step === 1 && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Mail className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">Forgot Password?</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Enter your email address and we'll send you a 6-digit code to reset your password.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white outline-none"
                  placeholder="name@example.com"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send Reset Code <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}

          {/* Step 2: Verify Code */}
          {step === 2 && (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div className="text-center mb-4">
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">Check Your Email</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  We sent a code to <span className="font-semibold text-gray-700 dark:text-gray-300">{email}</span>
                </p>
              </div>

              <div className="flex justify-center gap-2">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    id={`code-${index}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-10 h-12 text-center text-xl font-bold border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white outline-none"
                  />
                ))}
              </div>

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={loading || code.some(d => !d)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify Code'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center justify-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Change Email
                </button>
              </div>
            </form>
          )}

          {/* Step 3: New Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">Reset Password</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Create a new password for your account.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={passwords.password}
                    onChange={(e) => setPasswords({...passwords, password: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white outline-none"
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white outline-none"
                    placeholder="Re-enter password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
