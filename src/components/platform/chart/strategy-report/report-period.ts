export function reportYearToDateStart(lastDate: string): string {
  const year = /^\d{4}-\d{2}-\d{2}/.test(lastDate) ? lastDate.slice(0, 4) : String(new Date().getUTCFullYear());
  return `${year}-01-01`;
}
