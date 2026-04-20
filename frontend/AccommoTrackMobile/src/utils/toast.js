import Toast from 'react-native-toast-message';

let toastPresenter = null;

export const registerToastPresenter = (presenter) => {
  toastPresenter = presenter;

  return () => {
    if (toastPresenter === presenter) {
      toastPresenter = null;
    }
  };
};

const showToast = (params) => {
  if (toastPresenter && typeof toastPresenter.show === 'function') {
    toastPresenter.show(params);
    return;
  }

  Toast.show(params);
};

const hideCurrentToast = () => {
  if (toastPresenter && typeof toastPresenter.hide === 'function') {
    toastPresenter.hide();
    return;
  }

  Toast.hide();
};

/**
 * Show success toast notification
 * @param {string} message - Main message to display
 * @param {string} description - Optional description text
 */
export const showSuccess = (message, description = '') => {
  showToast({
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
  showToast({
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
  showToast({
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
  showToast({
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
  hideCurrentToast();
};
