import { View } from 'react-native';

import { spacing } from '@/theme';

import { ThemedText } from './themed-text';

type Props = {
  title: string;
  description: string;
};

export function PlaceholderState({ title, description }: Props) {
  return (
    <View style={{ paddingVertical: spacing.xxl, alignItems: 'center', gap: spacing.sm }}>
      <ThemedText variant="headline">{title}</ThemedText>
      <ThemedText variant="subhead">{description}</ThemedText>
    </View>
  );
}
