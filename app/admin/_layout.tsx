import { Stack } from 'expo-router/stack';

export default function AdminLayout() {
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
