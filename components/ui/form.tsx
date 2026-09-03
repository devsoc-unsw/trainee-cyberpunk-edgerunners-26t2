import { forwardRef, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, TextInputProps, View } from 'react-native';

import { EyeIcon, EyeOffIcon } from '@/components/ui/icons';
import { ThemedText } from '@/components/ui/themed-text';
import { colors, radius, spacing } from '@/theme';

/** Width reserved inside the field so long values never run under the accessory. */
const ACCESSORY_WIDTH = 48;

type FormFieldProps = TextInputProps & {
  label: string;
  /** Shown under the field in muted text. Use for format rules, not errors. */
  hint?: string;
  errorMessage?: string;
  /** Rendered against the trailing edge, inside the field's border. */
  accessory?: React.ReactNode;
};

export const FormField = forwardRef<TextInput, FormFieldProps>(function FormField(
  { label, hint, errorMessage, accessory, style, ...props },
  ref
) {
  return (
    <View style={{ gap: spacing.sm }}>
      <ThemedText variant="subhead">{label}</ThemedText>
      <View style={{ justifyContent: 'center' }}>
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
            accessory ? { paddingRight: ACCESSORY_WIDTH } : null,
            style,
          ]}
          {...props}
        />
        {accessory ? (
          <View
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: ACCESSORY_WIDTH,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {accessory}
          </View>
        ) : null}
      </View>
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

type PasswordFieldProps = Omit<FormFieldProps, 'accessory' | 'secureTextEntry'>;

/**
 * A password field with a show/hide toggle. Always prefer this over a bare
 * `secureTextEntry` FormField so the toggle is available everywhere a password
 * is typed.
 *
 * The value is expected to be controlled: on iOS, flipping `secureTextEntry`
 * while the field has focus clears an uncontrolled input.
 */
export const PasswordField = forwardRef<TextInput, PasswordFieldProps>(function PasswordField(
  { label = 'Password', ...props },
  ref
) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <FormField
      ref={ref}
      label={label}
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      secureTextEntry={!isVisible}
      accessory={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isVisible ? 'Hide password' : 'Show password'}
          accessibilityState={{ selected: isVisible }}
          hitSlop={spacing.sm}
          onPress={() => setIsVisible((current) => !current)}
          style={({ pressed }) => ({ padding: spacing.sm, opacity: pressed ? 0.6 : 1 })}
        >
          {isVisible ? <EyeOffIcon /> : <EyeIcon />}
        </Pressable>
      }
    />
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
