import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';

import { PlaceholderState } from '@/components/ui/placeholder-state';
import { ThemedText } from '@/components/ui/themed-text';
import { fetchPortfolioPositions, PortfolioPosition } from '@/lib/supabase-data';
import { colors, radius, spacing } from '@/theme';

function statusColor(status: PortfolioPosition['status']) {
  if (status === 'WON') return colors.yes;
  if (status === 'LOST') return colors.no;
  if (status === 'REFUNDED') return colors.accent;
  return colors.muted;
}

export default function PortfolioScreen() {
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPositions = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMessage(null);
    try {
      setPositions(await fetchPortfolioPositions());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load your predictions');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadPositions();
  }, [loadPositions]);

  if (isLoading) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}><ActivityIndicator color={colors.accent} /></View>;
  }

  if (errorMessage) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl, backgroundColor: colors.background }}><PlaceholderState title="Could not load portfolio" description={errorMessage} /></View>;
  }

  return (
    <FlatList
      data={positions}
      keyExtractor={(item) => item.id}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadPositions(true)} tintColor={colors.accent} />}
      ListHeaderComponent={<ThemedText variant="title" style={{ marginBottom: spacing.sm }}>My predictions</ThemedText>}
      ListEmptyComponent={<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><PlaceholderState title="No predictions yet" description="Your active and settled predictions will show here." /></View>}
      renderItem={({ item }) => (
        <View style={{ gap: spacing.sm, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, borderCurve: 'continuous' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
            <ThemedText variant="caption" style={{ color: colors.accent }}>{item.marketCategory.toUpperCase()}</ThemedText>
            <ThemedText variant="caption" style={{ color: statusColor(item.status), fontWeight: '700' }}>{item.status}</ThemedText>
          </View>
          <ThemedText variant="headline">{item.marketTitle}</ThemedText>
          <ThemedText variant="subhead">{item.outcome} · {item.stake.toLocaleString()} credits</ThemedText>
          <ThemedText variant="body">Potential payout: {item.potentialPayout.toLocaleString()} credits</ThemedText>
          <ThemedText variant="caption">Placed {item.placedAt} · Market {item.marketStatus}</ThemedText>
        </View>
      )}
    />
  );
}
