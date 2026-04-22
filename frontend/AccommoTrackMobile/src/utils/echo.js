import Echo from 'laravel-echo';
import Pusher from 'pusher-js/react-native';
import { AppState } from 'react-native';
import { ECHO_CONFIG } from '../config/index.js';
import { useAuthStore } from '../stores/auth/authStore.js';

window.Pusher = Pusher;

let echoInstance = null;
let appStateSubscription = null;

/**
 * Resolves the current auth token for Echo authentication.
 * Prioritizes the auth store for fast hydration.
 */
const resolveEchoToken = () => {
  return useAuthStore.getState().authToken || null;
};

/**
 * Creates or retrieves the singleton Echo instance.
 */
export const getEcho = () => {
  if (echoInstance) return echoInstance;

  const bearerToken = resolveEchoToken();
  
  const config = {
    ...ECHO_CONFIG,
    auth: {
      headers: {
        Accept: 'application/json',
        ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
      },
    },
  };

  echoInstance = new Echo(config);
  
  // Setup AppState handling for this instance
  setupAppStateHandling();

  return echoInstance;
};

/**
 * Completely destroys the current Echo instance and cleans up listeners.
 * Useful on logout.
 */
export const destroyEcho = () => {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
  }
  
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
};

/**
 * Refreshes the Echo instance (e.g., after token refresh or login)
 */
export const refreshEcho = () => {
  destroyEcho();
  return getEcho();
};

/**
 * Handles AppState changes to pause/resume the WebSocket connection.
 * Mobile apps should disconnect when in background to save battery/CPU.
 */
const setupAppStateHandling = () => {
  if (appStateSubscription) return;

  appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
    if (!echoInstance) return;

    if (nextAppState === 'active') {
      console.log('[Echo] App became active. Resuming connection...');
      echoInstance.connect();
    } else if (nextAppState.match(/inactive|background/)) {
      console.log('[Echo] App entered background. Pausing connection...');
      echoInstance.disconnect();
    }
  });
};

// Create a function that returns the singleton to maintain compatibility with "await createEcho()"
const createEcho = () => getEcho();

// Attach utility methods to the function for advanced usage
createEcho.refresh = refreshEcho;
createEcho.destroy = destroyEcho;
createEcho.disconnect = () => {
  if (echoInstance) echoInstance.disconnect();
};
createEcho.connect = () => {
  if (echoInstance) echoInstance.connect();
};

export default createEcho;
