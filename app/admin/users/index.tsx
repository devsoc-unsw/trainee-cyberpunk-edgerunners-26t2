import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';

import { AdminFilter, AdminSearch, AdminStatus } from '@/components/admin/admin-components';
import { ThemedText } from '@/components/ui/themed-text';
import { fetchAdminUsers } from '@/lib/supabase-data';
import { colors, spacing } from '@/theme';
import { AdminUser } from '@/types';

type UserFilter = 'ALL' | 'ACTIVE' | 'SUSPENDED' | 'ADMINS';

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<UserFilter>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      setUsers(await fetchAdminUsers());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesFilter = filter === 'ALL' || (filter === 'ADMINS' ? user.role === 'ADMIN' : user.status === filter);
      const matchesQuery = !normalizedQuery || `${user.name} ${user.email}`.toLowerCase().includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
  }, [filter, query, users]);

  if (isLoading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}><ActivityIndicator color={colors.accent} /></View>;

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xxxl, flexGrow: 1 }}
      data={filteredUsers}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={<View style={{ gap: spacing.md }}><AdminSearch placeholder="Search users" value={query} onChangeText={setQuery} /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}><AdminFilter active={filter === 'ALL'} onPress={() => setFilter('ALL')}>All</AdminFilter><AdminFilter active={filter === 'ACTIVE'} onPress={() => setFilter('ACTIVE')}>Active</AdminFilter><AdminFilter active={filter === 'SUSPENDED'} onPress={() => setFilter('SUSPENDED')}>Suspended</AdminFilter><AdminFilter active={filter === 'ADMINS'} onPress={() => setFilter('ADMINS')}>Admins</AdminFilter></View>{errorMessage ? <ThemedText style={{ color: colors.no }}>{errorMessage}</ThemedText> : null}</View>}
      ListEmptyComponent={<View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}><ThemedText variant="headline">No users found</ThemedText></View>}
      renderItem={({ item }) => (
        <View style={{ gap: spacing.sm, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: 16, borderCurve: 'continuous' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><AdminStatus label={item.role} tone={item.role === 'ADMIN' ? 'warning' : 'neutral'} /><AdminStatus label={item.status} tone={item.status === 'ACTIVE' ? 'positive' : 'negative'} /></View>
          <ThemedText variant="headline">{item.name}</ThemedText>
          <ThemedText variant="subhead">{item.email}</ThemedText>
          <ThemedText variant="body">{item.balance.toLocaleString()} credits · {item.betCount} bets</ThemedText>
          <ThemedText variant="subhead" onPress={() => router.push(`/admin/users/${item.id}`)} style={{ color: colors.accent, fontWeight: '700' }}>View user ›</ThemedText>
        </View>
      )}
    />
  );
}
