import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';

import { PlaceholderState } from '@/components/ui/placeholder-state';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { fetchMarket, getOutcome, maxStakeForBalance, placeBet, MarketWithOutcomes } from '@/lib/supabase-data';
import { useBalance } from '@/state/balance';
import { colors, radius, spacing } from '@/theme';
import { Outcome } from '@/types';

export default function MarketDetailsScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { balance, setBalance } = useBalance();
  const [market, setMarket] = useState<MarketWithOutcomes | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<Outcome | null>(null);
  const [stakeInput, setStakeInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadMarket = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      setMarket(await fetchMarket(id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load this market');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadMarket();
  }, [loadMarket]);

  const maxStake = maxStakeForBalance(balance ?? 0);
  const canBet = Boolean(market && market.status === 'OPEN' && new Date(market.closesAtIso).getTime() > Date.now());
  const selectedMarketOutcome = useMemo(
    () => (market && selectedOutcome ? getOutcome(market, selectedOutcome) : null),
    [market, selectedOutcome],
  );

  const handlePlaceBet = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedOutcome || !selectedMarketOutcome) {
      setErrorMessage('Choose YES or NO first');
      return;
    }

    const stake = Number.parseInt(stakeInput, 10);
    if (!Number.isSafeInteger(stake) || stake < 10) {
      setErrorMessage('Enter a whole-number stake of at least 10 credits');
      return;
    }
    if (stake > maxStake) {
      setErrorMessage(`Your maximum stake is ${maxStake.toLocaleString()} credits`);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await placeBet(selectedMarketOutcome.id, stake);
      setBalance(result.balance);
      setStakeInput('');
      setSuccessMessage(`Bet placed. Your new balance is ${result.balance.toLocaleString()} credits.`);
      await loadMarket();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to place bet');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <Screen centered><ActivityIndicator color={colors.accent} /></Screen>;
  }

  if (errorMessage && !market) {
    return <Screen centered><PlaceholderState title="Could not load market" description={errorMessage} /><Pressable onPress={() => void loadMarket()}><ThemedText variant="subhead" style={{ color: colors.accent }}>Try again</ThemedText></Pressable></Screen>;
  }

  if (!market) {
    return <Screen centered><PlaceholderState title="Market not found" description="Check the market ID and try again." /></Screen>;
  }

  const yes = getOutcome(market, 'YES');
  const no = getOutcome(market, 'NO');

  return (
    <Screen>
      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="caption" style={{ color: colors.accent }}>{market.category.toUpperCase()} · {market.status}</ThemedText>
        <ThemedText variant="title">{market.title}</ThemedText>
        <ThemedText variant="body" style={{ opacity: 0.72 }}>{market.description}</ThemedText>
      </View>

      <View style={{ gap: spacing.sm, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, borderCurve: 'continuous' }}>
        <ThemedText variant="caption">RESOLUTION CRITERIA</ThemedText>
        <ThemedText variant="body">{market.resolutionCriteria}</ThemedText>
        <ThemedText variant="subhead">Closes {market.closesAt}</ThemedText>
        {market.status === 'RESOLVED' ? <ThemedText variant="subhead" style={{ color: colors.yes }}>Resolved {market.resolvedOutcome}</ThemedText> : null}
      </View>

      <View style={{ gap: spacing.md }}>
        <ThemedText variant="headline">Make a prediction</ThemedText>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          {(['YES', 'NO'] as Outcome[]).map((outcome) => {
            const item = outcome === 'YES' ? yes : no;
            const selected = selectedOutcome === outcome;
            return (
              <Pressable
                key={outcome}
                disabled={!canBet}
                onPress={() => setSelectedOutcome(outcome)}
                style={{ flex: 1, gap: spacing.xs, padding: spacing.lg, borderWidth: 1, borderColor: outcome === 'YES' ? colors.yes : colors.no, borderRadius: radius.lg, backgroundColor: selected ? (outcome === 'YES' ? '#173D30' : '#452427') : colors.surface, opacity: canBet ? 1 : 0.5 }}
              >
                <ThemedText variant="caption">{outcome}</ThemedText>
                <ThemedText variant="title" style={{ color: outcome === 'YES' ? colors.yes : colors.no }}>{item ? `${Math.round((item.pool / Math.max(market.totalPool, 1)) * 100)}%` : '0%'}</ThemedText>
              </Pressable>
            );
          })}
        </View>

        <ThemedText variant="subhead">Balance: {(balance ?? 0).toLocaleString()} credits · Max stake: {maxStake.toLocaleString()}</ThemedText>
        <TextInput
          accessibilityLabel="Stake amount"
          editable={canBet && !isSubmitting}
          keyboardType="number-pad"
          onChangeText={setStakeInput}
          placeholder="Stake in credits"
          placeholderTextColor={colors.inputPlaceholder}
          value={stakeInput}
          style={{ height: 52, paddingHorizontal: spacing.lg, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, color: colors.inputText, fontSize: 16 }}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {[10, 25, 50, 100].filter((value) => value <= maxStake).map((value) => (
            <Pressable key={value} disabled={!canBet} onPress={() => setStakeInput(String(value))} style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, opacity: canBet ? 1 : 0.5 }}>
              <ThemedText variant="caption">{value} cr</ThemedText>
            </Pressable>
          ))}
        </View>
        {errorMessage ? <ThemedText style={{ color: colors.no }}>{errorMessage}</ThemedText> : null}
        {successMessage ? <ThemedText style={{ color: colors.yes }}>{successMessage}</ThemedText> : null}
        <Pressable disabled={!canBet || isSubmitting} onPress={() => void handlePlaceBet()} style={({ pressed }) => ({ minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.accent, opacity: !canBet || isSubmitting ? 0.45 : pressed ? 0.72 : 1 })}>
          <ThemedText style={{ color: colors.accentText, fontWeight: '700' }}>{isSubmitting ? 'Placing bet...' : canBet ? 'Place prediction' : 'Betting is closed'}</ThemedText>
        </Pressable>
      </View>
    </Screen>
  );
}
