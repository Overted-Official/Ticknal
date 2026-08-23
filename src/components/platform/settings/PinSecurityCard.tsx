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
      <div className="card-shell space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-plt-border-soft pb-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-plt-hover border border-plt-border flex items-center justify-center text-white/70 shrink-0 mt-2">
              <Lock size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-body font-medium text-plt-text tracking-normal">
                  4-Digit Passcode & App Lock
                </h2>
                {isConfigured ? (
                  <span className="px-2 py-2 rounded-xl text-compact tabular-nums font-medium bg-plt-profit/10 text-plt-profit border border-plt-profit/20">
                    PROTECTED
                  </span>
                ) : (
                  <span className="px-2 py-2 rounded-xl text-compact tabular-nums bg-plt-hover text-plt-muted border border-plt-border">
                    NOT SET
                  </span>
                )}
              </div>
              <p className="text-xs text-plt-muted mt-2 leading-relaxed">
                Lock QuantEGX behind a 4-digit PIN to secure your portfolio on mobile and shared devices.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-2">
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isConfigured}
                onChange={(e) => handleToggle(e.target.checked)}
                className="sr-only peer"
              />
              <span className={`toggle-token ${isConfigured ? 'toggle-token-active' : ''}`}>
                <span className={`toggle-thumb ${isConfigured ? 'toggle-thumb-active' : ''}`} />
              </span>
            </label>
          </div>
        </div>

        {/* Configurations when PIN is active */}
        {isConfigured && (
          <div className="space-y-4 pt-2">
            {/* Quick Action Buttons & Status */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={lockApp}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-plt-text bg-plt-hover hover:bg-plt-hover active:bg-plt-active border border-plt-border transition-all flex items-center gap-2"
                >
                  <Lock size={16} className="text-plt-muted" />
                  <span>Lock Now</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSetupModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-plt-subtle hover:text-plt-text bg-plt-hover hover:bg-plt-hover border border-plt-border transition-all flex items-center gap-2"
                >
                  <KeyRound size={16} className="text-plt-muted" />
                  <span>Change PIN & Recovery</span>
                </button>
              </div>

              <div className="text-caption text-plt-muted flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${hasSecurityQuestion ? 'bg-plt-profit' : 'bg-plt-warning'}`} />
                <span>Recovery Question: {hasSecurityQuestion ? 'Configured' : 'Password Only'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Setting 1: Auto-Lock on App Switch */}
              <div className="surface-widget-soft flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <Smartphone size={16} className="text-plt-muted shrink-0" />
                  <div className="min-w-0">
                    <h3 className="text-xs font-medium text-plt-text truncate">Auto-Lock on App Switch</h3>
                    <p className="text-caption text-plt-text/35 truncate">Lock when leaving app or minimizing</p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                  <input
                    type="checkbox"
                    checked={pinSettings.autoLockOnBlur}
                    onChange={(e) => updateSettings({ ...pinSettings, autoLockOnBlur: e.target.checked })}
                    className="sr-only peer"
                  />
                  <span className={`toggle-token ${pinSettings.autoLockOnBlur ? 'toggle-token-active' : ''}`}>
                    <span className={`toggle-thumb ${pinSettings.autoLockOnBlur ? 'toggle-thumb-active' : ''}`} />
                  </span>
                </label>
              </div>

              {/* Setting 2: Inactivity Timeout */}
              <div className="surface-widget-soft flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <Timer size={16} className="text-plt-muted shrink-0" />
                  <div className="min-w-0">
                    <h3 className="text-xs font-medium text-plt-text truncate">Inactivity Lock</h3>
                    <p className="text-caption text-plt-text/35 truncate">Auto-lock after idle period</p>
                  </div>
                </div>

                <div className="w-32 shrink-0">
                  <select
                    value={pinSettings.idleTimeoutMinutes}
                    onChange={(e) => updateSettings({ ...pinSettings, idleTimeoutMinutes: Number(e.target.value) })}
                    className="select-token"
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
                className="text-caption text-plt-risk/70 hover:text-plt-risk transition-colors"
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
