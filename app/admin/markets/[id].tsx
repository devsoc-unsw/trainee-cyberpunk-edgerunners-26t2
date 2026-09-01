import { router, useLocalSearchParams } from 'expo-router';
import { Alert, ActivityIndicator, View } from 'react-native';
import { useCallback, useEffect, useState } from 'react';

import { AdminActionButton, AdminRow, AdminSectionLabel, AdminStatus } from '@/components/admin/admin-components';
import { PlaceholderState } from '@/components/ui/placeholder-state';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { fetchMarket, resolveMarket, setMarketStatus, voidMarket, deleteMarket, MarketWithOutcomes } from '@/lib/supabase-data';
import { colors, spacing } from '@/theme';

function statusTone(status: MarketWithOutcomes['status']) {
  if (status === 'OPEN') return 'positive' as const;
  if (status === 'VOIDED') return 'negative' as const;
  if (status === 'CLOSED') return 'warning' as const;
  return 'neutral' as const;
}

export default function AdminMarketDetailsScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [market, setMarket] = useState<MarketWithOutcomes | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadMarket = useCallback(async () => {
    if (!id) return;
    setErrorMessage(null);
    try {
      setMarket(await fetchMarket(id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load market');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { void loadMarket(); }, [loadMarket]);

  const runAction = async (action: () => Promise<unknown>, successMessage: string) => {
    setErrorMessage(null);
    setIsBusy(true);
    try {
      await action();
      await loadMarket();
      Alert.alert('Done', successMessage);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to complete action');
    } finally {
      setIsBusy(false);
    }
  };

  if (isLoading) return <Screen centered><ActivityIndicator color={colors.accent} /></Screen>;
  if (!market) return <Screen centered><PlaceholderState title="Market not found" description={errorMessage ?? 'Check the market ID and try again.'} /></Screen>;

  const reason = 'Admin action from UNSWager';
  const canClose = market.status === 'OPEN';
  const canReopen = market.status === 'CLOSED';
  const canResolve = market.status === 'OPEN' || market.status === 'CLOSED';
  const canVoid = market.status !== 'VOIDED' && market.status !== 'RESOLVED';

  return (
    <Screen>
      <View style={{ gap: spacing.sm }}>
        <AdminStatus label={market.status} tone={statusTone(market.status)} />
        <ThemedText variant="title">{market.title}</ThemedText>
        <ThemedText variant="body" style={{ opacity: 0.72 }}>{market.description}</ThemedText>
      </View>

      <View style={{ gap: spacing.sm }}>
        <AdminSectionLabel>Market details</AdminSectionLabel>
        <AdminRow title="Category" value={market.category} />
        <AdminRow title="Closes" value={market.closesAt} />
        <AdminRow title="Resolution criteria" subtitle={market.resolutionCriteria} />
        <AdminRow title="Current odds" value={`YES ${Math.round(market.yesProbability * 100)}% · NO ${Math.round((1 - market.yesProbability) * 100)}%`} />
      </View>

      <View style={{ gap: spacing.sm }}>
        <AdminSectionLabel>Trading</AdminSectionLabel>
        <AdminRow title="Override odds" onPress={() => router.push(`/admin/markets/${market.id}/odds`)} />
        <AdminRow title="Edit market" onPress={() => router.push(`/admin/markets/${market.id}/edit`)} />
        <AdminActionButton disabled={!canClose || isBusy} onPress={() => void runAction(() => setMarketStatus(market.id, 'CLOSED', reason), 'Betting closed')}>Close betting</AdminActionButton>
        <AdminActionButton disabled={!canReopen || isBusy} onPress={() => void runAction(() => setMarketStatus(market.id, 'OPEN', reason), 'Betting reopened')}>Reopen betting</AdminActionButton>
      </View>

      <View style={{ gap: spacing.sm }}>
        <AdminSectionLabel>Resolution</AdminSectionLabel>
        <AdminActionButton disabled={!canResolve || isBusy} onPress={() => void runAction(() => resolveMarket(market.id, 'YES', reason), 'Market resolved YES')}>Resolve YES</AdminActionButton>
        <AdminActionButton disabled={!canResolve || isBusy} onPress={() => void runAction(() => resolveMarket(market.id, 'NO', reason), 'Market resolved NO')}>Resolve NO</AdminActionButton>
        <AdminActionButton disabled={!canVoid || isBusy} danger onPress={() => void runAction(() => voidMarket(market.id, reason), 'Market voided and bets refunded')}>Void and refund</AdminActionButton>
        <AdminActionButton disabled={market.totalPool > 0 || isBusy} danger onPress={() => void runAction(async () => { await deleteMarket(market.id); router.replace('/admin/markets'); }, 'Market deleted')}>Permanently delete</AdminActionButton>
        {market.totalPool > 0 ? <ThemedText variant="caption" style={{ color: colors.no }}>Deletion is disabled while the market has a non-zero pool.</ThemedText> : null}
        {errorMessage ? <ThemedText style={{ color: colors.no }}>{errorMessage}</ThemedText> : null}
      </View>
    </Screen>
  );
}
