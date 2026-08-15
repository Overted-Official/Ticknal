import SidebarNav from '@/components/navigation/SidebarNav';
import BottomNav from '@/components/navigation/BottomNav';
import { AlertProvider } from '@/components/platform/AlertProvider';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AlertProvider>
      <div className="flex flex-col md:flex-row h-[100dvh] w-screen overflow-hidden bg-black text-white relative">
        {/* Soft, Non-Intrusive Ambient Golden-Orange Volumetric Aura in Background */}
        <div className="fixed -top-32 right-0 md:right-[10%] w-[650px] h-[450px] bg-gradient-to-b from-[#ff640d]/[0.08] via-[#ff640d]/[0.02] to-transparent rounded-full blur-[160px] pointer-events-none z-0" />
        <div className="fixed bottom-0 left-[10%] w-[500px] h-[350px] bg-gradient-to-t from-[#ff640d]/[0.04] to-transparent rounded-full blur-[180px] pointer-events-none z-0" />

        <div className="hidden md:flex h-full shrink-0 z-50">
          <SidebarNav />
        </div>
        <div className="flex-1 overflow-hidden relative z-10 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </div>
        <div className="md:hidden fixed bottom-0 left-0 right-0 w-full z-50 pb-[env(safe-area-inset-bottom)]">
          <BottomNav />
        </div>
      </div>
    </AlertProvider>
  );
}
