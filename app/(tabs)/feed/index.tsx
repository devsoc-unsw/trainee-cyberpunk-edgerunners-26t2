import { useCallback, useRef, useState } from 'react';
import { FlatList, LayoutChangeEvent, Platform, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { mockMarkets } from '@/data/mock-markets';
import { colors, radius, spacing, typography } from '@/theme';
import { Market } from '@/types';

type FeedItem = {
  key: string;
  market: Market;
};

const probabilityHistory: Record<string, number[]> = {
  '1': [18, 20, 19, 22, 25, 23, 21, 22, 24],
  '2': [46, 49, 52, 50, 54, 58, 57, 53, 55],
  '3': [39, 43, 41, 47, 52, 56, 61, 64, 68],
  '4': [58, 63, 67, 65, 70, 76, 79, 77, 74],
};

function getProbabilityHistory(market: Market) {
  const currentProbability = Math.round(market.yesProbability * 100);

  return probabilityHistory[market.id] ?? [currentProbability];
}

function createBatch(batch: number): FeedItem[] {
  return mockMarkets.map((market) => ({
    key: `${batch}-${market.id}`,
    market,
  }));
}

function MarketPage({ item, height, width }: { item: FeedItem; height: number; width: number }) {
  const yes = Math.round(item.market.yesProbability * 100);
  const history = getProbabilityHistory(item.market);
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
        <Text style={styles.category}>{item.market.category}</Text>
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
  const [items, setItems] = useState(() => [...createBatch(0), ...createBatch(1)]);
  const [viewport, setViewport] = useState({ height: 0, width: 0 });
  const nextBatch = useRef(2);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    setViewport({ height, width });
  }, []);

  const loadMore = useCallback(() => {
    const batch = nextBatch.current;
    nextBatch.current += 1;
    setItems((current) => [...current, ...createBatch(batch)]);
  }, []);

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {viewport.height > 0 ? (
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
          onEndReached={loadMore}
          onEndReachedThreshold={0.75}
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
});
