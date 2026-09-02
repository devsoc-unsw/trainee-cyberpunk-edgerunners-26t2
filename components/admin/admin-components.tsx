import { Pressable, StyleProp, TextInput, TextInputProps, TextStyle, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { ThemedText } from '../ui/themed-text';

type AdminRowProps = {
  title: string;
  subtitle?: string;
  value?: string;
  danger?: boolean;
  onPress?: () => void;
};

export function AdminRow({ title, subtitle, value, danger, onPress }: AdminRowProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 68,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        borderCurve: 'continuous',
        opacity: pressed ? 0.72 : 1,
      })}
    >
      <View style={{ flex: 1, gap: spacing.xs }}>
        <ThemedText
          variant="headline"
          style={danger ? { color: colors.no } : undefined}
        >
          {title}
        </ThemedText>

        {subtitle ? (
          <ThemedText
            variant="subhead"
            style={{ color: colors.muted }}
          >
            {subtitle}
          </ThemedText>
        ) : null}
      </View>

      {value ? (
        <ThemedText
          variant="subhead"
          style={{
            flexShrink: 1,
            textAlign: 'right',
            fontWeight: '600',
          }}
        >
          {value}
        </ThemedText>
      ) : null}

      {onPress ? (
        <ThemedText
          variant="title"
          style={{ color: colors.muted }}
        >
          ›
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

export function AdminSectionLabel({ children }: { children: string }) {
  return (
    <ThemedText
      variant="caption"
      style={{
        color: colors.muted,
        fontWeight: '700',
        letterSpacing: 0.8,
      }}
    >
      {children.toUpperCase()}
    </ThemedText>
  );
}

export function AdminStatus({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'positive' | 'negative' | 'warning';
}) {
  const toneStyles = {
    neutral: {
      backgroundColor: colors.border,
      color: colors.muted,
    },
    positive: {
      backgroundColor: '#173D30',
      color: colors.yes,
    },
    negative: {
      backgroundColor: '#452427',
      color: colors.no,
    },
    warning: {
      backgroundColor: '#493E17',
      color: colors.accent,
    },
  } as const;

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        backgroundColor: toneStyles[tone].backgroundColor,
        borderRadius: radius.full,
        borderCurve: 'continuous',
      }}
    >
      <ThemedText
        variant="caption"
        style={{
          color: toneStyles[tone].color,
          fontWeight: '700',
          letterSpacing: 0.3,
        }}
      >
        {label}
      </ThemedText>
    </View>
  );
}

export function AdminSearch({
  placeholder,
  value,
  onChangeText,
}: {
  placeholder: string;
  value?: string;
  onChangeText?: (value: string) => void;
}) {
  return (
    <TextInput
      accessibilityLabel={placeholder}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.inputPlaceholder}
      value={value}
      style={{
        height: 52,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.md,
        color: colors.inputText,
        fontSize: 16,
      }}
    />
  );
}

export function AdminTextInput({ style, ...props }: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.inputPlaceholder}
      style={[
        {
          minHeight: 52,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.md,
          color: colors.inputText,
          fontSize: 16,
          lineHeight: 22,
          textAlignVertical: 'top',
        },
        style,
      ]}
      {...props}
    />
  );
}

export function AdminField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <ThemedText
        variant="subhead"
        style={{
          color: colors.text,
          fontWeight: '600',
        }}
      >
        {label}
      </ThemedText>

      {children}
    </View>
  );
}

export function AdminFilter({
  children,
  active = false,
  onPress,
}: {
  children: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 36,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: active ? colors.accent : colors.surface,
        borderWidth: 1,
        borderColor: active ? colors.accent : colors.border,
        borderRadius: radius.full,
        borderCurve: 'continuous',
        opacity: pressed ? 0.72 : 1,
      })}
    >
      <ThemedText
        variant="caption"
        style={{
          color: active ? colors.accentText : colors.muted,
          fontWeight: '700',
        }}
      >
        {children}
      </ThemedText>
    </Pressable>
  );
}

export function AdminActionButton({
  children,
  danger,
  disabled = false,
  style,
  onPress,
}: {
  children: string;
  danger?: boolean;
  disabled?: boolean;
  style?: StyleProp<TextStyle>;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: danger ? '#452427' : colors.accent,
        borderWidth: 1,
        borderColor: danger ? colors.no : colors.accent,
        borderRadius: radius.md,
        borderCurve: 'continuous',
        opacity: disabled ? 0.4 : pressed ? 0.72 : 1,
      })}
    >
      <ThemedText
        style={[
          {
            color: danger ? colors.no : colors.accentText,
            fontWeight: '700',
            textAlign: 'center',
          },
          style,
        ]}
      >
        {children}
      </ThemedText>
    </Pressable>
  );
}
