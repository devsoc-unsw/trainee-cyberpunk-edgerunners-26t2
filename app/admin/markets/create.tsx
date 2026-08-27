import { View } from 'react-native';

import { AdminActionButton, AdminField, AdminTextInput } from '@/components/admin/admin-components';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { spacing } from '@/theme';

export default function CreateMarketScreen() {
  return (
    <Screen>
      <View style={{ gap: spacing.xs }}>
        <ThemedText variant="title">New market</ThemedText>
      </View>
      <View style={{ gap: spacing.md }}>
        <AdminField label="Question">
          <AdminTextInput placeholder="Ask a yes or no question" accessibilityLabel="Question" />
        </AdminField>
        <AdminField label="Description">
          <AdminTextInput placeholder="Short description" multiline numberOfLines={3} accessibilityLabel="Description" />
        </AdminField>
        <AdminField label="Category">
          <AdminTextInput placeholder="e.g. Campus" accessibilityLabel="Category" />
        </AdminField>
        <AdminField label="Closing date">
          <AdminTextInput placeholder="YYYY-MM-DD" accessibilityLabel="Closing date" />
        </AdminField>
        <AdminField label="Resolution criteria">
          <AdminTextInput placeholder="What counts as YES?" multiline numberOfLines={4} accessibilityLabel="Resolution criteria" />
        </AdminField>
        <AdminActionButton>Create market</AdminActionButton>
      </View>
    </Screen>
  );
}
