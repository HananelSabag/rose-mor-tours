const base = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/hotel-images/`

/** hotel-images is a public bucket: served straight from the CDN, no signing. */
export function hotelImageUrl(path: string): string {
  return base + path.split('/').map(encodeURIComponent).join('/')
}

export function fileExtension(file: File | Blob, fallback = 'bin'): string {
  const fromType: Record<string, string> = {
    'image/webp': 'webp',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/avif': 'avif',
    'image/heic': 'heic',
    'image/heif': 'heif',
    'application/pdf': 'pdf',
  }
  return fromType[file.type] ?? fallback
}
