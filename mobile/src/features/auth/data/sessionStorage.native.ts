import * as SecureStore from "expo-secure-store";

const secureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export const authSessionStorage = {
  getItem(key: string) {
    return SecureStore.getItemAsync(key);
  },

  setItem(key: string, value: string) {
    return SecureStore.setItemAsync(key, value, secureStoreOptions);
  },

  removeItem(key: string) {
    return SecureStore.deleteItemAsync(key);
  },
};
