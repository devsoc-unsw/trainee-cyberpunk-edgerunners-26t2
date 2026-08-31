import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, TextInput, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { colors, radius, spacing } from '@/theme';
import { supabase } from '@/lib/supabase';

// Regex for UNSW email domain and subdomains like ad and student
const UNSW_EMAIL_REGEX = /^[^\s@]+@(?:[a-z0-9-]+\.)*unsw\.edu\.au$/i;

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const handleCreateAccount = async () => {
    setErrorMessage(null);

    // Validate UNSW domain
    if (!UNSW_EMAIL_REGEX.test(email.trim())) {
      setErrorMessage('Use your UNSW student email');
      return;
    }

    // Call supabase signup
    setIsSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setIsSubmitting(false);

    // Display error
    if (error) {
      setErrorMessage(error.message);
      return;
    }

    // Validate user account does not already exist
    if (data.user && data.user.identities?.length === 0) {
      router.replace('/login');
      return;
    }

    // Update sent state
    setVerificationSent(true);
  };

  if (verificationSent) {
    return (
      <Screen centered contentContainerStyle={{ paddingVertical: spacing.xxxl }}>
        <ThemedText variant="largeTitle">Check your email</ThemedText>
        <ThemedText variant="subhead">
          We sent a verification link to {email.trim()}. Verify your address before signing in.
        </ThemedText>
      </Screen>
    );
  }

  return (
    <Screen centered contentContainerStyle={{ paddingVertical: spacing.xxxl }}>
      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="largeTitle">Create account</ThemedText>
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
            autoComplete="password-new"
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
        onPress={handleCreateAccount}
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
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </ThemedText>
      </Pressable>
    </Screen>
  );
}