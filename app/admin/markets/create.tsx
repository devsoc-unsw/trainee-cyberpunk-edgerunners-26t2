import { View } from 'react-native';

import { AdminActionButton, AdminTextInput } from '@/components/admin/admin-components';
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
        <AdminTextInput placeholder="Market question" />
        <AdminTextInput placeholder="Short description" multiline numberOfLines={3} />
        <AdminTextInput placeholder="Category" />
        <AdminTextInput placeholder="Closing date" />
        <AdminTextInput placeholder="Resolution criteria" multiline numberOfLines={4} />
        <AdminActionButton>Create market</AdminActionButton>
      </View>
    </Screen>
  );
}
