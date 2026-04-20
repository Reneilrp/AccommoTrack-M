import React, { useState, useEffect, useRef } from 'react';
import { PenTool, MessageSquare, Wrench, X, Loader2 } from 'lucide-react';
import { showSuccess, showError } from '../../utils/toast';
import api from '../../utils/api';
import { useUIState } from '../../contexts/UIStateContext';
// import ConversationViewer from './Messaging/ConversationViewer'; // or similar for chat

const normalizeId = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const extractAssignedPropertyIds = (user) => {
  if (!user || user.role !== 'caretaker') return [];

  const ids = new Set();
  const pushId = (value) => {
    const normalized = normalizeId(value);
    if (normalized) ids.add(normalized);
  };

  pushId(user.assigned_property_id);
  pushId(user.property_id);

  if (Array.isArray(user.assigned_property_ids)) {
    user.assigned_property_ids.forEach(pushId);
  }

  if (Array.isArray(user.assigned_properties)) {
    user.assigned_properties.forEach((property) => {
      if (property && typeof property === 'object') {
        pushId(property.id ?? property.property_id);
      }
    });
  }

  return [...ids];
};

const normalizePropertiesPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export default function StaffToolbelt({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);

  const activeUser = React.useMemo(() => {
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
}

function QuickReportModal({ isOpen, onClose, user }) {
  const [properties, setProperties] = useState([]);
  const [propertyId, setPropertyId] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { invalidateData } = useUIState();

  const assignedPropertyIds = React.useMemo(() => extractAssignedPropertyIds(user), [user]);
  const hasSingleProperty = properties.length === 1;
  const singleProperty = hasSingleProperty ? properties[0] : null;

  const resolvePropertyLabel = (property) => {
    if (!property || typeof property !== 'object') return 'Assigned Property';
    if (property.title) return property.title;
    if (property.name) return property.name;
    const normalized = normalizeId(property.id);
    return normalized ? `Property #${normalized}` : 'Assigned Property';
  };

  const loadProperties = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/landlord/properties');
      const propertyRows = normalizePropertiesPayload(response?.data);
      setProperties(propertyRows);

      if (propertyRows.length === 0) {
        setPropertyId('');
        return;
      }

      const propertyIdSet = new Set(propertyRows.map((property) => normalizeId(property?.id)).filter(Boolean));

      const assignedDefault = assignedPropertyIds.find((assignedId) => propertyIdSet.has(assignedId));
      const fallbackAssignedId = normalizeId(user?.assigned_property_id || user?.property_id);
      const keeperAssignedId = propertyIdSet.has(fallbackAssignedId) ? fallbackAssignedId : '';
      const firstPropertyId = normalizeId(propertyRows[0]?.id);

      setPropertyId(assignedDefault || keeperAssignedId || firstPropertyId);
    } catch (err) {
      console.error(err);
      showError('Failed to load assigned properties.');
    } finally {
      setIsLoading(false);
    }
  }, [assignedPropertyIds, user]);

  useEffect(() => {
    if (isOpen) {
      loadProperties();
      setDescription('');
      setPropertyId('');
    }
  }, [isOpen, loadProperties]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!description.trim() || !propertyId) {
      showError('Please select a property and enter a report description.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/property-reports', {
        property_id: propertyId,
        description: description.trim()
      });
      showSuccess('Report submitted successfully.');
      onClose();
      invalidateData(['dashboard_stats', 'recent_activities']); // trigger refresh on dashboard
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-xl">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold dark:text-white">Quick Report</h3>
              <p className="text-sm text-gray-500">Log damage or property activity</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>
        ) : properties.length === 0 ? (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 text-sm font-medium">
            No assigned property found. Please ask your landlord to assign a property first.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">Property</label>
              {hasSingleProperty ? (
                <button
                  type="button"
                  onClick={() => setPropertyId(normalizeId(singleProperty?.id))}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-left text-sm dark:text-white cursor-pointer"
                  aria-label="Assigned property"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{resolvePropertyLabel(singleProperty)}</span>
                    <span className="text-[11px] font-bold uppercase tracking-wide text-green-600 dark:text-green-400">Assigned</span>
                  </div>
                </button>
              ) : (
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm dark:text-white"
                  required
                >
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>{resolvePropertyLabel(property)}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">Activity Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm dark:text-white resize-none"
                placeholder="Example: Replaced lightbulb in hallway, fixed door hinge on Room 2, general cleaning completed..."
                required
              />
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !propertyId || !description.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md shadow-green-500/20 transition-all disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Submit Report
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function DirectLandlordChatModal({ isOpen, onClose }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadConversation();
    }
  }, [isOpen]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const loadConversation = async () => {
    setIsLoading(true);
    try {
      const res = await api.post('/messages/start-landlord-chat');
      if (res.data) {
        setConversation(res.data);
        const msgs = await api.get(`/messages/conversations/${res.data.id}`);
        setMessages(msgs.data);
      }
    } catch (_err) {
      showError('Failed to load chat with landlord.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!messageText.trim() || !conversation) return;

    setIsSending(true);
    try {
      const response = await api.post('/messages/send', {
        conversation_id: conversation.id,
        message: messageText.trim(),
      });
      setMessages(prev => [...prev, response.data]);
      setMessageText('');
    } catch (_err) {
      showError('Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex flex-col bg-gray-50 dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md h-[500px] max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm shrink-0">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
            LL
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-white leading-tight">Landlord</h3>
            <p className="text-[11px] text-gray-500 uppercase font-semibold">Direct Chat</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto w-full no-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400">No messages yet.</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Send a message to start the conversation.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((msg, i) => {
                const isMine = msg.sender_role === 'caretaker'; 
                return (
                  <div key={i} className={`flex px-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-4 py-2 text-sm rounded-2xl shadow-sm ${isMine ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-bl-none'}`}>
                      {msg.message}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <form onSubmit={handleSend} className="flex items-end gap-2">
            <textarea
              rows={1}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 min-h-[44px] max-h-[120px] px-4 py-3 bg-gray-100 dark:bg-gray-700 outline-none resize-none rounded-2xl text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              disabled={isLoading || isSending}
            />
            <button
              type="submit"
              disabled={!messageText.trim() || isLoading || isSending}
              className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-full transition-colors shrink-0 flex items-center justify-center shadow-lg shadow-blue-500/30"
            >
              {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageSquare className="w-5 h-5 fill-current" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
