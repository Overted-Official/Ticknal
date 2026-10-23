import { useTranslation } from '@/lib/i18n';

/**
 * Safe translation hook that gracefully falls back to 'en' if rendered
 * outside of a LocaleProvider (e.g. during unit tests or SSR).
 */
export function useSafeLocale(): 'en' | 'ar' {
  try {
    const { locale } = useTranslation();
    return (locale as 'en' | 'ar') || 'en';
  } catch {
    return 'en';
  }
}
