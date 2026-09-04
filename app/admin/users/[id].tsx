import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import {
  AdminActionButton,
  AdminField,
  AdminRow,
  AdminSectionLabel,
  AdminStatus,
  AdminTextInput,
} from '@/components/admin/admin-components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PlaceholderState } from '@/components/ui/placeholder-state';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import {
  adjustUserCredits,
  fetchAdminUsers,
  setUserRole,
  setUserStatus,
} from '@/lib/data';
import { useSession } from '@/state/session';
import { colors, spacing } from '@/theme';
import { AdminUser } from '@/types';

type UserAction = 'promote' | 'demote' | 'suspend' | 'reactivate';

type ActionDetails = {
  title: string;
  confirmLabel: string;
  destructive?: boolean;
};

const actionDetails: Record<UserAction, ActionDetails> = {
  promote: { title: 'Assign admin access?', confirmLabel: 'Assign admin' },
  demote: {
    title: 'Remove admin access?',
    confirmLabel: 'Remove admin',
    destructive: true,
  },
  suspend: {
    title: 'Suspend this user?',
    confirmLabel: 'Suspend user',
    destructive: true,
  },
  reactivate: {
    title: 'Reactivate this user?',
    confirmLabel: 'Reactivate user',
  },
};

const ADJUSTMENT_ID_TEMPLATE = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';

export default function AdminUserDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useSession();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [creditText, setCreditText] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [creditError, setCreditError] = useState<string | null>(null);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [action, setAction] = useState<UserAction | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const adjustmentRequestId = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const users = await fetchAdminUsers();
      setUser(users.find((item) => item.id === id) ?? null);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const handleCreditAdjustment = async () => {
    if (!id) return;
    const delta = Number(creditText.trim());
    setCreditError(null);
    if (!Number.isSafeInteger(delta) || delta === 0) {
      setCreditError('Enter a whole number other than 0.');
      return;
    }
    if (!creditReason.trim()) {
      setCreditError('Enter a reason.');
      return;
    }
    setIsAdjusting(true);
    try {
      adjustmentRequestId.current ??= ADJUSTMENT_ID_TEMPLATE.replace(
        /[xy]/g,
        (character) => {
          const value = Math.floor(Math.random() * 16);
          return (character === 'x' ? value : (value & 0x3) | 0x8).toString(16);
        }
      );
      const balance = await adjustUserCredits(
        id,
        delta,
        creditReason.trim(),
        adjustmentRequestId.current
      );
      setUser((current) => (current ? { ...current, balance } : current));
      adjustmentRequestId.current = null;
      setCreditText('');
      setCreditReason('');
    } catch (error) {
      setCreditError(
        error instanceof Error
          ? error.message
          : 'Credits could not be adjusted.'
      );
    } finally {
      setIsAdjusting(false);
    }
  };

  const openAction = (nextAction: UserAction) => {
    setAction(nextAction);
    setActionReason('');
    setActionError(null);
  };

  const handleAction = async () => {
    if (!id || !action) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      if (action === 'promote') {
        await setUserRole(id, 'ADMIN', actionReason.trim());
      }
      if (action === 'demote') {
        await setUserRole(id, 'USER', actionReason.trim());
      }
      if (action === 'suspend') {
        await setUserStatus(id, 'SUSPENDED', actionReason.trim());
      }
      if (action === 'reactivate') {
        await setUserStatus(id, 'ACTIVE', actionReason.trim());
      }
      setAction(null);
      await load();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'The account could not be updated.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Screen centered>
        <ActivityIndicator color={colors.accent} />
      </Screen>
    );
  }

  if (!user) {
    const title = loadError ? 'User unavailable' : 'User not found';
    const description = loadError
      ? 'Try again.'
      : 'Check the user ID and try again.';

    return (
      <Screen centered>
        <PlaceholderState title={title} description={description} />
        <AdminActionButton
          onPress={() => {
            setIsLoading(true);
            void load();
          }}
        >
          Try again
        </AdminActionButton>
      </Screen>
    );
  }

  const isSelf = profile?.id === user.id;
  const details = action ? actionDetails[action] : null;

  return (
    <Screen>
      <View style={{ gap: spacing.sm }}>
        <AdminStatus
          label={user.status}
          tone={user.status === 'ACTIVE' ? 'positive' : 'negative'}
        />
        <ThemedText variant="title">{user.name}</ThemedText>
        <ThemedText variant="subhead">{user.email}</ThemedText>
      </View>

      <View style={{ gap: spacing.sm }}>
        <AdminSectionLabel>Account</AdminSectionLabel>
        <AdminRow title="Role" value={user.role} />
        <AdminRow title="Status" value={user.status} />
        <AdminRow
          title="Bets"
          value={`${user.betCount}`}
          onPress={() => router.push('/admin/bets')}
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <AdminSectionLabel>Credits</AdminSectionLabel>
        <AdminRow
          title="Current balance"
          value={`${user.balance.toLocaleString()} credits`}
        />
        <AdminField label="Credit adjustment">
          <AdminTextInput
            value={creditText}
            onChangeText={(value) => {
              adjustmentRequestId.current = null;
              setCreditText(value);
            }}
            placeholder="100 or -100"
            accessibilityLabel="Credit adjustment"
          />
        </AdminField>
        <AdminField label="Reason">
          <AdminTextInput
            value={creditReason}
            onChangeText={(value) => {
              adjustmentRequestId.current = null;
              setCreditReason(value);
            }}
            placeholder="Reason for adjustment"
            accessibilityLabel="Reason for adjustment"
          />
        </AdminField>
        {creditError ? (
          <ThemedText variant="caption" style={{ color: colors.no }}>
            {creditError}
          </ThemedText>
        ) : null}
        <AdminActionButton
          disabled={isAdjusting}
          onPress={handleCreditAdjustment}
        >
          {isAdjusting ? 'Adjusting credits…' : 'Adjust credits'}
        </AdminActionButton>
      </View>

      <View style={{ gap: spacing.sm }}>
        <AdminSectionLabel>Permissions</AdminSectionLabel>
        {user.role === 'USER' ? (
          <AdminActionButton onPress={() => openAction('promote')}>
            Assign admin
          </AdminActionButton>
        ) : (
          <AdminActionButton
            disabled={isSelf}
            danger
            onPress={() => openAction('demote')}
          >
            Remove admin
          </AdminActionButton>
        )}
        {user.status === 'ACTIVE' ? (
          <AdminActionButton
            disabled={isSelf}
            danger
            onPress={() => openAction('suspend')}
          >
            Suspend user
          </AdminActionButton>
        ) : (
          <AdminActionButton onPress={() => openAction('reactivate')}>
            Reactivate user
          </AdminActionButton>
        )}
        {isSelf ? (
          <ThemedText variant="caption">
            You cannot suspend or remove your own admin access.
          </ThemedText>
        ) : null}
      </View>

      {details ? (
        <ConfirmDialog
          visible
          title={details.title}
          confirmLabel={details.confirmLabel}
          destructive={details.destructive}
          isBusy={isSubmitting}
          reason={actionReason}
          reasonLabel="Reason"
          errorMessage={actionError}
          onReasonChange={setActionReason}
          onConfirm={handleAction}
          onCancel={() => setAction(null)}
        />
      ) : null}
    </Screen>
  );
}
