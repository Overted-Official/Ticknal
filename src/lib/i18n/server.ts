import { cookies, headers } from 'next/headers';
import type { Locale, Direction, TranslationKey, Dictionary } from './types';
import enDict from './dictionaries/en.json';
import arDict from './dictionaries/ar.json';
import { LOCALE_COOKIE_NAME } from './client';

const dictionaries: Record<Locale, Dictionary> = {
  en: enDict as Dictionary,
  ar: arDict as Dictionary,
};

export async function getServerLocale(): Promise<Locale> {
  try {
    const cookieStore = await cookies();
    const cookieVal = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
    if (cookieVal === 'ar' || cookieVal === 'en') {
      return cookieVal;
    }
  } catch {
    // cookies() may throw if called outside request scope in rare static analysis passes
  }

  try {
    const headerList = await headers();
    const acceptLang = headerList.get('accept-language');
    if (acceptLang?.toLowerCase().includes('ar')) {
      return 'ar';
    }
  } catch {
    // headers() fallback
  }

  return 'en';
}

export function getServerDirection(locale: Locale): Direction {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

export function getServerDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] || dictionaries.en;
}

export function createServerTranslator(locale: Locale) {
  const dict = getServerDictionary(locale);

  return (key: TranslationKey, params?: Record<string, string | number>): string => {
    const [ns, k] = key.split('.') as [keyof Dictionary, string];
    const nsObj = dict[ns] as Record<string, string> | undefined;
    let text = nsObj?.[k] || (dictionaries.en[ns] as Record<string, string>)?.[k] || key;

    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        text = text.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramValue));
      }
    }

    return text;
  };
}
