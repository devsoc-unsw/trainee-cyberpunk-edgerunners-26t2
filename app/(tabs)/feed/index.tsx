import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  LayoutChangeEvent,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { fetchMarkets, MarketWithOutcomes } from '@/lib/supabase-data';
import { colors, radius, spacing, typography } from '@/theme';
import { BalanceHeader } from '@/components/ui/balance-header';
import { PlaceholderState } from '@/components/ui/placeholder-state';
import { ThemedText } from '@/components/ui/themed-text';

const probabilityHistory: Record<string, number[]> = {
  '10000000-0000-0000-0000-000000000001': [18, 20, 19, 22, 25, 23, 21, 22, 24],
  '10000000-0000-0000-0000-000000000002': [46, 49, 52, 50, 54, 58, 57, 53, 55],
  '10000000-0000-0000-0000-000000000003': [39, 43, 41, 47, 52, 56, 61, 64, 68],
  '10000000-0000-0000-0000-000000000004': [58, 63, 67, 65, 70, 76, 79, 77, 74],
};

function getProbabilityHistory(market: MarketWithOutcomes) {
  const currentProbability = Math.round(market.yesProbability * 100);
  return probabilityHistory[market.id] ?? [Math.max(0, currentProbability - 4), currentProbability];
}

function MarketPage({ market, height, width }: { market: MarketWithOutcomes; height: number; width: number }) {
  const yes = Math.round(market.yesProbability * 100);
  const history = getProbabilityHistory(market);
  const change = yes - history[0];
  const chartHeight = Math.min(160, Math.max(112, height * 0.2));
  const chartWidth = Math.max(240, width - spacing.xl * 2);

  return (
    <View style={[styles.page, { height }]}>
      <View style={styles.chartSection} pointerEvents="none">
        <View style={styles.priceRow}>
          <View>
            <Text style={styles.priceLabel}>YES price</Text>
            <View style={styles.priceValueRow}>
              <Text style={styles.priceValue}>{yes}%</Text>
              <Text style={styles.priceChange}>
                {change >= 0 ? '+' : ''}
                {change}%
              </Text>
            </View>
          </View>

          <View style={styles.ranges}>
            {['1H', '1D', '1W', 'ALL'].map((range) => (
              <View key={range} style={[styles.range, range === '1W' && styles.activeRange]}>
                <Text style={[styles.rangeLabel, range === '1W' && styles.activeRangeLabel]}>{range}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.chart}>
          <LineChart
            data={history.map((value) => ({ value }))}
            width={chartWidth}
            height={chartHeight}
            maxValue={100}
            adjustToWidth
            disableScroll
            initialSpacing={0}
            endSpacing={0}
            yAxisLabelWidth={0}
            curved
            areaChart
            color={colors.accent}
            thickness={2}
            startFillColor={colors.accent}
            endFillColor={colors.accent}
            startOpacity={0.3}
            endOpacity={0}
            hideRules
            gradientDirection="vertical"
            hideDataPoints
            hideYAxisText
            hideAxesAndRules
          />
        </View>

        <View style={styles.dateRow}>
          <Text style={styles.dateLabel}>Recent</Text>
          <Text style={styles.dateLabel}>Now</Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${market.title}`}
        onPress={() => router.push(`/markets/${market.id}`)}
        style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
      >
        <View style={styles.marketHeader}>
          <Text style={styles.category}>{market.category}</Text>
          <Text style={styles.title} numberOfLines={4}>{market.title}</Text>
        </View>

        <View style={styles.outcomes}>
          <View style={[styles.outcome, styles.yesOutcome]}>
            <Text style={styles.outcomeLabel}>YES</Text>
            <Text style={styles.yesValue}>{yes}%</Text>
          </View>
          <View style={[styles.outcome, styles.noOutcome]}>
            <Text style={styles.outcomeLabel}>NO</Text>
            <Text style={styles.noValue}>{100 - yes}%</Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

export default function FeedScreen() {
  const [markets, setMarkets] = useState<MarketWithOutcomes[]>([]);
  const [viewport, setViewport] = useState({ height: 0, width: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadMarkets = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMessage(null);

    try {
      setMarkets(await fetchMarkets());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load markets');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadMarkets();
  }, [loadMarkets]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    setViewport({ height, width });
  }, []);

  if (isLoading) {
    return (
      <View
        style={[
          styles.centered,
          {
            gap: spacing.md,
            padding: spacing.xl,
            backgroundColor: colors.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colors.accent}
        />
  
        <ThemedText
          variant="subhead"
          style={{ color: colors.muted }}
        >
          Loading markets...
        </ThemedText>
      </View>
    );
  }
  
  if (errorMessage) {
    return (
      <View
        style={[
          styles.centered,
          {
            gap: spacing.lg,
            padding: spacing.xl,
            backgroundColor: colors.background,
          },
        ]}
      >
        <PlaceholderState
          title="Could not load markets"
          description={errorMessage}
        />
  
        <Pressable
          onPress={() => void loadMarkets()}
          style={({ pressed }) => ({
            minHeight: 44,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
            backgroundColor: colors.accent,
            borderRadius: radius.md,
            borderCurve: 'continuous',
            opacity: pressed ? 0.72 : 1,
          })}
        >
          <ThemedText
            variant="subhead"
            style={{
              color: colors.accentText,
              fontWeight: '700',
            }}
          >
            Try again
          </ThemedText>
        </Pressable>
      </View>
    );
  }
  
  if (markets.length === 0) {
    return (
      <View
        style={[
          styles.centered,
          {
            padding: spacing.xl,
            backgroundColor: colors.background,
          },
        ]}
      >
        <PlaceholderState
          title="No markets yet"
          description="New predictions will appear here when an admin publishes them."
        />
      </View>
    );
  }

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <View style={styles.balanceHeader} pointerEvents="box-none"><BalanceHeader /></View>
      {viewport.height > 0 ? (
        <FlatList
          data={markets}
          renderItem={({ item }) => <MarketPage market={item} height={viewport.height} width={viewport.width} />}
          keyExtractor={(item) => item.id}
          getItemLayout={(_, index) => ({ length: viewport.height, offset: viewport.height * index, index })}
          snapToInterval={viewport.height}
          snapToAlignment="start"
          disableIntervalMomentum
          decelerationRate="fast"
          directionalLockEnabled
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadMarkets(true)} tintColor={colors.accent} />}
          initialNumToRender={2}
          maxToRenderPerBatch={3}
          windowSize={3}
          contentInsetAdjustmentBehavior="automatic"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl, backgroundColor: colors.background },
  page: {
    gap: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: Platform.select({ web: spacing.xl + spacing.xxxl + spacing.lg, ios: spacing.xxxl + spacing.lg, default: spacing.xl }),
    paddingBottom: Platform.select({ ios: spacing.xxxl * 2, default: spacing.lg }),
  },
  marketHeader: { gap: spacing.md },
  category: { ...typography.caption, color: colors.accent },
  title: { color: colors.text, fontSize: 30, lineHeight: 35, fontWeight: '700', letterSpacing: -0.4 },
  chartSection: { flex: 1, gap: spacing.sm, justifyContent: 'center' },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.lg },
  priceLabel: { ...typography.caption, color: colors.muted },
  priceValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  priceValue: { color: colors.text, fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.4 },
  priceChange: { ...typography.subhead, color: colors.yes, fontWeight: '600' },
  ranges: { flexDirection: 'row', gap: spacing.xs },
  range: { minWidth: 32, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full, alignItems: 'center' },
  activeRange: { backgroundColor: colors.surface },
  rangeLabel: { ...typography.caption, color: colors.muted },
  activeRangeLabel: { color: colors.text },
  chart: { alignItems: 'center', overflow: 'hidden' },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dateLabel: { ...typography.caption, color: colors.muted },
  outcomes: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  outcome: { flex: 1, gap: spacing.sm, padding: spacing.lg, borderWidth: 1, borderRadius: radius.lg },
  yesOutcome: { borderColor: colors.yes },
  noOutcome: { borderColor: colors.no },
  outcomeLabel: { ...typography.caption, color: colors.text },
  yesValue: { ...typography.title, color: colors.yes },
  noValue: { ...typography.title, color: colors.no },
  balanceHeader: { position: 'absolute', top: spacing.xxxl, left: spacing.xl, zIndex: 1 },
});
