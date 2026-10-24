export function isValidOpenRouterApiKey(value: unknown): value is string {
  return typeof value === 'string'
    && value.length >= 16
    && value.length <= 512
    && /^sk-or-[A-Za-z0-9_-]+$/.test(value);
}
