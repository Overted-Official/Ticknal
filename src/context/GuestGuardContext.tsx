'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import GuestProLockModal from '@/components/platform/auth/GuestProLockModal';

interface GuestModalConfig {
  isOpen: boolean;
  featureName?: string;
  title?: string;
  description?: string;
}

interface GuestGuardContextType {
  isGuest: boolean;
  isLoading: boolean;
  openGuestModal: (config?: { featureName?: string; title?: string; description?: string }) => void;
  closeGuestModal: () => void;
  requireAuth: (
    e?: React.MouseEvent | React.SyntheticEvent,
    featureName?: string,
    title?: string,
    description?: string
  ) => boolean;
}

const GuestGuardContext = createContext<GuestGuardContextType>({
  isGuest: false,
  isLoading: true,
  openGuestModal: () => {},
  closeGuestModal: () => {},
  requireAuth: () => true,
});

export function useGuestGuard() {
  const context = useContext(GuestGuardContext);
  if (!context) {
    throw new Error('useGuestGuard must be used within a GuestGuardProvider');
  }
  return context;
}

function UrlAuthParamListener() {
  const { openGuestModal } = useGuestGuard();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const processedParamRef = useRef<string | null>(null);

  useEffect(() => {
    const authModal = searchParams.get('auth_modal');
    if (authModal === '1') {
      const feat = searchParams.get('feature') || 'Full Terminal';
      const key = `${authModal}-${feat}`;

      if (processedParamRef.current !== key) {
        processedParamRef.current = key;
        openGuestModal({
          featureName: feat,
          title: "Access Ticknal's Full Power",
          description: 'Sign in to monitor your Egyptian market portfolio, automate your trading alerts, and test custom strategies.',
        });

        // Clean the query parameters while keeping any other existing params
        const params = new URLSearchParams(searchParams.toString());
        params.delete('auth_modal');
        params.delete('feature');
        const newQuery = params.toString() ? `?${params.toString()}` : '';
        router.replace(`${pathname}${newQuery}`, { scroll: false });
      }
    }
  }, [searchParams, pathname, router, openGuestModal]);

  return null;
}

export function GuestGuardProvider({ children }: { children: React.ReactNode }) {
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [modalConfig, setModalConfig] = useState<GuestModalConfig>({
    isOpen: false,
  });

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (isMounted) {
          setIsGuest(!session?.user);
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          setIsGuest(true);
          setIsLoading(false);
        }
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setIsGuest(!session?.user);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const openGuestModal = useCallback(
    (config?: { featureName?: string; title?: string; description?: string }) => {
      setModalConfig({
        isOpen: true,
        featureName: config?.featureName,
        title: config?.title,
        description: config?.description,
      });
    },
    []
  );

  const closeGuestModal = useCallback(() => {
    setModalConfig((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const requireAuth = useCallback(
    (
      e?: React.MouseEvent | React.SyntheticEvent,
      featureName?: string,
      title?: string,
      description?: string
    ): boolean => {
      if (isGuest) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        openGuestModal({ featureName, title, description });
        return false;
      }
      return true;
    },
    [isGuest, openGuestModal]
  );

  return (
    <GuestGuardContext.Provider
      value={{
        isGuest,
        isLoading,
        openGuestModal,
        closeGuestModal,
        requireAuth,
      }}
    >
      <Suspense fallback={null}>
        <UrlAuthParamListener />
      </Suspense>

      {children}

      <GuestProLockModal
        isOpen={modalConfig.isOpen}
        onClose={closeGuestModal}
        featureName={modalConfig.featureName}
        title={modalConfig.title}
        description={modalConfig.description}
      />
    </GuestGuardContext.Provider>
  );
}
