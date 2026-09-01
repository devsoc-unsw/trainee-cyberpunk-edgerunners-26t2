import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { fetchMarkets, MarketWithOutcomes } from '@/lib/supabase-data';
import { colors, radius, spacing } from '@/theme';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [markets, setMarkets] = useState<MarketWithOutcomes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadMarkets = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMessage(null);

    try {
      setMarkets(await fetchMarkets());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load markets');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadMarkets();
  }, [loadMarkets]);

  const filteredMarkets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return markets;

    return markets.filter((market) =>
      `${market.title} ${market.category} ${market.description}`.toLowerCase().includes(normalizedQuery),
    );
  }, [markets, query]);

  if (isLoading) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.background }}><ActivityIndicator color={colors.accent} /><ThemedText variant="subhead">Loading markets...</ThemedText></View>;
  }

  return (
    <FlatList
      data={filteredMarkets}
      keyExtractor={(item) => item.id}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadMarkets(true)} tintColor={colors.accent} />}
      ListHeaderComponent={
        <View style={{ gap: spacing.md, paddingBottom: spacing.sm }}>
          <TextInput
            accessibilityLabel="Search markets"
            autoCapitalize="none"
            onChangeText={setQuery}
            placeholder="Search markets"
            placeholderTextColor={colors.inputPlaceholder}
            returnKeyType="search"
            style={{ height: 48, paddingHorizontal: spacing.lg, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, color: colors.inputText, fontSize: 16 }}
          />
          {errorMessage ? <ThemedText style={{ color: colors.accent }}>{errorMessage}</ThemedText> : null}
          <ThemedText variant="subhead">
            {filteredMarkets.length} {filteredMarkets.length === 1 ? 'market' : 'markets'}
          </ThemedText>
        </View>
      }
      ListEmptyComponent={
        <View style={{ paddingVertical: spacing.xxl, alignItems: 'center', gap: spacing.sm }}>
          <ThemedText variant="headline">No markets found</ThemedText>
          <ThemedText variant="subhead">Try a different search.</ThemedText>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${item.title}`}
          onPress={() => router.push(`/markets/${item.id}`)}
          style={({ pressed }) => ({ gap: spacing.md, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, borderCurve: 'continuous', opacity: pressed ? 0.72 : 1 })}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
            <ThemedText variant="caption" style={{ color: colors.accent }}>{item.category.toUpperCase()}</ThemedText>
            <ThemedText variant="caption">{item.status}</ThemedText>
          </View>
          <ThemedText variant="headline">{item.title}</ThemedText>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <ThemedText variant="subhead">YES {Math.round(item.yesProbability * 100)}%</ThemedText>
            <ThemedText variant="subhead">NO {Math.round((1 - item.yesProbability) * 100)}%</ThemedText>
          </View>
        </Pressable>
      )}
    />
  );
}
