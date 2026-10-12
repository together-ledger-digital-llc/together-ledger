import { Storage } from 'expo-sqlite/kv-store';
import { createWaitingStore } from '../journey/waiting-moments';
import { createPhoneStore, LANGUAGE_KEY, type PhoneStorage } from './ledger-store';

/**
 * Where the phone keeps its own ledger and preferences: a key-value store in SQLite, inside the
 * app's sandbox. Unlike AsyncStorage on Android it has no 2 MB limit on reading one value,
 * which matters because the whole ledger is one value. The only file that touches it.
 *
 * Moments held without a connection wait here too, per account, until the service has them
 * (#352, src/journey/waiting-moments.ts).
 *
 * Sign-in tokens never come here; they stay in the keychain (src/auth/token-storage.ts).
 */
const phoneStorage: PhoneStorage = {
  getItem: (key) => Storage.getItemAsync(key),
  setItem: (key, value) => Storage.setItemAsync(key, value),
  removeItem: (key) => Storage.removeItemAsync(key).then(() => undefined),
};

export const phoneStore = createPhoneStore(phoneStorage);

export const waitingStore = createWaitingStore(phoneStorage);

/**
 * The language chosen by hand on this phone, read at once as the app starts (101B), so the first
 * screen and the theme's type (src/theme/fonts.ts) are already in it. Null when nothing is saved
 * or the store can't be read: the phone's own languages decide.
 */
export function savedLanguageNow(): string | null {
  try {
    return Storage.getItemSync(LANGUAGE_KEY) || null;
  } catch {
    return null;
  }
}
