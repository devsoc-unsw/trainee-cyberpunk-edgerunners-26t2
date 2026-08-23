import { Text, TextProps } from 'react-native';

import { typography } from '@/theme';

type Props = TextProps & {
  variant?: keyof typeof typography;
};

export function ThemedText({ variant = 'body', style, selectable = true, ...props }: Props) {
  return <Text selectable={selectable} style={[typography[variant], style]} {...props} />;
}
