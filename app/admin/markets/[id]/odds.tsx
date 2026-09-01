import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AdminActionButton, AdminField, AdminTextInput } from '@/components/admin/admin-components';
import { PlaceholderState } from '@/components/ui/placeholder-state';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { fetchMarket, overrideMarketOdds, MarketWithOutcomes } from '@/lib/supabase-data';
import { colors, spacing } from '@/theme';

export default function OverrideOddsScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [market, setMarket] = useState<MarketWithOutcomes | null>(null);
  const [yesProbability, setYesProbability] = useState(0.5);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadMarket = useCallback(async () => {
    if (!id) return;
    try {
      const result = await fetchMarket(id);
      setMarket(result);
      if (result) setYesProbability(result.yesProbability);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load market');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { void loadMarket(); }, [loadMarket]);

  const yesPercent = Math.round(yesProbability * 100);
  const noPercent = 100 - yesPercent;
  const setPercentage = (value: string, side: 'YES' | 'NO') => {
    const percentage = Math.max(0, Math.min(100, Number.parseInt(value, 10) || 0));
    setYesProbability(side === 'YES' ? percentage / 100 : 1 - percentage / 100);
  };

  const handleApply = async () => {
    if (!id) return;
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await overrideMarketOdds(id, yesPercent, reason);
      router.replace(`/admin/markets/${id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to apply odds override');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <Screen centered><ActivityIndicator color={colors.accent} /></Screen>;
  if (!market) return <Screen centered><PlaceholderState title="Market not found" description={errorMessage ?? 'Check the market ID and try again.'} /></Screen>;

  return (
    <Screen>
      <ThemedText variant="title">Override odds</ThemedText>
      <ThemedText variant="subhead">{market.title}</ThemedText>
      <View style={{ gap: spacing.md }}>
        <AdminField label="YES percentage"><AdminTextInput value={`${yesPercent}`} keyboardType="number-pad" onChangeText={(value) => setPercentage(value, 'YES')} accessibilityLabel="YES percentage" /></AdminField>
        <AdminField label="NO percentage"><AdminTextInput value={`${noPercent}`} keyboardType="number-pad" onChangeText={(value) => setPercentage(value, 'NO')} accessibilityLabel="NO percentage" /></AdminField>
        <ThemedText variant="headline">YES {yesPercent}% · NO {noPercent}%</ThemedText>
        <AdminActionButton onPress={() => setYesProbability(0.25)}>25 / 75</AdminActionButton>
        <AdminActionButton onPress={() => setYesProbability(0.5)}>50 / 50</AdminActionButton>
        <AdminActionButton onPress={() => setYesProbability(0.75)}>75 / 25</AdminActionButton>
        <AdminField label="Reason"><AdminTextInput value={reason} onChangeText={setReason} placeholder="Reason for override" multiline numberOfLines={3} accessibilityLabel="Reason for override" /></AdminField>
        {errorMessage ? <ThemedText style={{ color: colors.no }}>{errorMessage}</ThemedText> : null}
        <AdminActionButton disabled={isSubmitting} onPress={() => void handleApply()}>{isSubmitting ? 'Applying...' : 'Apply override'}</AdminActionButton>
      </View>
    </Screen>
  );
}
