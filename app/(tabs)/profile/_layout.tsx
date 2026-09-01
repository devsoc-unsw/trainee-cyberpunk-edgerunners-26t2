import { Stack } from 'expo-router/stack';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerLargeTitle: true, headerShadowVisible: false }}>
      <Stack.Screen name="index" options={{ title: 'Profile' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings', headerLargeTitle: false }} />
      <Stack.Screen name="username" options={{ title: 'Username', headerLargeTitle: false }} />
      <Stack.Screen name="password" options={{ title: 'Password', headerLargeTitle: false }} />
    </Stack>
  );
}
