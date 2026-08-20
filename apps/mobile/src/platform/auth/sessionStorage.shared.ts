import type { SessionStorage } from '@debtulator/application/ports/sessionStorage';

export type AuthSessionStorage = SessionStorage;

export function createMemoryAuthSessionStorage(): AuthSessionStorage {
  const values = new Map<string, string>();

  return {
    async getItem(key: string) {
      return values.get(key) ?? null;
    },
    async setItem(key: string, value: string) {
      values.set(key, value);
    },
    async removeItem(key: string) {
      values.delete(key);
    },
  };
}
