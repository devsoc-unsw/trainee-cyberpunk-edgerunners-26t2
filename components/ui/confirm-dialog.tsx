import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/form';
import { ThemedText } from '@/components/ui/themed-text';
import { useAccessibility } from '@/state/accessibility';
import { colors, radius, spacing } from '@/theme';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Renders the confirm action in the destructive colour. */
  destructive?: boolean;
  isBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  isBusy = false,
  onConfirm,
  onCancel,
}: Props) {
  const { reduceMotion } = useAccessibility();

  return (
    <Modal
      transparent
      visible={visible}
      animationType={reduceMotion ? 'none' : 'fade'}
      // Android hardware back and iOS accessibility escape both cancel.
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xl,
        }}
      >
        {/* The scrim is a sibling of the card rather than its parent: on iOS
            `accessibilityElementsHidden` hides descendants too, so wrapping
            the card in it would hide the whole dialog from VoiceOver. */}
        <Pressable
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onPress={isBusy ? undefined : onCancel}
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]}
        />

        <View
          accessibilityViewIsModal
          accessibilityRole="alert"
          style={{
            width: '100%',
            maxWidth: 400,
            gap: spacing.lg,
            padding: spacing.xl,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.lg,
            borderCurve: 'continuous',
          }}
        >
          <View style={{ gap: spacing.sm }}>
            <ThemedText variant="title" accessibilityRole="header">
              {title}
            </ThemedText>
            {message ? <ThemedText variant="body" style={{ color: colors.muted }}>{message}</ThemedText> : null}
          </View>

          <View style={{ gap: spacing.sm }}>
            <PrimaryButton
              label={confirmLabel}
              tone={destructive ? 'danger' : 'accent'}
              isBusy={isBusy}
              onPress={onConfirm}
            />
            <PrimaryButton label={cancelLabel} tone="quiet" disabled={isBusy} onPress={onCancel} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
