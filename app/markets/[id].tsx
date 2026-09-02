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
      <View style={{ gap: spacing.md }}>
        <ThemedText
          variant="caption"
          style={{
            alignSelf: 'flex-start',
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
            color: colors.accent,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.full,
            fontWeight: '700',
            letterSpacing: 0.5,
          }}
        >
          {market.category.toUpperCase()} · {market.status}
        </ThemedText>
  
        <ThemedText variant="title">
          {market.title}
        </ThemedText>
  
        <ThemedText
          variant="body"
          style={{
            color: colors.muted,
            lineHeight: 22,
          }}
        >
          {market.description}
        </ThemedText>
      </View>
  
      <View
        style={{
          gap: spacing.md,
          padding: spacing.lg,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
        }}
      >
        <ThemedText
          variant="caption"
          style={{
            color: colors.muted,
            fontWeight: '700',
            letterSpacing: 0.8,
          }}
        >
          RESOLUTION CRITERIA
        </ThemedText>
  
        <ThemedText
          variant="body"
          style={{ lineHeight: 22 }}
        >
          {market.resolutionCriteria}
        </ThemedText>
  
        <View
          style={{
            height: 1,
            backgroundColor: colors.border,
          }}
        />
  
        <ThemedText
          variant="subhead"
          style={{ color: colors.muted }}
        >
          Closes {market.closesAt}
        </ThemedText>
  
        {market.status === 'RESOLVED' ? (
          <ThemedText
            variant="subhead"
            style={{
              alignSelf: 'flex-start',
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              color: colors.yes,
              backgroundColor: '#173D30',
              borderRadius: radius.full,
              fontWeight: '700',
            }}
          >
            Resolved {market.resolvedOutcome}
          </ThemedText>
        ) : null}
      </View>
  
      <View
        style={{
          gap: spacing.lg,
          padding: spacing.lg,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
        }}
      >
        <ThemedText variant="headline">
          Make a prediction
        </ThemedText>
  
        <View
          style={{
            flexDirection: 'row',
            gap: spacing.md,
          }}
        >
          {(['YES', 'NO'] as Outcome[]).map((outcome) => {
            const item = outcome === 'YES' ? yes : no;
            const selected = selectedOutcome === outcome;
  
            return (
              <Pressable
                key={outcome}
                disabled={!canBet}
                onPress={() => setSelectedOutcome(outcome)}
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 112,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing.xs,
                  padding: spacing.lg,
                  backgroundColor: selected
                    ? outcome === 'YES'
                      ? '#173D30'
                      : '#452427'
                    : colors.surface,
                  borderWidth: selected ? 2 : 1,
                  borderColor:
                    outcome === 'YES'
                      ? colors.yes
                      : colors.no,
                  borderRadius: radius.lg,
                  borderCurve: 'continuous',
                  opacity: !canBet
                    ? 0.5
                    : pressed
                      ? 0.72
                      : 1,
                })}
              >
                <ThemedText
                  variant="caption"
                  style={{
                    color:
                      outcome === 'YES'
                        ? colors.yes
                        : colors.no,
                    fontWeight: '700',
                    letterSpacing: 0.8,
                  }}
                >
                  {outcome}
                </ThemedText>
  
                <ThemedText
                  variant="title"
                  style={{
                    color:
                      outcome === 'YES'
                        ? colors.yes
                        : colors.no,
                  }}
                >
                  {item
                    ? `${Math.round(
                        (item.pool / Math.max(market.totalPool, 1)) * 100,
                      )}%`
                    : '0%'}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
  
        <View
          style={{
            gap: spacing.xs,
            padding: spacing.md,
            backgroundColor: colors.border,
            borderRadius: radius.md,
            borderCurve: 'continuous',
          }}
        >
          <ThemedText
            variant="caption"
            style={{ color: colors.muted }}
          >
            AVAILABLE BALANCE
          </ThemedText>
  
          <ThemedText
            variant="subhead"
            style={{ fontWeight: '700' }}
          >
            {(balance ?? 0).toLocaleString()} credits
          </ThemedText>
  
          <ThemedText
            variant="caption"
            style={{ color: colors.muted }}
          >
            Maximum stake: {maxStake.toLocaleString()} credits
          </ThemedText>
        </View>
  
        <View style={{ gap: spacing.sm }}>
          <ThemedText
            variant="subhead"
            style={{ fontWeight: '600' }}
          >
            Stake amount
          </ThemedText>
  
          <TextInput
            accessibilityLabel="Stake amount"
            editable={canBet && !isSubmitting}
            keyboardType="number-pad"
            onChangeText={setStakeInput}
            placeholder="Stake in credits"
            placeholderTextColor={colors.inputPlaceholder}
            value={stakeInput}
            style={{
              height: 54,
              paddingHorizontal: spacing.lg,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: radius.md,
              color: colors.inputText,
              fontSize: 16,
              fontWeight: '600',
            }}
          />
        </View>
  
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.sm,
          }}
        >
          {[10, 25, 50, 100]
            .filter((value) => value <= maxStake)
            .map((value) => (
              <Pressable
                key={value}
                disabled={!canBet}
                onPress={() => setStakeInput(String(value))}
                style={({ pressed }) => ({
                  minWidth: 68,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: radius.full,
                  opacity: !canBet
                    ? 0.5
                    : pressed
                      ? 0.72
                      : 1,
                })}
              >
                <ThemedText
                  variant="caption"
                  style={{ fontWeight: '700' }}
                >
                  {value} cr
                </ThemedText>
              </Pressable>
            ))}
        </View>
  
        {errorMessage ? (
          <ThemedText
            style={{
              padding: spacing.md,
              color: colors.no,
              backgroundColor: '#452427',
              borderRadius: radius.md,
            }}
          >
            {errorMessage}
          </ThemedText>
        ) : null}
  
        {successMessage ? (
          <ThemedText
            style={{
              padding: spacing.md,
              color: colors.yes,
              backgroundColor: '#173D30',
              borderRadius: radius.md,
            }}
          >
            {successMessage}
          </ThemedText>
        ) : null}
  
        <Pressable
          disabled={!canBet || isSubmitting}
          onPress={() => void handlePlaceBet()}
          style={({ pressed }) => ({
            minHeight: 54,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: spacing.lg,
            backgroundColor: colors.accent,
            borderRadius: radius.md,
            borderCurve: 'continuous',
            opacity:
              !canBet || isSubmitting
                ? 0.45
                : pressed
                  ? 0.72
                  : 1,
          })}
        >
          <ThemedText
            style={{
              color: colors.accentText,
              fontWeight: '700',
            }}
          >
            {isSubmitting
              ? 'Placing bet...'
              : canBet
                ? 'Place prediction'
                : 'Betting is closed'}
          </ThemedText>
        </Pressable>
      </View>
    </Screen>
  );
}
