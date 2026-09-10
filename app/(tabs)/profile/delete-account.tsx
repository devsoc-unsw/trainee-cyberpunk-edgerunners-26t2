import { useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PasswordField, PrimaryButton } from '@/components/ui/form';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { AppleSignInCancelledError, signInWithApple } from '@/lib/apple-auth';
import { hasPasswordAuth } from '@/lib/auth-providers';
import { deleteAccount } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/state/session';
import { colors, spacing } from '@/theme';

export default function DeleteAccountScreen() {
  const { user, profile, signOut } = useSession();
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const canUsePassword = hasPasswordAuth(user);

  const handleDelete = async () => {
    if (!user) {
      setErrorMessage('Could not confirm who you are. Sign in again and retry.');
      return;
    }

    setIsDeleting(true);

    if (canUsePassword) {
      if (!profile?.email) {
        setIsDeleting(false);
        setIsConfirmVisible(false);
        setErrorMessage('Could not confirm who you are. Sign in again and retry.');
        return;
      }

      // Re-authenticate first, same as changing a password -- otherwise
      // anyone who picks up an unlocked phone with a live session could
      // erase the account outright.
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password,
      });

      if (reauthError) {
        setIsDeleting(false);
        setIsConfirmVisible(false);
        setErrorMessage('Your password is incorrect.');
        return;
      }
    } else {
      // No password to check, so Apple's own sign-in sheet (which itself
      // requires Face ID, Touch ID, or a device passcode) is the
      // equivalent proof-of-presence before a destructive action.
      try {
        const reauthed = await signInWithApple();
        if (!reauthed.user || reauthed.user.id !== user.id) {
          setIsDeleting(false);
          setIsConfirmVisible(false);
          setErrorMessage('That Apple ID does not match this account.');
          return;
        }
      } catch (error) {
        setIsDeleting(false);
        setIsConfirmVisible(false);
        if (!(error instanceof AppleSignInCancelledError)) {
          setErrorMessage(error instanceof Error ? error.message : 'Could not verify your Apple ID.');
        }
        return;
      }
    }

    try {
      await deleteAccount();
    } catch (error) {
      setIsDeleting(false);
      setIsConfirmVisible(false);
      setErrorMessage(error instanceof Error ? error.message : 'Could not delete your account.');
      return;
    }

    await signOut();
    setIsDeleting(false);
    setIsConfirmVisible(false);
    router.replace('/login');
  };

  return (
    <Screen>
      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="title" accessibilityRole="header">
          Delete your account
        </ThemedText>
        <ThemedText variant="subhead">
          This permanently erases your profile, balance, predictions, and history. This cannot be
          undone.
        </ThemedText>
      </View>

      <View style={{ gap: spacing.md }}>
        {canUsePassword ? (
          <PasswordField
            label="Confirm your password"
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            returnKeyType="done"
          />
        ) : (
          <ThemedText variant="subhead">
            This account signs in with Apple, so we&apos;ll ask you to confirm with Apple again
            before deleting it.
          </ThemedText>
        )}

        {errorMessage ? (
          <ThemedText style={{ color: colors.no }} accessibilityLiveRegion="polite">
            {errorMessage}
          </ThemedText>
        ) : null}
      </View>

      <PrimaryButton
        label="Delete my account"
        tone="danger"
        disabled={canUsePassword && !password}
        onPress={() => {
          setErrorMessage(null);
          setIsConfirmVisible(true);
        }}
      />

      <PrimaryButton label="Cancel" tone="quiet" disabled={isDeleting} onPress={() => router.back()} />

      <ConfirmDialog
        visible={isConfirmVisible}
        title="Delete your account?"
        message="Your balance, predictions, and ledger history will be permanently erased. This cannot be undone."
        confirmLabel="Delete forever"
        destructive
        isBusy={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setIsConfirmVisible(false)}
      />
    </Screen>
  );
}
