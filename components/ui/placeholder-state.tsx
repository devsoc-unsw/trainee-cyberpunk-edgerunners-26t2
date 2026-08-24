import { View } from 'react-native';

import { spacing } from '@/theme';

import { ThemedText } from './themed-text';

type Props = {
  title: string;
  description: string;
};

export function PlaceholderState({ title, description }: Props) {
  return (
    <View style={{ gap: spacing.sm, maxWidth: 320 }}>
      <ThemedText variant="title">{title}</ThemedText>
      <ThemedText variant="body" style={{ opacity: 0.68 }}>
        {description}
      </ThemedText>
    </View>
  );
}
