import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';

import { AdminActionButton, AdminFilter, AdminSearch, AdminStatus } from '@/components/admin/admin-components';
import { ThemedText } from '@/components/ui/themed-text';
import { fetchMarkets } from '@/lib/data';
import { colors, spacing } from '@/theme';
import { Market } from '@/types';

function statusTone(status: Market['status']) {
  if (status === 'OPEN') return 'positive' as const;
  if (status === 'VOIDED') return 'negative' as const;
  if (status === 'CLOSED') return 'warning' as const;
  return 'neutral' as const;
}

export default function AdminMarketsScreen() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void fetchMarkets()
      .then(setMarkets)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: spacing.lg, padding: spacing.lg, paddingBottom: spacing.xxxl }}
      data={markets}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={{ gap: spacing.md }}>
          <AdminSearch placeholder="Search markets" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <AdminFilter active>All</AdminFilter>
            <AdminFilter>Open</AdminFilter>
            <AdminFilter>Closed</AdminFilter>
            <AdminFilter>Resolved</AdminFilter>
            <AdminFilter>Voided</AdminFilter>
          </View>
          <AdminActionButton onPress={() => router.push('/admin/markets/create')}>Create market</AdminActionButton>
        </View>
      }
      ListEmptyComponent={isLoading ? <ActivityIndicator color={colors.accent} /> : null}
      renderItem={({ item }) => (
        <View style={{ gap: spacing.sm, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: 16, borderCurve: 'continuous' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
            <AdminStatus label={item.status} tone={statusTone(item.status)} />
            <ThemedText variant="caption">YES {Math.round(item.yesProbability * 100)}%</ThemedText>
          </View>
          <ThemedText variant="headline">{item.title}</ThemedText>
          <ThemedText variant="subhead">{item.category} · closes {item.closesAt}</ThemedText>
          <AdminActionButton onPress={() => router.push(`/admin/markets/${item.id}`)} style={{ alignSelf: 'flex-start' }}>
            Manage market
          </AdminActionButton>
        </View>
      )}
    />
  );
}
