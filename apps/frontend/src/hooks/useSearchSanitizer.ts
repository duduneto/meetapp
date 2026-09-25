import { useMemo } from "react";

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

/** Strip leading zeros from digit-only input for query; empty → "". */
export function normalizeLeadingZeros(value: string): string {
  const digits = value.replace(/\D/gu, "");
  if (!digits) return "";
  return digits.replace(/^0+/u, "") || "0";
}

export function isDigitsOnlyQuery(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && /^\d+$/u.test(trimmed);
}

/**
 * Sanitizes a search input for backend queries while preserving the raw UI value.
 * Digits-only queries strip leading zeros; text queries are accent/symbol-normalized.
 */
export function useSearchSanitizer(rawInput: string) {
  return useMemo(() => {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      return { raw: rawInput, query: "" };
    }
    if (isDigitsOnlyQuery(trimmed)) {
      return { raw: rawInput, query: normalizeLeadingZeros(trimmed) };
    }
    return { raw: rawInput, query: sanitizeSearchText(trimmed) };
  }, [rawInput]);
}
