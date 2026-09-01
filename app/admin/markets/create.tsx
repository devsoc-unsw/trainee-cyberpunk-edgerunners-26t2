import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AdminActionButton, AdminField, AdminTextInput } from '@/components/admin/admin-components';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { createMarket } from '@/lib/supabase-data';
import { colors, spacing } from '@/theme';

function toClosingIso(value: string) {
  const date = new Date(`${value.trim()}T23:59:59.000Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default function CreateMarketScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [resolutionCriteria, setResolutionCriteria] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    const closesAtIso = toClosingIso(closesAt);
    if (!title.trim() || !category.trim() || !resolutionCriteria.trim() || !closesAtIso) {
      setErrorMessage('Fill in all required fields and use a valid closing date (YYYY-MM-DD)');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await createMarket({ title, description, category, closesAtIso, resolutionCriteria });
      router.replace('/admin/markets');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create market');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <View style={{ gap: spacing.xs }}><ThemedText variant="title">New market</ThemedText><ThemedText variant="subhead">Create a YES/NO prediction for students.</ThemedText></View>
      <View style={{ gap: spacing.md }}>
        <AdminField label="Question"><AdminTextInput value={title} onChangeText={setTitle} placeholder="Ask a yes or no question" accessibilityLabel="Question" /></AdminField>
        <AdminField label="Description"><AdminTextInput value={description} onChangeText={setDescription} placeholder="Short description" multiline numberOfLines={3} accessibilityLabel="Description" /></AdminField>
        <AdminField label="Category"><AdminTextInput value={category} onChangeText={setCategory} placeholder="e.g. Campus" accessibilityLabel="Category" /></AdminField>
        <AdminField label="Closing date"><AdminTextInput value={closesAt} onChangeText={setClosesAt} placeholder="YYYY-MM-DD" accessibilityLabel="Closing date" /></AdminField>
        <AdminField label="Resolution criteria"><AdminTextInput value={resolutionCriteria} onChangeText={setResolutionCriteria} placeholder="What counts as YES?" multiline numberOfLines={4} accessibilityLabel="Resolution criteria" /></AdminField>
        {errorMessage ? <ThemedText style={{ color: colors.no }}>{errorMessage}</ThemedText> : null}
        <AdminActionButton disabled={isSubmitting} onPress={() => void handleCreate()}>{isSubmitting ? 'Creating...' : 'Create market'}</AdminActionButton>
      </View>
    </Screen>
  );
}
