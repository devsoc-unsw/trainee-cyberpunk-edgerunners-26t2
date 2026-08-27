// Supabase Storage over the S3 protocol.
//
// Node-side only (scripts, seeding, admin tooling). The S3 protocol keys grant
// full read/write over every bucket in the project and are not scoped by RLS,
// so they must never reach the app bundle — only EXPO_PUBLIC_* vars are inlined
// into the bundle, and these deliberately are not. Uploads from the Expo app go
// through `uploadVideo` in ./supabase instead.
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Static dot-notation access only; anything else is invisible to the bundler.
function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Run this with the project .env loaded, e.g. node --env-file=.env`
    );
  }
  return value;
}

export const s3Client = new S3Client({
  forcePathStyle: true,
  region: requireEnv('S3_PROTOCOL_REGION', process.env.S3_PROTOCOL_REGION),
  endpoint: requireEnv('STORAGE_S3_URL', process.env.STORAGE_S3_URL),
  credentials: {
    accessKeyId: requireEnv('S3_PROTOCOL_ACCESS_KEY_ID', process.env.S3_PROTOCOL_ACCESS_KEY_ID),
    secretAccessKey: requireEnv(
      'S3_PROTOCOL_ACCESS_KEY_SECRET',
      process.env.S3_PROTOCOL_ACCESS_KEY_SECRET
    ),
  },
});

const CONTENT_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

export function contentTypeFor(key: string) {
  const extension = key.split('.').pop()?.toLowerCase() ?? '';
  return CONTENT_TYPES[extension] ?? 'application/octet-stream';
}

// Upload bytes to a bucket. Callers holding a file on disk read it themselves,
// e.g. `uploadObject('videos', 'clip.mp4', await readFile('./clip.mp4'))`.
export async function uploadObject(
  bucket: string,
  key: string,
  body: Uint8Array | string,
  { contentType = contentTypeFor(key) }: { contentType?: string } = {}
) {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return { bucket, key };
}
