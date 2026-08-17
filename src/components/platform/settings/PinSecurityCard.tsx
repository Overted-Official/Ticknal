'use client';

import React, { useState } from 'react';
import { Lock, Smartphone, Timer, KeyRound } from 'lucide-react';
import { usePinLock } from '@/components/platform/PinLockProvider';
import PinSetupModal from '@/components/platform/settings/PinSetupModal';

export default function PinSecurityCard() {
  const { isConfigured, pinSettings, lockApp, removePin, updateSettings } = usePinLock();
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
      <div className="border border-white/[0.09] rounded-md bg-black p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] pb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-plt-orange shrink-0 mt-0.5">
              <Lock size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[13px] font-medium text-white tracking-[-0.02em]">
                  4-Digit Passcode & App Lock
                </h2>
                {isConfigured ? (
                  <span className="px-1.5 py-0.5 rounded-[4px] text-[9px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    PROTECTED
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded-[4px] text-[9px] font-mono bg-white/[0.05] text-white/40 border border-white/[0.08]">
                    NOT SET
                  </span>
                )}
              </div>
              <p className="text-xs text-white/40 mt-1 leading-relaxed">
                Lock QuantEGX behind a 4-digit PIN to secure your portfolio on mobile and shared devices.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-0.5">
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isConfigured}
                onChange={(e) => handleToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5.5 bg-white/[0.08] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-plt-orange" />
            </label>
          </div>
        </div>

        {/* Configurations when PIN is active */}
        {isConfigured && (
          <div className="space-y-3 pt-1">
            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={lockApp}
                className="px-3 py-1.5 rounded-md text-xs font-medium text-white bg-white/[0.05] hover:bg-white/[0.09] active:bg-white/[0.15] border border-white/[0.10] transition-all flex items-center gap-1.5"
              >
                <Lock size={12} className="text-plt-orange" />
                <span>Lock Now</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSetupModalOpen(true)}
                className="px-3 py-1.5 rounded-md text-xs font-medium text-white/80 hover:text-white bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.07] transition-all flex items-center gap-1.5"
              >
                <KeyRound size={12} className="text-white/40" />
                <span>Change PIN</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* Setting 1: Auto-Lock on App Switch */}
              <div className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Smartphone size={16} className="text-white/40 shrink-0" />
                  <div className="min-w-0">
                    <h3 className="text-xs font-medium text-white truncate">Auto-Lock on App Switch</h3>
                    <p className="text-[11px] text-white/35 truncate">Lock when leaving app or minimizing</p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                  <input
                    type="checkbox"
                    checked={pinSettings.autoLockOnBlur}
                    onChange={(e) => updateSettings({ ...pinSettings, autoLockOnBlur: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4.5 bg-white/[0.08] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-plt-orange" />
                </label>
              </div>

              {/* Setting 2: Inactivity Timeout */}
              <div className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Timer size={16} className="text-white/40 shrink-0" />
                  <div className="min-w-0">
                    <h3 className="text-xs font-medium text-white truncate">Inactivity Lock</h3>
                    <p className="text-[11px] text-white/35 truncate">Auto-lock after idle period</p>
                  </div>
                </div>

                <select
                  value={pinSettings.idleTimeoutMinutes}
                  onChange={(e) => updateSettings({ ...pinSettings, idleTimeoutMinutes: Number(e.target.value) })}
                  className="bg-black border border-white/[0.12] rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-plt-orange font-mono shrink-0"
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

            {/* Remove PIN Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to remove your passcode PIN?')) {
                    removePin();
                  }
                }}
                className="text-[11px] text-rose-400/70 hover:text-rose-400 transition-colors"
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
