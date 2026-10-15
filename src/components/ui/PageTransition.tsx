'use client';

import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { pageTransition } from '@/lib/motion';
import { signalTicknalReady } from '@/components/platform/splash/splash-boot-script';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    signalTicknalReady();
  }, [pathname]);

  return (
    <motion.div
      key={pathname}
      initial={reduceMotion ? false : 'initial'}
      animate="enter"
      variants={pageTransition}
      className="flex min-h-0 flex-1 flex-col h-full"
    >
      {children}
    </motion.div>
  );
}
