import SidebarNav from '@/components/navigation/SidebarNav';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-tv-base text-tv-text">
      <SidebarNav />
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
