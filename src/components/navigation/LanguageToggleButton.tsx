'use client';

import React, { useRef } from 'react';
import { Globe } from '@/components/ui/icon-library';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/context/ToastContext';
import type { Locale } from '@/lib/i18n';

interface LanguageToggleButtonProps {
  variant?: 'sidebar' | 'mobile';
  className?: string;
  onToggle?: () => void;
}

export default function LanguageToggleButton({
  variant = 'sidebar',
  className = '',
  onToggle,
}: LanguageToggleButtonProps) {
  const { locale, setLocale } = useTranslation();
  const { toast } = useToast();
  const iconRef = useRef<{ startAnimation: () => void; stopAnimation: () => void } | null>(null);

  const isArabic = locale === 'ar';
  const nextLocale: Locale = isArabic ? 'en' : 'ar';
  const title = isArabic ? 'Switch to English (EN)' : 'التحويل إلى العربية (AR)';

  const handleMouseEnter = () => iconRef.current?.startAnimation();
  const handleMouseLeave = () => iconRef.current?.stopAnimation();

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    iconRef.current?.startAnimation();

    await setLocale(nextLocale);

    toast.success(
      nextLocale === 'ar' ? 'تم تغيير لغة العرض إلى العربية' : 'Language switched to English',
      nextLocale === 'ar' ? 'تم تفعيل الواجهة العربية' : 'English interface activated'
    );

    onToggle?.();
  };

  if (variant === 'mobile') {
    return (
      <button
        type="button"
        onClick={handleToggle}
        className={`w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.15] text-white flex items-center justify-center transition-colors cursor-pointer relative ${className}`}
        title={title}
        aria-label={title}
      >
        <Globe size={18} strokeWidth={1.8} />
      </button>
    );
  }

  return (
    <div className={`w-full relative flex items-center justify-center group ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="flex items-center justify-center relative cursor-pointer"
        title={title}
        aria-label={title}
      >
        <div className="nav-icon flex items-center justify-center transition-all duration-150 text-[#dbdbdb] hover:text-white relative">
          <Globe ref={iconRef} size={20} strokeWidth={1.5} />
        </div>
      </button>
    </div>
  );
}
