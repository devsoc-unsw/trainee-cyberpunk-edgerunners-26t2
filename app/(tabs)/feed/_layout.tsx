import { Stack } from 'expo-router/stack';

export default function FeedLayout() {
  return (
    <Stack screenOptions={{ headerLargeTitle: true, headerShadowVisible: false }}>
      <Stack.Screen name="index" options={{ title: 'Markets' }} />
    </Stack>
  );
}
