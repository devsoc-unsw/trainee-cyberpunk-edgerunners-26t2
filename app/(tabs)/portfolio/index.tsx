import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, RefreshControl, View } from 'react-native';

import { PlaceholderState } from '@/components/ui/placeholder-state';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { fetchPositions } from '@/lib/data';
import { useSession } from '@/state/session';
import { colors, radius, spacing } from '@/theme';
import { Position } from '@/types';

export default function PortfolioScreen() {
  const { profile } = useSession();
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const profileId = profile?.id;

  const load = useCallback(async () => {
    if (!profileId) {
      // No profile means nothing to show. Without this the spinner below would
      // never be cleared.
      setPositions([]);
      setIsLoading(false);
      return;
    }

    try {
      setPositions(await fetchPositions(profileId));
      setErrorMessage(null);
    } catch {
      setErrorMessage('Your predictions could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  // On focus rather than on mount: the tab bar keeps this screen mounted and
  // profileId never changes, so a mount-only effect showed the list as it was
  // before the user went off to a market screen and placed a prediction.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <Screen centered>
        <ActivityIndicator color={colors.accent} />
      </Screen>
    );
  }

  if (errorMessage) {
    return (
      <Screen centered>
        <PlaceholderState title="Portfolio unavailable" description={errorMessage} />
      </Screen>
    );
  }

  if (positions.length === 0) {
    return (
      <Screen
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.muted}
          />
        }
      >
        <PlaceholderState
          title="No predictions yet"
          description="Your active and settled predictions will show here."
        />
      </Screen>
    );
  }

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.muted} />
      }
    >
      <View style={{ gap: spacing.xs }}>
        <ThemedText variant="title">My predictions</ThemedText>
        <ThemedText variant="subhead">Your active and settled predictions.</ThemedText>
      </View>

      {positions.map((position) => (
        <View
          key={position.id}
          style={{
            gap: spacing.sm,
            padding: spacing.lg,
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            borderCurve: 'continuous',
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
            <ThemedText variant="caption" style={{ color: position.outcome === 'YES' ? colors.yes : colors.no }}>
              {position.outcome}
            </ThemedText>
            <ThemedText variant="caption">{position.status}</ThemedText>
          </View>
          <ThemedText variant="headline">{position.marketTitle}</ThemedText>
          <ThemedText variant="body">{position.stake.toLocaleString()} credits staked</ThemedText>
          {position.payout !== undefined ? <ThemedText variant="body">{position.payout.toLocaleString()} credits paid</ThemedText> : null}
          {position.placedAt ? <ThemedText variant="caption">Placed {position.placedAt}</ThemedText> : null}
        </View>
      ))}
    </Screen>
  );
}
