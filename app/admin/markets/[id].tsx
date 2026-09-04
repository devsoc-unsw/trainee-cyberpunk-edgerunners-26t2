import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AdminActionButton, AdminRow, AdminSectionLabel, AdminStatus } from '@/components/admin/admin-components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PlaceholderState } from '@/components/ui/placeholder-state';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { formatClosingDate } from '@/lib/countdown';
import { deleteMarket, fetchAdminBets, fetchMarket, resolveMarket, setMarketBetting, voidMarket } from '@/lib/data';
import { useCountdown } from '@/state/countdown';
import { colors, spacing } from '@/theme';
import { Market } from '@/types';

type MarketAction = 'close' | 'reopen' | 'resolveYes' | 'resolveNo' | 'void' | 'delete';

const actionDetails: Record<MarketAction, { title: string; confirmLabel: string; destructive?: boolean; reason?: boolean }> = {
  close: { title: 'Close betting?', confirmLabel: 'Close betting' },
  reopen: { title: 'Reopen betting?', confirmLabel: 'Reopen betting' },
  resolveYes: { title: 'Resolve this market YES?', confirmLabel: 'Resolve YES' },
  resolveNo: { title: 'Resolve this market NO?', confirmLabel: 'Resolve NO' },
  void: { title: 'Void this market and refund all open bets?', confirmLabel: 'Void and refund', destructive: true, reason: true },
  delete: { title: 'Delete this market?', confirmLabel: 'Delete market', destructive: true, reason: true },
};

export default function AdminMarketDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [market, setMarket] = useState<Market | null>(null);
  const [hasOpenBets, setHasOpenBets] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [action, setAction] = useState<MarketAction | null>(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const countdown = useCountdown(market?.closesAt);

  // Admins need the exact date as well as the time remaining, so show both.
  const closesLabel = market
    ? `${market.status === 'OPEN' && !countdown.isExpired ? `in ${countdown.label}` : 'closed'} · ${formatClosingDate(market.closesAt)}`
    : '';

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [nextMarket, bets] = await Promise.all([fetchMarket(id), fetchAdminBets()]);
      setMarket(nextMarket);
      setHasOpenBets(bets.some((bet) => bet.marketId === id && bet.status === 'OPEN'));
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const openAction = (nextAction: MarketAction) => {
    setReason('');
    setErrorMessage(null);
    setAction(nextAction);
  };

  const handleConfirm = async () => {
    if (!id || !action) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      if (action === 'close') await setMarketBetting(id, false);
      if (action === 'reopen') await setMarketBetting(id, true);
      if (action === 'resolveYes') await resolveMarket(id, 'YES');
      if (action === 'resolveNo') await resolveMarket(id, 'NO');
      if (action === 'void') await voidMarket(id, reason.trim());
      if (action === 'delete') await deleteMarket(id, reason.trim());
      setAction(null);
      await load();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The action could not be completed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <Screen centered><ActivityIndicator color={colors.accent} /></Screen>;
  if (!market) return <Screen centered><PlaceholderState title={loadError ? 'Market unavailable' : 'Market not found'} description={loadError ? 'Try again.' : 'Check the market ID and try again.'} /><AdminActionButton onPress={() => { setIsLoading(true); void load(); }}>Try again</AdminActionButton></Screen>;

  const isDeleted = Boolean(market.deletedAt);
  const isUnresolved = market.status === 'OPEN' || market.status === 'CLOSED';
  const details = action ? actionDetails[action] : null;

  return (
    <Screen>
      <View style={{ gap: spacing.sm }}>
        <AdminStatus label={isDeleted ? 'DELETED' : market.status} tone={market.status === 'OPEN' ? 'positive' : market.status === 'VOIDED' || isDeleted ? 'negative' : 'warning'} />
        <ThemedText variant="title">{market.title}</ThemedText>
        <ThemedText variant="body" style={{ opacity: 0.72 }}>{market.description}</ThemedText>
      </View>

      <View style={{ gap: spacing.sm }}>
        <AdminSectionLabel>Market details</AdminSectionLabel>
        <AdminRow title="Category" value={market.category} />
        <AdminRow title="Closes" value={closesLabel} />
        <AdminRow title="Resolution criteria" subtitle={market.resolutionCriteria} />
      </View>

      {!isDeleted && isUnresolved ? (
        <View style={{ gap: spacing.sm }}>
          <AdminSectionLabel>Trading</AdminSectionLabel>
          <AdminRow title="Override odds" onPress={() => router.push(`/admin/markets/${market.id}/odds`)} />
          <AdminRow title="Edit market" onPress={() => router.push(`/admin/markets/${market.id}/edit`)} />
          {market.status === 'OPEN' ? <AdminRow title="Close betting" onPress={() => openAction('close')} /> : null}
          {market.status === 'CLOSED' ? <AdminRow title="Reopen betting" onPress={() => openAction('reopen')} /> : null}
        </View>
      ) : null}

      {!isDeleted && isUnresolved ? (
        <View style={{ gap: spacing.sm }}>
          <AdminSectionLabel>Resolution</AdminSectionLabel>
          {market.status === 'CLOSED' ? (
            <>
              <AdminActionButton onPress={() => openAction('resolveYes')}>Resolve YES</AdminActionButton>
              <AdminActionButton onPress={() => openAction('resolveNo')}>Resolve NO</AdminActionButton>
            </>
          ) : null}
          <AdminActionButton danger onPress={() => openAction('void')}>Void and refund</AdminActionButton>
        </View>
      ) : null}

      {!isDeleted ? (
        <View style={{ gap: spacing.sm }}>
          <AdminActionButton disabled={hasOpenBets} danger onPress={() => openAction('delete')}>Delete market</AdminActionButton>
          {hasOpenBets ? <ThemedText variant="caption" style={{ color: colors.no }}>Void and refund open bets before deleting this market.</ThemedText> : null}
        </View>
      ) : null}

      {details ? (
        <ConfirmDialog
          visible
          title={details.title}
          confirmLabel={details.confirmLabel}
          destructive={details.destructive}
          isBusy={isSubmitting}
          reason={reason}
          reasonLabel={details.reason ? 'Reason' : undefined}
          errorMessage={errorMessage}
          onReasonChange={details.reason ? setReason : undefined}
          onConfirm={handleConfirm}
          onCancel={() => setAction(null)}
        />
      ) : null}
    </Screen>
  );
}
