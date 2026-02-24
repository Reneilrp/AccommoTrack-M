import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BlockedUserModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleContactSupport = () => {
    onClose();
    navigate('/help');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70]">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center text-center">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
            <ShieldAlert className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Account Blocked
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Your account has been blocked by the administrator. You are not permitted to log in at this time.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            If you believe this is a mistake or wish to appeal, please contact support.
          </p>
          <div className="flex gap-4 w-full">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              Close
            </button>
            <button
              onClick={handleContactSupport}
              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockedUserModal;
