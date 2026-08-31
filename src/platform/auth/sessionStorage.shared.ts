export type AuthSessionStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

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
