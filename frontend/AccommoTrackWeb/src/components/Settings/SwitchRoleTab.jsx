import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, ShieldCheck, Clock, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import api from '../../utils/api';

export default function SwitchRoleTab() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const currentRole = user?.role || 'tenant';
  const newRole = currentRole === 'landlord' ? 'tenant' : 'landlord';
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [loading, setLoading] = useState(true);

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
    if (currentRole === 'tenant' && newRole === 'landlord') {
      if (verificationStatus === 'approved') {
        if (window.confirm(`Are you sure you want to switch to Landlord mode?`)) {
          await performRoleSwitch();
        }
      } else if (verificationStatus === 'pending') {
        alert('Your landlord verification is still under review. Please wait for approval before switching.');
      } else {
        if (window.confirm(`To become a landlord, you need to submit verification documents. Proceed to verification?`)) {
          navigate('/settings', { state: { tab: 'verification' } });
        }
      }
      return;
    }

    if (window.confirm(`Are you sure you want to switch to ${newRole.charAt(0).toUpperCase() + newRole.slice(1)} mode?`)) {
      await performRoleSwitch();
    }
  };

  const performRoleSwitch = async () => {
    try {
      const response = await authService.switchRole(newRole);
      if (response.user) {
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Failed to switch role:', error);
      alert('Failed to switch role. Please try again.');
    }
  };

  const getVerificationInfo = () => {
    if (loading || currentRole === 'landlord') return null;

    switch (verificationStatus) {
      case 'approved':
        return { icon: <ShieldCheck className="w-5 h-5 text-green-500" />, text: 'You are a verified landlord. You can switch to landlord mode anytime.' };
      case 'pending':
        return { icon: <Clock className="w-5 h-5 text-yellow-500" />, text: 'Your landlord verification is pending review.' };
      case 'rejected':
        return { icon: <ShieldAlert className="w-5 h-5 text-red-500" />, text: 'Your previous landlord verification was rejected. You will need to resubmit.' };
      default:
        return { icon: <ShieldAlert className="w-5 h-5 text-orange-500" />, text: 'To become a landlord, you must submit documents for verification.' };
    }
  };

  const verificationInfo = getVerificationInfo();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-all">
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-green-600 dark:text-green-400" />
            Switch Role
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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
          <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            {verificationInfo.icon}
            <p className="text-sm text-gray-600 dark:text-gray-300 flex-1">{verificationInfo.text}</p>
          </div>
        )}

        <div className="pt-2">
          <button
            onClick={handleSwitchRole}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm shadow-green-500/20 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <ArrowLeftRight className="w-5 h-5" />
            {loading ? 'Loading...' : `Switch to ${newRole.charAt(0).toUpperCase() + newRole.slice(1)} Mode`}
          </button>
        </div>
      </div>
    </div>
  );
}
