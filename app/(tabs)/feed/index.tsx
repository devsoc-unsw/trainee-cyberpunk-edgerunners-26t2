import { useEvent } from 'expo';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BalanceHeader } from '@/components/ui/balance-header';
import { BetSheet } from '@/components/ui/bet-sheet';
import { MarketCountdown } from '@/components/ui/market-countdown';
import { fetchMarketHistories, fetchMarkets } from '@/lib/data';
import { getVideoPublicUrl } from '@/lib/market-video';
import { useAccessibility } from '@/state/accessibility';
import {
  discoveryColors,
  discoveryLayout,
  radius,
  spacing,
  typography,
} from '@/theme';
import { Market, MarketPricePoint, Outcome } from '@/types';

type FeedItem = { key: string; market: Market; history: MarketPricePoint[] };
type DiscoveryCategory = 'All' | 'Crypto' | 'Sports' | 'STEM' | 'Politics';
type MarketPageProps = {
  item: FeedItem;
  height: number;
  width: number;
  headerClearance: number;
  bottomInset: number;
  shouldLoadVideo: boolean;
  shouldPlayVideo: boolean;
  muted: boolean;
  onToggleMuted: () => void;
  onSelectOutcome: (market: Market, outcome: Outcome) => void;
};

const DISCOVERY_CATEGORIES: DiscoveryCategory[] = [
  'All',
  'Crypto',
  'Sports',
  'STEM',
  'Politics',
];
const MAX_CHART_POINTS = 60;
const VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 100,
  minimumViewTime: 80,
};

function MarketChart({
  item,
  height,
  width,
}: {
  item: FeedItem;
  height: number;
  width: number;
}) {
  const yes = Math.round(item.market.yesProbability * 100);
  const history = item.history
    .slice(-MAX_CHART_POINTS)
    .map((point) => Math.round(point.probability * 100));
  const values = history.length ? history : [yes];
  const change = yes - values[0];

  return (
    <View style={styles.chartSection} pointerEvents="none">
      <View style={styles.priceRow}>
        <View>
          <Text style={styles.priceLabel}>YES price</Text>
          <View style={styles.priceValueRow}>
            <Text style={styles.priceValue}>{yes}¢</Text>
            <Text style={[styles.priceChange, change < 0 && styles.negativeChange]}>
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
          data={values.map((value) => ({ value }))}
          width={Math.max(240, width - discoveryLayout.screenEdge * 2)}
          height={Math.min(170, Math.max(88, height * 0.18))}
          maxValue={100}
          adjustToWidth
          disableScroll
          initialSpacing={0}
          endSpacing={0}
          yAxisLabelWidth={0}
          curved
          areaChart
          color={discoveryColors.accent}
          thickness={2}
          startFillColor={discoveryColors.accent}
          endFillColor={discoveryColors.accent}
          startOpacity={0.28}
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
  );
}

function MarketVideo({
  path,
  active,
  muted,
  onError,
}: {
  path: string;
  active: boolean;
  muted: boolean;
  onError: () => void;
}) {
  const player = useVideoPlayer(
    { uri: getVideoPublicUrl(path), useCaching: true },
    (next) => {
      next.loop = true;
      next.muted = muted;
    },
  );
  const { status } = useEvent(player, 'statusChange', {
    status: player.status,
  });

  useEffect(() => {
    if (active && status !== 'error') player.play();
    else player.pause();
  }, [active, player, status]);
  useEffect(() => {
    if (status === 'error') onError();
  }, [onError, status]);

  if (status === 'error') return null;
  return (
    <VideoView
      contentFit="cover"
      nativeControls={false}
      player={player}
      style={StyleSheet.absoluteFill}
      surfaceType="textureView"
    />
  );
}

function BetButton({ outcome, onPress }: { outcome: Outcome; onPress: () => void }) {
  const isYes = outcome === 'YES';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Bet ${outcome}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.betButton,
        isYes ? styles.yesButton : styles.noButton,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.betButtonLabel}>BET {outcome}</Text>
    </Pressable>
  );
}

