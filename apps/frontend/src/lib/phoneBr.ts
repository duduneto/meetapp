/** Digits only from a phone-like string. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/gu, "");
}

/** Format BR mobile as (XX) 9XXXX-XXXX from up to 11 digits. */
export function formatBrPhoneMask(value: string): string {
  const digits = digitsOnly(value).slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** Normalize to 11-digit BR mobile (strips leading 55 if present). */
export function normalizeBrPhone11(value: string): string | null {
  let phone = digitsOnly(value);
  if (phone.startsWith("55") && phone.length === 13) {
    phone = phone.slice(2);
  }
  if (phone.length !== 11 || phone[2] !== "9") return null;
  return phone;
}
