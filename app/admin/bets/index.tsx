import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';

import { AdminFilter, AdminSearch, AdminStatus } from '@/components/admin/admin-components';
import { ThemedText } from '@/components/ui/themed-text';
import { fetchAdminBets } from '@/lib/data';
import { colors, spacing } from '@/theme';
import { AdminBet } from '@/types';

type BetFilter = 'All' | 'Active' | 'Refunded' | 'YES' | 'NO';
const filters: BetFilter[] = ['All', 'Active', 'Refunded', 'YES', 'NO'];

export default function AdminBetsScreen() {
  const [bets, setBets] = useState<AdminBet[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<BetFilter>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setBets(await fetchAdminBets());
      setErrorMessage(null);
    } catch {
      setErrorMessage('Bets could not be loaded.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const visibleBets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return bets.filter((bet) => {
      const matchesQuery = !normalizedQuery || `${bet.userName} ${bet.marketTitle}`.toLowerCase().includes(normalizedQuery);
      const matchesFilter = filter === 'All'
        || (filter === 'Active' && bet.status === 'OPEN')
        || (filter === 'Refunded' && bet.status === 'REFUNDED')
        || (filter === 'YES' || filter === 'NO') && bet.outcome === filter;
      return matchesQuery && matchesFilter;
    });
  }, [bets, filter, query]);

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xxxl }}
      data={visibleBets}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); void load(); }} tintColor={colors.muted} />}
      ListHeaderComponent={
        <View style={{ gap: spacing.md }}>
          <AdminSearch placeholder="Search users or markets" value={query} onChangeText={setQuery} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {filters.map((item) => <AdminFilter key={item} active={filter === item} onPress={() => setFilter(item)}>{item}</AdminFilter>)}
          </View>
        </View>
      }
      ListEmptyComponent={isLoading ? <ActivityIndicator color={colors.accent} /> : <ThemedText variant="subhead">{errorMessage ?? 'No bets found.'}</ThemedText>}
      renderItem={({ item }) => (
        <View style={{ gap: spacing.sm, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: 16, borderCurve: 'continuous' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AdminStatus label={item.status} tone={item.status === 'REFUNDED' ? 'warning' : item.status === 'LOST' ? 'negative' : 'positive'} />
            <ThemedText variant="caption">{item.outcome}</ThemedText>
          </View>
          <ThemedText variant="headline">{item.userName}</ThemedText>
          <ThemedText variant="subhead">{item.marketTitle}</ThemedText>
          <ThemedText variant="body">{item.stake} credits staked{item.payout !== undefined ? ` · ${item.payout} paid` : ''}</ThemedText>
          <ThemedText variant="caption">Placed {item.placedAt} · odds {Math.round(item.oddsAtPlacement * 100)}%</ThemedText>
          <ThemedText variant="subhead" onPress={() => router.push(`/admin/bets/${item.id}`)} style={{ color: colors.accent, fontWeight: '700' }}>
            View bet ›
          </ThemedText>
        </View>
      )}
    />
  );
}
