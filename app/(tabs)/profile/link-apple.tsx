import { useState } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { View } from 'react-native';

import { PrimaryButton } from '@/components/ui/form';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { AppleSignInCancelledError, linkAppleIdentity } from '@/lib/apple-auth';
import { useSession } from '@/state/session';
import { colors, radius, spacing } from '@/theme';

export default function LinkAppleScreen() {
  const { refreshUser } = useSession();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  const handleLink = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLinking(true);
    try {
      await linkAppleIdentity();
      // The account now has 'apple' in app_metadata.providers server-side.
      // Refreshing here hides the Settings row that led here immediately,
      // rather than waiting on Supabase's own auth-state event to arrive.
      await refreshUser();
      setSuccessMessage('Apple ID linked. You can now sign in with Apple too.');
    } catch (error) {
      if (!(error instanceof AppleSignInCancelledError)) {
        setErrorMessage(error instanceof Error ? error.message : 'Could not link your Apple ID.');
      }
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <Screen>
      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="title" accessibilityRole="header">
          Link Apple ID
        </ThemedText>
        <ThemedText variant="subhead">
          Add Apple as another way to sign in to this account. Your email and password will keep
          working too.
        </ThemedText>
      </View>

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

      {successMessage ? null : (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
          cornerRadius={radius.md}
          style={{ width: '100%', height: 50, opacity: isLinking ? 0.72 : 1 }}
          onPress={handleLink}
        />
      )}

      <PrimaryButton
        label={successMessage ? 'Done' : 'Back to settings'}
        tone="quiet"
        onPress={() => router.back()}
      />
    </Screen>
  );
}
