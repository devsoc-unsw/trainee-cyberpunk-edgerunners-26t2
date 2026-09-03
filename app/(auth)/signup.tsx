import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { FormField, PasswordField } from '@/components/ui/form';
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

    // When email confirmations are switched off, sign-up returns a live
    // session and there is nothing to verify -- go straight to naming
    // yourself instead of waiting for an email that will never arrive.
    if (data.session) {
      router.replace('/onboarding/username');
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
        <FormField
          label="Email"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="name@unsw.edu.au"
          value={email}
          onChangeText={setEmail}
        />

        <PasswordField
          label="Password"
          autoComplete="password-new"
          textContentType="newPassword"
          placeholder="Password"
          returnKeyType="done"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleCreateAccount}
        />

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