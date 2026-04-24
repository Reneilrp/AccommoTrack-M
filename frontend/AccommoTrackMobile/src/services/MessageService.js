import api, { normalizeResponse, normalizeError, normalizePaginatedResponse } from './api.js';

const MessageService = {
  async getConversations(params = {}) {
    try {
      const response = await api.get('/messages/conversations', { params });
      return {
        success: true,
        data: normalizePaginatedResponse(response),
        error: null
      };
    } catch (error) {
      return normalizeError(error);
    }
  },

  async getConversationMessages(conversationId, params = {}) {
    try {
      const response = await api.get(`/messages/conversations/${conversationId}`, { params });
      return {
        success: true,
        data: normalizePaginatedResponse(response),
        error: null
      };
    } catch (error) {
      return normalizeError(error);
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
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  },

  async startConversation(payload = {}) {
    try {
      const response = await api.post('/messages/start', payload);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  },

  async unsend(messageId) {
    try {
      const response = await api.patch(`/messages/${messageId}/unsend`);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  },

  async editMessage(messageId, newMessage) {
    try {
      const response = await api.patch(`/messages/${messageId}/edit`, { message: newMessage });
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  },

  async startLandlordChat() {
    try {
      const response = await api.post('/messages/start-landlord-chat');
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  },

  async assignCaretaker(conversationId, caretakerId) {
    try {
      const response = await api.patch(`/messages/${conversationId}/caretaker`, { caretaker_id: caretakerId });
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  },

  async markAsRead(conversationId) {
    try {
      const response = await api.post(`/messages/${conversationId}/read`);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  },

  async hideConversation(conversationId) {
    try {
      const response = await api.delete(`/messages/conversations/${conversationId}`);
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  },

  /**
   * LANDLORD: Broadcast a message to multiple tenants.
   * recipients: array of user IDs.
   */
  async broadcast(message, recipients) {
    try {
      const response = await api.post('/landlord/broadcast', {
        message,
        recipients,
      });
      return normalizeResponse(response);
    } catch (error) {
      return normalizeError(error);
    }
  }
};

export default MessageService;
