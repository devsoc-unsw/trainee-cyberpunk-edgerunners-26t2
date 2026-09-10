import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

export class AppleSignInCancelledError extends Error {
  constructor() {
    super('Sign in with Apple was cancelled.');
    this.name = 'AppleSignInCancelledError';
  }
}

/** Apple sign-in only exists on iOS/tvOS -- gate the button on this before rendering it. */
export async function isAppleSignInAvailable() {
  if (Platform.OS !== 'ios') {
    return false;
  }
  return AppleAuthentication.isAvailableAsync();
}

function isCancelledError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ERR_REQUEST_CANCELED'
  );
}

/**
 * Runs the native Apple sign-in sheet and returns the resulting identity
 * token plus the raw nonce that produced it. The raw nonce is sent to
 * Supabase and the SHA-256 of it to Apple, per Apple's replay-protection
 * requirement -- Apple never sees the value Supabase verifies against, and
 * vice versa.
 */
async function getAppleIdentityToken() {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (error) {
    if (isCancelledError(error)) {
      throw new AppleSignInCancelledError();
    }
    throw error;
  }

  if (!credential.identityToken) {
    throw new Error('Apple did not return an identity token. Try again.');
  }

  return { identityToken: credential.identityToken, rawNonce };
}

/**
 * Runs the native Apple sign-in sheet and exchanges the resulting identity
 * token for a Supabase session -- signs in as whichever account that Apple
 * identity resolves to (creating one if it's never been seen before).
 */
export async function signInWithApple() {
  const { identityToken, rawNonce } = await getAppleIdentityToken();

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: identityToken,
    nonce: rawNonce,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Runs the native Apple sign-in sheet and attaches the resulting identity to
 * the *currently signed-in* user, rather than signing in as whatever account
 * that identity would otherwise resolve to. This is how an email/password
 * account picks up Apple as an additional way to sign in -- calling
 * `signInWithApple` instead here would silently switch the session to a
 * different (likely brand-new) account instead of linking to this one.
 */
export async function linkAppleIdentity() {
  const { identityToken, rawNonce } = await getAppleIdentityToken();

  const { data, error } = await supabase.auth.linkIdentity({
    provider: 'apple',
    token: identityToken,
    nonce: rawNonce,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
