import { ActivityIndicator, FlatList, View } from 'react-native';
import { useEffect, useState } from 'react';

import { AdminFilter, AdminSearch, AdminStatus } from '@/components/admin/admin-components';
import { ThemedText } from '@/components/ui/themed-text';
import { fetchAdminHistory } from '@/lib/data';
import { colors, spacing } from '@/theme';
import { AdminAction } from '@/types';

export default function AdminHistoryScreen() {
  const [history, setHistory] = useState<AdminAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void fetchAdminHistory()
      .then(setHistory)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xxxl }}
      data={history}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={{ gap: spacing.md }}>
          <AdminSearch placeholder="Search admin history" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <AdminFilter active>All</AdminFilter>
            <AdminFilter>Markets</AdminFilter>
            <AdminFilter>Bets</AdminFilter>
            <AdminFilter>Users</AdminFilter>
            <AdminFilter>Credits</AdminFilter>
          </View>
        </View>
      }
      ListEmptyComponent={
        isLoading ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <ThemedText variant="subhead">No admin actions yet.</ThemedText>
        )
      }
      renderItem={({ item }) => (
        <View style={{ gap: spacing.sm, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: 16, borderCurve: 'continuous' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
            <AdminStatus label={item.action.replace('_', ' ')} tone={item.action === 'BET_REFUNDED' ? 'warning' : 'neutral'} />
            <ThemedText variant="caption">{item.createdAt}</ThemedText>
          </View>
          <ThemedText variant="headline">{item.summary}</ThemedText>
          <ThemedText variant="subhead">{item.target}</ThemedText>
          <ThemedText variant="body">{item.reason}</ThemedText>
          <ThemedText variant="caption">By {item.adminName}</ThemedText>
        </View>
      )}
    />
  );
}
