'use client';

import React, { useState } from 'react';
import { ShieldCheck, Lock, Smartphone, Timer, KeyRound } from 'lucide-react';
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
      <div className="border border-white/[0.09] rounded-md bg-black p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-plt-orange shrink-0">
              <Lock size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[13px] font-medium text-white tracking-[-0.02em]">
                  4-Digit Passcode & App Lock
                </h2>
                {isConfigured ? (
                  <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    PROTECTED
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-mono bg-white/[0.05] text-white/40 border border-white/[0.08]">
                    NOT SET
                  </span>
                )}
              </div>
              <p className="text-xs text-white/40 mt-0.5">
                Lock QuantEGX behind a 4-digit PIN to secure your portfolio on mobile and shared devices.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {isConfigured && (
              <button
                type="button"
                onClick={lockApp}
                className="px-3 py-1.5 rounded-md text-xs font-medium text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.09] transition-all flex items-center gap-1.5"
              >
                <Lock size={13} className="text-plt-orange" />
                <span>Lock Now</span>
              </button>
            )}

            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isConfigured}
                onChange={(e) => handleToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/[0.08] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-plt-orange" />
            </label>
          </div>
        </div>

        {/* Configurations when PIN is active */}
        {isConfigured && (
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Setting 1: Auto-Lock on App Switch */}
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone size={18} className="text-white/40" />
                  <div>
                    <h3 className="text-xs font-medium text-white">Auto-Lock on App Switch</h3>
                    <p className="text-[11px] text-white/35">Lock immediately when switching apps or minimizing</p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer select-none shrink-0 ml-3">
                  <input
                    type="checkbox"
                    checked={pinSettings.autoLockOnBlur}
                    onChange={(e) => updateSettings({ ...pinSettings, autoLockOnBlur: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-white/[0.08] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-plt-orange" />
                </label>
              </div>

              {/* Setting 2: Inactivity Timeout */}
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Timer size={18} className="text-white/40" />
                  <div>
                    <h3 className="text-xs font-medium text-white">Inactivity Lock Timeout</h3>
                    <p className="text-[11px] text-white/35">Auto-lock after period of idle inactivity</p>
                  </div>
                </div>

                <select
                  value={pinSettings.idleTimeoutMinutes}
                  onChange={(e) => updateSettings({ ...pinSettings, idleTimeoutMinutes: Number(e.target.value) })}
                  className="bg-black border border-white/[0.12] rounded-md px-2.5 py-1 text-xs text-white focus:outline-none focus:border-plt-orange font-mono shrink-0 ml-3"
                >
                  <option value={0}>Immediately</option>
                  <option value={1}>1 Minute</option>
                  <option value={2}>2 Minutes</option>
                  <option value={5}>5 Minutes</option>
                  <option value={15}>15 Minutes</option>
                  <option value={-1}>Never</option>
                </select>
              </div>
            </div>

            {/* Change / Remove PIN Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setIsSetupModalOpen(true)}
                className="text-xs text-white/70 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <KeyRound size={13} className="text-plt-orange" />
                <span>Change Passcode PIN</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to remove your passcode PIN?')) {
                    removePin();
                  }
                }}
                className="text-xs text-rose-400/80 hover:text-rose-400 transition-colors"
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
