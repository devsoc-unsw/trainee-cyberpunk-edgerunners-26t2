import { router, useLocalSearchParams } from 'expo-router';
import { Alert, View } from 'react-native';

import { AdminActionButton, AdminRow, AdminSectionLabel, AdminStatus } from '@/components/admin/admin-components';
import { PlaceholderState } from '@/components/ui/placeholder-state';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { adminMarkets } from '@/data/mock-admin';
import { colors, spacing } from '@/theme';

export default function AdminMarketDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const market = adminMarkets.find((item) => item.id === id);

  if (!market) {
    return <Screen centered><PlaceholderState title="Market not found" description="Check the market ID and try again." /></Screen>;
  }

  const previewAction = (title: string) => Alert.alert(title, 'This admin action is part of the UI preview and is not connected yet.');
  const hasBets = market.id !== '4';

  return (
    <Screen>
      <View style={{ gap: spacing.sm }}>
        <AdminStatus label={market.status} tone={market.status === 'OPEN' ? 'positive' : market.status === 'VOIDED' ? 'negative' : 'warning'} />
        <ThemedText variant="title">{market.title}</ThemedText>
        <ThemedText variant="body" style={{ opacity: 0.72 }}>{market.description}</ThemedText>
      </View>

      <View style={{ gap: spacing.sm }}>
        <AdminSectionLabel>Market details</AdminSectionLabel>
        <AdminRow title="Category" value={market.category} />
        <AdminRow title="Closes" value={market.closesAt} />
        <AdminRow title="Resolution criteria" subtitle={market.resolutionCriteria} />
      </View>

      <View style={{ gap: spacing.sm }}>
        <AdminSectionLabel>Trading</AdminSectionLabel>
        <AdminRow title="Override odds" onPress={() => router.push(`/admin/markets/${market.id}/odds`)} />
        <AdminRow title="Edit market" onPress={() => router.push(`/admin/markets/${market.id}/edit`)} />
        <AdminRow title="Close betting" onPress={() => previewAction('Close betting')} />
        <AdminRow title="Reopen betting" onPress={() => previewAction('Reopen betting')} />
      </View>

      <View style={{ gap: spacing.sm }}>
        <AdminSectionLabel>Resolution</AdminSectionLabel>
        <AdminActionButton onPress={() => previewAction('Resolve YES')}>Resolve YES</AdminActionButton>
        <AdminActionButton onPress={() => previewAction('Resolve NO')}>Resolve NO</AdminActionButton>
        <AdminActionButton danger onPress={() => previewAction('Void and refund')}>Void and refund</AdminActionButton>
        <AdminActionButton disabled={hasBets} danger onPress={() => previewAction('Permanently delete')}>
          Permanently delete
        </AdminActionButton>
        {hasBets ? <ThemedText variant="caption" style={{ color: colors.no }}>Permanent deletion is disabled while this market has bets. Void and refund it first.</ThemedText> : null}
      </View>
    </Screen>
  );
}
