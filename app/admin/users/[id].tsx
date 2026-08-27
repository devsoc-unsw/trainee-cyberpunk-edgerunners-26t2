import { router, useLocalSearchParams } from 'expo-router';
import { Alert, View } from 'react-native';

import { AdminActionButton, AdminRow, AdminSectionLabel, AdminStatus, AdminTextInput } from '@/components/admin/admin-components';
import { PlaceholderState } from '@/components/ui/placeholder-state';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { adminUsers } from '@/data/mock-admin';
import { spacing } from '@/theme';

export default function AdminUserDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = adminUsers.find((item) => item.id === id);

  if (!user) {
    return <Screen centered><PlaceholderState title="User not found" description="Check the user ID and try again." /></Screen>;
  }

  return (
    <Screen>
      <View style={{ gap: spacing.sm }}>
        <AdminStatus label={user.status} tone={user.status === 'ACTIVE' ? 'positive' : 'negative'} />
        <ThemedText variant="title">{user.name}</ThemedText>
        <ThemedText variant="subhead">{user.email}</ThemedText>
      </View>
      <View style={{ gap: spacing.sm }}>
        <AdminSectionLabel>Account</AdminSectionLabel>
        <AdminRow title="Role" value={user.role} />
        <AdminRow title="Status" value={user.status} />
        <AdminRow title="Bets" value={`${user.betCount}`} onPress={() => router.push('/admin/bets')} />
      </View>
      <View style={{ gap: spacing.sm }}>
        <AdminSectionLabel>Credits</AdminSectionLabel>
        <AdminRow title="Current balance" value={`${user.balance.toLocaleString()} credits`} />
        <View style={{ gap: spacing.md }}>
          <AdminTextInput placeholder="Credit adjustment" keyboardType="number-pad" />
          <AdminTextInput placeholder="Reason for adjustment" />
          <AdminActionButton>Adjust credits</AdminActionButton>
        </View>
      </View>
      <View style={{ gap: spacing.sm }}>
        <AdminSectionLabel>Permissions</AdminSectionLabel>
        <AdminActionButton onPress={() => Alert.alert('Assign admin', 'This is a UI preview. The role would be updated after backend permissions are connected.')}>Assign admin</AdminActionButton>
        <AdminActionButton onPress={() => Alert.alert('Suspend user', 'This is a UI preview. The account would be marked as suspended after backend permissions are connected.')}>Suspend user</AdminActionButton>
      </View>
    </Screen>
  );
}
