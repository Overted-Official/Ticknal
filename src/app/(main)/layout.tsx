import SidebarNav from '@/components/navigation/SidebarNav';
import BottomNav from '@/components/navigation/BottomNav';
import { AlertProvider } from '@/components/platform/AlertProvider';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AlertProvider>
      <div className="flex flex-col md:flex-row h-[100dvh] w-screen overflow-hidden bg-black text-white relative">
        {/* Layer 1: Base Candlesticks with Overlay Blend so they are textured with the glow */}
        <div 
          className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat opacity-25 mix-blend-overlay"
          style={{ 
            backgroundImage: 'url("https://framerusercontent.com/images/zeiaTuQEued5LxPaQBjujd0qsWg.png")',
            filter: 'contrast(1.4) brightness(0.8)'
          }}
        />

        {/* Layer 2: Main Glowing Orange Laser Light Beam (exact landing page asset) */}
        <div 
          className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat opacity-80"
          style={{ backgroundImage: 'url("https://framerusercontent.com/images/VTRQ7NkPkJjM8d02z85pj0EU1R8.png")' }}
        />

        {/* Layer 3: Ambient Warm Volumetric Spotlights */}
        <div className="fixed top-[-100px] right-[-50px] md:right-[15%] w-[600px] h-[450px] bg-radial from-[#ff640d]/20 via-[#d9480f]/08 to-transparent rounded-full blur-[140px] pointer-events-none z-0" />
        <div className="fixed bottom-[-80px] left-[5%] w-[450px] h-[350px] bg-radial from-[#ff640d]/10 via-[#d9480f]/04 to-transparent rounded-full blur-[140px] pointer-events-none z-0" />

        {/* Layer 4: Subtle Left Vignette for visual balance */}
        <div className="fixed inset-y-0 left-0 w-[400px] bg-gradient-to-r from-black/70 via-black/30 to-transparent pointer-events-none z-0" />

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
