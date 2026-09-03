import { Text, TextProps, TextStyle } from 'react-native';

import { useAccessibility } from '@/state/accessibility';
import { typography } from '@/theme';

type Props = TextProps & {
  variant?: keyof typeof typography;
};

// Bumping every weight one step keeps the type hierarchy intact -- body text
// gets heavier without becoming indistinguishable from a headline.
const BOLDER_WEIGHT: Record<string, TextStyle['fontWeight']> = {
  '400': '600',
  '500': '700',
  '600': '800',
  '700': '900',
};

// Muted text is the first thing to fail a contrast check, so high contrast
// lifts it much further than it lifts primary text.
const HIGH_CONTRAST_TEXT = '#FFFFFF';
const HIGH_CONTRAST_MUTED = '#DFE4EA';

export function ThemedText({ variant = 'body', style, selectable = true, ...props }: Props) {
  const { textScale, boldText, highContrast } = useAccessibility();
  const base = typography[variant];

  const resolved: TextStyle = {
    ...base,
    fontSize: Math.round(base.fontSize * textScale),
    lineHeight: Math.round(base.lineHeight * textScale),
  };

  if (boldText) {
    resolved.fontWeight = BOLDER_WEIGHT[base.fontWeight] ?? base.fontWeight;
  }

  if (highContrast) {
    resolved.color = base.color === typography.body.color ? HIGH_CONTRAST_TEXT : HIGH_CONTRAST_MUTED;
  }

  // `style` stays last so a caller's explicit colour still wins.
  return <Text selectable={selectable} style={[resolved, style]} {...props} />;
}
