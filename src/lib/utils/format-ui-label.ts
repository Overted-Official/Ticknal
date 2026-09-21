const UI_ACRONYMS = new Set([
  'AI',
  'API',
  'CBE',
  'COMEX',
  'EGP',
  'EGX',
  'FAQ',
  'FOREX',
  'PSI',
  'ROI',
  'SL',
  'TP',
  'USD',
]);

export function formatUiLabel(value: string): string {
  return value
    .trim()
    .replaceAll('_', ' ')
    .toLowerCase()
    .split(/\s+/)
    .map((word) => {
      const normalized = word.toUpperCase();
      if (UI_ACRONYMS.has(normalized)) return normalized;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}
