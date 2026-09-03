import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

import { AdminActionButton, AdminField, AdminRow, AdminSectionLabel, AdminStatus, AdminTextInput } from '@/components/admin/admin-components';
import { PlaceholderState } from '@/components/ui/placeholder-state';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { fetchAdminUsers, updateUserAccess } from '@/lib/data';
import { colors, spacing } from '@/theme';
import { AdminUser } from '@/types';

export default function AdminUserDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      return;
    }

    void fetchAdminUsers()
      .then((users) => setUser(users.find((item) => item.id === id) ?? null))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return <Screen centered><ActivityIndicator color={colors.accent} /></Screen>;
  }

  if (!user) {
    return <Screen centered><PlaceholderState title="User not found" description="Check the user ID and try again." /></Screen>;
  }

  return (
    <Screen>
      <View style={{ gap: spacing.sm }}>
        <AdminStatus label={user.status} tone={user.status === 'ACTIVE' ? 'positive' : 'negative'} />
        <ThemedText variant="title">{user.name}</ThemedText>
        <ThemedText variant="subhead">{user.email}</ThemedText>
      </View>
      <View style={{ gap: spacing.sm }}>
        <AdminSectionLabel>Account</AdminSectionLabel>
        <AdminRow title="Role" value={user.role} />
        <AdminRow title="Status" value={user.status} />
        <AdminRow title="Bets" value={`${user.betCount}`} onPress={() => router.push('/admin/bets')} />
      </View>
      <View style={{ gap: spacing.sm }}>
        <AdminSectionLabel>Credits</AdminSectionLabel>
        <AdminRow title="Current balance" value={`${user.balance.toLocaleString()} credits`} />
        <View style={{ gap: spacing.md }}>
          <AdminField label="Credit adjustment">
            <AdminTextInput placeholder="e.g. 100" keyboardType="number-pad" accessibilityLabel="Credit adjustment" />
          </AdminField>
          <AdminField label="Reason">
            <AdminTextInput placeholder="Why are you changing the balance?" accessibilityLabel="Reason for adjustment" />
          </AdminField>
          <AdminActionButton>Adjust credits</AdminActionButton>
        </View>
      </View>
      <View style={{ gap: spacing.sm }}>
        <AdminSectionLabel>Permissions</AdminSectionLabel>
        <AdminActionButton onPress={async () => {
          if (!id) return;
          try {
            await updateUserAccess(id, 'role', 'ADMIN');
            setUser((current) => current ? { ...current, role: 'ADMIN' } : current);
          } catch (error) {
            Alert.alert('Assign admin failed', error instanceof Error ? error.message : 'Please try again.');
          }
        }}>Assign admin</AdminActionButton>
        <AdminActionButton onPress={async () => {
          if (!id) return;
          try {
            await updateUserAccess(id, 'status', 'SUSPENDED');
            setUser((current) => current ? { ...current, status: 'SUSPENDED' } : current);
          } catch (error) {
            Alert.alert('Suspend user failed', error instanceof Error ? error.message : 'Please try again.');
          }
        }}>Suspend user</AdminActionButton>
      </View>
    </Screen>
  );
}
