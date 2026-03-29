import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, ShieldCheck, Clock, ShieldAlert, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function SwitchRoleTab({ user: userProp }) {
  const navigate = useNavigate();
  const user = userProp || authService.getCurrentUser();
  const currentRole = user?.role || 'tenant';
  const newRole = currentRole === 'landlord' ? 'tenant' : 'landlord';
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isCredentialModalOpen, setIsCredentialModalOpen] = useState(false);
  const [credentialForm, setCredentialForm] = useState({
    email: user?.email || '',
    password: '',
    confirmPassword: '',
    agree: false,
  });
  const [credentialErrors, setCredentialErrors] = useState({});

  useEffect(() => {
    setCredentialForm((prev) => ({
      ...prev,
      email: user?.email || prev.email,
    }));
  }, [user?.email]);

  useEffect(() => {
    const fetchVerificationStatus = async () => {
      // Only fetch verification status if the user is a tenant,
      // as they are the only ones who might need to verify to become a landlord.
      if (currentRole === 'tenant') {
        try {
          setLoading(true);
          const res = await api.get('/landlord/my-verification');
          setVerificationStatus(res.data.status);
        } catch (err) {
          if (err.response && err.response.status === 404) {
            setVerificationStatus('not_submitted');
          } else {
            console.error('Failed to fetch verification status:', err);
          }
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchVerificationStatus();
  }, [currentRole]);

  const handleSwitchRole = async () => {
    // If we're already a landlord, we can ALWAYS switch back to tenant
    if (currentRole === 'landlord' && newRole === 'tenant') {
      if (window.confirm(`Are you sure you want to switch to Tenant mode?`)) {
        await performRoleSwitch();
      }
      return;
    }

    if (currentRole === 'tenant' && newRole === 'landlord') {
      if (verificationStatus === 'approved') {
        openCredentialModal();
      } else if (verificationStatus === 'pending') {
        toast.error('Your landlord verification is still under review. Please wait for approval before switching.');
      } else {
        if (window.confirm(`To become a landlord, you need to submit verification documents. Proceed to verification?`)) {
          navigate('/verification');
        }
      }
      return;
    }

    if (window.confirm(`Are you sure you want to switch to ${newRole.charAt(0).toUpperCase() + newRole.slice(1)} mode?`)) {
      await performRoleSwitch();
    }
  };

  const openCredentialModal = () => {
    setCredentialErrors({});
    setCredentialForm({
      email: user?.email || '',
      password: '',
      confirmPassword: '',
      agree: false,
    });
    setIsCredentialModalOpen(true);
  };

  const handleCredentialChange = (field, value) => {
    setCredentialForm((prev) => ({ ...prev, [field]: value }));
    setCredentialErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validateCredentialForm = () => {
    const errors = {};
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

    if (!credentialForm.email?.trim()) {
      errors.email = 'Email is required.';
    } else if (!emailRegex.test(credentialForm.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!credentialForm.password) {
      errors.password = 'Password is required.';
    } else if (credentialForm.password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    }

    if (!credentialForm.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.';
    } else if (credentialForm.confirmPassword !== credentialForm.password) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (!credentialForm.agree) {
      errors.agree = 'You must agree before switching to landlord mode.';
    }

    setCredentialErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleTenantToLandlordSwitch = async () => {
    if (!validateCredentialForm()) return;

    const switched = await performRoleSwitch({
      email: credentialForm.email.trim(),
      password: credentialForm.password,
      password_confirmation: credentialForm.confirmPassword,
      agree: credentialForm.agree,
    });

    if (switched) {
      setIsCredentialModalOpen(false);
    }
  };

  const performRoleSwitch = async (payload = {}) => {
    try {
      setIsSwitching(true);
      const response = await authService.switchRole(newRole, payload);
      if (response.user) {
        // Update user data in localStorage to keep UI in sync
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        userData.role = newRole;
        localStorage.setItem('userData', JSON.stringify(userData));

        window.location.href = '/dashboard';
        return true;
      }
    } catch (error) {
      if (isCredentialModalOpen && error.response?.data?.errors) {
        const serverErrors = error.response.data.errors;
        const mappedErrors = {};

        if (serverErrors.email) mappedErrors.email = serverErrors.email[0];
        if (serverErrors.password) mappedErrors.password = serverErrors.password[0];
        if (serverErrors.password_confirmation) mappedErrors.confirmPassword = serverErrors.password_confirmation[0];
        if (serverErrors.agree) mappedErrors.agree = serverErrors.agree[0];

        setCredentialErrors((prev) => ({ ...prev, ...mappedErrors }));
      }

      console.error('Failed to switch role:', error);
      toast.error(error.response?.data?.message || 'Failed to switch role. Please try again.');
      return false;
    } finally {
      setIsSwitching(false);
    }

    return false;
  };

  const getVerificationInfo = () => {
    if (loading || currentRole === 'landlord') return null;

    switch (verificationStatus) {
      case 'approved':
        return { icon: <ShieldCheck className="w-5 h-5 text-green-500" />, text: 'You are a verified landlord. To switch modes, confirm your account credentials.' };
      case 'pending':
        return { icon: <Clock className="w-5 h-5 text-yellow-500" />, text: 'Your landlord verification is currently under review. This process typically takes 2-3 working days.' };
      case 'rejected':
        return { icon: <ShieldAlert className="w-5 h-5 text-red-500" />, text: 'Your previous landlord verification was rejected. You will need to resubmit.' };
      default:
        return { icon: <ShieldAlert className="w-5 h-5 text-orange-500" />, text: 'To become a landlord, you must submit documents for verification.' };
    }
  };

  const verificationInfo = getVerificationInfo();

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-all">
        <div className="space-y-6">
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-green-600 dark:text-green-400" />
              Switch Role
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Switch between Landlord and Tenant modes. This will change your available features and dashboard.
            </p>
          </div>

          <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800 p-4 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-300">
              Current Mode: <span className="font-bold capitalize">{currentRole}</span>
            </p>
          </div>

          {/* Verification status info for tenants */}
          {verificationInfo && (
            <div className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              {verificationInfo.icon}
              <p className="text-sm text-gray-600 dark:text-gray-300 flex-1">{verificationInfo.text}</p>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={handleSwitchRole}
              disabled={loading || isSwitching}
              className="flex items-center justify-center gap-2 px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm shadow-green-500/20 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <ArrowLeftRight className="w-5 h-5" />
              {loading || isSwitching ? 'Loading...' : `Switch to ${newRole.charAt(0).toUpperCase() + newRole.slice(1)} Mode`}
            </button>
          </div>
        </div>
      </div>

      {isCredentialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Confirm Landlord Credentials</h3>
              <button
                type="button"
                onClick={() => setIsCredentialModalOpen(false)}
                className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                To switch from tenant to landlord mode, confirm the credentials tied to your account.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={credentialForm.email}
                  onChange={(e) => handleCredentialChange('email', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="you@example.com"
                />
                {credentialErrors.email && <p className="text-xs text-red-500 mt-1">{credentialErrors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                <input
                  type="password"
                  value={credentialForm.password}
                  onChange={(e) => handleCredentialChange('password', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter your password"
                />
                {credentialErrors.password && <p className="text-xs text-red-500 mt-1">{credentialErrors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={credentialForm.confirmPassword}
                  onChange={(e) => handleCredentialChange('confirmPassword', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Re-enter your password"
                />
                {credentialErrors.confirmPassword && <p className="text-xs text-red-500 mt-1">{credentialErrors.confirmPassword}</p>}
              </div>

              <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={credentialForm.agree}
                  onChange={(e) => handleCredentialChange('agree', e.target.checked)}
                  className="mt-1"
                />
                <span>I agree to the terms and conditions for landlord mode.</span>
              </label>
              {credentialErrors.agree && <p className="text-xs text-red-500">{credentialErrors.agree}</p>}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCredentialModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTenantToLandlordSwitch}
                disabled={isSwitching}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400"
              >
                {isSwitching ? 'Switching...' : 'Confirm & Switch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
