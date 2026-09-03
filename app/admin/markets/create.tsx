import { useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';

import { AdminActionButton, AdminField, AdminTextInput } from '@/components/admin/admin-components';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { createMarket } from '@/lib/data';
import { colors, spacing } from '@/theme';

export default function CreateMarketScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [resolutionCriteria, setResolutionCriteria] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateMarket = async () => {
    setErrorMessage(null);

    if (!title.trim() || !category.trim() || !closesAt.trim() || !resolutionCriteria.trim()) {
      setErrorMessage('Question, category, closing date, and resolution criteria are required.');
      return;
    }

    if (Number.isNaN(Date.parse(closesAt))) {
      setErrorMessage('Use a valid closing date.');
      return;
    }

    setIsSubmitting(true);

    try {
      await createMarket({
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        closesAt,
        resolutionCriteria: resolutionCriteria.trim(),
      });
      router.replace('/admin/markets');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Market could not be created.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <View style={{ gap: spacing.xs }}>
        <ThemedText variant="title">New market</ThemedText>
      </View>
      <View style={{ gap: spacing.md }}>
        <AdminField label="Question">
          <AdminTextInput value={title} onChangeText={setTitle} placeholder="Ask a yes or no question" accessibilityLabel="Question" />
        </AdminField>
        <AdminField label="Description">
          <AdminTextInput value={description} onChangeText={setDescription} placeholder="Short description" multiline numberOfLines={3} accessibilityLabel="Description" />
        </AdminField>
        <AdminField label="Category">
          <AdminTextInput value={category} onChangeText={setCategory} placeholder="e.g. Campus" accessibilityLabel="Category" />
        </AdminField>
        <AdminField label="Closing date">
          <AdminTextInput value={closesAt} onChangeText={setClosesAt} placeholder="YYYY-MM-DD" accessibilityLabel="Closing date" />
        </AdminField>
        <AdminField label="Resolution criteria">
          <AdminTextInput value={resolutionCriteria} onChangeText={setResolutionCriteria} placeholder="What counts as YES?" multiline numberOfLines={4} accessibilityLabel="Resolution criteria" />
        </AdminField>
        {errorMessage ? <ThemedText style={{ color: colors.no }}>{errorMessage}</ThemedText> : null}
        <AdminActionButton disabled={isSubmitting} onPress={handleCreateMarket}>{isSubmitting ? 'Creating market…' : 'Create market'}</AdminActionButton>
      </View>
    </Screen>
  );
}
