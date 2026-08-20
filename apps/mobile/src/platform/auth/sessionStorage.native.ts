import * as SecureStore from 'expo-secure-store';

import {
  createMemoryAuthSessionStorage,
  type AuthSessionStorage,
} from './sessionStorage.shared';

const memoryFallback = createMemoryAuthSessionStorage();

async function isSecureStoreAvailable() {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

/** Native session persistence backed by the OS-protected credential store. */
export const authSessionStorage: AuthSessionStorage = {
  async getItem(key: string) {
    if (!(await isSecureStoreAvailable())) {
      return memoryFallback.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string) {
    if (!(await isSecureStoreAvailable())) {
      await memoryFallback.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string) {
    if (!(await isSecureStoreAvailable())) {
      await memoryFallback.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
