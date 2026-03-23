import Echo from 'laravel-echo';
import Pusher from 'pusher-js/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ECHO_CONFIG } from '../config/index.js';

window.Pusher = Pusher;

const createEcho = async () => {
  let bearerToken = '';
  try {
    const userJson = await AsyncStorage.getItem('userData');
    if (userJson) {
      const user = JSON.parse(userJson);
      bearerToken = user?.token || '';
    }
    if (!bearerToken) {
      bearerToken = await AsyncStorage.getItem('authToken');
    }
  } catch (e) {
    console.error('[Echo] Error retrieving token:', e);
  }

  const config = {
    ...ECHO_CONFIG,
    auth: {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        Accept: 'application/json',
      }
    }
  };

  return new Echo(config);
};

export default createEcho;
