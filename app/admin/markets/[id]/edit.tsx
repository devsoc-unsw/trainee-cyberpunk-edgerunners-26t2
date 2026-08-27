import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { AdminActionButton, AdminTextInput } from '@/components/admin/admin-components';
import { PlaceholderState } from '@/components/ui/placeholder-state';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { adminMarkets } from '@/data/mock-admin';
import { spacing } from '@/theme';

export default function EditMarketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const market = adminMarkets.find((item) => item.id === id);

  if (!market) {
    return <Screen centered><PlaceholderState title="Market not found" description="Check the market ID and try again." /></Screen>;
  }

  return (
    <Screen>
      <ThemedText variant="title">Edit market</ThemedText>
      <View style={{ gap: spacing.md }}>
        <AdminTextInput defaultValue={market.title} />
        <AdminTextInput defaultValue={market.description} multiline numberOfLines={3} />
        <AdminTextInput defaultValue={market.category} />
        <AdminTextInput defaultValue={market.closesAt} />
        <AdminTextInput defaultValue={market.resolutionCriteria} multiline numberOfLines={4} />
        <AdminActionButton>Save changes</AdminActionButton>
      </View>
    </Screen>
  );
}
