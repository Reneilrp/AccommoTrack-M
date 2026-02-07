import Toast from 'react-native-toast-message';

/**
 * Show success toast notification
 * @param {string} message - Main message to display
 * @param {string} description - Optional description text
 */
export const showSuccess = (message, description = '') => {
  Toast.show({
    type: 'success',
    text1: message,
    text2: description,
    position: 'top',
    visibilityTime: 3000,
    autoHide: true,
    topOffset: 60,
  });
};

/**
 * Show error toast notification
 * @param {string} message - Main message to display
 * @param {string} description - Optional description text
 */
export const showError = (message, description = '') => {
  Toast.show({
    type: 'error',
    text1: message,
    text2: description,
    position: 'top',
    visibilityTime: 4000,
    autoHide: true,
    topOffset: 60,
  });
};

/**
 * Show info toast notification
 * @param {string} message - Main message to display
 * @param {string} description - Optional description text
 */
export const showInfo = (message, description = '') => {
  Toast.show({
    type: 'info',
    text1: message,
    text2: description,
    position: 'top',
    visibilityTime: 3000,
    autoHide: true,
    topOffset: 60,
  });
};

/**
 * Show warning toast notification
 * @param {string} message - Main message to display
 * @param {string} description - Optional description text
 */
export const showWarning = (message, description = '') => {
  Toast.show({
    type: 'warning',
    text1: message,
    text2: description || '',
    position: 'top',
    visibilityTime: 3500,
    autoHide: true,
    topOffset: 60,
  });
};

/**
 * Hide currently displayed toast
 */
export const hideToast = () => {
  Toast.hide();
};
