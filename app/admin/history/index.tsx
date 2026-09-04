import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';

import { AdminFilter, AdminSearch, AdminStatus } from '@/components/admin/admin-components';
import { ThemedText } from '@/components/ui/themed-text';
import { fetchAdminHistory } from '@/lib/data';
import { colors, spacing } from '@/theme';
import { AdminAction } from '@/types';

type HistoryFilter = 'All' | 'Markets' | 'Bets' | 'Users' | 'Credits';
const filters: HistoryFilter[] = ['All', 'Markets', 'Bets', 'Users', 'Credits'];

export default function AdminHistoryScreen() {
  const [history, setHistory] = useState<AdminAction[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<HistoryFilter>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setHistory(await fetchAdminHistory());
      setErrorMessage(null);
    } catch {
      setErrorMessage('Admin history could not be loaded.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const visibleHistory = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return history.filter((item) => {
      const matchesQuery = !normalizedQuery || `${item.summary} ${item.target} ${item.reason} ${item.adminName}`.toLowerCase().includes(normalizedQuery);
      const matchesFilter = filter === 'All'
        || (filter === 'Credits' && item.action === 'CREDIT_ADJUSTMENT')
        || (filter === 'Markets' && item.targetType === 'MARKET')
        || (filter === 'Bets' && item.targetType === 'BET')
        || (filter === 'Users' && item.targetType === 'USER' && item.action !== 'CREDIT_ADJUSTMENT');
      return matchesQuery && matchesFilter;
    });
  }, [filter, history, query]);

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xxxl }}
      data={visibleHistory}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); void load(); }} tintColor={colors.muted} />}
      ListHeaderComponent={
        <View style={{ gap: spacing.md }}>
          <AdminSearch placeholder="Search admin history" value={query} onChangeText={setQuery} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {filters.map((item) => <AdminFilter key={item} active={filter === item} onPress={() => setFilter(item)}>{item}</AdminFilter>)}
          </View>
        </View>
      }
      ListEmptyComponent={isLoading ? <ActivityIndicator color={colors.accent} /> : <ThemedText variant="subhead">{errorMessage ?? 'No admin actions found.'}</ThemedText>}
      renderItem={({ item }) => (
        <View style={{ gap: spacing.sm, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: 16, borderCurve: 'continuous' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
            <AdminStatus label={item.action.replaceAll('_', ' ')} tone={item.action === 'BET_REFUNDED' || item.action === 'MARKET_VOIDED' || item.action === 'MARKET_DELETED' ? 'warning' : 'neutral'} />
            <ThemedText variant="caption">{item.createdAt}</ThemedText>
          </View>
          <ThemedText variant="headline">{item.summary}</ThemedText>
          <ThemedText variant="subhead">{item.target}</ThemedText>
          {item.reason ? <ThemedText variant="body">{item.reason}</ThemedText> : null}
          <ThemedText variant="caption">By {item.adminName}</ThemedText>
        </View>
      )}
    />
  );
}
