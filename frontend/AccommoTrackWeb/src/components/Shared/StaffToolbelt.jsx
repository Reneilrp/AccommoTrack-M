import React, { useState, useMemo, memo } from 'react';
import { PenTool, MessageSquare, Wrench, X } from 'lucide-react';
import QuickReportModal from './Toolbelt/QuickReportModal';
import DirectLandlordChatModal from './Toolbelt/DirectLandlordChatModal';

const StaffToolbelt = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);

  const activeUser = useMemo(() => {
    if (user) return user;
    try {
      return JSON.parse(localStorage.getItem('userData') || '{}');
    } catch {
      return {};
    }
  }, [user]);

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 font-sans">
        {isOpen && (
          <div className="flex flex-col gap-2 animate-in slide-in-from-bottom-5 duration-200">
            <button
              onClick={() => {
                setShowReportModal(true);
                setIsOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all group"
            >
              <span className="font-bold text-sm tracking-wide">Quick Property Report</span>
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg group-hover:scale-110 transition-transform">
                <Wrench className="w-5 h-5" />
              </div>
            </button>

            <button
              onClick={() => {
                setShowChatModal(true);
                setIsOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all group"
            >
              <span className="font-bold text-sm tracking-wide">Message Landlord</span>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg group-hover:scale-110 transition-transform">
                <MessageSquare className="w-5 h-5" />
              </div>
            </button>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`p-4 rounded-full shadow-xl transition-all duration-300 flex items-center justify-center ${
           isOpen ? 'bg-gray-800 text-white rotate-45' : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-green-500/30'
          }`}
        >
          {isOpen ? <X className="w-8 h-8" /> : <PenTool className="w-8 h-8" />}
        </button>
      </div>

      <QuickReportModal 
        isOpen={showReportModal} 
        onClose={() => setShowReportModal(false)}
        user={activeUser}
      />

      {showChatModal && (
        <DirectLandlordChatModal 
          isOpen={showChatModal} 
          onClose={() => setShowChatModal(false)} 
        />
      )}
    </>
  );
};

export default memo(StaffToolbelt);