import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';

import { PlaceholderState } from '@/components/ui/placeholder-state';
import { ThemedText } from '@/components/ui/themed-text';
import { fetchLeaderboard, LeaderboardEntry } from '@/lib/supabase-data';
import { colors, radius, spacing } from '@/theme';

export default function LeaderboardScreen() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadLeaderboard = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMessage(null);
    try {
      setEntries(await fetchLeaderboard());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load rankings');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadLeaderboard();
  }, [loadLeaderboard]);

  if (isLoading) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}><ActivityIndicator color={colors.accent} /></View>;
  }

  if (errorMessage) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.background }}><PlaceholderState title="Could not load rankings" description={errorMessage} /></View>;
  }

  return (
    <FlatList
      data={entries}
      keyExtractor={(item) => item.id}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadLeaderboard(true)} tintColor={colors.accent} />}
      ListHeaderComponent={<ThemedText variant="title" style={{ marginBottom: spacing.sm }}>Leaderboard</ThemedText>}
      ListEmptyComponent={<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><PlaceholderState title="No rankings yet" description="Rankings will appear once people start predicting." /></View>}
      renderItem={({ item }) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, borderCurve: 'continuous' }}>
          <ThemedText variant="title" style={{ color: item.rank <= 3 ? colors.accent : colors.muted, minWidth: 36 }}>#{item.rank}</ThemedText>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <ThemedText variant="headline">{item.name}</ThemedText>
            <ThemedText variant="caption">{item.balance.toLocaleString()} credits</ThemedText>
          </View>
        </View>
      )}
    />
  );
}
