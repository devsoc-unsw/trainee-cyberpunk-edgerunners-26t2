import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AdminActionButton, AdminField, AdminTextInput } from '@/components/admin/admin-components';
import { PlaceholderState } from '@/components/ui/placeholder-state';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { fetchMarket, updateMarket, MarketWithOutcomes } from '@/lib/supabase-data';
import { colors, spacing } from '@/theme';

function toClosingIso(value: string) {
  const date = new Date(`${value.trim()}T23:59:59.000Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default function EditMarketScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [market, setMarket] = useState<MarketWithOutcomes | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [resolutionCriteria, setResolutionCriteria] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadMarket = useCallback(async () => {
    if (!id) return;
    try {
      const result = await fetchMarket(id);
      setMarket(result);
      if (result) {
        setTitle(result.title);
        setDescription(result.description);
        setCategory(result.category);
        setClosesAt(result.closesAtIso.slice(0, 10));
        setResolutionCriteria(result.resolutionCriteria);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load market');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { void loadMarket(); }, [loadMarket]);

  const handleSave = async () => {
    const closesAtIso = toClosingIso(closesAt);
    if (!id || !title.trim() || !category.trim() || !resolutionCriteria.trim() || !closesAtIso) {
      setErrorMessage('Fill in all required fields and use a valid closing date (YYYY-MM-DD)');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await updateMarket(id, { title, description, category, closesAtIso, resolutionCriteria });
      router.replace(`/admin/markets/${id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save market');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <Screen centered><ActivityIndicator color={colors.accent} /></Screen>;
  if (!market) return <Screen centered><PlaceholderState title="Market not found" description={errorMessage ?? 'Check the market ID and try again.'} /></Screen>;

  return (
    <Screen>
      <ThemedText variant="title">Edit market</ThemedText>
      <View style={{ gap: spacing.md }}>
        <AdminField label="Question"><AdminTextInput value={title} onChangeText={setTitle} accessibilityLabel="Question" /></AdminField>
        <AdminField label="Description"><AdminTextInput value={description} onChangeText={setDescription} multiline numberOfLines={3} accessibilityLabel="Description" /></AdminField>
        <AdminField label="Category"><AdminTextInput value={category} onChangeText={setCategory} accessibilityLabel="Category" /></AdminField>
        <AdminField label="Closing date"><AdminTextInput value={closesAt} onChangeText={setClosesAt} placeholder="YYYY-MM-DD" accessibilityLabel="Closing date" /></AdminField>
        <AdminField label="Resolution criteria"><AdminTextInput value={resolutionCriteria} onChangeText={setResolutionCriteria} multiline numberOfLines={4} accessibilityLabel="Resolution criteria" /></AdminField>
        {errorMessage ? <ThemedText style={{ color: colors.no }}>{errorMessage}</ThemedText> : null}
        <AdminActionButton disabled={isSubmitting} onPress={() => void handleSave()}>{isSubmitting ? 'Saving...' : 'Save changes'}</AdminActionButton>
      </View>
    </Screen>
  );
}
