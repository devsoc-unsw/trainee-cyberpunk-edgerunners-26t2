import { useState } from 'react';
import { Link, router } from 'expo-router';
import { KeyboardAvoidingView, Pressable, View } from 'react-native';

import { FormField, PasswordField } from '@/components/ui/form';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { colors, radius, spacing } from '@/theme';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignIn = async () => {
    setErrorMessage(null);
    
    // Call supabase login
    setIsSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    // Display error
    if (error) {
      setIsSubmitting(false);
      setErrorMessage(error.message);
      return;
    }

    // Anyone who has not been through the "What should we call you?" screen
    // yet goes there first. Read it here rather than waiting on the session
    // context so the destination is settled before we navigate.
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', data.user.id)
      .maybeSingle();
    setIsSubmitting(false);

    router.replace(profile?.username ? '/feed' : '/onboarding/username');
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <Screen centered contentContainerStyle={{ paddingVertical: spacing.xxxl }}>
        <View style={{ gap: spacing.sm }}>
          <ThemedText variant="largeTitle">UNSWager</ThemedText>
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
            autoComplete="password"
            textContentType="password"
            placeholder="Password"
            returnKeyType="done"
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={handleSignIn}
          />

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
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}