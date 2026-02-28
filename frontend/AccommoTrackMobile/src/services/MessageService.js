import api from './api';

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
      const response = await api.get(`/messages/${conversationId}`);
      const payload = Array.isArray(response.data) ? response.data : [];
      return { success: true, data: payload };
    } catch (error) {
      return { success: false, error: extractError(error, 'Unable to load messages') };
    }
  },

  async sendMessage(conversationId, message, imageUri = null) {
    try {
      let payload;
      let headers = {};

      if (imageUri) {
        payload = new FormData();
        payload.append('conversation_id', conversationId);
        if (message) payload.append('message', message);
        
        // Append image
        const filename = imageUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;
        payload.append('image', { uri: imageUri, name: filename, type });
        
        headers['Content-Type'] = 'multipart/form-data';
      } else {
        payload = { conversation_id: conversationId, message };
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
  }
};

export default MessageService;
