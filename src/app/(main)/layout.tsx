import { Suspense } from 'react';
import SidebarNav from '@/components/navigation/SidebarNav';
import BottomNav from '@/components/navigation/BottomNav';
import { AlertProvider } from '@/components/platform/AlertProvider';
import { ToastProvider } from '@/context/ToastContext';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AlertProvider>
        <div className="flex flex-col md:flex-row h-[100dvh] w-screen overflow-hidden bg-black text-white">
          <div className="hidden md:flex h-full shrink-0 z-50">
            <Suspense fallback={<div className="w-[48px] h-full bg-black border-r border-white/[0.06]" />}>
              <SidebarNav />
            </Suspense>
          </div>
          <div className="flex-1 h-full min-h-0 overflow-hidden relative z-10 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0 flex flex-col">
            {children}
          </div>
          <div className="md:hidden fixed bottom-0 left-0 right-0 w-full z-50 pb-[env(safe-area-inset-bottom)]">
            <BottomNav />
          </div>
        </div>
      </AlertProvider>
    </ToastProvider>
  );
}
