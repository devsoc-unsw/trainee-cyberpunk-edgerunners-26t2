import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { PlaceholderState } from '@/components/ui/placeholder-state';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { mockMarkets } from '@/data/mock-markets';
import { colors, radius, spacing } from '@/theme';

export default function MarketDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const market = mockMarkets.find((item) => item.id === id);

  if (!market) {
    return (
      <Screen centered>
        <PlaceholderState title="Market not found" description="Check the market ID and try again." />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="caption" style={{ color: colors.accent }}>
          {market.category.toUpperCase()} · {market.status}
        </ThemedText>
        <ThemedText variant="title">{market.title}</ThemedText>
        <ThemedText variant="body" style={{ opacity: 0.72 }}>
          {market.description}
        </ThemedText>
      </View>

      <View
        style={{
          gap: spacing.sm,
          padding: spacing.lg,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
        }}
      >
        <ThemedText variant="caption">RESOLUTION CRITERIA</ThemedText>
        <ThemedText variant="body">{market.resolutionCriteria}</ThemedText>
        <ThemedText variant="subhead">Closes {market.closesAt}</ThemedText>
      </View>

      <PlaceholderState
        title="Make a prediction"
        description="Choose YES or NO, then enter your stake."
      />
    </Screen>
  );
}
