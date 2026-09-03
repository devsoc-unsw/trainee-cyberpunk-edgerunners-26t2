import { useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';

import { FormField, PrimaryButton } from '@/components/ui/form';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { USERNAME_HINT, validateUsername } from '@/lib/username';
import { useSession } from '@/state/session';
import { spacing } from '@/theme';

export default function ChooseUsernameScreen() {
  const { saveUsername } = useSession();
  const [username, setUsername] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContinue = async () => {
    const trimmed = username.trim();

    const validationError = validateUsername(trimmed);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await saveUsername(trimmed);
      router.replace('/feed');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not save your username.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen centered contentContainerStyle={{ paddingVertical: spacing.xxxl }}>
      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="largeTitle" accessibilityRole="header">
          What should we call you?
        </ThemedText>
        <ThemedText variant="subhead">This name will be publicly displayed</ThemedText>
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
        onSubmitEditing={handleContinue}
      />

      <PrimaryButton
        label="Continue"
        busyLabel="Saving…"
        isBusy={isSubmitting}
        onPress={handleContinue}
      />
    </Screen>
  );
}
