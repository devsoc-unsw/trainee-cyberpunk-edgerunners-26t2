import { Pressable, Switch, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { colors, radius, spacing } from '@/theme';

/** Groups rows into a single rounded card with hairline separators. */
export function ListCard({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        overflow: 'hidden',
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderCurve: 'continuous',
      }}
    >
      {children}
    </View>
  );
}

const rowLayout = {
  minHeight: 64,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: spacing.md,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
} as const;

type ListRowProps = {
  title: string;
  subtitle?: string;
  value?: string;
  danger?: boolean;
  /** Read after the title by screen readers to explain what happens on press. */
  accessibilityHint?: string;
  onPress?: () => void;
};

export function ListRow({ title, subtitle, value, danger, accessibilityHint, onPress }: ListRowProps) {
  // An explicit label replaces the children for screen readers, so the
  // subtitle and value have to be folded back in or they are simply lost.
  const label = [title, subtitle, value].filter(Boolean).join(', ');

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
      accessibilityHint={onPress ? accessibilityHint : undefined}
      accessibilityState={{ disabled: !onPress }}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({ ...rowLayout, opacity: pressed ? 0.72 : 1 })}
    >
      <View style={{ flex: 1, gap: spacing.xs }}>
        <ThemedText variant="headline" style={danger ? { color: colors.no } : undefined}>
          {title}
        </ThemedText>
        {subtitle ? <ThemedText variant="subhead">{subtitle}</ThemedText> : null}
      </View>
      {value ? (
        <ThemedText variant="subhead" style={{ flexShrink: 0 }}>
          {value}
        </ThemedText>
      ) : null}
      {onPress ? (
        <ThemedText variant="title" style={{ color: colors.muted }}>
          ›
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

type ToggleRowProps = {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

export function ToggleRow({ title, description, value, onValueChange }: ToggleRowProps) {
  return (
    <View style={rowLayout}>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <ThemedText variant="headline">{title}</ThemedText>
        <ThemedText variant="subhead">{description}</ThemedText>
      </View>
      <Switch
        accessibilityLabel={title}
        accessibilityHint={description}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor={colors.text}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

type SegmentedControlProps<T extends string> = {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        gap: spacing.xs,
        padding: spacing.xs,
        backgroundColor: colors.background,
        borderRadius: radius.md,
        borderCurve: 'continuous',
      }}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: isSelected, checked: isSelected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: spacing.sm,
              borderRadius: radius.sm,
              borderCurve: 'continuous',
              backgroundColor: isSelected ? colors.accent : 'transparent',
              opacity: pressed ? 0.72 : 1,
            })}
          >
            <ThemedText
              variant="caption"
              style={{ color: isSelected ? colors.accentText : colors.muted, fontWeight: '700' }}
            >
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}
