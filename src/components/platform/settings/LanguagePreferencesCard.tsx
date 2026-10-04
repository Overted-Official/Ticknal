'use client';

import React from 'react';
import { Globe, Check } from '@/components/ui/icon-library';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/context/ToastContext';
import type { Locale } from '@/lib/i18n';

export default function LanguagePreferencesCard() {
  const { locale, setLocale, t } = useTranslation();
  const { toast } = useToast();

  const handleLanguageChange = async (newLocale: Locale) => {
    if (newLocale === locale) return;
    await setLocale(newLocale);
    toast.success(
      newLocale === 'ar' ? 'تم تغيير لغة العرض إلى العربية' : 'Language switched to English',
      newLocale === 'ar' ? 'تم تفعيل خط Cairo والواجهة المقلوبة RTL' : 'Geist typography and standard LTR activated'
    );
  };

  const languages: {
    id: Locale;
    name: string;
    nativeName: string;
    description: string;
    fontBadge: string;
  }[] = [
    {
      id: 'en',
      name: 'English (US / UK)',
      nativeName: 'English',
      description: t('settings.englishDesc'),
      fontBadge: 'Geist Sans',
    },
    {
      id: 'ar',
      name: 'Arabic (Egypt / MENA)',
      nativeName: 'العربية',
      description: t('settings.arabicDesc'),
      fontBadge: 'Cairo Font',
    },
  ];

  return (
    <div className="w-full min-w-0 py-2 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-2">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center text-white shrink-0 mt-0.5">
            <Globe size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                {t('settings.languageTitle')}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-brand-blue/15 text-brand-blue">
                {locale === 'ar' ? 'العربية نشطة' : 'ENGLISH ACTIVE'}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              {t('settings.languageSubtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Language Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {languages.map((lang) => {
          const isSelected = locale === lang.id;

          return (
            <button
              key={lang.id}
              type="button"
              onClick={() => handleLanguageChange(lang.id)}
              className={`group relative text-start p-4 rounded-xl border transition-all duration-150 cursor-pointer select-none bg-black ${
                isSelected
                  ? 'border-brand-blue/60 shadow-[0_0_20px_rgba(59,130,246,0.12)]'
                  : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
              }`}
            >
              {/* Top Row: Native Name & Active Indicator */}
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base font-bold text-white tracking-tight">
                    {lang.nativeName}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    ({lang.name})
                  </span>
                </div>

                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-colors ${
                    isSelected
                      ? 'bg-brand-blue border-brand-blue text-white'
                      : 'border-white/20 bg-transparent text-transparent'
                  }`}
                >
                  <Check size={12} strokeWidth={2.5} />
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-text-muted leading-relaxed mb-3">
                {lang.description}
              </p>

              {/* Badges footer */}
              <div className="flex items-center gap-2 pt-1 border-t border-white/[0.06]">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-white/[0.05] text-zinc-300">
                  {lang.fontBadge}
                </span>
                <span className="text-[10px] text-text-muted">
                  {lang.id === 'ar' ? 'RTL Layout (من اليمين لليسار)' : 'LTR Layout (Left-to-Right)'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
