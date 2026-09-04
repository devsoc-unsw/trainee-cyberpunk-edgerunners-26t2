import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { Upload } from 'tus-js-client';

import { supabase, VIDEO_BUCKET } from '@/lib/supabase';

export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_VIDEO_DURATION_MS = 30_000;

/** iOS may report fractional milliseconds; Postgres stores whole milliseconds. */
export function normalizeVideoDurationMs(durationMs: number) {
  return Math.ceil(durationMs);
}

export type PickedMarketVideo = {
  uri: string;
  fileName: string;
  fileSize: number;
  durationMs: number;
  mimeType: 'video/mp4';
  file?: File;
};

export function getVideoPublicUrl(path: string) {
  return supabase.storage.from(VIDEO_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function validateVideoMetadata(input: {
  fileName?: string | null;
  fileSize?: number | null;
  durationMs?: number | null;
  mimeType?: string | null;
}) {
  const extensionIsMp4 = input.fileName?.toLowerCase().endsWith('.mp4') ?? false;
  if (input.mimeType !== 'video/mp4' && !extensionIsMp4) {
    throw new Error('Choose an MP4 video. Other video formats are not supported.');
  }
  if (!input.fileSize || input.fileSize > MAX_VIDEO_BYTES) {
    throw new Error('The video must be 50 MB or smaller.');
  }
  if (
    !input.durationMs
    || !Number.isFinite(input.durationMs)
    || input.durationMs > MAX_VIDEO_DURATION_MS
  ) {
    throw new Error('The video must be 30 seconds or shorter.');
  }
}

export async function validateExistingVideo(path: string, durationMs: number) {
  const normalizedPath = path.trim().replace(/^\/+/, '');
  if (!normalizedPath || normalizedPath.includes('://') || !normalizedPath.toLowerCase().endsWith('.mp4')) {
    throw new Error('Enter an MP4 path from the videos bucket.');
  }
  if (!Number.isInteger(durationMs) || durationMs < 1 || durationMs > MAX_VIDEO_DURATION_MS) {
    throw new Error('Enter the clip duration in milliseconds (1–30000).');
  }
  const parts = normalizedPath.split('/');
  const fileName = parts.pop()!;
  const { data, error } = await supabase.storage
    .from(VIDEO_BUCKET)
    .list(parts.join('/'), { search: fileName, limit: 100 });
  if (error) throw new Error(`The existing video could not be checked: ${error.message}`);

  const object = data.find((candidate) => candidate.name === fileName);
  if (!object) throw new Error('No video exists at that videos bucket path.');
  validateVideoMetadata({
    fileName,
    fileSize: Number(object.metadata?.size),
    durationMs,
    mimeType: object.metadata?.mimetype ?? object.metadata?.contentType,
  });
  return normalizedPath;
}

export async function pickMarketVideo(): Promise<PickedMarketVideo | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error(
      permission.canAskAgain
        ? 'Photo library access is required to choose a video.'
        : 'Photo library access is off. Enable it in system settings, then try again.',
    );
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    allowsEditing: false,
    quality: 1,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  const durationMs = asset.duration == null
    ? null
    : normalizeVideoDurationMs(asset.duration);
  validateVideoMetadata({
    fileName: asset.fileName,
    fileSize: asset.fileSize,
    durationMs,
    mimeType: asset.mimeType,
  });

  return {
    uri: asset.uri,
    fileName: asset.fileName ?? 'market-video.mp4',
    fileSize: asset.fileSize!,
    durationMs: durationMs!,
    mimeType: 'video/mp4',
    file: asset.file,
  };
}

function getResumableEndpoint() {
  const url = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL!);
  if (url.hostname.endsWith('.supabase.co')) {
    url.hostname = url.hostname.replace(/\.supabase\.co$/, '.storage.supabase.co');
  }
  url.pathname = '/storage/v1/upload/resumable';
  url.search = '';
  return url.toString();
}

export async function uploadMarketVideo(
  picked: PickedMarketVideo,
  options: {
    onProgress?: (fraction: number) => void;
    signal?: AbortSignal;
  } = {},
) {
  validateVideoMetadata(picked);
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Your session expired. Sign in again before uploading.');

  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${session.user.id}/markets/${uniqueId}.mp4`;
  const input = Platform.OS === 'web' && picked.file ? picked.file : { uri: picked.uri };

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    let cancelled = false;
    const upload = new Upload(input as File, {
      endpoint: getResumableEndpoint(),
      retryDelays: [0, 3000, 5000, 10_000, 20_000],
      headers: { authorization: `Bearer ${session.access_token}`, 'x-upsert': 'false' },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024,
      metadata: {
        bucketName: VIDEO_BUCKET,
        objectName: path,
        contentType: picked.mimeType,
        cacheControl: '3600',
      },
      onProgress: (uploaded, total) => options.onProgress?.(total ? uploaded / total : 0),
      onError: (error) => {
        if (!settled) {
          settled = true;
          reject(new Error(cancelled ? 'Video upload cancelled.' : `Video upload failed: ${error.message}`));
        }
      },
      onSuccess: () => {
        if (!settled) {
          settled = true;
          options.onProgress?.(1);
          resolve(path);
        }
      },
    });

    const cancel = () => {
      cancelled = true;
      void upload.abort(true).finally(() => {
        if (!settled) {
          settled = true;
          reject(new Error('Video upload cancelled.'));
        }
      });
    };
    options.signal?.addEventListener('abort', cancel, { once: true });
    if (options.signal?.aborted) cancel();
    else void upload.findPreviousUploads().then((previous) => {
      if (cancelled) return;
      if (previous[0]) upload.resumeFromPreviousUpload(previous[0]);
      upload.start();
    }).catch((error: Error) => {
      if (!cancelled && !settled) {
        settled = true;
        reject(new Error(`Video upload failed: ${error.message}`));
      }
    });
  });
}

export async function removeUploadedVideo(path: string) {
  const { error } = await supabase.storage.from(VIDEO_BUCKET).remove([path]);
  if (error) throw error;
}
