type Options = {
  maxSide: number
  type: 'image/webp' | 'image/jpeg'
  quality: number
}

/**
 * Downscales and re-encodes in the browser (Supabase Free has no image transformations).
 * Returns the original file when it cannot be decoded (e.g. HEIC outside Safari) or is a PDF.
 */
export async function compressImage(file: File, { maxSide, type, quality }: Options): Promise<File | Blob> {
  if (!file.type.startsWith('image/')) return file
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return file
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const encode = (t: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, t, quality))
  let blob = await encode(type)
  // Older Safari silently falls back to PNG for WebP: use JPEG instead.
  if (!blob || blob.type !== type) blob = await encode('image/jpeg')
  if (!blob) return file
  return blob.size < file.size ? blob : file
}

export const HOTEL_IMAGE = { maxSide: 1600, type: 'image/webp', quality: 0.82 } as const
// Readable passport scan around 300-600KB.
export const PASSPORT_IMAGE = { maxSide: 2000, type: 'image/jpeg', quality: 0.8 } as const
