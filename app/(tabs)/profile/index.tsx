import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AdminSectionLabel } from '@/components/admin/admin-components';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { supabase } from '@/lib/supabase';
import { useDemoSession } from '@/state/demo-session';
import { colors, radius, spacing } from '@/theme';

function ProfileRow({
  title,
  onPress,
}: {
  title: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 64,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        opacity: pressed ? 0.72 : 1,
      })}
    >
      <ThemedText
        variant="headline"
        style={{ flex: 1 }}
      >
        {title}
      </ThemedText>

      {onPress ? (
        <ThemedText
          variant="title"
          style={{
            color: colors.muted,
            paddingLeft: spacing.sm,
          }}
        >
          ›
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { session, signOut } = useDemoSession();

  const handleSignOut = async () => {
    await supabase.auth.signOut({ scope: 'local' });
    signOut();
    router.replace('/login');
  };

  return (
    <Screen
      contentContainerStyle={{
        paddingBottom: spacing.xxxl,
      }}
    >
      <View
        style={{
          gap: spacing.xs,
          padding: spacing.lg,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
        }}
      >
        <ThemedText variant="title">
          {session?.name ?? 'UNSW Student'}
        </ThemedText>

        <ThemedText
          variant="subhead"
          style={{ color: colors.muted }}
        >
          {session?.email ?? 'student@unsw.edu.au'}
        </ThemedText>
      </View>

      <View
        style={{
          gap: spacing.sm,
          padding: spacing.lg,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.accent,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
        }}
      >
        <ThemedText
          variant="caption"
          style={{
            color: colors.muted,
            fontWeight: '700',
            letterSpacing: 0.8,
          }}
        >
          CREDIT BALANCE
        </ThemedText>

        <ThemedText
          variant="largeTitle"
          style={{
            color: colors.accent,
            fontWeight: '700',
          }}
        >
          {session?.balance.toLocaleString() ?? '0'} cr
        </ThemedText>

        <ThemedText
          variant="caption"
          style={{ color: colors.muted }}
        >
          Available to place predictions
        </ThemedText>
      </View>

      <View style={{ gap: spacing.sm }}>
        <AdminSectionLabel>Account</AdminSectionLabel>

        <View
          style={{
            overflow: 'hidden',
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.lg,
            borderCurve: 'continuous',
          }}
        >
          <ProfileRow
            title="My predictions"
            onPress={() => router.push('/portfolio')}
          />

          <ProfileRow title="Settings" />

          <ProfileRow
            title="Sign out"
            onPress={() => void handleSignOut()}
          />
        </View>
      </View>

      {session?.role === 'ADMIN' ? (
        <View style={{ gap: spacing.sm }}>
          <AdminSectionLabel>Admin</AdminSectionLabel>

          <View
            style={{
              overflow: 'hidden',
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.lg,
              borderCurve: 'continuous',
            }}
          >
            <ProfileRow
              title="Admin tools"
              onPress={() => router.push('/admin')}
            />
          </View>
        </View>
      ) : null}
    </Screen>
  );
}
