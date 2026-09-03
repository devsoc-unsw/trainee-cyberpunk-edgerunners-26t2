import { Stack } from 'expo-router/stack';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      {/* No header title: the screen already says "Create account" in its own
          large title. headerBackTitle is set explicitly because the login route
          has no title to derive a capitalised label from. */}
      <Stack.Screen name="signup" options={{ headerTitle: '', headerBackTitle: 'Login' }} />
    </Stack>
  );
}
