import { useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';

import { PasswordField, PrimaryButton } from '@/components/ui/form';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { hasPasswordAuth } from '@/lib/auth-providers';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/state/session';
import { colors, spacing } from '@/theme';

// Matches `minimum_password_length` in supabase/config.toml, so the client
// never rejects a password the server would have accepted.
const MIN_PASSWORD_LENGTH = 6;

export default function ChangePasswordScreen() {
  const { user, profile, refreshUser } = useSession();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Apple-only accounts have no existing password to confirm -- this is the
  // first one they're setting, not a change, so there is nothing to
  // re-authenticate against.
  const isSettingFirstPassword = !hasPasswordAuth(user);

  const handleSave = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('The two new passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    if (!isSettingFirstPassword) {
      if (newPassword === currentPassword) {
        setIsSubmitting(false);
        setErrorMessage('Your new password must be different from the current one.');
        return;
      }
      if (!profile?.email) {
        setIsSubmitting(false);
        setErrorMessage('Could not confirm who you are. Sign in again and retry.');
        return;
      }

      // Re-authenticate first. Without this, anyone who picks up an unlocked
      // phone with a live session could change the password and take the
      // account. A failed attempt leaves the existing session untouched.
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: currentPassword,
      });

      if (reauthError) {
        setIsSubmitting(false);
        setErrorMessage('Your current password is incorrect.');
        return;
      }
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setIsSubmitting(false);
      setErrorMessage(error.message);
      return;
    }

    if (isSettingFirstPassword) {
      // The account now has 'email' in app_metadata.providers server-side.
      // Refreshing here switches this screen (and the Settings row) to the
      // normal has-a-password state immediately, rather than waiting on
      // Supabase's own auth-state event to happen to arrive.
      await refreshUser();
    }

    setIsSubmitting(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSuccessMessage(isSettingFirstPassword ? 'Password set.' : 'Password updated.');
  };

  return (
    <Screen>
      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="title" accessibilityRole="header">
          {isSettingFirstPassword ? 'Set a password' : 'Change your password'}
        </ThemedText>
        <ThemedText variant="subhead">
          {isSettingFirstPassword
            ? 'This account signs in with Apple. Set a password to also sign in with your email.'
            : 'Confirm your current password, then choose a new one.'}
        </ThemedText>
      </View>

      <View style={{ gap: spacing.md }}>
        {isSettingFirstPassword ? null : (
          <PasswordField
            label="Current password"
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            placeholder="Current password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />
        )}
        <PasswordField
          label="New password"
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
          placeholder="New password"
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <PasswordField
          label="Confirm new password"
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          placeholder="New password again"
          returnKeyType="done"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          onSubmitEditing={handleSave}
        />

        {errorMessage ? (
          <ThemedText style={{ color: colors.no }} accessibilityLiveRegion="polite">
            {errorMessage}
          </ThemedText>
        ) : null}
        {successMessage ? (
          <ThemedText style={{ color: colors.yes }} accessibilityLiveRegion="polite">
            {successMessage}
          </ThemedText>
        ) : null}
      </View>

      <PrimaryButton
        label={isSettingFirstPassword ? 'Set password' : 'Update password'}
        busyLabel={isSettingFirstPassword ? 'Saving…' : 'Updating…'}
        isBusy={isSubmitting}
        disabled={(!isSettingFirstPassword && !currentPassword) || !newPassword || !confirmPassword}
        onPress={handleSave}
      />

      <PrimaryButton label="Back to settings" tone="quiet" onPress={() => router.back()} />
    </Screen>
  );
}
