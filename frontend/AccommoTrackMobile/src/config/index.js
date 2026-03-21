import { 
  API_URL, 
  WEB_URL, 
  ECHO_HOST, 
  ECHO_PORT, 
  ECHO_SCHEME,
  REVERB_APP_KEY 
} from '@env';

// 1. Backend 
const safeApiUrl = API_URL || '';
const cleanUrl = safeApiUrl.endsWith('/') ? safeApiUrl.slice(0, -1) : safeApiUrl;
export const BASE_URL = cleanUrl;
export const API_BASE_URL = cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
console.log('[Config] API_BASE_URL:', API_BASE_URL);

// 2. Web Frontend
export const WEB_BASE_URL = WEB_URL;

// 3. Echo / Reverb Config
export const ECHO_CONFIG = {
    broadcaster: 'reverb',
    key: REVERB_APP_KEY,
    wsHost: ECHO_HOST,
    wsPort: parseInt(ECHO_PORT, 10) || 80,
    wssPort: parseInt(ECHO_PORT, 10) || 443,
    forceTLS: ECHO_SCHEME === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${API_BASE_URL}/broadcasting/auth`,
};

// Legacy Support
export const IP_ADDRESS = ECHO_HOST;
export const PORT = ECHO_PORT;
export { ECHO_HOST, ECHO_PORT };
export const ECHO_AUTH_ENDPOINT = `${API_BASE_URL}/broadcasting/auth`;