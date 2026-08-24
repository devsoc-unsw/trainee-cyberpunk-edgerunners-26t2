import { Stack } from 'expo-router/stack';

export default function LeaderboardLayout() {
  return (
    <Stack screenOptions={{ headerLargeTitle: true, headerShadowVisible: false }}>
      <Stack.Screen name="index" options={{ title: 'Leaderboard' }} />
    </Stack>
  );
}
