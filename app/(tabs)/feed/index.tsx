import { useEvent } from 'expo';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, Platform, Pressable, StyleSheet, Text, View, ViewToken } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { BalanceHeader } from '@/components/ui/balance-header';
import { MarketCountdown } from '@/components/ui/market-countdown';
import { fetchMarketHistories, fetchMarkets } from '@/lib/data';
import { getVideoPublicUrl } from '@/lib/market-video';
import { useAccessibility } from '@/state/accessibility';
import { colors, radius, spacing, typography } from '@/theme';
import { Market, MarketPricePoint } from '@/types';

type FeedItem = { key: string; market: Market; history: MarketPricePoint[] };
const MAX_CHART_POINTS = 60;
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 100, minimumViewTime: 80 };

function MarketChart({ item, height, width }: { item: FeedItem; height: number; width: number }) {
  const yes = Math.round(item.market.yesProbability * 100);
  const history = item.history.slice(-MAX_CHART_POINTS).map((point) => Math.round(point.probability * 100));
  const values = history.length ? history : [yes];
  const change = yes - values[0];

  return (
    <View style={styles.chartSection} pointerEvents="none">
      <View style={styles.priceRow}>
        <View>
          <Text style={styles.priceLabel}>YES price</Text>
          <View style={styles.priceValueRow}>
            <Text style={styles.priceValue}>{yes}¢</Text>
            <Text style={styles.priceChange}>{change >= 0 ? '+' : ''}{change}¢</Text>
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
        <LineChart data={values.map((value) => ({ value }))} width={Math.max(240, width - spacing.xl * 2)} height={Math.min(160, Math.max(112, height * 0.2))} maxValue={100} adjustToWidth disableScroll initialSpacing={0} endSpacing={0} yAxisLabelWidth={0} curved areaChart color={colors.accent} thickness={2} startFillColor={colors.accent} endFillColor={colors.accent} startOpacity={0.3} endOpacity={0} hideRules gradientDirection="vertical" hideDataPoints hideYAxisText hideAxesAndRules />
      </View>
      <View style={styles.dateRow}><Text style={styles.dateLabel}>20 Aug</Text><Text style={styles.dateLabel}>23 Aug</Text><Text style={styles.dateLabel}>Now</Text></View>
    </View>
  );
}

