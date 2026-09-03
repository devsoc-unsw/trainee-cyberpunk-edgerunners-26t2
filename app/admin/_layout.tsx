import { router } from 'expo-router';
import { useEffect } from 'react';
import { Stack } from 'expo-router/stack';

import { useSession } from '@/state/session';

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
      <Stack.Screen name="index" options={{ title: 'Admin' }} />
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
