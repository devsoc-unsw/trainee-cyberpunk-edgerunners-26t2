import { DarkTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ActivityIndicator, View } from 'react-native';

import { AccessibilityProvider } from '@/state/accessibility';
import { SessionProvider, useSession } from '@/state/session';
import { colors } from '@/theme';

export default function RootLayout() {
  // Outermost, and outside SessionProvider: these preferences belong to the
  // device rather than the account, so they apply on the login screen too and
  // survive signing out.
  return (
    <GestureHandlerRootView style={{ flex : 1 }}>
      <AccessibilityProvider>
        <SessionProvider>
          <ThemeProvider value={DarkTheme}>
            <StatusBar style="light" />
            <RootStack />
          </ThemeProvider>
        </SessionProvider>
      </AccessibilityProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Split out so it can read the session: the guards below have to sit inside
 * SessionProvider.
 */
function RootStack() {
  const { user, isLoading } = useSession();

  // Deciding before the stored session has been read would show the login
  // screen to someone who is already signed in.
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.accent} accessibilityLabel="Loading UNSWager" />
      </View>
    );
  }

  const isSignedIn = user !== null;

  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false,
      }}
    >
      {/* Unguarded, and so the anchor every failed guard falls back to. It
          reads the session and forwards to the right destination. */}
      <Stack.Screen name="index" options={{ headerShown: false }} />

      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>

      {/* Without these guards the only auth check in the app was on "/", so
          opening any other route directly -- a reload, a restored URL, a deep
          link -- rendered the signed-in app to a signed-out user. */}
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="markets/[id]" options={{ title: 'Market' }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
