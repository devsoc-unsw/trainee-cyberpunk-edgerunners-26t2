import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types';

// Translate between SecureStore ops and Supabase client data
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    return SecureStore.deleteItemAsync(key);
  },
};

const WebStorageAdapter = {
  getItem: async (key: string) => {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  },
};

// Read environment variables. Only EXPO_PUBLIC_* vars are inlined into the app
// bundle, so anything the client needs has to carry that prefix.
function requiredEnv(name: 'EXPO_PUBLIC_SUPABASE_URL' | 'EXPO_PUBLIC_SUPABASE_ANON_KEY') {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.example to .env and provide your Supabase credentials.`);
  }

  return value;
}

const supabaseUrl = requiredEnv('EXPO_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = requiredEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');

// Initialise Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? WebStorageAdapter : ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const VIDEO_BUCKET = 'videos';

export async function uploadVideo(
  localUri: string,
  { contentType = 'video/mp4' }: { contentType?: string } = {}
) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error('Must be signed in to upload a video');

  const body = await fetch(localUri).then((res) => res.arrayBuffer());

  const extension = localUri.split('.').pop() ?? 'mp4';
  const key = `${user.id}/${Date.now()}.${extension}`;

  const { data, error } = await supabase.storage
    .from(VIDEO_BUCKET)
    .upload(key, body, { contentType, upsert: false });
  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(VIDEO_BUCKET).getPublicUrl(data.path);

  return { path: data.path, publicUrl };
}
