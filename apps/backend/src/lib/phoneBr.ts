/** Brazilian mobile: DDD (2) + 9 + 8 digits = 11 digits, no country code. */
export function normalizeBrPhone11(value: string): string | null {
  const digits = value.replace(/\D/gu, "");
  let phone = digits;
  if (phone.startsWith("55") && phone.length === 13) {
    phone = phone.slice(2);
  }
  if (phone.length !== 11) return null;
  if (phone[2] !== "9") return null;
  return phone;
}

/**
 * Derive WhatsApp local form: DDD + 8 digits (strip the 9 after DDD).
 * e.g. 85988887777 → 8588887777
 */
export function deriveWhatsappFromBrPhone11(phone11: string): string {
  return `${phone11.slice(0, 2)}${phone11.slice(3)}`;
}
