import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { getLeaderboard, type LeaderboardEntry } from '@/lib/leaderboard';
import { colors, radius, spacing } from '@/theme';

function getInitials(username: string) {
  const parts = username.split(/[._-]/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('');

  return (initials || username.slice(0, 2)).toUpperCase();
}

function formatProfit(profit: number) {
  if (profit > 0) return `+${profit.toLocaleString()} cr`;
  if (profit < 0) return `−${Math.abs(profit).toLocaleString()} cr`;
  return '0 cr';
}

function profitColor(profit: number) {
  if (profit > 0) return colors.yes;
  if (profit < 0) return colors.no;
  return colors.muted;
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const isFirst = entry.rank === 1;

  return (
    <View
      accessible
      accessibilityLabel={`Rank ${entry.rank}, ${entry.username}, ${entry.settledCount} settled predictions, ${formatProfit(entry.settledProfit)}`}
      style={{
        minHeight: 78,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: entry.isCurrentUser ? colors.surface : 'transparent',
        borderColor: entry.isCurrentUser ? colors.accent : colors.border,
        borderWidth: entry.isCurrentUser ? 1 : 0,
        borderBottomWidth: 1,
        borderRadius: entry.isCurrentUser ? radius.lg : 0,
        borderCurve: 'continuous',
      }}
    >
      <ThemedText
        variant="headline"
        style={{
          width: 30,
          color: isFirst || entry.isCurrentUser ? colors.accent : colors.muted,
          fontVariant: ['tabular-nums'],
          textAlign: 'center',
        }}
      >
        {entry.rank}
      </ThemedText>

      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isFirst ? '#332D12' : colors.surface,
        }}
      >
        <ThemedText
          selectable={false}
          variant="caption"
          style={{ color: isFirst ? colors.accent : colors.text }}
        >
          {getInitials(entry.username)}
        </ThemedText>
      </View>

      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <ThemedText variant="headline" numberOfLines={1}>
          {entry.username}
        </ThemedText>
        <ThemedText variant="caption">
          {entry.settledCount} settled {entry.settledCount === 1 ? 'prediction' : 'predictions'}
        </ThemedText>
      </View>

      <ThemedText
        variant="headline"
        style={{
          color: profitColor(entry.settledProfit),
          fontVariant: ['tabular-nums'],
          textAlign: 'right',
        }}
      >
        {formatProfit(entry.settledProfit)}
      </ThemedText>
    </View>
  );
}

function RetryButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        backgroundColor: colors.accent,
        opacity: pressed ? 0.72 : 1,
      })}
    >
      <ThemedText selectable={false} variant="headline" style={{ color: colors.accentText }}>
        Try again
      </ThemedText>
    </Pressable>
  );
}

export default function LeaderboardScreen() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const hasLoaded = useRef(false);

  const loadLeaderboard = useCallback(async (refresh = false) => {
    const currentRequest = ++requestId.current;

    if (refresh) setRefreshing(true);
    else if (!hasLoaded.current) setLoading(true);

    setError(null);

    try {
      const nextEntries = await getLeaderboard();
      if (requestId.current === currentRequest) setEntries(nextEntries);
    } catch {
      if (requestId.current === currentRequest) setError('Couldn’t load rankings.');
    } finally {
      if (requestId.current === currentRequest) {
        hasLoaded.current = true;
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadLeaderboard();

      return () => {
        requestId.current += 1;
      };
    }, [loadLeaderboard]),
  );

  const rankedEntries = entries.filter((entry) => entry.rank <= 50);
  const currentUserOutsideTopFifty = entries.find(
    (entry) => entry.isCurrentUser && entry.rank > 50,
  );

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.md,
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.accent} />
        <ThemedText variant="subhead">Loading rankings…</ThemedText>
      </View>
    );
  }

  return (
    <FlatList
      data={rankedEntries}
      keyExtractor={(entry) => entry.profileId}
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: colors.background }}
      alwaysBounceVertical
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: spacing.xxl,
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void loadLeaderboard(true)}
          tintColor={colors.muted}
        />
      }
      ListHeaderComponent={
        error ? (
          <View
            style={{
              paddingVertical: spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: spacing.md,
            }}
          >
            <ThemedText variant="subhead" style={{ flex: 1 }}>
              {error}
            </ThemedText>
            <RetryButton onPress={() => void loadLeaderboard()} />
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View style={{ paddingVertical: spacing.xxxl, gap: spacing.sm }}>
          <ThemedText variant="title">No rankings yet</ThemedText>
          <ThemedText variant="subhead">Rankings appear when students join.</ThemedText>
        </View>
      }
      ListFooterComponent={
        currentUserOutsideTopFifty ? (
          <View style={{ paddingTop: spacing.xxl, gap: spacing.sm }}>
            <ThemedText variant="caption" style={{ color: colors.accent }}>
              YOUR RANK
            </ThemedText>
            <LeaderboardRow entry={currentUserOutsideTopFifty} />
          </View>
        ) : null
      }
      renderItem={({ item }) => <LeaderboardRow entry={item} />}
    />
  );
}
