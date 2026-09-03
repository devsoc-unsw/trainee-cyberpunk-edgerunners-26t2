import { router } from 'expo-router';
import { View } from 'react-native';

import { AdminSectionLabel } from '@/components/admin/admin-components';
import { ListCard, ListRow, SegmentedControl, ToggleRow } from '@/components/ui/list';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { TextSize, useAccessibility } from '@/state/accessibility';
import { useSession } from '@/state/session';
import { colors, radius, spacing } from '@/theme';

const TEXT_SIZE_OPTIONS: { value: TextSize; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'large', label: 'Large' },
  { value: 'larger', label: 'Larger' },
];

export default function SettingsScreen() {
  const { profile } = useSession();
  const { textSize, boldText, highContrast, reduceMotion, setPreference } = useAccessibility();

  return (
    <Screen>
      <View style={{ gap: spacing.sm }}>
        <AdminSectionLabel>Account</AdminSectionLabel>
        <ListCard>
          <ListRow
            title="Username"
            value={profile?.username ?? 'Not set'}
            accessibilityHint="Opens the change username screen"
            onPress={() => router.push('/profile/username')}
          />
          <ListRow
            title="Password"
            accessibilityHint="Opens the change password screen"
            onPress={() => router.push('/profile/password')}
          />
          <ListRow title="Email" value={profile?.email} />
        </ListCard>
      </View>

      <View style={{ gap: spacing.sm }}>
        <AdminSectionLabel>Accessibility</AdminSectionLabel>

        <View
          style={{
            gap: spacing.md,
            padding: spacing.lg,
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            borderCurve: 'continuous',
          }}
        >
          <View style={{ gap: spacing.xs }}>
            <ThemedText variant="headline">Text size</ThemedText>
            <ThemedText variant="subhead">Scales every label and heading in the app.</ThemedText>
          </View>
          <SegmentedControl
            label="Text size"
            options={TEXT_SIZE_OPTIONS}
            value={textSize}
            onChange={(value) => setPreference('textSize', value)}
          />
          {/* Live preview so the effect of the choice is visible without
              leaving the screen. */}
          <ThemedText variant="body">The Boilermaker beats the Wallabies. Yes or no?</ThemedText>
        </View>

        <ListCard>
          <ToggleRow
            title="Bold text"
            description="Thickens text for easier reading."
            value={boldText}
            onValueChange={(value) => setPreference('boldText', value)}
          />
          <ToggleRow
            title="High contrast text"
            description="Brightens text against the dark background."
            value={highContrast}
            onValueChange={(value) => setPreference('highContrast', value)}
          />
          <ToggleRow
            title="Reduce motion"
            description="Removes fades and transitions in dialogs."
            value={reduceMotion}
            onValueChange={(value) => setPreference('reduceMotion', value)}
          />
        </ListCard>

        <ThemedText variant="caption">
          These preferences are saved on this device and start from your system accessibility
          settings.
        </ThemedText>
      </View>
    </Screen>
  );
}
