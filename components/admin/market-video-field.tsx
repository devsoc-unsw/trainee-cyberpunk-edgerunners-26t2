import { useEvent } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { Pressable, StyleSheet, View } from "react-native";

import {
  AdminField,
  AdminTextInput,
} from "@/components/admin/admin-components";
import { ThemedText } from "@/components/ui/themed-text";
import {
  getVideoPublicUrl,
  pickMarketVideo,
  type PickedMarketVideo,
} from "@/lib/market-video";
import { colors, radius, spacing } from "@/theme";

type Props = {
  path: string;
  durationText: string;
  picked: PickedMarketVideo | null;
  disabled?: boolean;
  progress?: number | null;
  onPathChange: (value: string) => void;
  onDurationChange: (value: string) => void;
  onPicked: (value: PickedMarketVideo | null) => void;
  onError: (message: string) => void;
  onCancel?: () => void;
};

function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (nextPlayer) => {
    nextPlayer.loop = true;
    nextPlayer.muted = true;
    nextPlayer.play();
  });
  const { status } = useEvent(player, "statusChange", {
    status: player.status,
  });

  if (status === "error") {
    return (
      <View style={[styles.preview, styles.previewFallback]}>
        <ThemedText variant="subhead">
          Preview unavailable. Check that this path is public and points to an
          MP4.
        </ThemedText>
      </View>
    );
  }

  return (
    <VideoView
      accessibilityLabel="Selected market video preview"
      contentFit="cover"
      nativeControls
      player={player}
      style={styles.preview}
      surfaceType="textureView"
    />
  );
}

export function MarketVideoField({
  path,
  durationText,
  picked,
  disabled,
  progress,
  onPathChange,
  onDurationChange,
  onPicked,
  onError,
  onCancel,
}: Props) {
  const previewUri =
    picked?.uri ??
    (path.trim() ? getVideoPublicUrl(path.trim().replace(/^\/+/, "")) : null);

  const chooseVideo = async () => {
    try {
      const next = await pickMarketVideo();
      if (next) {
        onPicked(next);
        onPathChange("");
        onDurationChange(String(next.durationMs));
      }
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "The video could not be selected.",
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <ThemedText variant="headline">Background video</ThemedText>
          <ThemedText variant="subhead">
            Optional MP4, up to 30 seconds and 50 MB.
          </ThemedText>
        </View>
        {(picked || path) && !disabled ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onPicked(null);
              onPathChange("");
              onDurationChange("");
            }}
          >
            <ThemedText variant="subhead" style={{ color: colors.no }}>
              Remove
            </ThemedText>
          </Pressable>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={chooseVideo}
        style={({ pressed }) => [
          styles.chooseButton,
          { opacity: disabled ? 0.45 : pressed ? 0.72 : 1 },
        ]}
      >
        <ThemedText style={{ color: colors.accentText, fontWeight: "700" }}>
          {picked ? "Choose a different MP4" : "Choose MP4 from device"}
        </ThemedText>
      </Pressable>

      {picked ? (
        <ThemedText variant="subhead" selectable>
          {picked.fileName} · {(picked.fileSize / 1024 / 1024).toFixed(1)} MB ·{" "}
          {(picked.durationMs / 1000).toFixed(1)}s
        </ThemedText>
      ) : (
        <>
          <AdminField label="Or existing videos bucket path">
            <AdminTextInput
              accessibilityLabel="Existing video bucket path"
              autoCapitalize="none"
              editable={!disabled}
              onChangeText={(value) => {
                onPicked(null);
                onPathChange(value);
              }}
              placeholder="admin-id/markets/clip.mp4"
              value={path}
            />
          </AdminField>
          <AdminField label="Clip duration (milliseconds)">
            <AdminTextInput
              accessibilityLabel="Clip duration in milliseconds"
              editable={!disabled}
              keyboardType="number-pad"
              onChangeText={onDurationChange}
              placeholder="e.g. 15000"
              value={durationText}
            />
          </AdminField>
        </>
      )}

      {previewUri ? <VideoPreview key={previewUri} uri={previewUri} /> : null}

      {progress !== null && progress !== undefined ? (
        <View style={{ gap: spacing.xs }}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round(progress * 100)}%` },
              ]}
            />
          </View>
          <View style={styles.headingRow}>
            <ThemedText variant="subhead">
              Uploading {Math.round(progress * 100)}%
            </ThemedText>
            {onCancel ? (
              <Pressable accessibilityRole="button" onPress={onCancel}>
                <ThemedText variant="subhead" style={{ color: colors.no }}>
                  Cancel upload
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  chooseButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
  },
  preview: {
    width: "100%",
    aspectRatio: 9 / 16,
    maxHeight: 420,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.background,
  },
  previewFallback: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  progressTrack: {
    height: 6,
    overflow: "hidden",
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  progressFill: { height: "100%", backgroundColor: colors.accent },
});
