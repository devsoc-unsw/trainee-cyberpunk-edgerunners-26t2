import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';

import { AdminActionButton, AdminFilter, AdminSearch, AdminStatus } from '@/components/admin/admin-components';
import { MarketCountdown } from '@/components/ui/market-countdown';
import { ThemedText } from '@/components/ui/themed-text';
import { fetchMarkets } from '@/lib/data';
import { colors, spacing } from '@/theme';
import { Market } from '@/types';

type MarketFilter = 'All' | 'Open' | 'Closed' | 'Resolved' | 'Voided' | 'Deleted';
const filters: MarketFilter[] = ['All', 'Open', 'Closed', 'Resolved', 'Voided', 'Deleted'];

function statusTone(status: Market['status'], deleted: boolean) {
  if (deleted || status === 'VOIDED') return 'negative' as const;
  if (status === 'OPEN') return 'positive' as const;
  if (status === 'CLOSED') return 'warning' as const;
  return 'neutral' as const;
}

export default function AdminMarketsScreen() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MarketFilter>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setMarkets(await fetchMarkets({ includeDeleted: true }));
      setErrorMessage(null);
    } catch {
      setErrorMessage('Markets could not be loaded.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const visibleMarkets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return markets.filter((market) => {
      const matchesQuery = !normalizedQuery || `${market.title} ${market.category}`.toLowerCase().includes(normalizedQuery);
      const matchesFilter = filter === 'All'
        ? !market.deletedAt
        : filter === 'Deleted'
          ? Boolean(market.deletedAt)
          : !market.deletedAt && market.status === filter.toUpperCase();
      return matchesQuery && matchesFilter;
    });
  }, [filter, markets, query]);

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: spacing.lg, padding: spacing.lg, paddingBottom: spacing.xxxl }}
      data={visibleMarkets}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); void load(); }} tintColor={colors.muted} />}
      ListHeaderComponent={
        <View style={{ gap: spacing.md }}>
          <AdminSearch placeholder="Search markets" value={query} onChangeText={setQuery} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {filters.map((item) => <AdminFilter key={item} active={filter === item} onPress={() => setFilter(item)}>{item}</AdminFilter>)}
          </View>
          <AdminActionButton onPress={() => router.push('/admin/markets/create')}>Create market</AdminActionButton>
        </View>
      }
      ListEmptyComponent={isLoading ? <ActivityIndicator color={colors.accent} /> : <ThemedText variant="subhead">{errorMessage ?? 'No markets found.'}</ThemedText>}
      renderItem={({ item }) => {
        const deleted = Boolean(item.deletedAt);
        return (
          <View style={{ gap: spacing.sm, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: 16, borderCurve: 'continuous' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
              <AdminStatus label={deleted ? 'DELETED' : item.status} tone={statusTone(item.status, deleted)} />
              <ThemedText variant="caption">YES {Math.round(item.yesProbability * 100)}%</ThemedText>
            </View>
            <ThemedText variant="headline">{item.title}</ThemedText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <ThemedText variant="subhead">{item.category} ·</ThemedText>
              <MarketCountdown closesAt={item.closesAt} status={item.status} />
            </View>
            <AdminActionButton onPress={() => router.push(`/admin/markets/${item.id}`)} style={{ alignSelf: 'flex-start' }}>
              {deleted ? 'View market' : 'Manage market'}
            </AdminActionButton>
          </View>
        );
      }}
    />
  );
}
