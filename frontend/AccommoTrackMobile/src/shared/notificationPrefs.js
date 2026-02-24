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

export async function loadPrefsMobile(AsyncStorage) {
  const keys = Object.values(STORAGE_KEYS);
  const res = await AsyncStorage.multiGet(keys);
  const next = { ...DEFAULT_PREFS };
  res.forEach(([k, v]) => {
    if (v !== null) {
      const keyName = Object.keys(STORAGE_KEYS).find((name) => STORAGE_KEYS[name] === k);
      if (keyName) next[keyName] = v === '1' || v === 'true';
    }
  });
  return next;
}

export async function savePrefsMobile(AsyncStorage, prefs) {
  const entries = Object.entries(STORAGE_KEYS);
  await Promise.all(entries.map(([name, storageKey]) => AsyncStorage.setItem(storageKey, prefs[name] ? '1' : '0')));
}

export default {
  STORAGE_KEYS,
  DEFAULT_PREFS,
  loadPrefsMobile,
  savePrefsMobile,
};
