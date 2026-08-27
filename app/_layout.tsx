import { DarkTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';

import { DemoSessionProvider } from '@/state/demo-session';

export default function RootLayout() {
  return (
    <DemoSessionProvider>
      <ThemeProvider value={DarkTheme}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerBackButtonDisplayMode: 'minimal',
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="markets/[id]" options={{ title: 'Market' }} />
          <Stack.Screen name="admin" options={{ headerShown: false }} />
        </Stack>
      </ThemeProvider>
    </DemoSessionProvider>
  );
}
