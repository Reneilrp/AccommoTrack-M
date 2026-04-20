import api from './api.js';

const extractError = (error, fallback = 'Something went wrong') => {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.message) {
    return error.message;
  }
  return fallback;
};

const MessageService = {
  async getConversations() {
    try {
      const response = await api.get('/messages/conversations');
      const payload = Array.isArray(response.data) ? response.data : [];
      return { success: true, data: payload };
    } catch (error) {
      return { success: false, error: extractError(error, 'Unable to load conversations') };
    }
  },

  async getConversationMessages(conversationId) {
    try {
      const response = await api.get(`/messages/conversations/${conversationId}`);
      const payload = Array.isArray(response.data) ? response.data : [];
      return { success: true, data: payload };
    } catch (error) {
      return { success: false, error: extractError(error, 'Unable to load messages') };
    }
  },

  async sendMessage(conversationId, message, imageUri = null, replyToId = null, fileUri = null, fileName = null) {
    try {
      let payload;
      let headers = {};

      if (imageUri || fileUri) {
        payload = new FormData();
        payload.append('conversation_id', conversationId);
        if (message) payload.append('message', message);
        if (replyToId) payload.append('reply_to_id', replyToId);
        
        if (imageUri) {
          const filename = imageUri.split('/').pop();
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : `image`;
          payload.append('image', { uri: imageUri, name: filename, type });
        }

        if (fileUri) {
          const type = fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          payload.append('file', { uri: fileUri, name: fileName, type });
        }
        
        headers['Content-Type'] = 'multipart/form-data';
      } else {
        payload = { conversation_id: conversationId, message, reply_to_id: replyToId };
      }

      const response = await api.post('/messages/send', payload, { headers });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: extractError(error, 'Unable to send message') };
    }
  },

  async startConversation(payload = {}) {
    try {
      const response = await api.post('/messages/start', payload);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: extractError(error, 'Unable to start conversation') };
    }
  },

  async unsend(messageId) {
    try {
      const response = await api.patch(`/messages/${messageId}/unsend`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: extractError(error, 'Unable to unsend message') };
    }
  },

  async editMessage(messageId, newMessage) {
    try {
      const response = await api.patch(`/messages/${messageId}/edit`, { message: newMessage });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: extractError(error, 'Unable to edit message') };
    }
  },

  async startLandlordChat() {
    try {
      const response = await api.post('/messages/start-landlord-chat');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: extractError(error, 'Unable to start chat with landlord') };
    }
  },

  async assignCaretaker(conversationId, caretakerId) {
    try {
      const response = await api.patch(`/messages/${conversationId}/caretaker`, { caretaker_id: caretakerId });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: extractError(error, 'Unable to assign caretaker') };
    }
  },

  async markAsRead(conversationId) {
    try {
      const response = await api.post(`/messages/${conversationId}/read`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: extractError(error, 'Unable to mark messages as read') };
    }
  },

  async hideConversation(conversationId) {
    try {
      const response = await api.delete(`/messages/conversations/${conversationId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: extractError(error, 'Unable to delete conversation') };
    }
  }
};

export default MessageService;
