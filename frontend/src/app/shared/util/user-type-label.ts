/** Wartości z API / bazy (np. artist) → etykiety po polsku. */
const LABELS: Record<string, string> = {
  artist: 'Artysta tatuażu',
  client: 'Klient',
  studio: 'Studio tatuażu',
  'tattoo artist': 'Artysta tatuażu',
};

export function userTypeLabelPl(raw: string | null | undefined): string {
  if (raw == null || String(raw).trim() === '') {
    return '';
  }
  const key = String(raw).trim().toLowerCase();
  return LABELS[key] ?? String(raw).trim();
}
