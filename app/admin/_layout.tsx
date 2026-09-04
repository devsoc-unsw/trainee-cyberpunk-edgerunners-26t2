import { router, type NativeStackHeaderBackProps } from 'expo-router';
import { useEffect } from 'react';
import { Stack } from 'expo-router/stack';
import { Pressable } from 'react-native';

import { ChevronLeftIcon } from '@/components/ui/icons';
import { useSession } from '@/state/session';
import { colors, spacing } from '@/theme';

/**
 * Admin is the root of its own stack, so there is no native back button to
 * return to the profile tab that pushed it -- every screen deeper in the stack
 * gets one for free. Falls back to the profile tab rather than router.back()
 * when there is no history, which is how a deep link into /admin arrives.
 */
function AdminBackButton({ tintColor }: NativeStackHeaderBackProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={spacing.md}
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <ChevronLeftIcon color={typeof tintColor === 'string' ? tintColor : colors.text} />
    </Pressable>
  );
}

export default function AdminLayout() {
  const { profile, isLoading } = useSession();
  // The role comes from the profiles table, so this reflects what the database
  // will actually let the user do rather than a client-side claim.
  const isAdmin = profile?.role === 'ADMIN';

  useEffect(() => {
    // Wait for the profile to arrive; redirecting mid-load would bounce an
    // admin out of their own tools on a cold start.
    if (!isLoading && !isAdmin) {
      router.replace('/feed');
    }
  }, [isAdmin, isLoading]);

  if (!isAdmin) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: 'Admin', headerLeft: (props) => <AdminBackButton {...props} /> }}
      />
      <Stack.Screen name="markets/index" options={{ title: 'Markets' }} />
      <Stack.Screen name="markets/[id]" options={{ title: 'Market' }} />
      <Stack.Screen name="markets/create" options={{ title: 'Create market' }} />
      <Stack.Screen name="markets/[id]/edit" options={{ title: 'Edit market' }} />
      <Stack.Screen name="markets/[id]/odds" options={{ title: 'Override odds' }} />
      <Stack.Screen name="bets/index" options={{ title: 'Bets' }} />
      <Stack.Screen name="bets/[id]" options={{ title: 'Bet details' }} />
      <Stack.Screen name="users/index" options={{ title: 'Users' }} />
      <Stack.Screen name="users/[id]" options={{ title: 'User details' }} />
      <Stack.Screen name="history/index" options={{ title: 'History' }} />
    </Stack>
  );
}
