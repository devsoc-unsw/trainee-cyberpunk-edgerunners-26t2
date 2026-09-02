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
      <View style={{ gap: spacing.lg }}>
        {/* Header */}
        <View style={{ gap: spacing.sm }}>
          <AdminStatus
            label={bet.status}
            tone={
              bet.status === 'REFUNDED'
                ? 'warning'
                : bet.status === 'LOST'
                  ? 'negative'
                  : 'positive'
            }
          />
  
          <ThemedText variant="title">
            {bet.userName}
          </ThemedText>
  
          <ThemedText
            variant="body"
            style={{ color: colors.muted }}
          >
            {bet.marketTitle}
          </ThemedText>
        </View>
  
        <View
          style={{
            gap: spacing.sm,
            padding: spacing.md,
            borderRadius: 12,
            backgroundColor: colors.card,
          }}
        >
          <AdminSectionLabel>Bet details</AdminSectionLabel>
  
          <AdminRow title="Outcome" value={bet.outcome} />
          <AdminRow title="Stake" value={`${bet.stake} credits`} />
          <AdminRow
            title="Potential payout"
            value={`${bet.potentialPayout} credits`}
          />
          <AdminRow
            title="Odds when placed"
            value={`${Math.round(bet.oddsAtPlacement * 100)}%`}
          />
          <AdminRow title="Placed" value={bet.placedAt} />
        </View>
  
        <View style={{ gap: spacing.sm }}>
          <AdminActionButton
            danger
            disabled={isBusy || bet.status === 'REFUNDED'}
            onPress={() => void handleRefund()}
          >
            {isBusy ? 'Refunding...' : 'Remove and refund bet'}
          </AdminActionButton>
  
          <ThemedText
            variant="caption"
            style={{
              color: colors.muted,
              textAlign: 'center',
            }}
          >
            Refund amount: {bet.stake} credits
          </ThemedText>
  
          {errorMessage ? (
            <ThemedText
              variant="caption"
              style={{
                color: colors.no,
                textAlign: 'center',
              }}
            >
              {errorMessage}
            </ThemedText>
          ) : null}
        </View>
  
        <ThemedText
          variant="subhead"
          onPress={() => router.back()}
          style={{
            color: colors.accent,
            textAlign: 'center',
            paddingVertical: spacing.sm,
          }}
        >
          Back
        </ThemedText>
      </View>
    </Screen>
  );
}
