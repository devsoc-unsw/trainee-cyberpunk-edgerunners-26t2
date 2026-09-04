import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';

import { PlaceholderState } from '@/components/ui/placeholder-state';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { fetchMarket, placeBet } from '@/lib/data';
import { useBalance } from '@/state/balance';
import { useCountdown } from '@/state/countdown';
import { Market } from '@/types';
import { colors, radius, spacing } from '@/theme';

export default function MarketDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [market, setMarket] = useState<Market | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string | null>(null);
  const [stakeText, setStakeText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { setBalance } = useBalance();
  const countdown = useCountdown(market?.closesAt);

  // The countdown can reach zero while the screen is open, before any refetch.
  // Treat that as closed straight away so betting stops at the deadline.
  const isClosed = market !== null && (market.status !== 'OPEN' || countdown.isExpired);

  useEffect(() => {
    if (!id) {
      return;
    }

    let isMounted = true;

    void fetchMarket(id)
      .then((nextMarket) => {
        if (isMounted) {
          setMarket(nextMarket);
          setSelectedOutcomeId(nextMarket?.outcomes?.[0]?.id ?? null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setErrorMessage('This market could not be loaded. Please try again.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handlePlaceBet = async () => {
    const stake = Number.parseInt(stakeText.trim(), 10);

    setErrorMessage(null);
    setSuccessMessage(null);

    if (isClosed) {
      setErrorMessage('This market has closed. No further predictions can be placed.');
      return;
    }

    if (!selectedOutcomeId) {
      setErrorMessage('Choose YES or NO first.');
      return;
    }

    if (!Number.isSafeInteger(stake) || stake < 10) {
      setErrorMessage('Enter a whole-number stake of at least 10 credits.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await placeBet(selectedOutcomeId, stake);
      setBalance(result.balance);
      setStakeText('');
      setSuccessMessage(`Prediction placed. Your balance is ${result.balance.toLocaleString()} credits.`);

      try {
        const nextMarket = await fetchMarket(id);
        setMarket(nextMarket);
      } catch {
        // The bet has already been committed. The next screen visit will refresh market odds.
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Prediction could not be placed.');
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

  if (errorMessage && !market) {
    return (
      <Screen centered>
        <PlaceholderState title="Market unavailable" description={errorMessage} />
      </Screen>
    );
  }

  if (!market) {
    return (
      <Screen centered>
        <PlaceholderState title="Market not found" description="Check the market ID and try again." />
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <Screen automaticallyAdjustKeyboardInsets>
        <View style={{ gap: spacing.sm }}>
          <ThemedText variant="caption" style={{ color: colors.accent }}>
            {market.category.toUpperCase()} · {market.status}
          </ThemedText>
          <ThemedText variant="title">{market.title}</ThemedText>
          <ThemedText variant="body" style={{ opacity: 0.72 }}>
            {market.description}
          </ThemedText>
        </View>

        <View
          style={{
            gap: spacing.sm,
            padding: spacing.lg,
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            borderCurve: 'continuous',
          }}
        >
          <ThemedText variant="caption">RESOLUTION CRITERIA</ThemedText>
          <ThemedText variant="body">{market.resolutionCriteria}</ThemedText>
          <ThemedText variant="subhead" style={{ color: isClosed ? colors.no : colors.accent }}>
            {isClosed ? 'Betting is closed' : `Closes in ${countdown.label}`}
          </ThemedText>
        </View>

        <View style={{ gap: spacing.md }}>
          <View style={{ gap: spacing.sm }}>
            <ThemedText variant="title">Make a prediction</ThemedText>
            <ThemedText variant="subhead">
              {isClosed
                ? 'This market is no longer taking predictions.'
                : 'Choose YES or NO, then enter your stake.'}
            </ThemedText>
          </View>

          <View style={{ gap: spacing.sm }}>
            {market.outcomes?.map((outcome) => {
              const isSelected = outcome.id === selectedOutcomeId;
              const isYes = outcome.name === 'YES';

              return (
                <Pressable
                  key={outcome.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected, disabled: isClosed }}
                  disabled={isClosed}
                  onPress={() => setSelectedOutcomeId(outcome.id)}
                  style={({ pressed }) => ({
                    gap: spacing.xs,
                    padding: spacing.lg,
                    backgroundColor: colors.surface,
                    borderColor: isSelected ? (isYes ? colors.yes : colors.no) : colors.border,
                    borderWidth: 1,
                    borderRadius: radius.md,
                    opacity: isClosed ? 0.48 : pressed ? 0.72 : 1,
                  })}
                >
                  <ThemedText variant="caption">{outcome.name}</ThemedText>
                  <ThemedText variant="headline">
                    {Math.round((isYes ? market.yesProbability : 1 - market.yesProbability) * 100)}%
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            accessibilityLabel="Stake in credits"
            editable={!isClosed}
            keyboardType="number-pad"
            onChangeText={setStakeText}
            placeholder="Stake in credits"
            placeholderTextColor={colors.inputPlaceholder}
            value={stakeText}
            style={{
              height: 52,
              paddingHorizontal: spacing.lg,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: radius.md,
              color: colors.inputText,
              fontSize: 16,
            }}
          />

          {errorMessage ? <ThemedText style={{ color: colors.no }}>{errorMessage}</ThemedText> : null}
          {successMessage ? <ThemedText style={{ color: colors.yes }}>{successMessage}</ThemedText> : null}

          <Pressable
            accessibilityRole="button"
            disabled={isSubmitting || isClosed}
            onPress={handlePlaceBet}
            style={({ pressed }) => ({
              minHeight: 50,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.md,
              backgroundColor: colors.accent,
              opacity: isClosed ? 0.48 : isSubmitting || pressed ? 0.72 : 1,
            })}
          >
            <ThemedText style={{ color: colors.accentText, fontWeight: '700' }}>
              {isClosed ? 'Market closed' : isSubmitting ? 'Placing prediction…' : 'Place prediction'}
            </ThemedText>
          </Pressable>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
