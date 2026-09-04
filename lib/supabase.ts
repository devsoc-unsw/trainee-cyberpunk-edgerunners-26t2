import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import type { Database } from '@/types';

// A Supabase session (two JWTs plus the user object) can exceed the payload a
// keystore will accept -- Expo warns that some iOS releases reject values over
// roughly 2048 bytes -- so values are split across numbered entries and the key
// itself holds the count. Chunks are written before the count and deleted after
// it, so an interrupted write is read back as "signed out" rather than as a
// truncated token.
const CHUNK_SIZE = 1500;
const CHUNK_COUNT_PREFIX = 'chunks:';

async function deleteChunks(key: string, count: number) {
  await Promise.all(
    Array.from({ length: count }, (_, index) => SecureStore.deleteItemAsync(`${key}.${index}`))
  );
}

/** The chunk count for `key`, or null if it holds a plain pre-chunking value. */
function parseChunkCount(head: string) {
  if (!head.startsWith(CHUNK_COUNT_PREFIX)) {
    return null;
  }
  const count = Number.parseInt(head.slice(CHUNK_COUNT_PREFIX.length), 10);
  return Number.isInteger(count) && count >= 0 ? count : null;
}

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    const head = await SecureStore.getItemAsync(key);
    if (head === null) {
      return null;
    }

    const count = parseChunkCount(head);
    // Written before this adapter chunked. Returning it keeps sessions that
    // predate the change signed in; the next write re-saves it chunked.
    if (count === null) {
      return head;
    }

    const chunks = await Promise.all(
      Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(`${key}.${index}`))
    );

    // A missing chunk means a torn write. Treat it as no session at all.
    return chunks.some((chunk) => chunk === null) ? null : chunks.join('');
  },

  setItem: async (key: string, value: string) => {
    const head = await SecureStore.getItemAsync(key);
    const previousCount = head === null ? null : parseChunkCount(head);

    const chunks: string[] = [];
    for (let index = 0; index < value.length; index += CHUNK_SIZE) {
      chunks.push(value.slice(index, index + CHUNK_SIZE));
    }
    if (chunks.length === 0) {
      chunks.push('');
    }

    await Promise.all(
      chunks.map((chunk, index) => SecureStore.setItemAsync(`${key}.${index}`, chunk))
    );
    await SecureStore.setItemAsync(key, `${CHUNK_COUNT_PREFIX}${chunks.length}`);

    // Only now that the new count is committed can stale trailing chunks go.
    if (previousCount !== null && previousCount > chunks.length) {
      await Promise.all(
        Array.from({ length: previousCount - chunks.length }, (_, offset) =>
          SecureStore.deleteItemAsync(`${key}.${chunks.length + offset}`)
        )
      );
    }
  },

  removeItem: async (key: string) => {
    const head = await SecureStore.getItemAsync(key);
    const count = head === null ? null : parseChunkCount(head);

    await SecureStore.deleteItemAsync(key);
    if (count !== null) {
      await deleteChunks(key, count);
    }
  },
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
    // Web has no SecureStore; leaving it undefined there falls through to
    // localStorage, which is Supabase's own default for browsers. Every native
    // platform gets the keystore -- on Android, `undefined` silently resolved
    // to in-memory storage, so `persistSession` did nothing and each cold start
    // signed the user out.
    storage: Platform.OS === 'web' ? undefined : ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const VIDEO_BUCKET = 'videos';
