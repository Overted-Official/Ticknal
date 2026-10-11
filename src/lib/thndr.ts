/**
 * Thndr Integration & Asset Deep Linking
 * Maps EGX tickers to Thndr internal UUIDs and generates direct trade URLs.
 */

export const THNDR_EGX_MAP: Record<string, string> = {
  // Abu Dhabi Islamic Bank - Egypt
  ADIB: '50362d04-f235-4315-87b9-9f762add5021',
};

/**
 * Returns the direct Thndr web/mobile deep link for an EGX stock symbol.
 * On mobile devices, this URL triggers Thndr's universal link to open the app directly.
 */
export function getThndrTradeUrl(symbol: string, locale: 'ar' | 'en' = 'ar'): { url: string; isDirect: boolean } {
  const clean = (symbol || '').replace('.CA', '').trim().toUpperCase();
  const uuid = THNDR_EGX_MAP[clean];
  const lang = locale === 'en' ? 'en' : 'ar';

  if (uuid) {
    return {
      url: `https://web.thndr.app/${lang}/assets/${uuid}`,
      isDirect: true,
    };
  }

  return {
    url: `https://web.thndr.app/${lang}`,
    isDirect: false,
  };
}
