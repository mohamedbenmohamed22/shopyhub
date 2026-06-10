/**
 * Turn an arbitrary name into a URL-safe slug:
 * lowercased, accents stripped, non-alphanumerics collapsed to single dashes.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
