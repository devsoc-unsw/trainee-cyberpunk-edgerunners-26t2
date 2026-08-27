import { router } from 'expo-router';
import { FlatList, View } from 'react-native';

import { AdminFilter, AdminSearch, AdminStatus } from '@/components/admin/admin-components';
import { ThemedText } from '@/components/ui/themed-text';
import { adminUsers } from '@/data/mock-admin';
import { colors, spacing } from '@/theme';

export default function AdminUsersScreen() {
  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xxxl }}
      data={adminUsers}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={{ gap: spacing.md }}>
          <AdminSearch placeholder="Search users" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <AdminFilter active>All</AdminFilter>
            <AdminFilter>Active</AdminFilter>
            <AdminFilter>Suspended</AdminFilter>
            <AdminFilter>Admins</AdminFilter>
          </View>
        </View>
      }
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
