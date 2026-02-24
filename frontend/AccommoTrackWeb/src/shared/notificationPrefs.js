export const STORAGE_KEYS = {
  email_booking: 'notif_email_booking',
  email_payment: 'notif_email_payment',
  email_maintenance: 'notif_email_maintenance',
  email_marketing: 'notif_email_marketing',
  push_messages: 'notif_push_messages',
  push_booking_updates: 'notif_push_booking_updates',
};

export const DEFAULT_PREFS = {
  email_booking: true,
  email_payment: true,
  email_maintenance: false,
  email_marketing: false,
  push_messages: true,
  push_booking_updates: true,
};

export function loadPrefsWeb() {
  const next = { ...DEFAULT_PREFS };
  try {
    Object.keys(STORAGE_KEYS).forEach((name) => {
      const v = localStorage.getItem(STORAGE_KEYS[name]);
      if (v !== null) next[name] = v === '1' || v === 'true';
    });
  } catch (e) {
    console.warn('loadPrefsWeb error', e);
  }
  return next;
}

export function savePrefsWeb(prefs) {
  try {
    Object.keys(STORAGE_KEYS).forEach((name) => {
      localStorage.setItem(STORAGE_KEYS[name], prefs[name] ? '1' : '0');
    });
  } catch (e) {
    console.warn('savePrefsWeb error', e);
  }
}

export default {
  STORAGE_KEYS,
  DEFAULT_PREFS,
  loadPrefsWeb,
  savePrefsWeb,
};
