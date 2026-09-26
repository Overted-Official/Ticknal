type ClassValue = string | false | null | undefined | Record<string, boolean | null | undefined>;

export function cn(...inputs: ClassValue[]) {
  return inputs
    .flatMap((input) => {
      if (!input) return [];
      if (typeof input === 'string') return [input];
      return Object.entries(input)
        .filter(([, enabled]) => Boolean(enabled))
        .map(([className]) => className);
    })
    .join(' ');
}
