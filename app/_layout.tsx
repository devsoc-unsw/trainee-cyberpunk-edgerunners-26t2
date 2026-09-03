import { DarkTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { SessionProvider } from '@/state/session';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex : 1 }}>
      <SessionProvider>
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
      </SessionProvider>
    </GestureHandlerRootView>
  );
}
