import React, { Suspense } from 'react';
import { connection } from 'next/server';
import { assertAdminUser } from '@/lib/server/admin-guard';
import SidebarNav from '@/components/navigation/SidebarNav';
import BottomNav from '@/components/navigation/BottomNav';
import { AlertProvider } from '@/components/platform/AlertProvider';
import { ToastProvider } from '@/context/ToastContext';
import { PinLockProvider } from '@/components/platform/PinLockProvider';
import { MobileNavScrollProvider } from '@/context/MobileNavScrollContext';
import { GuestGuardProvider } from '@/context/GuestGuardContext';
import PageTransition from '@/components/ui/PageTransition';

export const dynamic = 'force-dynamic';

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  await connection();

  // Zero-trust server guard: redirects non-admins or unauthenticated users immediately
  await assertAdminUser({ redirectOnFail: true });

  return (
    <ToastProvider>
      <AlertProvider>
        <PinLockProvider>
          <MobileNavScrollProvider>
            <GuestGuardProvider>
              <div className="app-shell flex h-dvh w-full max-w-full overflow-hidden md:flex-row bg-plt-base text-plt-text">
                <div className="flex-1 h-full min-h-0 overflow-hidden relative z-10 flex flex-col pt-[var(--ticknal-safe-area-top)] md:pt-0">
                  <PageTransition>{children}</PageTransition>
                </div>
                <div className="hidden md:flex h-full shrink-0 z-50">
                  <Suspense fallback={<div className="h-full w-[45px] border-l nav-shell" />}>
                    <SidebarNav />
                  </Suspense>
                </div>
                <div className="md:hidden fixed bottom-0 left-0 right-0 w-full z-50 pointer-events-none">
                  <BottomNav />
                </div>
              </div>
            </GuestGuardProvider>
          </MobileNavScrollProvider>
        </PinLockProvider>
      </AlertProvider>
    </ToastProvider>
  );
}
