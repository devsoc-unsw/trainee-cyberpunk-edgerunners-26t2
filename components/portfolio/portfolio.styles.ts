import { StyleSheet } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

export const styles = StyleSheet.create({
  balanceCard: {
    minHeight: 168,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
  },
  balanceColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  balanceLabel: {
    ...typography.body,
    color: colors.muted,
  },
  balanceValue: {
    color: colors.text,
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  todayProfit: {
    ...typography.body,
    color: colors.yes,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 64,
    marginHorizontal: spacing.xl,
    backgroundColor: colors.border,
  },
  winRateColumn: {
    width: 84,
    gap: spacing.xs,
  },
  section: {
    gap: spacing.xl + spacing.xs,
  },
  activeSection: {
    marginTop: spacing.xl,
  },
  historySection: {
    marginTop: spacing.md,
  },
  cardList: {
    gap: spacing.xl + spacing.xs,
  },
  betCard: {
    minHeight: 108,
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
  },
  betTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  question: {
    flex: 1,
    flexShrink: 1,
  },
  outcome: {
    ...typography.body,
    fontWeight: '700',
  },
  historyResult: {
    ...typography.body,
    flexShrink: 0,
    fontWeight: '700',
  },
  betDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  detail: {
    color: colors.muted,
    flexShrink: 1,
  },
  emptyText: {
    ...typography.body,
    color: colors.muted,
    paddingVertical: spacing.sm,
  },
});
