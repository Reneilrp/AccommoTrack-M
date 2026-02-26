import { 
  API_URL, 
  WEB_URL, 
  ECHO_HOST, 
  ECHO_PORT, 
  ECHO_SCHEME,
  REVERB_APP_KEY 
} from '@env';

// 1. Backend 
const cleanUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
export const API_BASE_URL = cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
console.log('[Config] API_BASE_URL:', API_BASE_URL);

// 2. Web Frontend
export const WEB_BASE_URL = WEB_URL;

// 3. Echo / Reverb Config
export const ECHO_CONFIG = {
    broadcaster: 'reverb',
    key: REVERB_APP_KEY,
    wsHost: ECHO_HOST,
    wsPort: parseInt(ECHO_PORT),
    wssPort: parseInt(ECHO_PORT),
    forceTLS: ECHO_SCHEME === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${API_BASE_URL}/broadcasting/auth`,
};

// Legacy Support
export const IP_ADDRESS = ECHO_HOST;
export const PORT = ECHO_PORT;