import { Stack } from 'expo-router/stack';

export default function FeedLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: 'Home' }} />
    </Stack>
  );
}
