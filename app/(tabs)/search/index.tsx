import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { fetchMarketHistories, fetchMarkets } from '@/lib/data';
import {
  discoveryColors,
  discoveryLayout,
  radius,
  spacing,
  typography,
} from '@/theme';
import { Market, MarketPricePoint, Outcome } from '@/types';

type LeadingSnapshot = {
  outcome: Outcome;
  probability: number;
  movement: number | null;
};

function SearchIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={6.5} stroke={discoveryColors.accent} strokeWidth={2} />
      <Line
        x1={16}
        y1={16}
        x2={21}
        y2={21}
        stroke={discoveryColors.accent}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function CloseIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Line
        x1={6}
        y1={6}
        x2={18}
        y2={18}
        stroke={discoveryColors.text}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Line
        x1={18}
        y1={6}
        x2={6}
        y2={18}
        stroke={discoveryColors.text}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function MarketThumbnail() {
  return (
    <View style={styles.thumbnail} accessibilityElementsHidden>
      <Svg width={36} height={36} viewBox="0 0 36 36" fill="none">
        <Path
          d="M7 24.5l7-7 5 4 9-10"
          stroke={discoveryColors.subtle}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={27.5} cy={11.5} r={2.5} fill={discoveryColors.accent} />
      </Svg>
    </View>
  );
}

function getLeadingSnapshot(
  market: Market,
  history: MarketPricePoint[],
): LeadingSnapshot {
  const currentYes = market.yesProbability;
  const isYesLeading = currentYes >= 0.5;
  const earliestYes = history[0]?.probability;
  const hasHistory = Number.isFinite(earliestYes);
  const yesMovement = hasHistory ? currentYes - earliestYes : null;

  return {
    outcome: isYesLeading ? 'YES' : 'NO',
    probability: isYesLeading ? currentYes : 1 - currentYes,
    movement: yesMovement === null ? null : isYesLeading ? yesMovement : -yesMovement,
  };
}

function formatMovement(movement: number | null) {
  if (movement === null) return '—';
  const percentagePoints = movement * 100;
  return `${percentagePoints >= 0 ? '+' : ''}${percentagePoints.toFixed(1)}%`;
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [allMarkets, setAllMarkets] = useState<Market[]>([]);
  const [histories, setHistories] = useState<Record<string, MarketPricePoint[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const markets = await fetchMarkets();
      setAllMarkets(markets);
      setErrorMessage(null);

      try {
        setHistories(await fetchMarketHistories(markets.map((market) => market.id)));
      } catch {
        setHistories({});
      }
    } catch {
      setErrorMessage('Markets could not be loaded. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Refresh when returning to the tab so probabilities and movement stay current.
  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    void load();
  }, [load]);

  const markets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return allMarkets;

    return allMarkets.filter((market) =>
      `${market.title} ${market.category}`.toLowerCase().includes(normalizedQuery),
    );
  }, [allMarkets, query]);

  return (
    <View style={styles.container}>
      <View style={[styles.searchHeader, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.searchCapsule}>
          <SearchIcon />
          <TextInput
            accessibilityLabel="Search markets"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setQuery}
            placeholder="Search markets"
            placeholderTextColor={discoveryColors.muted}
            returnKeyType="search"
            value={query}
            style={styles.searchInput}
          />
        </View>
        <Pressable
          accessibilityLabel="Close search and return home"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.replace('/(tabs)/feed')}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
        >
          <CloseIcon />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centeredState}>
          <ActivityIndicator color={discoveryColors.accent} />
          <Text style={styles.stateDescription}>Loading markets…</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.centeredState}>
          <Text style={styles.stateTitle}>Search is unavailable</Text>
          <Text style={styles.stateDescription}>{errorMessage}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={handleRefresh}
            style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
          >
            <Text style={styles.retryLabel}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={markets}
          keyExtractor={(item) => item.id}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={discoveryColors.muted}
            />
          }
          contentContainerStyle={[
            styles.results,
            { paddingBottom: insets.bottom + discoveryLayout.tabClearance },
            markets.length === 0 && styles.emptyResults,
          ]}
          ListHeaderComponent={
            markets.length > 0 ? (
              <Text style={styles.resultCount}>
                {markets.length} {markets.length === 1 ? 'market' : 'markets'}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.centeredState}>
              <Text style={styles.stateTitle}>No markets found</Text>
              <Text style={styles.stateDescription}>Try a market title or category.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const snapshot = getLeadingSnapshot(item, histories[item.id] ?? []);
            const movementColor =
              snapshot.movement === null || snapshot.movement === 0
                ? discoveryColors.muted
                : snapshot.movement > 0
                  ? discoveryColors.yes
                  : discoveryColors.no;
            const outcomeColor =
              snapshot.outcome === 'YES' ? discoveryColors.yes : discoveryColors.no;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${item.title}`}
                onPress={() => router.push(`/markets/${item.id}`)}
                style={({ pressed }) => [styles.resultRow, pressed && styles.pressed]}
              >
                <MarketThumbnail />
                <View style={styles.resultCopy}>
                  <Text numberOfLines={2} style={styles.resultTitle}>
                    {item.title}
                  </Text>
                  <View style={styles.probabilityRow}>
                    <Text style={[styles.outcomeLabel, { color: outcomeColor }]}>
                      {snapshot.outcome}
                    </Text>
                    <Text style={styles.probabilityValue}>
                      {Math.round(snapshot.probability * 100)}%
                    </Text>
                    <Text style={[styles.movement, { color: movementColor }]}>
                      {formatMovement(snapshot.movement)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: discoveryColors.background },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: discoveryLayout.screenEdge,
    paddingBottom: spacing.md,
  },
  searchCapsule: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderColor: discoveryColors.accent,
    borderRadius: radius.full,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    color: discoveryColors.text,
    fontSize: 16,
    lineHeight: 21,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: discoveryColors.surface,
  },
  results: { paddingHorizontal: discoveryLayout.screenEdge },
  emptyResults: { flexGrow: 1 },
  resultCount: {
    ...typography.caption,
    color: discoveryColors.muted,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  resultRow: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: discoveryColors.border,
  },
  thumbnail: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: discoveryColors.thumbnail,
  },
  resultCopy: { flex: 1, gap: spacing.sm },
  resultTitle: {
    color: discoveryColors.text,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
  },
  probabilityRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  outcomeLabel: { ...typography.caption, fontWeight: '800', letterSpacing: 0.5 },
  probabilityValue: {
    ...typography.subhead,
    color: discoveryColors.text,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  movement: { ...typography.caption, fontVariant: ['tabular-nums'] },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  stateTitle: { ...typography.headline, color: discoveryColors.text, textAlign: 'center' },
  stateDescription: {
    ...typography.subhead,
    color: discoveryColors.muted,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
    backgroundColor: discoveryColors.accent,
  },
  retryLabel: { ...typography.headline, color: discoveryColors.accentText },
  pressed: { opacity: 0.68 },
});
