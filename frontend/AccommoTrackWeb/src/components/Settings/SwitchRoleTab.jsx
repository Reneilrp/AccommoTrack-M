import React from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';

export default function SwitchRoleTab() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const currentRole = user?.role || 'tenant';
  const newRole = currentRole === 'landlord' ? 'tenant' : 'landlord';

  const handleSwitchRole = async () => {
    if (currentRole === 'tenant' && newRole === 'landlord') {
      if (window.confirm(`To become a landlord, you need to submit verification documents. Proceed to verification?`)) {
        navigate('/settings', { state: { tab: 'verification' } });
      }
      return;
    }

    if (window.confirm(`Are you sure you want to switch to ${newRole.charAt(0).toUpperCase() + newRole.slice(1)} mode?`)) {
      try {
        const response = await authService.switchRole(newRole);
        if (response.user) {
          window.location.href = '/dashboard';
        }
      } catch (error) {
        console.error('Failed to switch role:', error);
        alert('Failed to switch role. Please try again.');
      }
    }
  };

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

        <div className="pt-2">
          <button
            onClick={handleSwitchRole}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm shadow-green-500/20"
          >
            <ArrowLeftRight className="w-5 h-5" />
            Switch to {newRole.charAt(0).toUpperCase() + newRole.slice(1)} Mode
          </button>
        </div>
      </div>
    </div>
  );
}
