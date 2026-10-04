'use client';

import React, { useState } from 'react';
import { Lock, Smartphone, Timer, KeyRound } from '@/components/ui/icon-library';
import { usePinLock } from '@/components/platform/PinLockProvider';
import PinSetupModal from '@/components/platform/settings/PinSetupModal';
import { useTranslation } from '@/lib/i18n';

export default function PinSecurityCard() {
  const { t, locale, isRTL } = useTranslation();
  const { isConfigured, hasSecurityQuestion, securityQuestion, pinSettings, lockApp, removePin, updateSettings } = usePinLock();
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);

  const handleToggle = (checked: boolean) => {
    if (checked) {
      setIsSetupModalOpen(true);
    } else {
      if (confirm(locale === 'ar' ? 'هل أنت متأكد من رغبتك في تعطيل قفل رمز PIN؟' : 'Are you sure you want to disable the PIN passcode lock?')) {
        removePin();
      }
    }
  };

  return (
    <>
    <div className="w-full min-w-0 py-2 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-2">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center text-white shrink-0 mt-0.5">
            <Lock size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                {locale === 'ar' ? 'رمز المرور المكون من 4 أرقام وقفل التطبيق' : '4-Digit Passcode & App Lock'}
              </h2>
              {isConfigured ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-profit-num/10 text-profit-num">
                  {locale === 'ar' ? 'مفعّل' : 'PROTECTED'}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.06] text-text-muted">
                  {locale === 'ar' ? 'غير محدد' : 'NOT SET'}
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              {locale === 'ar'
                ? 'قفل تكنال برمز PIN مكون من 4 أرقام لحماية محفظتك على الهاتف والأجهزة المشتركة.'
                : 'Lock Ticknal behind a 4-digit PIN to secure your portfolio on mobile and shared devices.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 pt-1">
          <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
            <input
              type="checkbox"
              checked={isConfigured}
              onChange={(e) => handleToggle(e.target.checked)}
              className="sr-only peer"
            />
            <div
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                isConfigured ? 'bg-profit-num' : 'bg-white/20'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
                  isConfigured ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </label>
        </div>
      </div>

      {/* Configurations when PIN is active */}
      {isConfigured && (
        <div className="space-y-4 pt-1">
          {/* Quick Action Buttons & Status */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={lockApp}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] active:scale-98 text-white transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Lock size={14} className="text-text-muted" />
                <span>{locale === 'ar' ? 'قفل الآن' : 'Lock Now'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSetupModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-white/[0.06] hover:bg-white/[0.12] active:scale-98 text-text-secondary hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <KeyRound size={14} className="text-text-muted" />
                <span>{locale === 'ar' ? 'تغيير الرمز والاسترداد' : 'Change PIN & Recovery'}</span>
              </button>
            </div>

            <div className="text-xs text-text-muted flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${hasSecurityQuestion ? 'bg-profit-num' : 'bg-[#ff9800]'}`} />
              <span>
                {locale === 'ar'
                  ? `سؤال الأمان: ${hasSecurityQuestion ? 'مُفعّل' : 'كلمة المرور فقط'}`
                  : `Recovery Question: ${hasSecurityQuestion ? 'Configured' : 'Password Only'}`}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {/* Setting 1: Auto-Lock on App Switch */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition-colors flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Smartphone size={16} className="text-text-muted shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold text-white truncate">
                    {locale === 'ar' ? 'القفل التلقائي عند التبديل' : 'Auto-Lock on App Switch'}
                  </h3>
                  <p className="text-[11px] text-text-muted truncate">
                    {locale === 'ar' ? 'القفل عند مغادرة التطبيق أو تصغيره' : 'Lock when leaving app or minimizing'}
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                <input
                  type="checkbox"
                  checked={pinSettings.autoLockOnBlur}
                  onChange={(e) => updateSettings({ ...pinSettings, autoLockOnBlur: e.target.checked })}
                  className="sr-only peer"
                />
                <div
                  className={`w-10 h-5.5 rounded-full transition-colors relative flex items-center px-0.5 ${
                    pinSettings.autoLockOnBlur ? 'bg-profit-num' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-white shadow-xs transition-transform duration-200 ease-out ${
                      pinSettings.autoLockOnBlur ? 'translate-x-4.5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </label>
            </div>

            {/* Setting 2: Inactivity Timeout */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition-colors flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Timer size={16} className="text-text-muted shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold text-white truncate">
                    {locale === 'ar' ? 'قفل عدم النشاط' : 'Inactivity Lock'}
                  </h3>
                  <p className="text-[11px] text-text-muted truncate">
                    {locale === 'ar' ? 'قفل تلقائي بعد فترة من السكون' : 'Auto-lock after idle period'}
                  </p>
                </div>
              </div>

              <div className="w-28 shrink-0">
                <select
                  value={pinSettings.idleTimeoutMinutes}
                  onChange={(e) => updateSettings({ ...pinSettings, idleTimeoutMinutes: Number(e.target.value) })}
                  className="w-full bg-black border border-white/10 hover:border-white/20 focus:border-brand-blue text-xs text-white rounded-lg px-2.5 py-1.5 outline-none transition-colors cursor-pointer"
                >
                  <option value={0}>{locale === 'ar' ? 'فوراً' : 'Immediately'}</option>
                  <option value={1}>{locale === 'ar' ? 'دقيقة واحدة' : '1 Min'}</option>
                  <option value={2}>{locale === 'ar' ? 'دقيقتان' : '2 Mins'}</option>
                  <option value={5}>{locale === 'ar' ? '5 دقائق' : '5 Mins'}</option>
                  <option value={15}>{locale === 'ar' ? '15 دقيقة' : '15 Mins'}</option>
                  <option value={-1}>{locale === 'ar' ? 'أبداً' : 'Never'}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Remove PIN Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => {
                if (confirm(locale === 'ar' ? 'هل أنت متأكد من رغبتك في إزالة رمز PIN؟' : 'Are you sure you want to remove your passcode PIN?')) {
                  removePin();
                }
              }}
              className="text-xs font-medium text-loss-num/80 hover:text-loss-num transition-colors cursor-pointer"
            >
              {locale === 'ar' ? 'إزالة حماية رمز PIN' : 'Remove PIN Protection'}
            </button>
          </div>
        </div>
      )}
    </div>

      <PinSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
      />
    </>
  );
}
