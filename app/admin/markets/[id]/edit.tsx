import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AdminActionButton, AdminField, AdminTextInput } from '@/components/admin/admin-components';
import { PlaceholderState } from '@/components/ui/placeholder-state';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { fetchMarket, updateMarket } from '@/lib/data';
import { colors, spacing } from '@/theme';
import { Market } from '@/types';

export default function EditMarketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [market, setMarket] = useState<Market | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [resolutionCriteria, setResolutionCriteria] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) {
      return;
    }

    void fetchMarket(id)
      .then((nextMarket) => {
        setMarket(nextMarket);
        if (nextMarket) {
          setTitle(nextMarket.title);
          setDescription(nextMarket.description);
          setCategory(nextMarket.category);
          setClosesAt(nextMarket.closesAt);
          setResolutionCriteria(nextMarket.resolutionCriteria);
        }
      })
      .catch(() => setErrorMessage('Market could not be loaded.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!id || !title.trim() || !category.trim() || !closesAt.trim() || !resolutionCriteria.trim()) {
      setErrorMessage('Question, category, closing date, and resolution criteria are required.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await updateMarket(id, {
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        closesAt,
        resolutionCriteria: resolutionCriteria.trim(),
      });
      router.back();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Market could not be updated.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <Screen centered><ActivityIndicator color={colors.accent} /></Screen>;
  }

  if (!market) {
    return <Screen centered><PlaceholderState title="Market not found" description="Check the market ID and try again." /></Screen>;
  }

  return (
    <Screen>
      <ThemedText variant="title">Edit market</ThemedText>
      <View style={{ gap: spacing.md }}>
        <AdminField label="Question">
          <AdminTextInput value={title} onChangeText={setTitle} accessibilityLabel="Question" />
        </AdminField>
        <AdminField label="Description">
          <AdminTextInput value={description} onChangeText={setDescription} multiline numberOfLines={3} accessibilityLabel="Description" />
        </AdminField>
        <AdminField label="Category">
          <AdminTextInput value={category} onChangeText={setCategory} accessibilityLabel="Category" />
        </AdminField>
        <AdminField label="Closing date">
          <AdminTextInput value={closesAt} onChangeText={setClosesAt} accessibilityLabel="Closing date" />
        </AdminField>
        <AdminField label="Resolution criteria">
          <AdminTextInput value={resolutionCriteria} onChangeText={setResolutionCriteria} multiline numberOfLines={4} accessibilityLabel="Resolution criteria" />
        </AdminField>
        {errorMessage ? <ThemedText style={{ color: colors.no }}>{errorMessage}</ThemedText> : null}
        <AdminActionButton disabled={isSubmitting} onPress={handleSave}>{isSubmitting ? 'Saving changes…' : 'Save changes'}</AdminActionButton>
      </View>
    </Screen>
  );
}
