import { Stack } from 'expo-router/stack';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerLargeTitle: true, headerShadowVisible: false }}>
      <Stack.Screen name="index" options={{ title: 'Profile' }} />
    </Stack>
  );
}
