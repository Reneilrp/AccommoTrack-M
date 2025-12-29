import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

const createEcho = () => {
    const token = localStorage.getItem('auth_token');

    const REVERB_KEY = import.meta.env.VITE_REVERB_APP_KEY || import.meta.env.VITE_REVERB_KEY || import.meta.env.REVERB_APP_KEY || import.meta.env.REVERB_KEY;
    const REVERB_HOST = import.meta.env.VITE_REVERB_HOST || import.meta.env.VITE_REVERB_WS_HOST || import.meta.env.REVERB_HOST || window.location.hostname;
    const REVERB_PORT = import.meta.env.VITE_REVERB_PORT || import.meta.env.REVERB_PORT || 8080;
    const REVERB_SCHEME = import.meta.env.VITE_REVERB_SCHEME || import.meta.env.REVERB_SCHEME || 'http';
    const API_BASE = import.meta.env.VITE_API_BASE_URL || `${import.meta.env.VITE_APP_URL || window.location.origin}/api`;

    // Allow explicit override for the broadcasting auth endpoint, otherwise build one
    // Remove any trailing `/api` because Laravel's broadcast auth route is usually `/broadcasting/auth`.
    const explicitAuth = import.meta.env.VITE_BROADCAST_AUTH_ENDPOINT;
    const apiRoot = API_BASE.replace(/\/api\/?$/, '') || (import.meta.env.VITE_APP_URL || window.location.origin);
    const authEndpoint = explicitAuth || `${apiRoot.replace(/\/$/, '')}/broadcasting/auth`;

    if (!REVERB_KEY) {
        console.warn('[Echo] Reverb app key missing. Real-time features will be disabled.');
        return null;
    }

    console.info('[Echo] init', { REVERB_KEY: REVERB_KEY ? '***' : null, REVERB_HOST, REVERB_PORT, REVERB_SCHEME, authEndpoint });

    const echo = new Echo({
        broadcaster: 'reverb',
        key: REVERB_KEY,
        wsHost: REVERB_HOST,
        wsPort: Number(REVERB_PORT),
        forceTLS: (REVERB_SCHEME === 'https'),
        disableStats: true,
        authEndpoint: authEndpoint,
        auth: {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
    });

    // Attach diagnostics to the underlying Pusher connection so it's easy to see in console.
    try {
        const pusher = echo.connector && echo.connector.pusher;
        if (pusher && pusher.connection) {
            pusher.connection.bind('connected', () => console.info('[Echo] connected'));
            pusher.connection.bind('disconnected', () => console.warn('[Echo] disconnected'));
            pusher.connection.bind('error', (err) => console.error('[Echo] connection error', err));
        }
    } catch (err) {
        console.warn('[Echo] failed to attach pusher listeners', err);
    }

    return echo;
};

export default createEcho;