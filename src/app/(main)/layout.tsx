import SidebarNav from '@/components/navigation/SidebarNav';
import BottomNav from '@/components/navigation/BottomNav';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-tv-base text-tv-text">
      <div className="hidden md:flex h-full">
        <SidebarNav />
      </div>
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
      <div className="flex md:hidden w-full shrink-0">
        <BottomNav />
      </div>
    </div>
  );
}
