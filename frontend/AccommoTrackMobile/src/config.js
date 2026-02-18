export const IP_ADDRESS = '192.168.43.142';
export const WEB_IP_ADDRESS = '192.168.43.142';

export const PORT = '8000';
export const WEB_PORT = '5173';

export const BASE_URL = `http://${IP_ADDRESS}:${PORT}`;
export const API_BASE_URL = `${BASE_URL}/api`;
export const WEB_BASE_URL = `http://${WEB_IP_ADDRESS}:${WEB_PORT}`;

// Echo / Pusher Config
export const ECHO_HOST = IP_ADDRESS;
export const ECHO_PORT = 8000;
export const ECHO_AUTH_ENDPOINT = `${API_BASE_URL}/broadcasting/auth`;