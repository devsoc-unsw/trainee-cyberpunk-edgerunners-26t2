import { forwardRef } from 'react';
import { ActivityIndicator, Pressable, TextInput, TextInputProps, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { colors, radius, spacing } from '@/theme';

type FormFieldProps = TextInputProps & {
  label: string;
  /** Shown under the field in muted text. Use for format rules, not errors. */
  hint?: string;
  errorMessage?: string;
};

export const FormField = forwardRef<TextInput, FormFieldProps>(function FormField(
  { label, hint, errorMessage, style, ...props },
  ref
) {
  return (
    <View style={{ gap: spacing.sm }}>
      <ThemedText variant="subhead">{label}</ThemedText>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={colors.inputPlaceholder}
        style={[
          {
            width: '100%',
            minHeight: 52,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            backgroundColor: colors.surface,
            borderColor: errorMessage ? colors.no : colors.border,
            borderWidth: 1,
            borderRadius: radius.md,
            borderCurve: 'continuous',
            color: colors.inputText,
            fontSize: 16,
          },
          style,
        ]}
        {...props}
      />
      {errorMessage ? (
        <ThemedText variant="caption" style={{ color: colors.no }} accessibilityLiveRegion="polite">
          {errorMessage}
        </ThemedText>
      ) : hint ? (
        <ThemedText variant="caption">{hint}</ThemedText>
      ) : null}
    </View>
  );
});

type PrimaryButtonProps = {
  label: string;
  /** Replaces the label and blocks presses while true. */
  isBusy?: boolean;
  disabled?: boolean;
  busyLabel?: string;
  tone?: 'accent' | 'danger' | 'quiet';
  onPress: () => void;
};

export function PrimaryButton({
  label,
  isBusy = false,
  disabled = false,
  busyLabel,
  tone = 'accent',
  onPress,
}: PrimaryButtonProps) {
  const isInactive = disabled || isBusy;

  const toneStyles = {
    accent: { backgroundColor: colors.accent, color: colors.accentText },
    danger: { backgroundColor: colors.no, color: colors.accentText },
    quiet: { backgroundColor: colors.surface, color: colors.text },
  } as const;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive, busy: isBusy }}
      accessibilityLabel={isBusy ? (busyLabel ?? label) : label}
      disabled={isInactive}
      onPress={onPress}
      style={({ pressed }) => ({
        width: '100%',
        minHeight: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.md,
        borderCurve: 'continuous',
        borderWidth: tone === 'quiet' ? 1 : 0,
        borderColor: colors.border,
        backgroundColor: toneStyles[tone].backgroundColor,
        opacity: pressed || isInactive ? 0.72 : 1,
      })}
    >
      {isBusy ? <ActivityIndicator color={toneStyles[tone].color} size="small" /> : null}
      <ThemedText style={{ color: toneStyles[tone].color, fontWeight: '700' }}>
        {isBusy ? (busyLabel ?? label) : label}
      </ThemedText>
    </Pressable>
  );
}
