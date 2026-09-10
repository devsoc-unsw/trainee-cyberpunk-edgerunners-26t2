import { useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';

import { FormField, PrimaryButton } from '@/components/ui/form';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { deleteAccount } from '@/lib/data';
import { ZID_HINT, normalizeZid, validateZid } from '@/lib/zid';
import { ZidTakenError, useSession } from '@/state/session';
import { spacing } from '@/theme';

export default function LinkZidScreen() {
  const { saveZid, signOut } = useSession();
  const [zid, setZid] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isZidConflict, setIsZidConflict] = useState(false);

  const handleContinue = async () => {
    const normalized = normalizeZid(zid);

    const validationError = validateZid(normalized);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await saveZid(normalized);
      router.replace('/');
    } catch (error) {
      if (error instanceof ZidTakenError) {
        setIsSubmitting(false);
        setIsZidConflict(true);
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : 'Could not save your zID.');
      setIsSubmitting(false);
    }
  };

  const handleUseEmailInstead = async () => {
    setIsSubmitting(true);
    // This Apple sign-in just provisioned a brand-new, empty account -- it
    // has no admin history, so deletion always succeeds. Best-effort: an
    // orphaned zero-balance account left behind here is harmless.
    try {
      await deleteAccount();
    } catch {
      // Ignored -- the redirect below still gets them unstuck.
    }
    await signOut();
    router.replace('/login');
  };

  if (isZidConflict) {
    return (
      <Screen centered contentContainerStyle={{ paddingVertical: spacing.xxxl }}>
        <View style={{ gap: spacing.sm }}>
          <ThemedText variant="largeTitle" accessibilityRole="header">
            That zID is already registered
          </ThemedText>
          <ThemedText variant="subhead">
            You already have an account under that zID. Sign in with your UNSW email and password
            instead -- you can add Apple as a sign-in option from Settings afterwards.
          </ThemedText>
        </View>

        <PrimaryButton
          label="Sign in with email"
          busyLabel="One moment…"
          isBusy={isSubmitting}
          onPress={handleUseEmailInstead}
        />
      </Screen>
    );
  }

  return (
    <Screen centered contentContainerStyle={{ paddingVertical: spacing.xxxl }}>
      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="largeTitle" accessibilityRole="header">
          Confirm your zID
        </ThemedText>
        <ThemedText variant="subhead">
          Apple sign-in doesn&apos;t always share your UNSW email, so we use your zID to make sure
          you only ever have one account.
        </ThemedText>
      </View>

      <FormField
        label="zID"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
        maxLength={8}
        hint={ZID_HINT}
        errorMessage={errorMessage ?? undefined}
        placeholder="z5555555"
        returnKeyType="done"
        value={zid}
        onChangeText={(value) => {
          setZid(value);
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
