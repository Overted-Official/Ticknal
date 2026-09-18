'use client';

import React, { useState } from 'react';
import { Lock, Smartphone, Timer, KeyRound } from '@/components/ui/icon-library';
import { usePinLock } from '@/components/platform/PinLockProvider';
import PinSetupModal from '@/components/platform/settings/PinSetupModal';

export default function PinSecurityCard() {
  const { isConfigured, hasSecurityQuestion, securityQuestion, pinSettings, lockApp, removePin, updateSettings } = usePinLock();
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);

  const handleToggle = (checked: boolean) => {
    if (checked) {
      setIsSetupModalOpen(true);
    } else {
      if (confirm('Are you sure you want to disable the PIN passcode lock?')) {
        removePin();
      }
    }
  };

  return (
    <>
      <div className="bg-[#121214] border border-[#27272a] rounded-xl p-5 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#222225] pb-5">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#18181b] border border-[#27272a] flex items-center justify-center text-[#d1d4dc] shrink-0 mt-0.5">
              <Lock size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  4-Digit Passcode & App Lock
                </h2>
                {isConfigured ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#089981]/10 text-[#089981] border border-[#089981]/25">
                    PROTECTED
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#18181b] text-[#787b86] border border-[#27272a]">
                    NOT SET
                  </span>
                )}
              </div>
              <p className="text-xs text-[#787b86] mt-1 leading-relaxed">
                Lock Ticknal behind a 4-digit PIN to secure your portfolio on mobile and shared devices.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-1">
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isConfigured}
                onChange={(e) => handleToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div
                className={`w-10 h-5.5 rounded-full transition-colors relative flex items-center ${
                  isConfigured ? 'bg-[#089981]' : 'bg-[#27272a]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                    isConfigured ? 'translate-x-5' : 'translate-x-1'
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
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#18181b] hover:bg-[#222226] text-white border border-[#27272a] hover:border-[#3f3f46] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Lock size={14} className="text-[#787b86]" />
                  <span>Lock Now</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSetupModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[#18181b] hover:bg-[#222226] text-[#d1d4dc] hover:text-white border border-[#27272a] hover:border-[#3f3f46] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <KeyRound size={14} className="text-[#787b86]" />
                  <span>Change PIN & Recovery</span>
                </button>
              </div>

              <div className="text-xs text-[#787b86] flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${hasSecurityQuestion ? 'bg-[#089981]' : 'bg-[#ff9800]'}`} />
                <span>Recovery Question: {hasSecurityQuestion ? 'Configured' : 'Password Only'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
              {/* Setting 1: Auto-Lock on App Switch */}
              <div className="p-3.5 sm:p-4 rounded-lg bg-[#18181b] border border-[#27272a] hover:border-[#3f3f46] transition-colors flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Smartphone size={16} className="text-[#787b86] shrink-0" />
                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold text-white truncate">Auto-Lock on App Switch</h3>
                    <p className="text-[11px] text-[#787b86] truncate">Lock when leaving app or minimizing</p>
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
                    className={`w-9 h-5 rounded-full transition-colors relative flex items-center ${
                      pinSettings.autoLockOnBlur ? 'bg-[#089981]' : 'bg-[#27272a]'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 ${
                        pinSettings.autoLockOnBlur ? 'translate-x-4.5' : 'translate-x-1'
                      }`}
                    />
                  </div>
                </label>
              </div>

              {/* Setting 2: Inactivity Timeout */}
              <div className="p-3.5 sm:p-4 rounded-lg bg-[#18181b] border border-[#27272a] hover:border-[#3f3f46] transition-colors flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Timer size={16} className="text-[#787b86] shrink-0" />
                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold text-white truncate">Inactivity Lock</h3>
                    <p className="text-[11px] text-[#787b86] truncate">Auto-lock after idle period</p>
                  </div>
                </div>

                <div className="w-28 shrink-0">
                  <select
                    value={pinSettings.idleTimeoutMinutes}
                    onChange={(e) => updateSettings({ ...pinSettings, idleTimeoutMinutes: Number(e.target.value) })}
                    className="w-full bg-[#121214] border border-[#27272a] hover:border-[#3f3f46] focus:border-[#2962ff] text-xs text-white rounded-lg px-2.5 py-1.5 outline-none transition-colors cursor-pointer"
                  >
                    <option value={0}>Immediately</option>
                    <option value={1}>1 Min</option>
                    <option value={2}>2 Mins</option>
                    <option value={5}>5 Mins</option>
                    <option value={15}>15 Mins</option>
                    <option value={-1}>Never</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Remove PIN Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to remove your passcode PIN?')) {
                    removePin();
                  }
                }}
                className="text-xs font-medium text-[#f23645]/70 hover:text-[#f23645] transition-colors cursor-pointer"
              >
                Remove PIN Protection
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
