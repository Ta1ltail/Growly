// Mobile Supabase client — uses @supabase/supabase-js directly (not @supabase/ssr).
// On native, session tokens are persisted via expo-secure-store.
// Environment variables are injected at build time via Expo's process.env or app.config.ts.

import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://kuhsnuhpjejkvolswsdw.supabase.co";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.warn("[supabase] EXPO_PUBLIC_SUPABASE_ANON_KEY is not set — auth will fail.");
}

// Expo SecureStore adapter for auth session persistence
export const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch {
      // SecureStore can fail on simulators without a passcode
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Safe to ignore
    }
  },
};

export function createMobileClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  });
}
