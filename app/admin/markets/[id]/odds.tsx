import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AdminActionButton, AdminTextInput } from '@/components/admin/admin-components';
import { PlaceholderState } from '@/components/ui/placeholder-state';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { adminMarkets } from '@/data/mock-admin';
import { spacing } from '@/theme';

export default function OverrideOddsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const market = adminMarkets.find((item) => item.id === id);
  const [yesProbability, setYesProbability] = useState(market?.yesProbability ?? 0.5);

  if (!market) {
    return <Screen centered><PlaceholderState title="Market not found" description="Check the market ID and try again." /></Screen>;
  }

  const yesPercent = Math.round(yesProbability * 100);
  const noPercent = 100 - yesPercent;
  const setPercentage = (value: string, side: 'YES' | 'NO') => {
    const percentage = Math.max(0, Math.min(100, Number.parseInt(value, 10) || 0));
    setYesProbability(side === 'YES' ? percentage / 100 : 1 - percentage / 100);
  };

  return (
    <Screen>
      <ThemedText variant="title">Override odds</ThemedText>
      <ThemedText variant="subhead">{market.title}</ThemedText>
      <View style={{ gap: spacing.md }}>
        <AdminTextInput value={`${yesPercent}`} placeholder="YES percentage" keyboardType="number-pad" onChangeText={(value) => setPercentage(value, 'YES')} />
        <AdminTextInput value={`${noPercent}`} placeholder="NO percentage" keyboardType="number-pad" onChangeText={(value) => setPercentage(value, 'NO')} />
        <ThemedText variant="headline">YES {yesPercent}% · NO {noPercent}%</ThemedText>
        <AdminActionButton onPress={() => setYesProbability(0.25)}>25 / 75</AdminActionButton>
        <AdminActionButton onPress={() => setYesProbability(0.5)}>50 / 50</AdminActionButton>
        <AdminActionButton onPress={() => setYesProbability(0.75)}>75 / 25</AdminActionButton>
        <AdminTextInput placeholder="Reason for override" multiline numberOfLines={3} />
        <AdminActionButton>Apply override</AdminActionButton>
      </View>
    </Screen>
  );
}
