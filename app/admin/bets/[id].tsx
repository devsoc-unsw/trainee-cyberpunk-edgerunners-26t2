import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

import { AdminActionButton, AdminRow, AdminSectionLabel, AdminStatus } from '@/components/admin/admin-components';
import { PlaceholderState } from '@/components/ui/placeholder-state';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { fetchAdminBets } from '@/lib/data';
import { colors, spacing } from '@/theme';
import { AdminBet } from '@/types';

export default function AdminBetDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [bet, setBet] = useState<AdminBet | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      return;
    }

    void fetchAdminBets()
      .then((bets) => setBet(bets.find((item) => item.id === id) ?? null))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return <Screen centered><ActivityIndicator color={colors.accent} /></Screen>;
  }

  if (!bet) {
    return <Screen centered><PlaceholderState title="Bet not found" description="Check the bet ID and try again." /></Screen>;
  }

  return (
    <Screen>
      <View style={{ gap: spacing.sm }}>
        <AdminStatus label={bet.status} tone={bet.status === 'REFUNDED' ? 'warning' : 'positive'} />
        <ThemedText variant="title">{bet.userName}</ThemedText>
        <ThemedText variant="body">{bet.marketTitle}</ThemedText>
      </View>
      <View style={{ gap: spacing.sm }}>
        <AdminSectionLabel>Bet details</AdminSectionLabel>
        <AdminRow title="Outcome" value={bet.outcome} />
        <AdminRow title="Stake" value={`${bet.stake} credits`} />
        <AdminRow title="Potential payout" value={`${bet.potentialPayout} credits`} />
        <AdminRow title="Odds when placed" value={`${Math.round(bet.oddsAtPlacement * 100)}%`} />
        <AdminRow title="Placed" value={bet.placedAt} />
      </View>
      <AdminActionButton
        danger
        onPress={() => Alert.alert('Remove and refund bet', 'This is a UI preview. The bet would remain visible as Refunded and the refund would be recorded in admin history.')}
      >
        Remove and refund bet
      </AdminActionButton>
      <ThemedText variant="caption" style={{ color: colors.muted }}>Refund amount: {bet.stake} credits</ThemedText>
    </Screen>
  );
}
