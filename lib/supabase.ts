import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import type { Database } from '@/types';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

// Read environment variables. Only EXPO_PUBLIC_* vars are inlined into the app
// bundle, so anything the client needs has to carry that prefix.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase public environment variables. Add them to .env before starting Expo.');
}

// Initialise Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'ios' ? ExpoSecureStoreAdapter : undefined,
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
