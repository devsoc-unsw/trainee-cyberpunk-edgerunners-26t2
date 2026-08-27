import { useState } from 'react';
import { Link, router } from 'expo-router';
import { Pressable, TextInput, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { colors, radius, spacing } from '@/theme';
import { supabase } from '@/lib/supabase';
import { useDemoSession } from '@/state/demo-session';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn: signInDemoSession } = useDemoSession();

  const handleSignIn = async () => {
    setErrorMessage(null);
    
    // Call supabase login
    setIsSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setIsSubmitting(false);
 
    // Display error
    if (error) {
      setErrorMessage(error.message);
      return;
    }

    // Update demo session
    signInDemoSession(email.trim(), password);
    
    // Continue to feed page
    router.replace('/feed');
  };

  return (
    <Screen centered contentContainerStyle={{ paddingVertical: spacing.xxxl }}>
      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="largeTitle">UNSWager</ThemedText>
      </View>

      <View style={{ gap: spacing.md }}>
        <View style={{ gap: spacing.sm }}>
          <ThemedText variant="subhead">Email</ThemedText>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="name@unsw.edu.au"
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
            onChangeText={setEmail}
          />
        </View>

        <View style={{ gap: spacing.sm }}>
          <ThemedText variant="subhead">Password</ThemedText>
          <TextInput
            autoComplete="password"
            placeholder="Password"
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
            onChangeText={setPassword}
          />
        </View>

        {errorMessage ? (
          <ThemedText style={{ color: colors.accent }}>{errorMessage}</ThemedText>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={isSubmitting}
        onPress={handleSignIn}
        style={({ pressed }) => ({
          width: '100%',
          height: 50,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.md,
          backgroundColor: colors.accent,
          opacity: pressed || isSubmitting ? 0.72 : 1,
        })}
      >
        <ThemedText style={{ color: colors.accentText, fontWeight: '700' }}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </ThemedText>
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