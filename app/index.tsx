import { Redirect } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { useSession } from '@/state/session';
import { colors } from '@/theme';

export default function Index() {
  const { user, profile, isLoading, needsUsername, needsZid } = useSession();

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

  if (profile?.status === 'SUSPENDED') {
    return <Redirect href="/suspended" />;
  }

  // Checked before username: an unlinked Apple sign-in might belong to
  // someone who already has an account, and resolving that comes first.
  if (needsZid) {
    return <Redirect href="/onboarding/zid" />;
  }

  if (needsUsername) {
    return <Redirect href="/onboarding/username" />;
  }

  return <Redirect href="/feed" />;
}
