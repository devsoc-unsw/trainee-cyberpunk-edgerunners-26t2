import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AdminActionButton, AdminField, AdminRow, AdminSectionLabel, AdminStatus, AdminTextInput } from '@/components/admin/admin-components';
import { PlaceholderState } from '@/components/ui/placeholder-state';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { adjustUserBalance, fetchAdminUsers, setUserRole, setUserStatus } from '@/lib/supabase-data';
import { colors, spacing } from '@/theme';
import { AdminUser } from '@/types';

export default function AdminUserDetailsScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [user, setUser] = useState<AdminUser | null>(null);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadUser = useCallback(async () => {
    if (!id) return;
    try {
      const result = (await fetchAdminUsers()).find((item) => item.id === id) ?? null;
      setUser(result);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load user');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { void loadUser(); }, [loadUser]);

  const runAction = async (action: () => Promise<unknown>) => {
    setErrorMessage(null);
    setIsBusy(true);
    try {
      await action();
      await loadUser();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to complete action');
    } finally {
      setIsBusy(false);
    }
  };

  const handleAdjustment = () => {
    const amount = Number.parseInt(delta, 10);
    if (!id || !Number.isSafeInteger(amount) || amount === 0) {
      setErrorMessage('Enter a non-zero whole-number adjustment');
      return;
    }
    void runAction(async () => {
      await adjustUserBalance(id, amount, reason);
      setDelta('');
    });
  };

  if (isLoading) return <Screen centered><ActivityIndicator color={colors.accent} /></Screen>;
  if (!user) return <Screen centered><PlaceholderState title="User not found" description={errorMessage ?? 'Check the user ID and try again.'} /></Screen>;

  const nextStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
  const nextRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';

  return (
    <Screen>
      <View style={{ gap: spacing.sm }}><AdminStatus label={user.status} tone={user.status === 'ACTIVE' ? 'positive' : 'negative'} /><ThemedText variant="title">{user.name}</ThemedText><ThemedText variant="subhead">{user.email}</ThemedText></View>
      <View style={{ gap: spacing.sm }}><AdminSectionLabel>Account</AdminSectionLabel><AdminRow title="Role" value={user.role} /><AdminRow title="Status" value={user.status} /><AdminRow title="Bets" value={`${user.betCount}`} onPress={() => router.push('/admin/bets')} /></View>
      <View style={{ gap: spacing.sm }}>
        <AdminSectionLabel>Credits</AdminSectionLabel>
        <AdminRow title="Current balance" value={`${user.balance.toLocaleString()} credits`} />
        <View style={{ gap: spacing.md }}>
          <AdminField label="Credit adjustment"><AdminTextInput value={delta} onChangeText={setDelta} placeholder="e.g. 100 or -50" keyboardType="number-pad" accessibilityLabel="Credit adjustment" /></AdminField>
          <AdminField label="Reason"><AdminTextInput value={reason} onChangeText={setReason} placeholder="Why are you changing the balance?" accessibilityLabel="Reason for adjustment" /></AdminField>
          {errorMessage ? <ThemedText style={{ color: colors.no }}>{errorMessage}</ThemedText> : null}
          <AdminActionButton disabled={isBusy} onPress={handleAdjustment}>Adjust credits</AdminActionButton>
        </View>
      </View>
      <View style={{ gap: spacing.sm }}>
        <AdminSectionLabel>Permissions</AdminSectionLabel>
        <AdminActionButton disabled={isBusy} onPress={() => void runAction(() => setUserRole(user.id, nextRole, reason))}>{nextRole === 'ADMIN' ? 'Assign admin' : 'Remove admin'}</AdminActionButton>
        <AdminActionButton disabled={isBusy} onPress={() => void runAction(() => setUserStatus(user.id, nextStatus, reason))}>{nextStatus === 'SUSPENDED' ? 'Suspend user' : 'Reactivate user'}</AdminActionButton>
      </View>
    </Screen>
  );
}
