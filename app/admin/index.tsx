import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { AdminRow, AdminSectionLabel } from '@/components/admin/admin-components';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { spacing } from '@/theme';
import { useDemoSession } from '@/state/demo-session';

export default function AdminHomeScreen() {
  const { session } = useDemoSession();
  const isAdmin = session?.role === 'ADMIN';

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/feed');
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return null;
  }

  return (
    <Screen>
      <View style={{ gap: spacing.xs }}>
        <ThemedText variant="title">Admin tools</ThemedText>
      </View>
      <View style={{ gap: spacing.sm }}>
        <AdminSectionLabel>Manage</AdminSectionLabel>
        <AdminRow title="Markets" onPress={() => router.push('/admin/markets')} />
        <AdminRow title="Bets" onPress={() => router.push('/admin/bets')} />
        <AdminRow title="Users" onPress={() => router.push('/admin/users')} />
        <AdminRow title="History" onPress={() => router.push('/admin/history')} />
      </View>
    </Screen>
  );
}
