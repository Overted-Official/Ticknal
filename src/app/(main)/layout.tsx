import SidebarNav from '@/components/navigation/SidebarNav';
import BottomNav from '@/components/navigation/BottomNav';
import { AlertProvider } from '@/components/platform/AlertProvider';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AlertProvider>
      <div className="flex flex-col md:flex-row h-[100dvh] w-screen overflow-hidden bg-plt-base text-plt-text relative">
        <div className="hidden md:flex h-full shrink-0 z-50">
          <SidebarNav />
        </div>
        <div className="flex-1 overflow-hidden relative z-0 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </div>
        <div className="md:hidden fixed bottom-0 left-0 right-0 w-full z-50 pb-[env(safe-area-inset-bottom)] bg-plt-surface border-t border-plt-border">
          <BottomNav />
        </div>
      </div>
    </AlertProvider>
  );
}
