import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';

import { colors } from '@/theme';

export default function TabsLayout() {
  return (
    <NativeTabs
      backgroundColor={colors.surface}
      blurEffect="systemMaterialDark"
      iconColor={{ default: colors.muted, selected: colors.accent }}
      labelStyle={{ default: { color: colors.muted }, selected: { color: colors.accent } }}
      tintColor={colors.accent}
    >
      <NativeTabs.Trigger name="feed">
        <Icon
          sf="list.bullet"
          androidSrc={<VectorIcon family={MaterialIcons} name="format-list-bulleted" />}
        />
        <Label>Markets</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="portfolio">
        <Icon
          sf={{ default: 'briefcase', selected: 'briefcase.fill' }}
          androidSrc={<VectorIcon family={MaterialIcons} name="account-balance-wallet" />}
        />
        <Label>Portfolio</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="leaderboard">
        <Icon
          sf={{ default: 'trophy', selected: 'trophy.fill' }}
          androidSrc={<VectorIcon family={MaterialIcons} name="leaderboard" />}
        />
        <Label>Leaderboard</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
