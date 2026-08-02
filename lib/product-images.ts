export function normalizeImageList(images: unknown): string[] {
  if (Array.isArray(images)) {
    return images.filter((image): image is string => typeof image === 'string' && image.trim().length > 0).map((image) => image.trim());
  }

  if (typeof images === 'string') {
    const trimmed = images.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((image): image is string => typeof image === 'string' && image.trim().length > 0).map((image) => image.trim());
      }
    } catch {
      return [trimmed];
    }

    return [trimmed];
  }

  return [];
}

export function getFirstImageUrl(images: unknown): string | null {
  return normalizeImageList(images)[0] ?? null;
}

export type StorageObjectRef = {
  bucket: string;
  path: string;
};

export function extractStorageObjectRef(imageUrl: string): StorageObjectRef | null {
  try {
    const parsed = new URL(imageUrl);
    const segments = parsed.pathname.split('/').filter(Boolean);

    const objectIndex = segments.findIndex((segment) => segment === 'object');
    if (objectIndex < 0) return null;

    const accessMode = segments[objectIndex + 1];
    const bucket = segments[objectIndex + 2];
    const pathSegments = segments.slice(objectIndex + 3);

    if (!accessMode || !bucket || pathSegments.length === 0) {
      return null;
    }

    return {
      bucket,
      path: pathSegments.join('/'),
    };
  } catch {
    return null;
  }
}

export async function toSignedImageUrl(storageClient: any, imageUrl: string, expiresInSeconds = 60 * 60 * 24 * 30): Promise<string> {
  const ref = extractStorageObjectRef(imageUrl);
  if (!ref) return imageUrl;

  const { data, error } = await storageClient.storage.from(ref.bucket).createSignedUrl(ref.path, expiresInSeconds);
  if (error || !data?.signedUrl) {
    return imageUrl;
  }

  return data.signedUrl;
}

export async function toSignedImageUrls(storageClient: any, images: unknown, expiresInSeconds = 60 * 60 * 24 * 30): Promise<string[]> {
  const normalized = normalizeImageList(images);
  return Promise.all(normalized.map((imageUrl) => toSignedImageUrl(storageClient, imageUrl, expiresInSeconds)));
}