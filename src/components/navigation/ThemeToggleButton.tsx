'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from '@/components/ui/icon-library';
import { useTranslation } from '@/lib/i18n';
import { toast } from '@/components/ui/sonner';

interface ThemeToggleButtonProps {
  variant?: 'sidebar' | 'mobile';
  className?: string;
  onToggle?: () => void;
}

export default function ThemeToggleButton({
  variant = 'sidebar',
  className = '',
  onToggle,
}: ThemeToggleButtonProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const { locale } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLight = mounted && resolvedTheme === 'light';
  const nextTheme = isLight ? 'dark' : 'light';
  const isArabic = locale === 'ar';

  const title = isLight
    ? isArabic
      ? 'التبديل إلى الوضع الداكن (Dark)'
      : 'Switch to Dark Mode'
    : isArabic
      ? 'التبديل إلى الوضع الفاتح (Light)'
      : 'Switch to Light Mode';

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTheme(nextTheme);

    if (nextTheme === 'light') {
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

    onToggle?.();
  };

  if (variant === 'mobile') {
    return (
      <button
        type="button"
        onClick={handleToggle}
        className={`w-9 h-9 rounded-full bg-plt-hover hover:bg-plt-active text-plt-text flex items-center justify-center transition-colors cursor-pointer relative ${className}`}
        title={title}
        aria-label={title}
      >
        {isLight ? <Moon size={18} strokeWidth={1.8} /> : <Sun size={18} strokeWidth={1.8} />}
      </button>
    );
  }

  return (
    <div className={`w-full relative flex items-center justify-center group ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center justify-center relative cursor-pointer"
        title={title}
        aria-label={title}
      >
        <div className="nav-icon flex items-center justify-center transition-all duration-150 text-[#dbdbdb] hover:text-white relative">
          {isLight ? (
            <Moon size={19} strokeWidth={1.6} />
          ) : (
            <Sun size={19} strokeWidth={1.6} />
          )}
        </div>
      </button>
    </div>
  );
}
