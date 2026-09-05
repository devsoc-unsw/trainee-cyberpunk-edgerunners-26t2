import { useBalance } from '@/state/balance';
import { Text, View, StyleSheet } from 'react-native';
import { colors, discoveryColors, radius, spacing, typography } from '@/theme';

type Props = {
  variant?: 'default' | 'compact';
};

export function BalanceHeader({ variant = 'default' }: Props) {
  const { balance } = useBalance();
  const balanceText = Number.isNaN(balance) || balance === null ? "—"
    : `${Math.max(0, balance)} cr`;
  const isCompact = variant === 'compact';
 
  return (
    <View style={[styles.container, isCompact && styles.compactContainer]}>
      <Text style={[styles.text, isCompact && styles.compactText]}>{balanceText}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  text: {
    ...typography.caption,
    color: colors.accentText,
  },
  compactContainer: {
    minHeight: 32,
    justifyContent: 'center',
    backgroundColor: discoveryColors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  compactText: {
    color: discoveryColors.accentText,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
