import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, TextInput, View } from 'react-native';

import { PlaceholderState } from '@/components/ui/placeholder-state';
import { ThemedText } from '@/components/ui/themed-text';
import { fetchMarkets } from '@/lib/data';
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
  const [allMarkets, setAllMarkets] = useState<Awaited<ReturnType<typeof fetchMarkets>>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void fetchMarkets()
      .then(setAllMarkets)
      .finally(() => setIsLoading(false));
  }, []);

  const markets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return allMarkets;

    return allMarkets.filter((market) =>
      `${market.title} ${market.category}`.toLowerCase().includes(normalizedQuery),
    );
  }, [allMarkets, query]);

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
          <ThemedText variant="subhead">
            {isLoading ? 'Loading markets…' : `${markets.length} ${markets.length === 1 ? 'market' : 'markets'}`}
          </ThemedText>
        </View>
      }
      ListEmptyComponent={
        isLoading ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <PlaceholderState title="No markets found" description="Try a different search." />
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