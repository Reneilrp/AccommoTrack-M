import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

window.Pusher = Pusher;

const createEcho = async () => {
  const bearerToken =
    (await AsyncStorage.getItem('token')) ||
    (await AsyncStorage.getItem('auth_token')) ||
    '';

  return new Echo({
    broadcaster: 'reverb',
    key: 'w4k7x9m2p5n8v3b6',
    wsHost: '10.221.1.156',
    wsPort: 8080,
    forceTLS: false,
    disableStats: true,
    authEndpoint: 'http://10.221.1.156:8000/api/broadcasting/auth',
    auth: {
      headers: {
        Authorization: `Bearer ${bearerToken}`
      }
    }
  });
};

export default createEcho;
