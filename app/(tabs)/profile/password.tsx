import { useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';

import { FormField, PrimaryButton } from '@/components/ui/form';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/state/session';
import { colors, spacing } from '@/theme';

// Matches `minimum_password_length` in supabase/config.toml, so the client
// never rejects a password the server would have accepted.
const MIN_PASSWORD_LENGTH = 6;

export default function ChangePasswordScreen() {
  const { profile } = useSession();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (newPassword === currentPassword) {
      setErrorMessage('Your new password must be different from the current one.');
      return;
    }
    if (!profile?.email) {
      setErrorMessage('Could not confirm who you are. Sign in again and retry.');
      return;
    }

    setIsSubmitting(true);

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

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSuccessMessage('Password updated.');
  };

  return (
    <Screen>
      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="title" accessibilityRole="header">
          Change your password
        </ThemedText>
        <ThemedText variant="subhead">
          Confirm your current password, then choose a new one.
        </ThemedText>
      </View>

      <View style={{ gap: spacing.md }}>
        <FormField
          label="Current password"
          autoCapitalize="none"
          autoComplete="current-password"
          secureTextEntry
          textContentType="password"
          placeholder="Current password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />
        <FormField
          label="New password"
          autoCapitalize="none"
          autoComplete="new-password"
          secureTextEntry
          textContentType="newPassword"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
          placeholder="New password"
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <FormField
          label="Confirm new password"
          autoCapitalize="none"
          autoComplete="new-password"
          secureTextEntry
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
        label="Update password"
        busyLabel="Updating…"
        isBusy={isSubmitting}
        disabled={!currentPassword || !newPassword || !confirmPassword}
        onPress={handleSave}
      />

      <PrimaryButton label="Back to settings" tone="quiet" onPress={() => router.back()} />
    </Screen>
  );
}
