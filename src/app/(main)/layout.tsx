import SidebarNav from '@/components/navigation/SidebarNav';
import BottomNav from '@/components/navigation/BottomNav';
import { AlertProvider } from '@/components/platform/AlertProvider';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AlertProvider>
      <div className="flex flex-col md:flex-row h-[100dvh] w-screen overflow-hidden bg-plt-base text-plt-text relative">
        {/* Ambient Warm Golden-Orange Volumetric Aura */}
        <div className="fixed top-[-100px] right-[-50px] md:right-[15%] w-[600px] h-[350px] bg-gradient-to-b from-[#ff640d]/12 via-[#ff640d]/3 to-transparent rounded-full blur-[140px] pointer-events-none z-0" />
        <div className="fixed bottom-[-50px] left-[5%] w-[450px] h-[250px] bg-gradient-to-t from-white/[0.02] to-transparent rounded-full blur-[120px] pointer-events-none z-0" />

        <div className="hidden md:flex h-full shrink-0 z-50">
          <SidebarNav />
        </div>
        <div className="flex-1 overflow-hidden relative z-10 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </div>
        <div className="md:hidden fixed bottom-0 left-0 right-0 w-full z-50 pb-[env(safe-area-inset-bottom)] bg-plt-surface border-t border-plt-border">
          <BottomNav />
        </div>
      </div>
    </AlertProvider>
  );
}
