import { Redirect } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { useSession } from '@/state/session';
import { colors } from '@/theme';

export default function Index() {
  const { user, isLoading, needsUsername } = useSession();

  // Deciding before the stored session has been read would bounce returning
  // users through the login screen on every cold start.
  if (isLoading) {
    return (
      <Screen centered>
        <ActivityIndicator color={colors.accent} accessibilityLabel="Loading UNSWager" />
      </Screen>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (needsUsername) {
    return <Redirect href="/onboarding/username" />;
  }

  return <Redirect href="/feed" />;
}
