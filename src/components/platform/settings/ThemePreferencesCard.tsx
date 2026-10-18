'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Check } from '@/components/ui/icon-library';
import { useTranslation } from '@/lib/i18n';
import { toast } from '@/components/ui/sonner';

export default function ThemePreferencesCard() {
  const { resolvedTheme, setTheme } = useTheme();
  const { locale } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted && resolvedTheme === 'light' ? 'light' : 'dark';
  const isArabic = locale === 'ar';

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    if (newTheme === currentTheme) return;
    setTheme(newTheme);

    if (newTheme === 'light') {
      toast.success(
        isArabic ? 'تم تفعيل الوضع الفاتح' : 'Light Mode Activated',
        isArabic ? 'تم تحديث ألوان الواجهة والرسوم البيانية' : 'Interface surfaces switched to high-contrast light theme'
      );
    } else {
      toast.success(
        isArabic ? 'تم تفعيل الوضع الداكن' : 'Dark Mode Activated',
        isArabic ? 'تمت استعادة واجهة Ticknal السوداء بالكامل' : 'Pure black institutional terminal restored'
      );
    }
  };

  const themes: {
    id: 'dark' | 'light';
    name: string;
    subtitle: string;
    description: string;
    surfaceBadge: string;
    contrastLabel: string;
    icon: typeof Moon;
  }[] = [
    {
      id: 'dark',
      name: isArabic ? 'الوضع الداكن' : 'Dark Mode',
      subtitle: isArabic ? 'الافتراضي (#000000)' : 'Default (#000000)',
      description: isArabic
        ? 'واجهة التداول المؤسسية باللون الأسود النقي لتقليل إجهاد العين وإبراز المؤشرات والرسوم البيانية بأعلى تباين.'
        : 'Signature pure-black institutional terminal engineered for zero eye strain and maximum chart & signal contrast.',
      surfaceBadge: 'Pure Black #000000',
      contrastLabel: isArabic ? 'تباين OLED فائق' : 'OLED High Contrast',
      icon: Moon,
    },
    {
      id: 'light',
      name: isArabic ? 'الوضع الفاتح' : 'Light Mode',
      subtitle: isArabic ? 'نهاري (#FFFFFF)' : 'Daylight (#FFFFFF)',
      description: isArabic
        ? 'لوحة ألوان نهارية عالية الوضوح مصممة لبيئات الإضاءة الساطعة والقراءة التحليلية المريحة.'
        : 'Crisp, high-contrast daylight surfaces optimized for bright environments and editorial data readability.',
      surfaceBadge: 'Daylight #FFFFFF',
      contrastLabel: isArabic ? 'وضوح نهاري' : 'Daylight Clarity',
      icon: Sun,
    },
  ];

  return (
    <div className="w-full min-w-0 py-2 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-2">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-10 h-10 rounded-full bg-plt-hover flex items-center justify-center text-plt-text shrink-0 mt-0.5">
            {currentTheme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-plt-text tracking-tight">
                {isArabic ? 'مظهر الواجهة (الوضع الداكن / الفاتح)' : 'Interface Theme & Appearance'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-brand-blue/15 text-brand-blue">
                {currentTheme === 'light'
                  ? isArabic
                    ? 'الوضع الفاتح نشط'
                    : 'LIGHT MODE ACTIVE'
                  : isArabic
                    ? 'الوضع الداكن نشط'
                    : 'DARK MODE ACTIVE'}
              </span>
            </div>
            <p className="text-xs text-plt-muted mt-1 leading-relaxed">
              {isArabic
                ? 'اختر نمط الألوان المفضل لديك عبر لوحة التحكم والرسوم البيانية والقوائم.'
                : 'Select your preferred color scheme across all platform dashboards, tables, and drawers.'}
            </p>
          </div>
        </div>
      </div>

      {/* Theme Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {themes.map((item) => {
          const isSelected = currentTheme === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleThemeChange(item.id)}
              className={`group relative text-start p-4 rounded-xl border transition-all duration-150 cursor-pointer select-none bg-plt-base ${
                isSelected
                  ? 'border-brand-blue/60 shadow-[0_0_20px_rgba(59,130,246,0.12)]'
                  : 'border-plt-border hover:border-plt-border-strong hover:bg-plt-hover'
              }`}
            >
              {/* Top Row: Name & Active Indicator */}
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                      item.id === 'dark'
                        ? 'bg-black text-white border-white/15'
                        : 'bg-white text-zinc-900 border-zinc-300'
                    }`}
                  >
                    <Icon size={14} strokeWidth={2} />
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-base font-bold text-plt-text tracking-tight">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-plt-muted">
                      ({item.subtitle})
                    </span>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-colors ${
                    isSelected
                      ? 'bg-brand-blue border-brand-blue text-white'
                      : 'border-plt-border bg-transparent text-transparent'
                  }`}
                >
                  <Check size={12} strokeWidth={2.5} />
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-plt-muted leading-relaxed mb-3">
                {item.description}
              </p>

              {/* Badges footer */}
              <div className="flex items-center gap-2 pt-1 border-t border-plt-border">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-plt-hover text-plt-subtle tabular-nums">
                  {item.surfaceBadge}
                </span>
                <span className="text-[10px] text-plt-muted">
                  {item.contrastLabel}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
