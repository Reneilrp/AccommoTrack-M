import React, { useState } from 'react';
import { Megaphone, X, Send, Building } from 'lucide-react';
import ChatList from '../../components/Shared/Messaging/ChatList';
import ChatArea from '../../components/Shared/Messaging/ChatArea';
import { useMessaging } from '../../components/Shared/Messaging/useMessaging';

export default function Messages({ user, accessRole = 'landlord' }) {
  const messaging = useMessaging(user, accessRole);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastProperty, setBroadcastProperty] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const onSendBroadcast = async () => {
    if (!broadcastProperty || !broadcastMsg.trim()) return;
    setSendingBroadcast(true);
    const res = await messaging.handleBroadcast(broadcastProperty, broadcastMsg);
    setSendingBroadcast(false);
    if (res.success) {
      setShowBroadcastModal(false);
      setBroadcastMsg('');
      setBroadcastProperty('');
    }
  };

  return (
    <div className="h-full bg-transparent dark:bg-gray-900 flex flex-col overflow-hidden relative">
      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List Sidebar */}
        <div className="w-80 flex-shrink-0 border-r border-gray-300 dark:border-gray-700 h-full overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Messages</h2>
            <button
              onClick={() => setShowBroadcastModal(true)}
              className="p-2 bg-messaging-light text-messaging-primary rounded-full hover:opacity-80 transition-colors title='Send Announcement'"
              title="Property Announcement"
            >
              <Megaphone className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatList {...messaging} />
          </div>
        </div>

        {/* Chat Area Main Content */}
        <ChatArea {...messaging} />
      </div>

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-messaging-primary">
              <div className="flex items-center gap-3 text-white">
                <Megaphone className="w-6 h-6" />
                <h3 className="text-xl font-bold">Property Broadcast</h3>
              </div>
              <button 
                onClick={() => !sendingBroadcast && setShowBroadcastModal(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Target Property
                </label>
                <select
                  value={broadcastProperty}
                  onChange={(e) => setBroadcastProperty(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-messaging-primary focus:border-transparent dark:text-white outline-none"
                  disabled={sendingBroadcast}
                >
                  <option value="">Select a property...</option>
                  {messaging.propertyOptions.map(prop => (
                    <option key={prop.id} value={prop.id}>{prop.title || prop.name}</option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Announcement will be sent as individual messages to all residents of this property.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Message
                </label>
                <textarea
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  placeholder="e.g. Water maintenance scheduled for 2 PM today..."
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-messaging-primary focus:border-transparent dark:text-white outline-none min-h-[120px] resize-none"
                  disabled={sendingBroadcast}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowBroadcastModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  disabled={sendingBroadcast}
                >
                  Cancel
                </button>
                <button
                  onClick={onSendBroadcast}
                  disabled={sendingBroadcast || !broadcastProperty || !broadcastMsg.trim()}
                  className="flex-1 px-6 py-3 bg-messaging-primary text-white font-bold rounded-xl hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {sendingBroadcast ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Now
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
