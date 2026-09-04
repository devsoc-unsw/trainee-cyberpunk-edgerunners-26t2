import { router } from 'expo-router';
import { View } from 'react-native';

import { PrimaryButton } from '@/components/ui/form';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { useSession } from '@/state/session';
import { spacing } from '@/theme';

export default function SuspendedScreen() {
  const { signOut } = useSession();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <Screen centered>
      <View style={{ gap: spacing.md }}>
        <ThemedText variant="largeTitle">Account suspended</ThemedText>
        <ThemedText variant="body">Contact the project team if you think this is a mistake.</ThemedText>
        <PrimaryButton label="Sign out" tone="quiet" onPress={handleSignOut} />
      </View>
    </Screen>
  );
}
