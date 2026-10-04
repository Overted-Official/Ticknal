'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale, Direction, TranslationKey, Dictionary } from './types';
import enDict from './dictionaries/en.json';
import arDict from './dictionaries/ar.json';

const dictionaries: Record<Locale, Dictionary> = {
  en: enDict as Dictionary,
  ar: arDict as Dictionary,
};

interface LocaleContextType {
  locale: Locale;
  dir: Direction;
  isRTL: boolean;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  setLocale: (newLocale: Locale) => Promise<void>;
  formatCurrency: (amount: number, currency?: 'EGP' | 'USD') => string;
  formatPercent: (val: number, includeSign?: boolean) => string;
  formatNumber: (val: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  i18n: { language: Locale };
}

const LocaleContext = createContext<LocaleContextType | null>(null);

export const LOCALE_COOKIE_NAME = 'ticknal_locale';

export function LocaleProvider({
  children,
  initialLocale = 'en',
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // Sync with client storage on mount if different
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCALE_COOKIE_NAME) as Locale | null;
      if (stored && (stored === 'en' || stored === 'ar') && stored !== locale) {
        setLocaleState(stored);
        document.documentElement.lang = stored;
        document.documentElement.dir = stored === 'ar' ? 'rtl' : 'ltr';
      }
    } catch {
      // Storage access might be restricted in some sandboxes
    }
  }, [locale]);

  const dir: Direction = locale === 'ar' ? 'rtl' : 'ltr';
  const isRTL = dir === 'rtl';

  const setLocale = useCallback(
    async (newLocale: Locale) => {
      if (newLocale === locale) return;

      // 1. Update state
      setLocaleState(newLocale);

      // 2. Set Cookie (1 year expiry)
      try {
        const oneYear = 365 * 24 * 60 * 60;
        document.cookie = `${LOCALE_COOKIE_NAME}=${newLocale}; path=/; max-age=${oneYear}; SameSite=Lax`;
        localStorage.setItem(LOCALE_COOKIE_NAME, newLocale);
      } catch (err) {
        console.error('Failed to persist locale:', err);
      }

      // 3. Update DOM attributes immediately
      document.documentElement.lang = newLocale;
      document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr';

      // 4. Trigger router refresh so Server Components refresh with the new cookie
      router.refresh();

      // 5. Emit custom event for any listeners outside React
      window.dispatchEvent(
        new CustomEvent('ticknal_locale_changed', {
          detail: { locale: newLocale, dir: newLocale === 'ar' ? 'rtl' : 'ltr' },
        })
      );
    },
    [locale, router]
  );

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      const [ns, k] = key.split('.') as [keyof Dictionary, string];
      const dict = dictionaries[locale] || dictionaries.en;
      const nsObj = dict[ns] as Record<string, string> | undefined;
      let text = nsObj?.[k] || (dictionaries.en[ns] as Record<string, string>)?.[k] || key;

      if (params) {
        for (const [paramKey, paramValue] of Object.entries(params)) {
          text = text.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramValue));
        }
      }

      return text;
    },
    [locale]
  );

  const formatNumber = useCallback(
    (val: number, options?: Intl.NumberFormatOptions): string => {
      // Standardize on Western Arabic digits (0-9) with tabular numbers for institutional clarity
      return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', options).format(
        val
      );
    },
    [locale]
  );

  const formatCurrency = useCallback(
    (amount: number, currency: 'EGP' | 'USD' = 'EGP'): string => {
      const formattedNum = formatNumber(amount, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      if (currency === 'EGP') {
        return locale === 'ar' ? `${formattedNum} ج.م` : `${formattedNum} EGP`;
      }
      return `$${formattedNum}`;
    },
    [formatNumber, locale]
  );

  const formatPercent = useCallback(
    (val: number, includeSign = true): string => {
      const absVal = Math.abs(val);
      const formattedNum = formatNumber(absVal, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const sign = val > 0 ? '+' : val < 0 ? '-' : '';
      const prefix = includeSign ? sign : '';

      return locale === 'ar' ? `%${prefix}${formattedNum}` : `${prefix}${formattedNum}%`;
    },
    [formatNumber, locale]
  );

  const formatDate = useCallback(
    (date: Date | string | number, options?: Intl.DateTimeFormatOptions): string => {
      const d = typeof date === 'object' ? date : new Date(date);
      const defaultOptions: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        ...options,
      };
      return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', defaultOptions).format(
        d
      );
    },
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      dir,
      isRTL,
      t,
      setLocale,
      formatCurrency,
      formatPercent,
      formatNumber,
      formatDate,
      i18n: { language: locale },
    }),
    [locale, dir, isRTL, t, setLocale, formatCurrency, formatPercent, formatNumber, formatDate]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useTranslation() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LocaleProvider');
  }
  return context;
}
