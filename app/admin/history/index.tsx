import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';

import { AdminFilter, AdminSearch, AdminStatus } from '@/components/admin/admin-components';
import { ThemedText } from '@/components/ui/themed-text';
import { fetchAdminHistory } from '@/lib/supabase-data';
import { colors, spacing } from '@/theme';
import { AdminAction } from '@/types';

type HistoryFilter = 'ALL' | 'MARKETS' | 'BETS' | 'USERS' | 'CREDITS';

function matchesFilter(action: AdminAction['action'], filter: HistoryFilter) {
  if (filter === 'ALL') return true;
  if (filter === 'MARKETS') return action.startsWith('MARKET_') || action === 'ODDS_OVERRIDE';
  if (filter === 'BETS') return action === 'BET_REFUNDED';
  if (filter === 'USERS') return action === 'USER_SUSPENDED' || action === 'USER_REACTIVATED' || action === 'USER_ROLE_CHANGED';
  return action === 'CREDIT_ADJUSTMENT';
}

export default function AdminHistoryScreen() {
  const [actions, setActions] = useState<AdminAction[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<HistoryFilter>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      setActions(await fetchAdminHistory());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load admin history');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  const filteredActions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return actions.filter((item) => matchesFilter(item.action, filter) && (!normalizedQuery || `${item.summary} ${item.target} ${item.reason}`.toLowerCase().includes(normalizedQuery)));
  }, [actions, filter, query]);

  if (isLoading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}><ActivityIndicator color={colors.accent} /></View>;

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        padding: spacing.lg,
        paddingBottom: spacing.xxxl,
        flexGrow: 1,
      }}
      data={filteredActions}
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
            placeholder="Search admin history"
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
              active={filter === 'MARKETS'}
              onPress={() => setFilter('MARKETS')}
            >
              Markets
            </AdminFilter>
  
            <AdminFilter
              active={filter === 'BETS'}
              onPress={() => setFilter('BETS')}
            >
              Bets
            </AdminFilter>
  
            <AdminFilter
              active={filter === 'USERS'}
              onPress={() => setFilter('USERS')}
            >
              Users
            </AdminFilter>
  
            <AdminFilter
              active={filter === 'CREDITS'}
              onPress={() => setFilter('CREDITS')}
            >
              Credits
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
            No admin actions yet
          </ThemedText>
  
          <ThemedText
            variant="body"
            style={{
              color: colors.muted,
              textAlign: 'center',
            }}
          >
            Admin activity will appear here.
          </ThemedText>
        </View>
      }
      renderItem={({ item }) => {
        const isWarning =
          item.action === 'BET_REFUNDED' ||
          item.action === 'MARKET_VOIDED';
  
        return (
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
                alignItems: 'flex-start',
                gap: spacing.md,
              }}
            >
              <AdminStatus
                label={item.action.replaceAll('_', ' ')}
                tone={isWarning ? 'warning' : 'neutral'}
              />
  
              <ThemedText
                variant="caption"
                style={{
                  color: colors.muted,
                  flexShrink: 1,
                  textAlign: 'right',
                }}
              >
                {item.createdAt}
              </ThemedText>
            </View>
  
            <View style={{ gap: spacing.xs }}>
              <ThemedText variant="headline">
                {item.summary}
              </ThemedText>
  
              <ThemedText
                variant="subhead"
                style={{ color: colors.accent }}
              >
                {item.target}
              </ThemedText>
            </View>
  
            {item.reason ? (
              <View
                style={{
                  padding: spacing.md,
                  backgroundColor: colors.background,
                  borderRadius: 12,
                  borderCurve: 'continuous',
                }}
              >
                <ThemedText
                  variant="caption"
                  style={{
                    color: colors.muted,
                    marginBottom: spacing.xs,
                  }}
                >
                  REASON
                </ThemedText>
  
                <ThemedText variant="body">
                  {item.reason}
                </ThemedText>
              </View>
            ) : null}
  
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <ThemedText
                variant="caption"
                style={{ color: colors.muted }}
              >
                Performed by
              </ThemedText>
  
              <ThemedText
                variant="subhead"
                style={{ fontWeight: '700' }}
              >
                {item.adminName}
              </ThemedText>
            </View>
          </View>
        );
      }}
    />
  );
}
