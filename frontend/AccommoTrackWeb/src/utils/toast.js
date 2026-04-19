import toast from 'react-hot-toast';

/**
 * AccommoTrack Premium Toast Utility
 * Centralized notification system for the Web platform.
 */

const toastConfig = {
  duration: 4000,
  position: 'top-right',
};

export const showSuccess = (message) => {
  return toast.success(message, {
    ...toastConfig,
    id: message, // Prevent duplicates
  });
};

export const showError = (message) => {
  return toast.error(message, {
    ...toastConfig,
    duration: 6000,
    id: message,
  });
};

export const showWarning = (message) => {
  return toast(message, {
    ...toastConfig,
    icon: '⚠️',
    style: {
      ...toastConfig.style,
      border: '1px solid #F59E0B',
    },
    id: message,
  });
};

export const showInfo = (message) => {
  return toast(message, {
    ...toastConfig,
    icon: 'ℹ️',
    id: message,
  });
};

export const showLoading = (message) => {
  return toast.loading(message, {
    id: 'global-loading',
  });
};

export const dismissToast = (id) => {
  toast.dismiss(id);
};

export default {
  success: showSuccess,
  error: showError,
  warning: showWarning,
  info: showInfo,
  loading: showLoading,
  dismiss: dismissToast,
};
