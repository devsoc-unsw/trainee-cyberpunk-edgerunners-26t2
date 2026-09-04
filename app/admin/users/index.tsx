import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';

import { AdminFilter, AdminSearch, AdminStatus } from '@/components/admin/admin-components';
import { ThemedText } from '@/components/ui/themed-text';
import { fetchAdminUsers } from '@/lib/data';
import { colors, spacing } from '@/theme';
import { AdminUser } from '@/types';

type UserFilter = 'All' | 'Active' | 'Suspended' | 'Admins';
const filters: UserFilter[] = ['All', 'Active', 'Suspended', 'Admins'];

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<UserFilter>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setUsers(await fetchAdminUsers());
      setErrorMessage(null);
    } catch {
      setErrorMessage('Users could not be loaded.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const visibleUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesQuery = !normalizedQuery || `${user.name} ${user.email}`.toLowerCase().includes(normalizedQuery);
      const matchesFilter = filter === 'All'
        || (filter === 'Admins' ? user.role === 'ADMIN' : user.status === filter.toUpperCase());
      return matchesQuery && matchesFilter;
    });
  }, [filter, query, users]);

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xxxl }}
      data={visibleUsers}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); void load(); }} tintColor={colors.muted} />}
      ListHeaderComponent={
        <View style={{ gap: spacing.md }}>
          <AdminSearch placeholder="Search users" value={query} onChangeText={setQuery} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {filters.map((item) => <AdminFilter key={item} active={filter === item} onPress={() => setFilter(item)}>{item}</AdminFilter>)}
          </View>
        </View>
      }
      ListEmptyComponent={isLoading ? <ActivityIndicator color={colors.accent} /> : <ThemedText variant="subhead">{errorMessage ?? 'No users found.'}</ThemedText>}
      renderItem={({ item }) => (
        <View style={{ gap: spacing.sm, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: 16, borderCurve: 'continuous' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AdminStatus label={item.role} tone={item.role === 'ADMIN' ? 'warning' : 'neutral'} />
            <AdminStatus label={item.status} tone={item.status === 'ACTIVE' ? 'positive' : 'negative'} />
          </View>
          <ThemedText variant="headline">{item.name}</ThemedText>
          <ThemedText variant="subhead">{item.email}</ThemedText>
          <ThemedText variant="body">{item.balance.toLocaleString()} credits · {item.betCount} bets</ThemedText>
          <ThemedText variant="subhead" onPress={() => router.push(`/admin/users/${item.id}`)} style={{ color: colors.accent, fontWeight: '700' }}>
            View user ›
          </ThemedText>
        </View>
      )}
    />
  );
}
