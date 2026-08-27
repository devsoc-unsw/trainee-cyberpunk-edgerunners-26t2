import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { colors, radius, spacing } from '@/theme';
import { useDemoSession } from '@/state/demo-session';

export default function LoginScreen() {
  const { signIn } = useDemoSession();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  return (
    <Screen centered contentContainerStyle={{ paddingVertical: spacing.xxxl }}>
      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="largeTitle">UNSWager</ThemedText>
      </View>

      <View style={{ gap: spacing.md }}>
        <View style={{ gap: spacing.sm }}>
          <ThemedText variant="subhead">Username</ThemedText>
          <TextInput
            autoCapitalize="none"
            autoComplete="username"
            onChangeText={setIdentifier}
            placeholder="test"
            placeholderTextColor={colors.inputPlaceholder}
            style={{
              width: '100%',
              height: 52,
              paddingHorizontal: spacing.lg,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: radius.md,
              color: colors.inputText,
              fontSize: 16,
            }}
          />
        </View>

        <View style={{ gap: spacing.sm }}>
          <ThemedText variant="subhead">Password</ThemedText>
          <TextInput
            autoCapitalize="none"
            autoComplete="password"
            onChangeText={setPassword}
            placeholder="test"
            placeholderTextColor={colors.inputPlaceholder}
            secureTextEntry
            style={{
              width: '100%',
              height: 52,
              paddingHorizontal: spacing.lg,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: radius.md,
              color: colors.inputText,
              fontSize: 16,
            }}
          />
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          signIn(identifier, password);
          router.replace('/feed');
        }}
        style={({ pressed }) => ({
          width: '100%',
          height: 50,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.md,
          backgroundColor: colors.accent,
          opacity: pressed ? 0.72 : 1,
        })}
      >
        <ThemedText style={{ color: colors.accentText, fontWeight: '700' }}>Sign in</ThemedText>
      </Pressable>

      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <Link href="/signup" style={{ color: colors.accent, fontSize: 15, fontWeight: '600' }}>
          Create an account
        </Link>
        <ThemedText variant="caption">Demo login</ThemedText>
      </View>
    </Screen>
  );
}
