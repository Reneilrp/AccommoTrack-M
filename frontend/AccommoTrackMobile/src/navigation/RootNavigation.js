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
