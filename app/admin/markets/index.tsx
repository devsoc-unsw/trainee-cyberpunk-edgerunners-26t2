import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';

import { AdminActionButton, AdminFilter, AdminSearch, AdminStatus } from '@/components/admin/admin-components';
import { ThemedText } from '@/components/ui/themed-text';
import { fetchMarkets, MarketWithOutcomes } from '@/lib/supabase-data';
import { colors, spacing } from '@/theme';
import { Market } from '@/types';

function statusTone(status: Market['status']) {
  if (status === 'OPEN') return 'positive' as const;
  if (status === 'VOIDED') return 'negative' as const;
  if (status === 'CLOSED') return 'warning' as const;
  return 'neutral' as const;
}

export default function AdminMarketsScreen() {
  const [markets, setMarkets] = useState<MarketWithOutcomes[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Market['status'] | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadMarkets = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      setMarkets(await fetchMarkets());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load markets');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMarkets();
  }, [loadMarkets]);

  const filteredMarkets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return markets.filter((market) => {
      const matchesStatus = statusFilter === 'ALL' || market.status === statusFilter;
      const matchesQuery = !normalizedQuery || `${market.title} ${market.category}`.toLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [markets, query, statusFilter]);

  if (isLoading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}><ActivityIndicator color={colors.accent} /></View>;

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: spacing.lg, padding: spacing.lg, paddingBottom: spacing.xxxl, flexGrow: 1 }}
      data={filteredMarkets}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={{ gap: spacing.md }}>
          <AdminSearch placeholder="Search markets" value={query} onChangeText={setQuery} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <AdminFilter active={statusFilter === 'ALL'} onPress={() => setStatusFilter('ALL')}>All</AdminFilter>
            <AdminFilter active={statusFilter === 'OPEN'} onPress={() => setStatusFilter('OPEN')}>Open</AdminFilter>
            <AdminFilter active={statusFilter === 'CLOSED'} onPress={() => setStatusFilter('CLOSED')}>Closed</AdminFilter>
            <AdminFilter active={statusFilter === 'RESOLVED'} onPress={() => setStatusFilter('RESOLVED')}>Resolved</AdminFilter>
            <AdminFilter active={statusFilter === 'VOIDED'} onPress={() => setStatusFilter('VOIDED')}>Voided</AdminFilter>
          </View>
          <AdminActionButton onPress={() => router.push('/admin/markets/create')}>Create market</AdminActionButton>
          {errorMessage ? <ThemedText style={{ color: colors.no }}>{errorMessage}</ThemedText> : null}
        </View>
      }
      ListEmptyComponent={<View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}><ThemedText variant="headline">No markets found</ThemedText></View>}
      renderItem={({ item }) => (
        <View style={{ gap: spacing.sm, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: 16, borderCurve: 'continuous' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
            <AdminStatus label={item.status} tone={statusTone(item.status)} />
            <ThemedText variant="caption">YES {Math.round(item.yesProbability * 100)}%</ThemedText>
          </View>
          <ThemedText variant="headline">{item.title}</ThemedText>
          <ThemedText variant="subhead">{item.category} · closes {item.closesAt}</ThemedText>
          <AdminActionButton onPress={() => router.push(`/admin/markets/${item.id}`)} style={{ alignSelf: 'flex-start' }}>Manage market</AdminActionButton>
        </View>
      )}
    />
  );
}
