import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, RefreshControl, View } from 'react-native';

import { AdminSectionLabel, AdminStatus } from '@/components/admin/admin-components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PrimaryButton } from '@/components/ui/form';
import { ListCard, ListRow } from '@/components/ui/list';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/state/session';
import { colors, radius, spacing } from '@/theme';

type PredictionStats = {
  count: number;
  staked: number;
};

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        gap: spacing.xs,
        padding: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderCurve: 'continuous',
      }}
    >
      <ThemedText variant="caption">{label.toUpperCase()}</ThemedText>
      <ThemedText variant="title">{value}</ThemedText>
    </View>
  );
}

function formatMemberSince(isoDate: string) {
  return new Date(isoDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export default function ProfileScreen() {
  const { user, profile, isLoading, refresh, signOut } = useSession();
  const [stats, setStats] = useState<PredictionStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSignOutVisible, setIsSignOutVisible] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const profileId = profile?.id;

  // Written as a promise chain rather than async/await so the state update
  // lives in a callback, which is what makes it safe to call from an effect.
  const loadStats = useCallback(
    () =>
      // RLS already limits this to the signed-in user's own positions.
      supabase
        .from('positions')
        .select('stake')
        .then(({ data, error }) => {
          if (error) {
            return;
          }
          setStats({
            count: data.length,
            staked: data.reduce((total, position) => total + position.stake, 0),
          });
        }),
    []
  );

  // On focus, not on mount: the tab stays mounted and profileId never changes,
  // so a prediction placed elsewhere left this count showing the old total.
  useFocusEffect(
    useCallback(() => {
      if (!profileId) {
        return;
      }
      void loadStats();
    }, [profileId, loadStats])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refresh(), loadStats()]);
    setIsRefreshing(false);
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
    setIsSignOutVisible(false);
    router.replace('/login');
  };

  if (isLoading) {
    return (
      <Screen centered>
        <ActivityIndicator color={colors.accent} accessibilityLabel="Loading your profile" />
      </Screen>
    );
  }

  if (!profile) {
    // A signed-in user with no profile means the fetch failed, which is worth
    // a retry rather than the sign-in prompt.
    return (
      <Screen centered>
        <View style={{ gap: spacing.md }}>
          <ThemedText variant="subhead">
            {user ? 'We could not load your profile.' : 'Sign in to see your profile.'}
          </ThemedText>
          {user ? <PrimaryButton label="Try again" tone="quiet" onPress={refresh} /> : null}
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.muted}
        />
      }
    >
      <View style={{ gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' }}>
          <ThemedText variant="title" accessibilityRole="header">
            {profile.username ?? 'UNSW Student'}
          </ThemedText>
          {profile.role === 'ADMIN' ? <AdminStatus label="ADMIN" tone="warning" /> : null}
        </View>
        <ThemedText variant="subhead">{profile.email}</ThemedText>
        <ThemedText variant="caption">Member since {formatMemberSince(profile.createdAt)}</ThemedText>
      </View>

      {profile.username ? null : (
        <ListCard>
          <ListRow
            title="Choose a username"
            subtitle="Other students see this on the leaderboard."
            accessibilityHint="Opens the username screen"
            onPress={() => router.push('/profile/username')}
          />
        </ListCard>
      )}

      <View
        style={{
          gap: spacing.xs,
          padding: spacing.lg,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
        }}
      >
        <ThemedText variant="caption">FAKE-CREDIT BALANCE</ThemedText>
        <ThemedText variant="largeTitle" style={{ color: colors.accent }}>
          {profile.balance.toLocaleString()} cr
        </ThemedText>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <StatCard label="Predictions" value={stats ? stats.count.toLocaleString() : '—'} />
        <StatCard label="Staked" value={stats ? `${stats.staked.toLocaleString()} cr` : '—'} />
      </View>

      <View style={{ gap: spacing.sm }}>
        <AdminSectionLabel>Account</AdminSectionLabel>
        <ListCard>
          <ListRow
            title="My predictions"
            value={stats ? `${stats.count}` : undefined}
            accessibilityHint="Opens your portfolio"
            onPress={() => router.navigate('/portfolio')}
          />
          <ListRow
            title="Settings"
            accessibilityHint="Opens account and accessibility settings"
            onPress={() => router.push('/profile/settings')}
          />
          <ListRow
            title="Sign out"
            danger
            accessibilityHint="Asks you to confirm before signing out"
            onPress={() => setIsSignOutVisible(true)}
          />
        </ListCard>
      </View>

      {profile.role === 'ADMIN' ? (
        <View style={{ gap: spacing.sm }}>
          <AdminSectionLabel>Admin</AdminSectionLabel>
          <ListCard>
            <ListRow
              title="Admin tools"
              accessibilityHint="Opens the admin dashboard"
              onPress={() => router.push('/admin')}
            />
          </ListCard>
        </View>
      ) : null}

      <ConfirmDialog
        visible={isSignOutVisible}
        title="Are you sure you want to sign out?"
        message="You will need your email and password to sign back in."
        confirmLabel="Sign out"
        destructive
        isBusy={isSigningOut}
        onConfirm={handleSignOut}
        onCancel={() => setIsSignOutVisible(false)}
      />
    </Screen>
  );
}
