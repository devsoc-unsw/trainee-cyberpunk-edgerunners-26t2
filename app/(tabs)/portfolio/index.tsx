import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { PlaceholderState } from '@/components/ui/placeholder-state';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { fetchPositions } from '@/lib/data';
import { useSession } from '@/state/session';
import { colors, radius, spacing } from '@/theme';
import { Position } from '@/types';

export default function PortfolioScreen() {
  const { session } = useSession();
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.id) {
      return;
    }

    let isMounted = true;

    void fetchPositions(session.id)
      .then((nextPositions) => {
        if (isMounted) {
          setPositions(nextPositions);
        }
      })
      .catch(() => {
        if (isMounted) {
          setErrorMessage('Your predictions could not be loaded.');
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
  }, [session?.id]);

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
      <Screen>
        <PlaceholderState
          title="No predictions yet"
          description="Your active and settled predictions will show here."
        />
      </Screen>
    );
  }

  return (
    <Screen>
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
          {position.placedAt ? <ThemedText variant="caption">Placed {position.placedAt}</ThemedText> : null}
        </View>
      ))}
    </Screen>
  );
}
