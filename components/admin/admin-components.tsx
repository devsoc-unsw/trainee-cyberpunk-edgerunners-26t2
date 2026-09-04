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
      accessibilityRole="button"
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 64,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderCurve: 'continuous',
        opacity: pressed ? 0.72 : onPress ? 1 : 0.55,
      })}
    >
      <View style={{ flex: 1, gap: spacing.xs }}>
        <ThemedText variant="headline" style={danger ? { color: colors.no } : undefined}>
          {title}
        </ThemedText>
        {subtitle ? <ThemedText variant="subhead">{subtitle}</ThemedText> : null}
      </View>
      {value ? <ThemedText variant="subhead">{value}</ThemedText> : null}
      {onPress ? <ThemedText variant="title" style={{ color: colors.muted }}>›</ThemedText> : null}
    </Pressable>
  );
}

export function AdminSectionLabel({ children }: { children: string }) {
  return (
    <ThemedText variant="caption" style={{ letterSpacing: 0.7 }}>
      {children.toUpperCase()}
    </ThemedText>
  );
}

export function AdminStatus({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'positive' | 'negative' | 'warning' }) {
  const toneStyles = {
    neutral: { backgroundColor: colors.border, color: colors.muted },
    positive: { backgroundColor: '#173D30', color: colors.yes },
    negative: { backgroundColor: '#452427', color: colors.no },
    warning: { backgroundColor: '#493E17', color: colors.accent },
  } as const;

  return (
    <View style={{ alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: toneStyles[tone].backgroundColor }}>
      <ThemedText variant="caption" style={{ color: toneStyles[tone].color, fontWeight: '700' }}>
        {label}
      </ThemedText>
    </View>
  );
}

export function AdminSearch({ placeholder, value, onChangeText }: { placeholder: string; value?: string; onChangeText?: (value: string) => void }) {
  return (
    <TextInput
      accessibilityLabel={placeholder}
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      placeholderTextColor={colors.inputPlaceholder}
      style={{
        height: 48,
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
          minHeight: 48,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.md,
          color: colors.inputText,
          fontSize: 16,
          textAlignVertical: 'top',
        },
        style,
      ]}
      {...props}
    />
  );
}

export function AdminField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <ThemedText variant="subhead" style={{ color: colors.text, fontWeight: '600' }}>
        {label}
      </ThemedText>
      {children}
    </View>
  );
}

export function AdminFilter({ children, active = false, onPress }: { children: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        backgroundColor: active ? colors.accent : colors.surface,
        borderWidth: 1,
        borderColor: active ? colors.accent : colors.border,
        opacity: pressed ? 0.72 : 1,
      })}
    >
      <ThemedText variant="caption" style={{ color: active ? colors.accentText : colors.muted, fontWeight: '700' }}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

export function AdminActionButton({ children, danger, disabled = false, style, onPress }: { children: string; danger?: boolean; disabled?: boolean; style?: StyleProp<TextStyle>; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
        borderRadius: radius.md,
        backgroundColor: danger ? '#452427' : colors.accent,
        opacity: disabled ? 0.4 : pressed ? 0.72 : 1,
      })}
    >
      <ThemedText style={[{ color: danger ? colors.no : colors.accentText, fontWeight: '700' }, style]}>
        {children}
      </ThemedText>
    </Pressable>
  );
}
