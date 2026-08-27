import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { AdminActionButton, AdminField, AdminTextInput } from '@/components/admin/admin-components';
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
        <AdminField label="Question">
          <AdminTextInput defaultValue={market.title} accessibilityLabel="Question" />
        </AdminField>
        <AdminField label="Description">
          <AdminTextInput defaultValue={market.description} multiline numberOfLines={3} accessibilityLabel="Description" />
        </AdminField>
        <AdminField label="Category">
          <AdminTextInput defaultValue={market.category} accessibilityLabel="Category" />
        </AdminField>
        <AdminField label="Closing date">
          <AdminTextInput defaultValue={market.closesAt} accessibilityLabel="Closing date" />
        </AdminField>
        <AdminField label="Resolution criteria">
          <AdminTextInput defaultValue={market.resolutionCriteria} multiline numberOfLines={4} accessibilityLabel="Resolution criteria" />
        </AdminField>
        <AdminActionButton>Save changes</AdminActionButton>
      </View>
    </Screen>
  );
}
