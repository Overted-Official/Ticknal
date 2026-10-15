function cairoParts(now: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', hourCycle: 'h23', weekday: 'short',
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return { date: `${value('year')}-${value('month')}-${value('day')}`,
    hour: Number(value('hour')), weekday: value('weekday') };
}

export function cairoMarketDate(now: Date): string {
  return cairoParts(now).date;
}

export function isClosedEgxSession(now: Date, latestSession: string): boolean {
  const cairo = cairoParts(now);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'].includes(cairo.weekday)
    && cairo.hour >= 17
    && latestSession === cairo.date;
}
