/** Lowercase, strip accents/diacritics, remove symbols; collapse whitespace. */
export function sanitizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

/** Strip leading zeros from a digit-only query (e.g. "01" → "1"). Empty → null. */
export function normalizeLeadingZeros(value: string): string | null {
  const digits = value.replace(/\D/gu, "");
  if (!digits) return null;
  const normalized = digits.replace(/^0+/u, "") || "0";
  return normalized;
}

export function isDigitsOnlyQuery(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && /^\d+$/u.test(trimmed);
}
