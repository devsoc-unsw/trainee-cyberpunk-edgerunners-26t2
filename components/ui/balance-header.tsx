import { useBalance } from '@/state/balance';
import { Text, View, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

export function BalanceHeader() {
  const { balance } = useBalance();
  const balanceText = Number.isNaN(balance) || balance === null ? "—"
    : `${Math.max(0, balance)} cr`;
 
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{balanceText}</Text>
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
});