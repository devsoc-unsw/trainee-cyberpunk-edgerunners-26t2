import { useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';

import { AdminActionButton, AdminField, AdminTextInput } from '@/components/admin/admin-components';
import { MarketVideoField } from '@/components/admin/market-video-field';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { createMarket } from '@/lib/data';
import { normalizeVideoDurationMs, removeUploadedVideo, uploadMarketVideo, validateExistingVideo, type PickedMarketVideo } from '@/lib/market-video';
import { colors, spacing } from '@/theme';

export default function CreateMarketScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [resolutionCriteria, setResolutionCriteria] = useState('');
  const [yesPercentage, setYesPercentage] = useState('50');
  const [videoPath, setVideoPath] = useState('');
  const [videoDuration, setVideoDuration] = useState('');
  const [pickedVideo, setPickedVideo] = useState<PickedMarketVideo | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadController, setUploadController] = useState<AbortController | null>(null);
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

    const parsedYesPercentage = Number(yesPercentage);
    if (!Number.isInteger(parsedYesPercentage) || parsedYesPercentage < 1 || parsedYesPercentage > 99) {
      setErrorMessage('YES percentage must be a whole number from 1 to 99.');
      return;
    }

    setIsSubmitting(true);

    let uploadedPath: string | null = null;

    try {
      let nextVideoPath: string | null = null;
      let nextVideoDuration: number | null = null;

      if (pickedVideo) {
        const controller = new AbortController();
        setUploadController(controller);
        setUploadProgress(0);
        uploadedPath = await uploadMarketVideo(pickedVideo, {
          signal: controller.signal,
          onProgress: setUploadProgress,
        });
        setUploadController(null);
        setUploadProgress(null);
        nextVideoPath = uploadedPath;
        nextVideoDuration = normalizeVideoDurationMs(pickedVideo.durationMs);
      } else if (videoPath.trim()) {
        nextVideoDuration = Number(videoDuration);
        nextVideoPath = await validateExistingVideo(videoPath, nextVideoDuration);
      }

      await createMarket({
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        closesAt,
        resolutionCriteria: resolutionCriteria.trim(),
        yesPercentage: parsedYesPercentage,
        videoPath: nextVideoPath,
        videoDurationMs: nextVideoDuration,
      });
      router.replace('/admin/markets');
    } catch (error) {
      if (uploadedPath) {
        try {
          await removeUploadedVideo(uploadedPath);
        } catch {
          // The failed save remains the primary error. This best-effort cleanup
          // only targets the object created by this attempt.
        }
      }
      setErrorMessage(error instanceof Error ? error.message : 'Market could not be created.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
      setUploadController(null);
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
        <AdminField label="Starting YES percentage">
          <AdminTextInput value={yesPercentage} onChangeText={setYesPercentage} keyboardType="number-pad" accessibilityLabel="Starting YES percentage" />
        </AdminField>
        <MarketVideoField
          disabled={isSubmitting}
          durationText={videoDuration}
          onCancel={() => uploadController?.abort()}
          onDurationChange={setVideoDuration}
          onError={setErrorMessage}
          onPathChange={setVideoPath}
          onPicked={setPickedVideo}
          path={videoPath}
          picked={pickedVideo}
          progress={uploadProgress}
        />
        {errorMessage ? <ThemedText style={{ color: colors.no }}>{errorMessage}</ThemedText> : null}
        <AdminActionButton disabled={isSubmitting} onPress={handleCreateMarket}>{isSubmitting ? 'Creating market…' : 'Create market'}</AdminActionButton>
      </View>
    </Screen>
  );
}
