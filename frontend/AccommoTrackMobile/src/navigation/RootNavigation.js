import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

export default {
  navigationRef,
  navigate,
};

// Forced logout callback — registered by AppNavigator, triggered by API interceptor
let _forcedLogoutCallback = null;
export function setForcedLogoutCallback(cb) {
  _forcedLogoutCallback = cb;
}
export function triggerForcedLogout(isBlocked = false) {
  if (_forcedLogoutCallback) {
    _forcedLogoutCallback(isBlocked);
  }
}

// Simple navigation state listeners so other modules can react to route changes
const _stateListeners = new Set();
export function notifyNavigationStateChange(route) {
  for (const cb of _stateListeners) {
    try { cb(route); } catch (e) { /* ignore listener errors */ }
  }
}

export function addNavigationStateListener(cb) {
  _stateListeners.add(cb);
  return () => _stateListeners.delete(cb);
}
