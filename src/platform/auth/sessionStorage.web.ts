import {
  createMemoryAuthSessionStorage,
  type AuthSessionStorage,
} from './sessionStorage.shared';

const memoryFallback = createMemoryAuthSessionStorage();

function getBrowserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    // Browsers can deny storage access because of privacy or sandbox policy.
    return null;
  }
}

/** Browser-persistent auth storage with a safe fallback for restricted contexts. */
export const authSessionStorage: AuthSessionStorage = {
  async getItem(key: string) {
    const browserStorage = getBrowserStorage();
    if (browserStorage) {
      try {
        const value = browserStorage.getItem(key);
        if (value !== null) {
          return value;
        }
      } catch {
        // Fall through to memory when storage becomes unavailable at runtime.
      }
    }
    return memoryFallback.getItem(key);
  },
  async setItem(key: string, value: string) {
    const browserStorage = getBrowserStorage();
    if (browserStorage) {
      try {
        browserStorage.setItem(key, value);
        await memoryFallback.removeItem(key);
        return;
      } catch {
        // Quota and security errors should not prevent the current session.
      }
    }
    await memoryFallback.setItem(key, value);
  },
  async removeItem(key: string) {
    await memoryFallback.removeItem(key);
    const browserStorage = getBrowserStorage();
    if (!browserStorage) {
      return;
    }
    try {
      browserStorage.removeItem(key);
    } catch {
      // Nothing else can be cleared in a restricted browser context.
    }
  },
};
