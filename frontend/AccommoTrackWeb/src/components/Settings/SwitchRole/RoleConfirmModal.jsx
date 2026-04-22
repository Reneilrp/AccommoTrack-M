import React, { memo } from 'react';
import { ArrowLeftRight } from 'lucide-react';

const RoleConfirmModal = ({ isOpen, onClose, onConfirm, config, isSwitching }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1200]">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full mx-auto mb-4">
          <ArrowLeftRight className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>

        <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center mb-2">
          {config.title}
        </h3>

        <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
          {config.message}
        </p>

        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSwitching}
            className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400"
          >
            {isSwitching ? 'Switching...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(RoleConfirmModal);