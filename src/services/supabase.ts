import 'react-native-url-polyfill/auto';

import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const memoryStore = new Map<string, string>();

const secureStorage = {
  async getItem(key: string) {
    if (Platform.OS === 'web' || !(await SecureStore.isAvailableAsync())) {
      return memoryStore.get(key) ?? null;
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web' || !(await SecureStore.isAvailableAsync())) {
      memoryStore.set(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string) {
    if (Platform.OS === 'web' || !(await SecureStore.isAvailableAsync())) {
      memoryStore.delete(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storage: secureStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
