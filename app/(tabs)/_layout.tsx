import { NativeTabs } from 'expo-router/unstable-native-tabs';

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
        <NativeTabs.Trigger.Icon
          sf="list.bullet"
          md="format_list_bulleted"
        />
        <NativeTabs.Trigger.Label>Markets</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="portfolio">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'briefcase', selected: 'briefcase.fill' }}
          md="account_balance_wallet"
        />
        <NativeTabs.Trigger.Label>Portfolio</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="leaderboard">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'trophy', selected: 'trophy.fill' }}
          md="leaderboard"
        />
        <NativeTabs.Trigger.Label>Leaderboard</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
