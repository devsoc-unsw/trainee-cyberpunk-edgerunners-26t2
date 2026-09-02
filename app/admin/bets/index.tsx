import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';

import { AdminFilter, AdminSearch, AdminStatus } from '@/components/admin/admin-components';
import { ThemedText } from '@/components/ui/themed-text';
import { fetchAdminBets } from '@/lib/data';
import { colors, spacing } from '@/theme';
import { AdminBet } from '@/types';

export default function AdminBetsScreen() {
  const [bets, setBets] = useState<AdminBet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void fetchAdminBets()
      .then(setBets)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xxxl }}
      data={bets}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={{ gap: spacing.md }}>
          <AdminSearch placeholder="Search users or markets" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <AdminFilter active>All</AdminFilter>
            <AdminFilter>Active</AdminFilter>
            <AdminFilter>Refunded</AdminFilter>
            <AdminFilter>YES</AdminFilter>
            <AdminFilter>NO</AdminFilter>
          </View>
        </View>
      }
      ListEmptyComponent={isLoading ? <ActivityIndicator color={colors.accent} /> : null}
      renderItem={({ item }) => (
        <View style={{ gap: spacing.sm, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: 16, borderCurve: 'continuous' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AdminStatus label={item.status} tone={item.status === 'REFUNDED' ? 'warning' : 'positive'} />
            <ThemedText variant="caption">{item.outcome}</ThemedText>
          </View>
          <ThemedText variant="headline">{item.userName}</ThemedText>
          <ThemedText variant="subhead">{item.marketTitle}</ThemedText>
          <ThemedText variant="body">{item.stake} credits staked · {item.potentialPayout} potential payout</ThemedText>
          <ThemedText variant="caption">Placed {item.placedAt} · odds {Math.round(item.oddsAtPlacement * 100)}%</ThemedText>
          <ThemedText variant="subhead" onPress={() => router.push(`/admin/bets/${item.id}`)} style={{ color: colors.accent, fontWeight: '700' }}>
            View bet ›
          </ThemedText>
        </View>
      )}
    />
  );
}
