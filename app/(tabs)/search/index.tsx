import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { supabase } from '@/lib/supabase';
import { colors, radius, spacing } from '@/theme';

type SearchMarket = {
  id: string;
  title: string;
  category: string;
  status: string;
  yesProbability: number;
};

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [allMarkets, setAllMarkets] = useState<SearchMarket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadMarkets() {
      setIsLoading(true);
      setLoadError(null);

      // Query supabase data
      const { data, error } = await supabase
        .from('markets')
        .select('id, title, category, status, outcomes(name, pool)');

      if (!isMounted) return;

      if (error) {
        setLoadError(error.message);
        setIsLoading(false);
        return;
      }

      // Calculate odds and format data
      const computed: SearchMarket[] = (data ?? []).map((market) => {
        const yesPool = market.outcomes.find((o) => o.name === 'Yes')?.pool ?? 0;
        const noPool = market.outcomes.find((o) => o.name === 'No')?.pool ?? 0;
        const totalPool = yesPool + noPool;

        return {
          id: market.id,
          title: market.title,
          category: market.category,
          status: market.status,
          yesProbability: totalPool > 0 ? yesPool / totalPool : 0.5,
        };
      });

      setAllMarkets(computed);
      setIsLoading(false);
    }

    loadMarkets();
    return () => {
      isMounted = false;
    };
  }, []);

  // Update search results on query or market changes
  const markets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return allMarkets;

    return allMarkets.filter((market) =>
      `${market.title} ${market.category}`.toLowerCase().includes(normalizedQuery),
    );
  }, [query, allMarkets]);

  return (
    <FlatList
      data={markets}
      keyExtractor={(item) => item.id}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
      ListHeaderComponent={
        <View style={{ gap: spacing.md, paddingBottom: spacing.sm }}>
          <TextInput
            accessibilityLabel="Search markets"
            autoCapitalize="none"
            onChangeText={setQuery}
            placeholder="Search markets"
            placeholderTextColor={colors.inputPlaceholder}
            returnKeyType="search"
            style={{
              height: 48,
              paddingHorizontal: spacing.lg,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: radius.md,
              color: colors.inputText,
              fontSize: 16,
            }}
          />
          {loadError ? (
            <ThemedText style={{ color: colors.accent }}>Couldn't load markets: {loadError}</ThemedText>
          ) : (
            <ThemedText variant="subhead">
              {isLoading ? 'Loading…' : `${markets.length} ${markets.length === 1 ? 'market' : 'markets'}`}
            </ThemedText>
          )}
        </View>
      }
      ListEmptyComponent={
        isLoading ? null : (
          <View style={{ paddingVertical: spacing.xxl, alignItems: 'center', gap: spacing.sm }}>
            <ThemedText variant="headline">No markets found</ThemedText>
            <ThemedText variant="subhead">Try a different search.</ThemedText>
          </View>
        )
      }
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${item.title}`}
          onPress={() => router.push(`/markets/${item.id}`)}
          style={({ pressed }) => ({
            gap: spacing.md,
            padding: spacing.lg,
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            borderCurve: 'continuous',
            opacity: pressed ? 0.72 : 1,
          })}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
            <ThemedText variant="caption" style={{ color: colors.accent }}>
              {item.category.toUpperCase()}
            </ThemedText>
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