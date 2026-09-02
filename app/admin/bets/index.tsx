import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';

import { AdminFilter, AdminSearch, AdminStatus } from '@/components/admin/admin-components';
import { ThemedText } from '@/components/ui/themed-text';
import { fetchAdminBets } from '@/lib/supabase-data';
import { colors, spacing } from '@/theme';
import { AdminBet, PositionStatus } from '@/types';

type BetFilter = 'ALL' | 'OPEN' | 'REFUNDED' | 'YES' | 'NO';

export default function AdminBetsScreen() {
  const [bets, setBets] = useState<AdminBet[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<BetFilter>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadBets = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      setBets(await fetchAdminBets());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load bets');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadBets(); }, [loadBets]);

  const filteredBets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return bets.filter((bet) => {
      const matchesFilter = filter === 'ALL' || (filter === 'OPEN' ? bet.status === 'OPEN' : filter === 'REFUNDED' ? bet.status === 'REFUNDED' : bet.outcome === filter);
      return matchesFilter && (!normalizedQuery || `${bet.userName} ${bet.marketTitle}`.toLowerCase().includes(normalizedQuery));
    });
  }, [bets, filter, query]);

  const statusTone = (status: PositionStatus) => status === 'REFUNDED' ? 'warning' as const : status === 'OPEN' ? 'positive' as const : status === 'WON' ? 'positive' as const : 'negative' as const;

  if (isLoading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}><ActivityIndicator color={colors.accent} /></View>;

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        padding: spacing.lg,
        paddingBottom: spacing.xxxl,
        flexGrow: 1,
      }}
      data={filteredBets}
      keyExtractor={(item) => item.id}
      ItemSeparatorComponent={() => (
        <View style={{ height: spacing.md }} />
      )}
      ListHeaderComponent={
        <View
          style={{
            gap: spacing.md,
            marginBottom: spacing.lg,
          }}
        >
          <AdminSearch
            placeholder="Search users or markets"
            value={query}
            onChangeText={setQuery}
          />
  
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: spacing.sm,
            }}
          >
            <AdminFilter
              active={filter === 'ALL'}
              onPress={() => setFilter('ALL')}
            >
              All
            </AdminFilter>
  
            <AdminFilter
              active={filter === 'OPEN'}
              onPress={() => setFilter('OPEN')}
            >
              Active
            </AdminFilter>
  
            <AdminFilter
              active={filter === 'REFUNDED'}
              onPress={() => setFilter('REFUNDED')}
            >
              Refunded
            </AdminFilter>
  
            <AdminFilter
              active={filter === 'YES'}
              onPress={() => setFilter('YES')}
            >
              YES
            </AdminFilter>
  
            <AdminFilter
              active={filter === 'NO'}
              onPress={() => setFilter('NO')}
            >
              NO
            </AdminFilter>
          </View>
  
          {errorMessage ? (
            <ThemedText style={{ color: colors.no }}>
              {errorMessage}
            </ThemedText>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: spacing.xxxl,
            gap: spacing.sm,
          }}
        >
          <ThemedText variant="headline">
            No bets found
          </ThemedText>
  
          <ThemedText
            variant="body"
            style={{
              color: colors.muted,
              textAlign: 'center',
            }}
          >
            Try changing your search or filters.
          </ThemedText>
        </View>
      }
      renderItem={({ item }) => (
        <View
          style={{
            gap: spacing.md,
            padding: spacing.lg,
            backgroundColor: colors.surface,
            borderRadius: 16,
            borderCurve: 'continuous',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <AdminStatus
              label={item.status}
              tone={statusTone(item.status)}
            />
  
            <ThemedText
              variant="subhead"
              style={{
                color:
                  item.outcome === 'YES'
                    ? colors.yes
                    : colors.no,
                fontWeight: '700',
              }}
            >
              {item.outcome}
            </ThemedText>
          </View>
  
          <View style={{ gap: spacing.xs }}>
            <ThemedText variant="headline">
              {item.userName}
            </ThemedText>
  
            <ThemedText
              variant="subhead"
              style={{ color: colors.muted }}
            >
              {item.marketTitle}
            </ThemedText>
          </View>
  
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.xl,
            }}
          >
            <View style={{ flex: 1, gap: spacing.xs }}>
              <ThemedText
                variant="caption"
                style={{ color: colors.muted }}
              >
                STAKE
              </ThemedText>
  
              <ThemedText variant="subhead">
                {item.stake} credits
              </ThemedText>
            </View>
  
            <View style={{ flex: 1, gap: spacing.xs }}>
              <ThemedText
                variant="caption"
                style={{ color: colors.muted }}
              >
                POTENTIAL PAYOUT
              </ThemedText>
  
              <ThemedText variant="subhead">
                {item.potentialPayout} credits
              </ThemedText>
            </View>
          </View>
  
          <ThemedText
            variant="caption"
            style={{ color: colors.muted }}
          >
            Placed {item.placedAt} · Odds{' '}
            {Math.round(item.oddsAtPlacement * 100)}%
          </ThemedText>
  
          <ThemedText
            variant="subhead"
            onPress={() =>
              router.push(`/admin/bets/${item.id}`)
            }
            style={{
              color: colors.accent,
              fontWeight: '700',
              paddingTop: spacing.xs,
            }}
          >
            View bet ›
          </ThemedText>
        </View>
      )}
    />
  );
}