function MarketPage({
  item,
  height,
  width,
  headerClearance,
  bottomInset,
  shouldLoadVideo,
  shouldPlayVideo,
  muted,
  onToggleMuted,
  onSelectOutcome,
}: MarketPageProps) {
  const [videoFailed, setVideoFailed] = useState(false);
  const yes = Math.round(item.market.yesProbability * 100);
  const no = 100 - yes;
  const volume = (item.market.outcomes ?? []).reduce(
    (total, outcome) => total + outcome.wagerPool,
    0,
  );
  const showVideo = Boolean(item.market.videoPath && shouldLoadVideo && !videoFailed);
  const compact = height < 720;

  return (
    <View
      style={[
        styles.page,
        {
          height,
          paddingTop: headerClearance + spacing.md,
          paddingBottom:
            bottomInset + (compact ? spacing.xxxl + spacing.md : discoveryLayout.tabClearance),
        },
      ]}
    >
      {showVideo && item.market.videoPath ? (
        <MarketVideo
          key={`${item.market.videoPath}-${muted}`}
          path={item.market.videoPath}
          active={shouldPlayVideo}
          muted={muted}
          onError={() => setVideoFailed(true)}
        />
      ) : null}
      {showVideo ? (
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(13,11,18,0.6)', 'rgba(13,11,18,0.06)', 'rgba(13,11,18,0.94)']}
          locations={[0, 0.42, 1]}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      {showVideo ? (
        <View style={styles.mediaSpacer} />
      ) : (
        <MarketChart item={item} height={height} width={width} />
      )}

      {showVideo ? (
        <Pressable
          accessibilityLabel={muted ? 'Turn video sound on' : 'Mute video'}
          accessibilityRole="button"
          onPress={onToggleMuted}
          style={({ pressed }) => [
            styles.soundButton,
            { top: headerClearance + spacing.md },
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.soundText}>{muted ? 'Sound off' : 'Sound on'}</Text>
        </Pressable>
      ) : null}

      <View style={[styles.marketDetails, compact && styles.compactMarketDetails]}>
        <View style={styles.marketMeta}>
          <View style={styles.categoryChip}>
            <Text style={styles.category}>{item.market.category}</Text>
          </View>
          <MarketCountdown
            closesAt={item.market.closesAt}
            status={item.market.status}
            variant="caption"
            style={styles.countdown}
          />
        </View>
        <Text style={[styles.title, compact && styles.compactTitle]} numberOfLines={compact ? 3 : 4}>
          {item.market.title}
        </Text>
        <Text style={styles.volume}>Volume: {volume.toLocaleString()} credits</Text>

        <View style={[styles.probabilityBlock, compact && styles.compactProbabilityBlock]}>
          <View style={styles.probabilityLabels}>
            <Text style={styles.yesProbability}>YES {yes}%</Text>
            <Text style={styles.noProbability}>NO {no}%</Text>
          </View>
          <View style={styles.probabilityRail} accessibilityElementsHidden>
            <View style={[styles.yesRail, { flex: Math.max(yes, 0.01) }]} />
            <View style={[styles.noRail, { flex: Math.max(no, 0.01) }]} />
          </View>
        </View>

        <View style={[styles.betButtons, compact && styles.compactBetButtons]}>
          <BetButton
            outcome="YES"
            onPress={() => onSelectOutcome(item.market, 'YES')}
          />
          <BetButton outcome="NO" onPress={() => onSelectOutcome(item.market, 'NO')} />
        </View>
      </View>
    </View>
  );
}

function DiscoveryHeader({
  selectedCategory,
  onSelectCategory,
  topInset,
}: {
  selectedCategory: DiscoveryCategory;
  onSelectCategory: (category: DiscoveryCategory) => void;
  topInset: number;
}) {
  return (
    <View style={[styles.header, { paddingTop: topInset + spacing.sm }]}>
      <View style={styles.headerTopRow}>
        <Text style={styles.wordmark} pointerEvents="none">
          UNSWager
        </Text>
        <View style={styles.balanceSlot}>
          <BalanceHeader variant="compact" />
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {DISCOVERY_CATEGORIES.map((category) => {
          const selected = category === selectedCategory;
          return (
            <Pressable
              key={category}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onSelectCategory(category)}
              style={({ pressed }) => [
                styles.filter,
                selected && styles.selectedFilter,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.filterLabel, selected && styles.selectedFilterLabel]}>
                {category}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<FeedItem>>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [histories, setHistories] = useState<Record<string, MarketPricePoint[]>>({});
  const [selectedCategory, setSelectedCategory] = useState<DiscoveryCategory>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewport, setViewport] = useState({ height: 0, width: 0 });
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [isAppActive, setIsAppActive] = useState(AppState.currentState === 'active');
  const [isSwiping, setIsSwiping] = useState(false);
  const [muted, setMuted] = useState(true);
  const [activeBet, setActiveBet] = useState<{
    market: Market;
    outcome: Outcome;
  } | null>(null);
  const { reduceMotion } = useAccessibility();
  const headerClearance = insets.top + 108;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) =>
      setIsAppActive(state === 'active'),
    );
    return () => subscription.remove();
  }, []);

  const loadMarkets = useCallback(
    async (isMounted: () => boolean = () => true) => {
      try {
        const nextMarkets = await fetchMarkets();
        if (!isMounted()) return;
        setMarkets(nextMarkets);
        setErrorMessage(null);
        try {
          const nextHistories = await fetchMarketHistories(
            nextMarkets.map((market) => market.id),
          );
          if (isMounted()) setHistories(nextHistories);
        } catch {
          if (isMounted()) setHistories({});
        }
      } catch {
        if (isMounted()) setErrorMessage('Markets could not be loaded. Please try again.');
      } finally {
        if (isMounted()) setIsLoading(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setIsFocused(true);
      void loadMarkets(() => mounted);
      return () => {
        mounted = false;
        setIsFocused(false);
      };
    }, [loadMarkets]),
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<FeedItem>[] }) => {
      const index = viewableItems[0]?.index;
      if (index !== null && index !== undefined) setActiveIndex(index);
    },
    [],
  );
  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (viewport.height) {
      setActiveIndex(Math.round(event.nativeEvent.contentOffset.y / viewport.height));
    }
    setIsSwiping(false);
  };
  const filteredMarkets = useMemo(() => {
    if (selectedCategory === 'All') return markets;
    const category = selectedCategory.toLowerCase();
    return markets.filter((market) => market.category.trim().toLowerCase() === category);
  }, [markets, selectedCategory]);
  const items = useMemo<FeedItem[]>(
    () =>
      filteredMarkets.map((market) => ({
        key: market.id,
        market,
        history: histories[market.id] ?? [],
      })),
    [filteredMarkets, histories],
  );
  const canPlay = isFocused && isAppActive && !isSwiping && !reduceMotion && !activeBet;
  const handleSelectOutcome = useCallback((market: Market, outcome: Outcome) => {
    setActiveBet({ market, outcome });
  }, []);
  const handleSelectCategory = useCallback((category: DiscoveryCategory) => {
    setSelectedCategory(category);
    setActiveIndex(0);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, []);
  const renderItem = useCallback(
    ({ item, index }: { item: FeedItem; index: number }) => (
      <MarketPage
        item={item}
        height={viewport.height}
        width={viewport.width}
        headerClearance={headerClearance}
        bottomInset={insets.bottom}
        muted={muted}
        onSelectOutcome={handleSelectOutcome}
        onToggleMuted={() => setMuted((value) => !value)}
        shouldLoadVideo={!reduceMotion && Math.abs(index - activeIndex) <= 1}
        shouldPlayVideo={canPlay && index === activeIndex}
      />
    ),
    [
      activeIndex,
      canPlay,
      handleSelectOutcome,
      headerClearance,
      insets.bottom,
      muted,
      reduceMotion,
      viewport.height,
      viewport.width,
    ],
  );

  return (
    <View
      style={styles.container}
      onLayout={(event: LayoutChangeEvent) => setViewport(event.nativeEvent.layout)}
    >
      <DiscoveryHeader
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
        topInset={insets.top}
      />

      {isLoading ? (
        <View style={[styles.centeredState, { paddingTop: headerClearance }]}>
          <ActivityIndicator color={discoveryColors.accent} />
        </View>
      ) : errorMessage ? (
        <View style={[styles.centeredState, { paddingTop: headerClearance }]}>
          <Text style={styles.stateTitle}>Markets are unavailable</Text>
          <Text style={styles.stateText}>{errorMessage}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setIsLoading(true);
              void loadMarkets();
            }}
            style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
          >
            <Text style={styles.retryLabel}>Try again</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={[styles.centeredState, { paddingTop: headerClearance }]}>
          <Text style={styles.stateTitle}>
            {selectedCategory === 'All' ? 'No markets yet' : `No ${selectedCategory} markets yet`}
          </Text>
          <Text style={styles.stateText}>
            {selectedCategory === 'All'
              ? 'New markets will appear here when they open.'
              : 'Choose All to keep exploring.'}
          </Text>
        </View>
      ) : viewport.height > 0 ? (
        <FlatList
          ref={listRef}
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.key}
          extraData={{ activeIndex, muted, reduceMotion }}
          getItemLayout={(_, index) => ({
            length: viewport.height,
            offset: viewport.height * index,
            index,
          })}
          initialNumToRender={2}
          maxToRenderPerBatch={3}
          windowSize={3}
          snapToInterval={viewport.height}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          directionalLockEnabled
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumEnd}
          onScrollBeginDrag={() => setIsSwiping(true)}
          onScrollEndDrag={(event) => {
            if (event.nativeEvent.velocity?.y === 0) handleMomentumEnd(event);
          }}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={VIEWABILITY_CONFIG}
        />
      ) : null}

      {activeBet ? (
        <BetSheet
          market={activeBet.market}
          outcome={activeBet.outcome}
          onClose={() => setActiveBet(null)}
          onPlaced={() => {
            setActiveBet(null);
            void loadMarkets();
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: discoveryColors.background },
  header: {
    position: 'absolute',
    zIndex: 3,
    top: 0,
    left: 0,
    right: 0,
    gap: discoveryLayout.headerGap,
    paddingBottom: spacing.md,
    backgroundColor: discoveryColors.background,
  },
  headerTopRow: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: discoveryLayout.screenEdge,
  },
  wordmark: {
    position: 'absolute',
    left: 0,
    right: 0,
    color: discoveryColors.text,
    fontSize: 23,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
    textAlign: 'center',
  },
  balanceSlot: { zIndex: 1 },
  filters: {
    gap: spacing.sm,
    paddingHorizontal: discoveryLayout.screenEdge,
  },
  filter: {
    height: discoveryLayout.filterHeight,
    minWidth: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    backgroundColor: discoveryColors.surface,
    borderWidth: 1,
    borderColor: discoveryColors.border,
  },
  selectedFilter: {
    backgroundColor: discoveryColors.accent,
    borderColor: discoveryColors.accent,
  },
  filterLabel: { ...typography.subhead, color: discoveryColors.muted, fontWeight: '600' },
  selectedFilterLabel: { color: discoveryColors.accentText, fontWeight: '800' },
  page: {
    gap: spacing.md,
    paddingHorizontal: discoveryLayout.screenEdge,
    overflow: 'hidden',
    backgroundColor: discoveryColors.background,
  },
  mediaSpacer: { flex: 1 },
  chartSection: { flex: 1, gap: spacing.sm, justifyContent: 'center' },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  priceLabel: { ...typography.caption, color: discoveryColors.muted },
  priceValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  priceValue: {
    color: discoveryColors.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  priceChange: {
    ...typography.subhead,
    color: discoveryColors.yes,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  negativeChange: { color: discoveryColors.no },
  ranges: { flexDirection: 'row', gap: spacing.xs },
  range: {
    minWidth: 32,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  activeRange: { backgroundColor: discoveryColors.elevatedSurface },
  rangeLabel: { ...typography.caption, color: discoveryColors.muted },
  activeRangeLabel: { color: discoveryColors.text },
  chart: { alignItems: 'center', overflow: 'hidden' },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dateLabel: { ...typography.caption, color: discoveryColors.subtle },
  soundButton: {
    position: 'absolute',
    right: discoveryLayout.screenEdge,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    backgroundColor: 'rgba(25,22,33,0.82)',
  },
  soundText: { ...typography.caption, color: discoveryColors.text, fontWeight: '700' },
  marketDetails: { gap: spacing.md },
  compactMarketDetails: { gap: spacing.sm },
  marketMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  categoryChip: {
    minHeight: 28,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: discoveryColors.accentSoft,
  },
  category: {
    ...typography.caption,
    color: discoveryColors.accent,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  countdown: { color: discoveryColors.accent, fontWeight: '600' },
  title: {
    color: discoveryColors.text,
    fontSize: 29,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  compactTitle: { fontSize: 25, lineHeight: 30 },
  volume: {
    ...typography.subhead,
    color: discoveryColors.muted,
    fontVariant: ['tabular-nums'],
  },
  probabilityBlock: { gap: spacing.sm },
  compactProbabilityBlock: { gap: spacing.xs },
  probabilityLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  yesProbability: {
    ...typography.headline,
    color: discoveryColors.yes,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  noProbability: {
    ...typography.headline,
    color: discoveryColors.no,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  probabilityRail: {
    height: 8,
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: radius.full,
    backgroundColor: discoveryColors.elevatedSurface,
  },
  yesRail: { backgroundColor: discoveryColors.yes },
  noRail: { backgroundColor: discoveryColors.no },
  betButtons: { flexDirection: 'row', gap: spacing.md },
  compactBetButtons: { gap: spacing.sm },
  betButton: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
  yesButton: { backgroundColor: discoveryColors.yes },
  noButton: { backgroundColor: discoveryColors.no },
  betButtonLabel: {
    color: discoveryColors.background,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  stateTitle: { ...typography.headline, color: discoveryColors.text, textAlign: 'center' },
  stateText: { ...typography.subhead, color: discoveryColors.muted, textAlign: 'center' },
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
