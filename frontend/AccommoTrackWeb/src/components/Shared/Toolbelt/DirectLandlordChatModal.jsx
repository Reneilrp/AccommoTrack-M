import React, { useState, useEffect, useRef, memo } from 'react';
import { MessageSquare, X, Loader2 } from 'lucide-react';
import api from '../../../utils/api';
import { showError } from '../../../utils/toast';

const DirectLandlordChatModal = ({ isOpen, onClose, user }) => {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  const userId = user?.id;

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
                const isMine = Number(msg.actual_sender_id) === Number(userId); 
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
};

export default memo(DirectLandlordChatModal);