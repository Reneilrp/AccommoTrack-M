import { 
  API_URL, 
  WEB_URL, 
  ECHO_HOST, 
  ECHO_PORT, 
  ECHO_SCHEME,
  REVERB_APP_KEY 
} from '@env';

const normalizeEnvValue = (value) => {
  if (typeof value !== 'string') return value;

  // Trim whitespace/newlines and remove accidental surrounding quotes.
  const trimmed = value.trim();
  return trimmed.replace(/^['"]|['"]$/g, '');
};

// Prefer .env (react-native-dotenv), then EAS/Expo env, then safe production defaults.
const resolvedApiUrl =
  normalizeEnvValue(API_URL) ||
  normalizeEnvValue(process.env.EXPO_PUBLIC_API_URL) ||
  'https://accommotrack.me/api';
const resolvedWebUrl =
  normalizeEnvValue(WEB_URL) ||
  normalizeEnvValue(process.env.EXPO_PUBLIC_WEB_URL) ||
  'https://accommotrack.me';
const resolvedEchoHost =
  normalizeEnvValue(ECHO_HOST) ||
  normalizeEnvValue(process.env.EXPO_PUBLIC_ECHO_HOST) ||
  'accommotrack.me';
const resolvedEchoPort =
  normalizeEnvValue(ECHO_PORT) ||
  normalizeEnvValue(process.env.EXPO_PUBLIC_ECHO_PORT) ||
  '443';
const resolvedEchoScheme =
  normalizeEnvValue(ECHO_SCHEME) ||
  normalizeEnvValue(process.env.EXPO_PUBLIC_ECHO_SCHEME) ||
  'https';
const resolvedReverbAppKey =
  normalizeEnvValue(REVERB_APP_KEY) ||
  normalizeEnvValue(process.env.EXPO_PUBLIC_REVERB_APP_KEY) ||
  '';
const resolvedTenantPaymentsDisabled =
  normalizeEnvValue(process.env.EXPO_PUBLIC_TENANT_PAYMENTS_DISABLED) ??
  'true';
const resolvedInvoicePaymongoDisabled =
  normalizeEnvValue(process.env.EXPO_PUBLIC_INVOICE_PAYMONGO_DISABLED) ??
  resolvedTenantPaymentsDisabled;
const resolvedReservationFeeDisabled =
  normalizeEnvValue(process.env.EXPO_PUBLIC_RESERVATION_FEE_DISABLED) ??
  'true';

// 1. Backend 
const safeApiUrl = normalizeEnvValue(resolvedApiUrl);
const cleanUrl = safeApiUrl.endsWith('/') ? safeApiUrl.slice(0, -1) : safeApiUrl;
export const BASE_URL = cleanUrl;
export const API_BASE_URL = cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
console.log('[Config] API_BASE_URL:', API_BASE_URL);

// 2. Web Frontend
export const WEB_BASE_URL = resolvedWebUrl;
export const TENANT_PAYMENTS_TEMP_DISABLED = String(resolvedTenantPaymentsDisabled).toLowerCase() !== 'false';
export const INVOICE_PAYMONGO_TEMP_DISABLED = String(resolvedInvoicePaymongoDisabled).toLowerCase() !== 'false';
export const RESERVATION_FEE_TEMP_DISABLED = String(resolvedReservationFeeDisabled).toLowerCase() !== 'false';

// 3. Echo / Reverb Config
export const ECHO_CONFIG = {
    broadcaster: 'reverb',
    key: resolvedReverbAppKey,
    wsHost: resolvedEchoHost,
    wsPort: parseInt(resolvedEchoPort, 10) || 80,
    wssPort: parseInt(resolvedEchoPort, 10) || 443,
    forceTLS: resolvedEchoScheme === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${API_BASE_URL}/broadcasting/auth`,
};

// Legacy Support
export const IP_ADDRESS = resolvedEchoHost;
export const PORT = resolvedEchoPort;
const _ECHO_HOST = resolvedEchoHost;
const _ECHO_PORT = resolvedEchoPort;
export { _ECHO_HOST as ECHO_HOST, _ECHO_PORT as ECHO_PORT };
export const ECHO_AUTH_ENDPOINT = `${API_BASE_URL}/broadcasting/auth`;
