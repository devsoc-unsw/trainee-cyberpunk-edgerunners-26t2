import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, LayoutChangeEvent, Platform, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useFocusEffect } from 'expo-router';

import { fetchMarketHistories, fetchMarkets } from '@/lib/data';
import { colors, radius, spacing, typography } from '@/theme';
import { Market, MarketPricePoint } from '@/types';
import { BalanceHeader } from '@/components/ui/balance-header';
import { MarketCountdown } from '@/components/ui/market-countdown';

type FeedItem = {
  key: string;
  market: Market;
  history: MarketPricePoint[];
};

// A sparkline this size cannot show more than a few dozen points legibly, and a
// busy market accumulates one per bet, so chart only the most recent stretch.
const MAX_CHART_POINTS = 60;

function getChartValues(item: FeedItem) {
  const values = item.history
    .slice(-MAX_CHART_POINTS)
    .map((point) => Math.round(point.probability * 100));

  // A market with no recorded history yet still needs a line to draw. Falling
  // back to the current probability gives a flat one rather than an empty card.
  if (values.length === 0) {
    return [Math.round(item.market.yesProbability * 100)];
  }

  return values;
}

function MarketPage({ item, height, width }: { item: FeedItem; height: number; width: number }) {
  const yes = Math.round(item.market.yesProbability * 100);
  const history = getChartValues(item);
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
              <Text style={styles.priceValue}>{yes}¢</Text>
              <Text style={styles.priceChange}>
                {change >= 0 ? '+' : ''}
                {change}¢
              </Text>
            </View>
          </View>

          <View style={styles.ranges}>
            {['1H', '1D', '1W', 'ALL'].map((range) => (
              <View key={range} style={[styles.range, range === '1W' && styles.activeRange]}>
                <Text style={[styles.rangeLabel, range === '1W' && styles.activeRangeLabel]}>
                  {range}
                </Text>
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
          <Text style={styles.dateLabel}>20 Aug</Text>
          <Text style={styles.dateLabel}>23 Aug</Text>
          <Text style={styles.dateLabel}>Now</Text>
        </View>
      </View>

      <View style={styles.marketHeader}>
        <View style={styles.categoryRow}>
          <Text style={styles.category}>{item.market.category}</Text>
          <MarketCountdown
            closesAt={item.market.closesAt}
            status={item.market.status}
            variant="caption"
          />
        </View>
        <Text style={styles.title} numberOfLines={4}>
          {item.market.title}
        </Text>
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
    </View>
  );
}

export default function FeedScreen() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [histories, setHistories] = useState<Record<string, MarketPricePoint[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewport, setViewport] = useState({ height: 0, width: 0 });

  // Refetched on focus so returning from placing a bet shows the new point
  // rather than the chart the screen was mounted with.
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      void fetchMarkets()
        .then(async (nextMarkets) => {
          if (!isMounted) return;

          setMarkets(nextMarkets);
          setErrorMessage(null);

          // A failure here costs the chart its history, not the feed itself, so
          // it falls back to a flat line instead of blanking the screen.
          try {
            const nextHistories = await fetchMarketHistories(
              nextMarkets.map((market) => market.id),
            );

            if (isMounted) setHistories(nextHistories);
          } catch {
            if (isMounted) setHistories({});
          }
        })
        .catch(() => {
          if (isMounted) {
            setErrorMessage('Markets could not be loaded. Please try again.');
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
    }, []),
  );

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    setViewport({ height, width });
  }, []);

  const items: FeedItem[] = markets.map((market) => ({
    key: market.id,
    market,
    history: histories[market.id] ?? [],
  }));

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <View style={styles.balanceHeader} pointerEvents='box-none'>
        <BalanceHeader />
      </View>
      {isLoading ? (
        <View style={styles.centeredState}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : errorMessage ? (
        <View style={styles.centeredState}>
          <Text style={styles.stateText}>{errorMessage}</Text>
        </View>
      ) : viewport.height > 0 ? (
        <FlatList
          data={items}
          renderItem={({ item }) => (
            <MarketPage item={item} height={viewport.height} width={viewport.width} />
          )}
          keyExtractor={(item) => item.key}
          getItemLayout={(_, index) => ({
            length: viewport.height,
            offset: viewport.height * index,
            index,
          })}
          snapToInterval={viewport.height}
          snapToAlignment="start"
          disableIntervalMomentum
          decelerationRate="fast"
          directionalLockEnabled
          showsVerticalScrollIndicator={false}
          initialNumToRender={2}
          maxToRenderPerBatch={3}
          windowSize={3}
          // "never", not "automatic": this list pages by whole screens, and
          // snapToInterval/getItemLayout are both measured from the container.
          // An automatic safe-area inset shifts the content down without
          // changing those measurements, so the first page opened below its
          // start and every snap was off by the inset. The page style already
          // pads for the notch and the balance header.
          contentInsetAdjustmentBehavior="never"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  page: {
    gap: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: Platform.select({
      web: spacing.xl + spacing.xxxl + spacing.lg,
      ios: spacing.xxxl + spacing.lg,
      default: spacing.xl,
    }),
    paddingBottom: Platform.select({
      ios: spacing.xxxl * 2,
      default: spacing.lg,
    }),
  },
  marketHeader: {
    gap: spacing.md,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  category: {
    ...typography.caption,
    color: colors.accent,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 35,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  chartSection: {
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  priceLabel: {
    ...typography.caption,
    color: colors.muted,
  },
  priceValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  priceValue: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  priceChange: {
    ...typography.subhead,
    color: colors.yes,
    fontWeight: '600',
  },
  ranges: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  range: {
    minWidth: 32,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  activeRange: {
    backgroundColor: colors.surface,
  },
  rangeLabel: {
    ...typography.caption,
    color: colors.muted,
  },
  activeRangeLabel: {
    color: colors.text,
  },
  chart: {
    alignItems: 'center',
    overflow: 'hidden',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateLabel: {
    ...typography.caption,
    color: colors.muted,
  },
  outcomes: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  outcome: {
    flex: 1,
    gap: spacing.sm,
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  yesOutcome: {
    borderColor: colors.yes,
  },
  noOutcome: {
    borderColor: colors.no,
  },
  outcomeLabel: {
    ...typography.caption,
    color: colors.text,
  },
  yesValue: {
    ...typography.title,
    color: colors.yes,
  },
  noValue: {
    ...typography.title,
    color: colors.no,
  },
  balanceHeader: {
    position: 'absolute',
    top: spacing.xxxl,
    left: spacing.xl,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  stateText: {
    ...typography.subhead,
    textAlign: 'center',
  },
});