function MarketVideo({ path, active, muted, onError }: { path: string; active: boolean; muted: boolean; onError: () => void }) {
  const player = useVideoPlayer({ uri: getVideoPublicUrl(path), useCaching: true }, (next) => {
    next.loop = true;
    next.muted = muted;
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  useEffect(() => { if (active && status !== 'error') player.play(); else player.pause(); }, [active, player, status]);
  useEffect(() => { if (status === 'error') onError(); }, [onError, status]);

  if (status === 'error') return null;
  return <VideoView contentFit="cover" nativeControls={false} player={player} style={StyleSheet.absoluteFill} surfaceType="textureView" />;
}

function MarketPage({ item, height, width, shouldLoadVideo, shouldPlayVideo, muted, onToggleMuted }: { item: FeedItem; height: number; width: number; shouldLoadVideo: boolean; shouldPlayVideo: boolean; muted: boolean; onToggleMuted: () => void }) {
  const [videoFailed, setVideoFailed] = useState(false);
  const yes = Math.round(item.market.yesProbability * 100);
  const showVideo = Boolean(item.market.videoPath && shouldLoadVideo && !videoFailed);
  const openOutcome = (name: 'YES' | 'NO') => {
    const outcomeId = item.market.outcomes?.find((outcome) => outcome.name === name)?.id;
    if (outcomeId) router.push({ pathname: '/markets/[id]', params: { id: item.market.id, outcomeId } });
  };

  return (
    <View style={[styles.page, { height }]}>
      {showVideo && item.market.videoPath ? <MarketVideo key={`${item.market.videoPath}-${muted}`} path={item.market.videoPath} active={shouldPlayVideo} muted={muted} onError={() => setVideoFailed(true)} /> : null}
      {showVideo ? <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.48)', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFill} /> : null}
      {!showVideo ? <MarketChart item={item} height={height} width={width} /> : <View style={{ flex: 1 }} />}
      {showVideo ? (
        <Pressable accessibilityLabel={muted ? 'Turn video sound on' : 'Mute video'} accessibilityRole="button" onPress={onToggleMuted} style={styles.soundButton}>
          <Text style={styles.soundText}>{muted ? 'Sound off' : 'Sound on'}</Text>
        </Pressable>
      ) : null}
      <View style={styles.marketHeader}>
        <View style={styles.categoryRow}>
          <Text style={styles.category}>{item.market.category}</Text>
          <MarketCountdown closesAt={item.market.closesAt} status={item.market.status} variant="caption" />
        </View>
        <Text style={[styles.title, showVideo && styles.videoTitle]} numberOfLines={4}>{item.market.title}</Text>
      </View>
      <View style={styles.outcomes}>
        <Pressable accessibilityRole="button" accessibilityLabel={`YES, ${yes}%`} onPress={() => openOutcome('YES')} style={({ pressed }) => [styles.outcome, styles.yesOutcome, showVideo && styles.videoOutcome, pressed && styles.pressed]}><Text style={styles.outcomeLabel}>YES</Text><Text style={styles.yesValue}>{yes}%</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`NO, ${100 - yes}%`} onPress={() => openOutcome('NO')} style={({ pressed }) => [styles.outcome, styles.noOutcome, showVideo && styles.videoOutcome, pressed && styles.pressed]}><Text style={styles.outcomeLabel}>NO</Text><Text style={styles.noValue}>{100 - yes}%</Text></Pressable>
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
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [isAppActive, setIsAppActive] = useState(AppState.currentState === 'active');
  const [isSwiping, setIsSwiping] = useState(false);
  const [muted, setMuted] = useState(true);
  const { reduceMotion } = useAccessibility();

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setIsAppActive(state === 'active'));
    return () => subscription.remove();
  }, []);

  useFocusEffect(useCallback(() => {
    let mounted = true;
    setIsFocused(true);
    void fetchMarkets().then(async (nextMarkets) => {
      if (!mounted) return;
      setMarkets(nextMarkets);
      setErrorMessage(null);
      try {
        const nextHistories = await fetchMarketHistories(nextMarkets.map((market) => market.id));
        if (mounted) setHistories(nextHistories);
      } catch { if (mounted) setHistories({}); }
    }).catch(() => mounted && setErrorMessage('Markets could not be loaded. Please try again.')).finally(() => mounted && setIsLoading(false));
    return () => { mounted = false; setIsFocused(false); };
  }, []));

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken<FeedItem>[] }) => {
    const index = viewableItems[0]?.index;
    if (index !== null && index !== undefined) setActiveIndex(index);
  }, []);
  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (viewport.height) setActiveIndex(Math.round(event.nativeEvent.contentOffset.y / viewport.height));
    setIsSwiping(false);
  };
  const items: FeedItem[] = markets.map((market) => ({ key: market.id, market, history: histories[market.id] ?? [] }));
  const canPlay = isFocused && isAppActive && !isSwiping && !reduceMotion;

  return (
    <View style={styles.container} onLayout={(event: LayoutChangeEvent) => setViewport(event.nativeEvent.layout)}>
      <View style={styles.balanceHeader} pointerEvents="box-none"><BalanceHeader /></View>
      {isLoading ? <View style={styles.centeredState}><ActivityIndicator color={colors.accent} /></View> : errorMessage ? <View style={styles.centeredState}><Text style={styles.stateText}>{errorMessage}</Text></View> : viewport.height > 0 ? (
        <FlatList contentInsetAdjustmentBehavior="never" data={items} decelerationRate="fast" directionalLockEnabled disableIntervalMomentum getItemLayout={(_, index) => ({ length: viewport.height, offset: viewport.height * index, index })} initialNumToRender={2} keyExtractor={(item) => item.key} maxToRenderPerBatch={3} onMomentumScrollEnd={handleMomentumEnd} onScrollBeginDrag={() => setIsSwiping(true)} onScrollEndDrag={(event) => { if (event.nativeEvent.velocity?.y === 0) handleMomentumEnd(event); }} onViewableItemsChanged={onViewableItemsChanged} renderItem={({ item, index }) => <MarketPage height={viewport.height} item={item} muted={muted} onToggleMuted={() => setMuted((value) => !value)} shouldLoadVideo={!reduceMotion && Math.abs(index - activeIndex) <= 1} shouldPlayVideo={canPlay && index === activeIndex} width={viewport.width} />} showsVerticalScrollIndicator={false} snapToAlignment="start" snapToInterval={viewport.height} viewabilityConfig={VIEWABILITY_CONFIG} windowSize={3} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  page: { gap: spacing.xl, paddingHorizontal: spacing.xl, paddingTop: Platform.select({ web: spacing.xl + spacing.xxxl + spacing.lg, ios: spacing.xxxl + spacing.lg, default: spacing.xl }), paddingBottom: Platform.select({ ios: spacing.xxxl * 2, default: spacing.lg }), overflow: 'hidden' },
  marketHeader: { gap: spacing.md }, categoryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }, category: { ...typography.caption, color: colors.accent },
  title: { color: colors.text, fontSize: 30, lineHeight: 35, fontWeight: '700', letterSpacing: -0.4 }, videoTitle: { textShadowColor: 'rgba(0,0,0,0.75)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  chartSection: { flex: 1, gap: spacing.sm, justifyContent: 'center' }, priceRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.lg }, priceLabel: { ...typography.caption, color: colors.muted }, priceValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }, priceValue: { color: colors.text, fontSize: 28, lineHeight: 34, fontWeight: '700' }, priceChange: { ...typography.subhead, color: colors.yes, fontWeight: '600' },
  ranges: { flexDirection: 'row', gap: spacing.xs }, range: { minWidth: 32, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full, alignItems: 'center' }, activeRange: { backgroundColor: colors.surface }, rangeLabel: { ...typography.caption, color: colors.muted }, activeRangeLabel: { color: colors.text }, chart: { alignItems: 'center', overflow: 'hidden' }, dateRow: { flexDirection: 'row', justifyContent: 'space-between' }, dateLabel: { ...typography.caption, color: colors.muted },
  outcomes: { flexDirection: 'row', gap: spacing.md }, outcome: { flex: 1, gap: spacing.sm, padding: spacing.lg, borderWidth: 1, borderRadius: radius.lg }, videoOutcome: { backgroundColor: 'rgba(11,13,16,0.68)' }, yesOutcome: { borderColor: colors.yes }, noOutcome: { borderColor: colors.no }, outcomeLabel: { ...typography.caption, color: colors.text }, yesValue: { ...typography.title, color: colors.yes }, noValue: { ...typography.title, color: colors.no }, pressed: { opacity: 0.7 },
  soundButton: { position: 'absolute', top: Platform.select({ ios: spacing.xxxl + spacing.lg, default: spacing.xl }), right: spacing.xl, minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: 'rgba(11,13,16,0.72)' }, soundText: { ...typography.caption, color: colors.text, fontWeight: '700' },
  balanceHeader: { position: 'absolute', zIndex: 2, top: spacing.xxxl, left: spacing.xl }, centeredState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }, stateText: { ...typography.subhead, textAlign: 'center' },
});
