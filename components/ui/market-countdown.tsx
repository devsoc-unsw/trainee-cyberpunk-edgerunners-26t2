import { StyleProp, TextStyle } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { useCountdown } from '@/state/countdown';
import { colors, typography } from '@/theme';
import { MarketStatus } from '@/types';

type Props = {
  closesAt: string;
  status: MarketStatus;
  variant?: keyof typeof typography;
  style?: StyleProp<TextStyle>;
};

function getClosedLabel(status: MarketStatus) {
  if (status === 'RESOLVED') return 'Resolved';
  if (status === 'VOIDED') return 'Voided';
  return 'Closed';
}

/**
 * Live "closes in ..." label for a market. Kept as a component rather than a
 * bare helper so it can be dropped into list rows, where a hook cannot be
 * called directly from the renderItem callback.
 */
export function MarketCountdown({ closesAt, status, variant = 'subhead', style }: Props) {
  const countdown = useCountdown(closesAt);
  const isClosed = status !== 'OPEN' || countdown.isExpired;

  return (
    <ThemedText
      variant={variant}
      style={[{ color: isClosed ? colors.muted : colors.accent }, style]}
    >
      {isClosed ? getClosedLabel(status) : `Closes in ${countdown.label}`}
    </ThemedText>
  );
}
