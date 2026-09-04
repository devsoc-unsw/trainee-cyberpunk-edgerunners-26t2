import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import {
  AdminActionButton,
  AdminRow,
  AdminSectionLabel,
  AdminStatus,
} from '@/components/admin/admin-components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PlaceholderState } from '@/components/ui/placeholder-state';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { fetchAdminBets, refundBet } from '@/lib/data';
import { colors, spacing } from '@/theme';
import { AdminBet } from '@/types';

export default function AdminBetDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [bet, setBet] = useState<AdminBet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const bets = await fetchAdminBets();
      setBet(bets.find((item) => item.id === id) ?? null);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const handleRefund = async () => {
    if (!id) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await refundBet(id, reason.trim());
      setIsConfirming(false);
      await load();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'The bet could not be refunded.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Screen centered>
        <ActivityIndicator color={colors.accent} />
      </Screen>
    );
  }

  if (!bet) {
    const title = loadError ? 'Bet unavailable' : 'Bet not found';
    const description = loadError
      ? 'Try again.'
      : 'Check the bet ID and try again.';

    return (
      <Screen centered>
        <PlaceholderState title={title} description={description} />
        <AdminActionButton
          onPress={() => {
            setIsLoading(true);
            void load();
          }}
        >
          Try again
        </AdminActionButton>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: spacing.sm }}>
        <AdminStatus
          label={bet.status}
          tone={bet.status === 'REFUNDED' ? 'warning' : 'positive'}
        />
        <ThemedText variant="title">{bet.userName}</ThemedText>
        <ThemedText variant="body">{bet.marketTitle}</ThemedText>
      </View>
      <View style={{ gap: spacing.sm }}>
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
      {bet.status === 'OPEN' ? (
        <>
          <AdminActionButton
            danger
            onPress={() => {
              setReason('');
              setErrorMessage(null);
              setIsConfirming(true);
            }}
          >
            Remove and refund bet
          </AdminActionButton>
          <ThemedText variant="caption" style={{ color: colors.muted }}>
            Refund amount: {bet.stake} credits
          </ThemedText>
        </>
      ) : null}
      <ConfirmDialog
        visible={isConfirming}
        title="Remove and refund this bet?"
        confirmLabel="Remove and refund"
        destructive
        isBusy={isSubmitting}
        reason={reason}
        reasonLabel="Reason"
        errorMessage={errorMessage}
        onReasonChange={setReason}
        onConfirm={handleRefund}
        onCancel={() => setIsConfirming(false)}
      />
    </Screen>
  );
}
