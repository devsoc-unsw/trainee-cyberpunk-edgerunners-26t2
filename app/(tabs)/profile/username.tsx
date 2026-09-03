import { useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';

import { FormField, PrimaryButton } from '@/components/ui/form';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { USERNAME_HINT, validateUsername } from '@/lib/username';
import { useSession } from '@/state/session';
import { spacing } from '@/theme';

export default function ChangeUsernameScreen() {
  const { profile, saveUsername } = useSession();
  const [username, setUsername] = useState(profile?.username ?? '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmed = username.trim();
  const isUnchanged = trimmed === (profile?.username ?? '');

  const handleSave = async () => {
    const validationError = validateUsername(trimmed);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await saveUsername(trimmed);
      router.back();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not save your username.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="title" accessibilityRole="header">
          Change your username
        </ThemedText>
        <ThemedText variant="subhead">Your username is publicly displayed.</ThemedText>
      </View>

      <FormField
        label="Username"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
        maxLength={20}
        hint={USERNAME_HINT}
        errorMessage={errorMessage ?? undefined}
        placeholder="unsw_student"
        returnKeyType="done"
        value={username}
        onChangeText={(value) => {
          setUsername(value);
          setErrorMessage(null);
        }}
        onSubmitEditing={handleSave}
      />

      <PrimaryButton
        label="Save username"
        busyLabel="Saving…"
        disabled={isUnchanged}
        isBusy={isSubmitting}
        onPress={handleSave}
      />
    </Screen>
  );
}
