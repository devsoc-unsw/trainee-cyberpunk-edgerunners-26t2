import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, RefreshControl, StyleSheet, View } from 'react-native';

import { PlaceholderState } from '@/components/ui/placeholder-state';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { fetchPositions } from '@/lib/data';
import { useSession } from '@/state/session';
import { colors, radius, spacing, typography } from '@/theme';
import { Position } from '@/types';

function formatCredits(value: number) {
  return value.toLocaleString();
}

function formatRelativeDate(dateValue?: string) {
  if (!dateValue) {
    return 'Recently';
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  const daysAgo = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));

  if (daysAgo === 0) {
    return 'Today';
  }
  if (daysAgo === 1) {
    return 'Yesterday';
  }
  if (daysAgo < 7) {
    return `${daysAgo} days ago`;
  }
  if (daysAgo < 30) {
    return `${Math.floor(daysAgo / 7)} weeks ago`;
  }
  return `${Math.floor(daysAgo / 30)} months ago`;
}

function getPositionProfit(position: Position) {
  if (position.status === 'WON') {
    return (position.payout ?? position.potentialPayout) - position.stake;
  }
  if (position.status === 'LOST') {
    return -position.stake;
  }
  return 0;
}

function BalanceCard({ balance, todayProfit, winRate }: { balance: number; todayProfit: number; winRate: number }) {
  return (
    <View style={styles.balanceCard}>
      <View style={styles.balanceColumn}>
        <ThemedText style={styles.balanceLabel}>Balance</ThemedText>
        <ThemedText style={styles.balanceValue}>{formatCredits(balance)} cr</ThemedText>
        <ThemedText style={styles.todayProfit}>
          {todayProfit >= 0 ? '+' : ''}
          {formatCredits(todayProfit)} cr today
        </ThemedText>
      </View>

      <View style={styles.divider} />

      <View style={styles.winRateColumn}>
        <ThemedText style={styles.balanceLabel}>Win Rate</ThemedText>
        <ThemedText style={styles.balanceValue}>{winRate}%</ThemedText>
      </View>
    </View>
  );
}

function BetCard({ position, history = false }: { position: Position; history?: boolean }) {
  const isYes = position.outcome === 'YES';
  const outcomeColor = isYes ? colors.yes : colors.no;
  const isRefunded = position.status === 'REFUNDED';
  const historyAmount =
    position.status === 'WON'
      ? (position.payout ?? position.potentialPayout)
      : position.stake;
  const historyColor = isRefunded
    ? colors.muted
    : position.status === 'WON'
      ? colors.yes
      : colors.no;
  const historyLabel = isRefunded
    ? `Refunded ${formatCredits(historyAmount)} CR`
    : `${position.status === 'WON' ? '+' : '-'} ${formatCredits(historyAmount)} CR`;

  return (
    <View style={styles.betCard}>
      <View style={styles.betTopRow}>
        <ThemedText variant="headline" style={styles.question}>
          {position.marketTitle ?? 'Unknown market'}
        </ThemedText>

        {history ? (
          <ThemedText style={[styles.historyResult, { color: historyColor }]}>
            {historyLabel}
          </ThemedText>
        ) : (
          <ThemedText style={[styles.outcome, { color: outcomeColor }]}>{position.outcome}</ThemedText>
        )}
      </View>

      {history ? (
        <ThemedText variant="body" style={styles.detail}>
          Bet {position.outcome} · {formatRelativeDate(position.placedAt)} · {formatCredits(position.stake)} cr
        </ThemedText>
      ) : (
        <View style={styles.betDetails}>
          <ThemedText variant="body" style={styles.detail}>
            Staked: {formatCredits(position.stake)} cr
          </ThemedText>
          <ThemedText variant="body" style={styles.detail}>
            Potential: {formatCredits(position.potentialPayout)} cr
          </ThemedText>
        </View>
      )}
    </View>
  );
}

function EmptySection({ message }: { message: string }) {
  return <ThemedText style={styles.emptyText}>{message}</ThemedText>;
}

export default function PortfolioScreen() {
  const { profile } = useSession();
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const profileId = profile?.id;

  const load = useCallback(async () => {
    if (!profileId) {
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

  const activePositions = useMemo(
    () => positions.filter((position) => position.status === 'OPEN'),
    [positions]
  );
  const historyPositions = useMemo(
    () => positions.filter((position) => position.status !== 'OPEN'),
    [positions]
  );
  const settledPositions = useMemo(
    () =>
      historyPositions.filter(
        (position) => position.status === 'WON' || position.status === 'LOST'
      ),
    [historyPositions]
  );
  const winRate = settledPositions.length
    ? Math.round(
        (settledPositions.filter((position) => position.status === 'WON').length /
          settledPositions.length) *
          100
      )
    : 0;
  const todayProfit = historyPositions
    .filter((position) => {
      if (!position.placedAt) {
        return false;
      }
      return new Date(position.placedAt).toDateString() === new Date().toDateString();
    })
    .reduce((total, position) => total + getPositionProfit(position), 0);

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

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.muted} />
      }
    >
      <BalanceCard
        balance={profile?.balance ?? 0}
        todayProfit={todayProfit}
        winRate={winRate}
      />

      <View style={[styles.section, styles.activeSection]}>
        <ThemedText variant="title" accessibilityRole="header">
          Active Bets ({activePositions.length})
        </ThemedText>
        <View style={styles.cardList}>
          {activePositions.length ? (
            activePositions.map((position) => <BetCard key={position.id} position={position} />)
          ) : (
            <EmptySection message="No active bets" />
          )}
        </View>
      </View>

      <View style={[styles.section, styles.historySection]}>
        <ThemedText variant="title" accessibilityRole="header">
          Bet History
        </ThemedText>
        <View style={styles.cardList}>
          {historyPositions.length ? (
            historyPositions.map((position) => <BetCard key={position.id} position={position} history />)
          ) : (
            <EmptySection message="No settled bets yet" />
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  balanceCard: {
    minHeight: 168,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
  },
  balanceColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  balanceLabel: {
    ...typography.body,
    color: colors.muted,
  },
  balanceValue: {
    color: colors.text,
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  todayProfit: {
    ...typography.body,
    color: colors.yes,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 64,
    marginHorizontal: spacing.xl,
    backgroundColor: colors.border,
  },
  winRateColumn: {
    width: 84,
    gap: spacing.xs,
  },
  section: {
    gap: spacing.xl + spacing.xs,
  },
  activeSection: {
    marginTop: spacing.xl,
  },
  historySection: {
    marginTop: spacing.md,
  },
  cardList: {
    gap: spacing.xl + spacing.xs,
  },
  betCard: {
    minHeight: 108,
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
  },
  betTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  question: {
    flex: 1,
    flexShrink: 1,
  },
  outcome: {
    ...typography.body,
    fontWeight: '700',
  },
  historyResult: {
    ...typography.body,
    flexShrink: 0,
    fontWeight: '700',
  },
  betDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  detail: {
    color: colors.muted,
    flexShrink: 1,
  },
  emptyText: {
    ...typography.body,
    color: colors.muted,
    paddingVertical: spacing.sm,
  },
});
