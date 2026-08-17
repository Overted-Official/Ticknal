/**
 * Financial & Sensitive Data Masking Utility
 * Protects account numbers, IBANs, and PII from shoulder-surfing and accidental exposure.
 */

/**
 * Masks a bank account or IBAN number, showing only the last 4 digits.
 * e.g. "100029384812" -> "•••• •••• 4812"
 */
export function maskAccountNumber(accountNumber?: string | null): string {
  if (!accountNumber) return '—';
  const clean = accountNumber.trim();
  if (clean.length === 0) return '—';
  if (clean.length <= 4) return `•••• ${clean}`;

  const last4 = clean.slice(-4);
  return `•••• •••• ${last4}`;
}

/**
 * Masks monetary values into privacy dots
 */
export function maskFinancialValue(value: string | number, suffix = 'EGP'): string {
  return `****** ${suffix}`;
}
