import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

import { AdminActionButton, AdminRow, AdminSectionLabel, AdminStatus } from '@/components/admin/admin-components';
import { PlaceholderState } from '@/components/ui/placeholder-state';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { fetchAdminBets, refundPosition } from '@/lib/supabase-data';
import { colors, spacing } from '@/theme';
import { AdminBet } from '@/types';

export default function AdminBetDetailsScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [bet, setBet] = useState<AdminBet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadBet = useCallback(async () => {
    if (!id) return;
    try {
      setBet((await fetchAdminBets()).find((item) => item.id === id) ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load bet');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { void loadBet(); }, [loadBet]);

  const handleRefund = async () => {
    if (!bet) return;
    setErrorMessage(null);
    setIsBusy(true);
    try {
      await refundPosition(bet.id, 'Refunded by admin');
      await loadBet();
      Alert.alert('Done', 'Bet refunded');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to refund bet');
    } finally {
      setIsBusy(false);
    }
  };

  if (isLoading) return <Screen centered><ActivityIndicator color={colors.accent} /></Screen>;
  if (!bet) return <Screen centered><PlaceholderState title="Bet not found" description={errorMessage ?? 'Check the bet ID and try again.'} /></Screen>;

  return (
    <Screen>
      <View style={{ gap: spacing.sm }}><AdminStatus label={bet.status} tone={bet.status === 'REFUNDED' ? 'warning' : bet.status === 'LOST' ? 'negative' : 'positive'} /><ThemedText variant="title">{bet.userName}</ThemedText><ThemedText variant="body">{bet.marketTitle}</ThemedText></View>
      <View style={{ gap: spacing.sm }}><AdminSectionLabel>Bet details</AdminSectionLabel><AdminRow title="Outcome" value={bet.outcome} /><AdminRow title="Stake" value={`${bet.stake} credits`} /><AdminRow title="Potential payout" value={`${bet.potentialPayout} credits`} /><AdminRow title="Odds when placed" value={`${Math.round(bet.oddsAtPlacement * 100)}%`} /><AdminRow title="Placed" value={bet.placedAt} /></View>
      <AdminActionButton disabled={isBusy || bet.status === 'REFUNDED'} danger onPress={() => void handleRefund()}>Remove and refund bet</AdminActionButton>
      <ThemedText variant="caption" style={{ color: colors.muted }}>Refund amount: {bet.stake} credits</ThemedText>
      {errorMessage ? <ThemedText style={{ color: colors.no }}>{errorMessage}</ThemedText> : null}
      <ThemedText variant="subhead" onPress={() => router.back()} style={{ color: colors.accent }}>Back</ThemedText>
    </Screen>
  );
}
