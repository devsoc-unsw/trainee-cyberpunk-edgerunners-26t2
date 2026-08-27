import { router } from 'expo-router';
import { FlatList, View } from 'react-native';

import { AdminActionButton, AdminFilter, AdminSearch, AdminStatus } from '@/components/admin/admin-components';
import { ThemedText } from '@/components/ui/themed-text';
import { adminMarkets } from '@/data/mock-admin';
import { colors, spacing } from '@/theme';
import { Market } from '@/types';

function statusTone(status: Market['status']) {
  if (status === 'OPEN') return 'positive' as const;
  if (status === 'VOIDED') return 'negative' as const;
  if (status === 'CLOSED') return 'warning' as const;
  return 'neutral' as const;
}

export default function AdminMarketsScreen() {
  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: spacing.lg, padding: spacing.lg, paddingBottom: spacing.xxxl }}
      data={adminMarkets}
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
