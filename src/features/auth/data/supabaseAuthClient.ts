import "react-native-url-polyfill/auto";

import {
  createClient,
  processLock,
  type SupabaseClient,
} from "@supabase/supabase-js";

import { authSessionStorage } from "./sessionStorage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

const supabaseClientKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseClientKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseClientKey!, {
      auth: {
        storage: authSessionStorage,

        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,

        lock: processLock,
      },
    })
  : null;
