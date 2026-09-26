import { Suspense } from 'react';
import SidebarNav from '@/components/navigation/SidebarNav';
import BottomNav from '@/components/navigation/BottomNav';
import { AlertProvider } from '@/components/platform/AlertProvider';
import { ToastProvider } from '@/context/ToastContext';
import { PinLockProvider } from '@/components/platform/PinLockProvider';
import { MobileNavScrollProvider } from '@/context/MobileNavScrollContext';
import PageTransition from '@/components/ui/PageTransition';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AlertProvider>
        <PinLockProvider>
          <MobileNavScrollProvider>
            <div className="app-shell flex h-dvh w-full max-w-full overflow-hidden md:flex-row">
              <div className="flex-1 h-full min-h-0 overflow-hidden relative z-10 flex flex-col">
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
          </MobileNavScrollProvider>
        </PinLockProvider>
      </AlertProvider>
    </ToastProvider>
  );
}
