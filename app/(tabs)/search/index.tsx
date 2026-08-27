import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { mockMarkets } from '@/data/mock-markets';
import { colors, radius, spacing } from '@/theme';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const markets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return mockMarkets;

    return mockMarkets.filter((market) =>
      `${market.title} ${market.category}`.toLowerCase().includes(normalizedQuery),
    );
  }, [query]);

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
            {markets.length} {markets.length === 1 ? 'market' : 'markets'}
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
