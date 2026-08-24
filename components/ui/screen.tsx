import { ScrollView, ScrollViewProps } from 'react-native';

import { colors, spacing } from '@/theme';

type Props = ScrollViewProps & {
  centered?: boolean;
};

export function Screen({ centered, contentContainerStyle, style, ...props }: Props) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      style={[{ flex: 1, backgroundColor: colors.background }, style]}
      contentContainerStyle={[
        {
          flexGrow: 1,
          padding: spacing.lg,
          gap: spacing.lg,
        },
        centered && { justifyContent: 'center' },
        contentContainerStyle,
      ]}
      {...props}
    />
  );
}
