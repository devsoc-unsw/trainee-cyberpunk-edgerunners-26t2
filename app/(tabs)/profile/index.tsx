import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AdminSectionLabel } from '@/components/admin/admin-components';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { colors, radius, spacing } from '@/theme';
import { useDemoSession } from '@/state/demo-session';
import { supabase } from '@/lib/supabase';

function ProfileRow({ title, onPress }: { title: string; onPress?: () => void }) {
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
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        opacity: pressed ? 0.72 : 1,
      })}
    >
      <ThemedText variant="headline">{title}</ThemedText>
      {onPress ? <ThemedText variant="title" style={{ color: colors.muted }}>›</ThemedText> : null}
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
    <Screen>
      <View style={{ gap: spacing.xs }}>
        <ThemedText variant="title">{session?.name ?? 'UNSW Student'}</ThemedText>
        <ThemedText variant="subhead">{session?.email ?? 'student@unsw.edu.au'}</ThemedText>
      </View>

      <View style={{ gap: spacing.xs, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, borderCurve: 'continuous' }}>
        <ThemedText variant="caption">FAKE-CREDIT BALANCE</ThemedText>
        <ThemedText variant="largeTitle" style={{ color: colors.accent }}>{session?.balance.toLocaleString() ?? '1,000'} cr</ThemedText>
      </View>

      <View style={{ gap: spacing.sm }}>
        <AdminSectionLabel>Account</AdminSectionLabel>
        <View style={{ overflow: 'hidden', backgroundColor: colors.surface, borderRadius: radius.lg, borderCurve: 'continuous' }}>
          <ProfileRow title="My predictions" />
          <ProfileRow title="Settings" />
          <ProfileRow title="Sign out" onPress={handleSignOut} />
        </View>
      </View>

      {session?.role === 'ADMIN' ? (
        <View style={{ gap: spacing.sm }}>
          <AdminSectionLabel>Admin</AdminSectionLabel>
          <View style={{ overflow: 'hidden', backgroundColor: colors.surface, borderRadius: radius.lg, borderCurve: 'continuous' }}>
            <ProfileRow title="Admin tools" onPress={() => router.push('/admin')} />
          </View>
        </View>
      ) : null}
    </Screen>
  );
}
