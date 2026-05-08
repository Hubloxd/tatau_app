/** Zgodne z polem mime_type z API (null = traktuj jak obraz). */
export function isVideoMime(mime: string | null | undefined): boolean {
  return !!mime && mime.startsWith('video/');
}
