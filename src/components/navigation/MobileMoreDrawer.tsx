'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, usePathname } from 'next/navigation';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Zap,
  ArrowRightLeft,
  Shield,
  Settings,
  Globe,
  Eye,
  EyeOff,
  LogOut,
  LogIn,
  User,
  ChevronRight,
} from '@/components/ui/icon-library';
import TicknalBrand from '@/components/ui/TicknalBrand';
import UserProfileWidget, { type SettingsUserProfile } from '@/components/platform/settings/UserProfileWidget';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/context/ToastContext';
import { useGuestGuard } from '@/context/GuestGuardContext';
import { createClient } from '@/lib/supabase/client';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface MobileMoreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMoreDrawer({ isOpen, onClose }: MobileMoreDrawerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { locale, setLocale, isRTL, t } = useTranslation();
  const { isGuest, isLoading: isGuestLoading, requireAuth, openGuestModal } = useGuestGuard();
  const { isPrivacy, togglePrivacy } = usePrivacyMode();
  const { toast } = useToast();

  const [mounted, setMounted] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync Supabase user on mount / auth change
  useEffect(() => {
    if (isGuest) {
      setAuthUser(null);
      return;
    }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setAuthUser(user);
      }
    });
  }, [isGuest]);

  // Fetch full profile data via SWR
  const { data: profileData, isLoading: isProfileLoading } = useSWR<any>(
    '/api/profile',
    fetcher,
    { revalidateOnFocus: true, dedupingInterval: 30000, shouldRetryOnError: false }
  );

  // Assemble SettingsUserProfile
  const userProfile: SettingsUserProfile | null = useMemo(() => {
    const source = profileData && !profileData.error ? profileData : authUser;
    if (!source || (!profileData?.email && isGuest)) return null;

    const metadata = source.user_metadata || {};
    const defaultName =
      source.fullName ||
      source.name ||
      (typeof metadata.full_name === 'string' && metadata.full_name) ||
      (typeof metadata.name === 'string' && metadata.name) ||
      source.email?.split('@')[0] ||
      'Trader';

    const defaultAvatar =
      source.avatarUrl ||
      (typeof metadata.avatar_url === 'string' && metadata.avatar_url) ||
      (typeof metadata.picture === 'string' && metadata.picture) ||
      null;

    return {
      id: source.id || authUser?.id || '',
      email: source.email || authUser?.email || '',
      emailConfirmed: Boolean(source.emailConfirmed ?? authUser?.email_confirmed_at),
      name: defaultName,
      avatarUrl: defaultAvatar,
      createdAt: source.createdAt || authUser?.created_at || new Date().toISOString(),
      lastSignInAt: source.lastSignInAt || authUser?.last_sign_in_at,
      provider: source.provider || authUser?.app_metadata?.provider || 'email',
    };
  }, [isGuest, profileData, authUser]);

  // Strictly check admin email for Admin Console access
  const currentUserEmail = (profileData?.email || authUser?.email || userProfile?.email || '').toLowerCase().trim();
  const isAdminEmail = currentUserEmail === 'abdelrahman.m.abualola@gmail.com';

  // Navigation pages list
  const navPages = useMemo(() => {
    return [
      {
        id: 'strategies',
        title: locale === 'ar' ? 'الاستراتيجيات' : 'Strategies',
        subtitle: locale === 'ar' ? 'إشارات كمية واختبار تاريخي' : 'Quantitative signals & backtesting',
        href: '/strategies',
        icon: Zap,
        isProtected: true,
        badge: null,
      },
      {
        id: 'transactions',
        title: locale === 'ar' ? 'المعاملات' : 'Transactions',
        subtitle: locale === 'ar' ? 'دفتر الأستاذ وحركات السيولة' : 'Portfolio ledger & cashflow records',
        href: '/transactions',
        icon: ArrowRightLeft,
        isProtected: true,
        badge: null,
      },
      ...(isAdminEmail
        ? [
            {
              id: 'console',
              title: locale === 'ar' ? 'لوحة الإدارة' : 'Admin Console',
              subtitle: locale === 'ar' ? 'إدارة المنصة ومتابعة النظام' : 'Platform operations & system health',
              href: '/console/overview',
              icon: Shield,
              isProtected: false,
              badge: 'Admin',
            },
          ]
        : []),
      {
        id: 'settings',
        title: locale === 'ar' ? 'الإعدادات' : 'Settings',
        subtitle: locale === 'ar' ? 'تفضيلات الحساب، التنبيهات والأجهزة' : 'Preferences, security & device alerts',
        href: '/settings',
        icon: Settings,
        isProtected: true,
        badge: null,
      },
    ];
  }, [locale, isAdminEmail]);

  // Navigation item click handler
  const handleNavigate = (e: React.MouseEvent, page: (typeof navPages)[0]) => {
    if (page.isProtected && isGuest) {
      if (!requireAuth(e, page.title, `Unlock ${page.title}`)) {
        return;
      }
    }
    onClose();
    router.push(page.href);
  };

  // Language switch handler
  const handleToggleLanguage = async () => {
    const nextLocale = locale === 'ar' ? 'en' : 'ar';
    await setLocale(nextLocale);
    toast.success(
      nextLocale === 'ar' ? 'تم تغيير لغة العرض إلى العربية' : 'Language switched to English',
      nextLocale === 'ar' ? 'تم تفعيل الواجهة العربية' : 'English interface activated'
    );
  };

  // Sign out handler
  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      onClose();
      router.push('/');
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-modal flex items-end justify-center pointer-events-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-xs"
          />

          {/* Drawer Sheet — Strictly Pure Black, Sharp Edges, Mobile Optimized */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="relative z-modal-content w-full bg-black text-white border-t border-white/[0.12] shadow-2xl flex flex-col max-h-[88vh] rounded-none overflow-hidden select-none"
          >
            {/* Ticknal signature gradient top hairline */}
            <div className="h-[2px] w-full bg-gradient-to-r from-[#00BCE6] via-[#2962FF] to-[#D500F9] shrink-0" />

            {/* Drag handle pill */}
            <div
              className="w-full flex items-center justify-center pt-2 pb-1 cursor-pointer"
              onClick={onClose}
              aria-label="Drag handle to close"
            >
              <div className="w-10 h-1 rounded-full bg-white/20 hover:bg-white/40 transition-colors" />
            </div>

            {/* Header Row */}
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-white/[0.08] shrink-0">
              <div className="flex items-center gap-2">
                <TicknalBrand iconSize={18} showText={true} />
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                aria-label={locale === 'ar' ? 'إغلاق' : 'Close'}
              >
                <X size={18} />
              </button>
            </div>

            {/* Main Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 custom-scrollbar">
              {/* SECTION 1: ACCOUNT PROFILE FROM SETTINGS */}
              <div className="border-b border-white/[0.08] pb-4">
                {userProfile ? (
                  <UserProfileWidget userProfile={userProfile} hideSignOutButton={true} />
                ) : isGuest ? (
                  <div className="w-full min-w-0 py-2">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-14 h-14 shrink-0 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-zinc-400 shadow-inner">
                        <User size={22} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-base font-bold text-white tracking-tight truncate">
                          {locale === 'ar' ? 'مستخدم ضيف' : 'Guest Trader'}
                        </h2>
                        <p className="text-xs text-text-muted mt-0.5 truncate">
                          {locale === 'ar'
                            ? 'سجّل الدخول لمزامنة محفظتك ومتابعة التداولات'
                            : 'Sign in to sync your portfolio & track live trades'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full min-w-0 py-2 flex items-center gap-3.5 animate-pulse">
                    <div className="w-14 h-14 shrink-0 rounded-full bg-white/[0.08]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-white/[0.08] rounded w-32" />
                      <div className="h-3 bg-white/[0.05] rounded w-48" />
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: ADDITIONAL PAGES LIST */}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-1">
                  {locale === 'ar' ? 'الصفحات' : 'Navigation'}
                </div>
                <div className="flex flex-col gap-1.5">
                  {navPages.map((page) => {
                    const Icon = page.icon;
                    const isActive = pathname === page.href || pathname.startsWith(page.href + '/');
                    return (
                      <button
                        key={page.id}
                        type="button"
                        onClick={(e) => handleNavigate(e, page)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-all text-left rtl:text-right cursor-pointer group ${
                          isActive
                            ? 'bg-white/[0.08] border border-white/20 text-white'
                            : 'bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] text-zinc-300 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                              isActive
                                ? 'bg-white/10 text-white border border-white/20'
                                : 'bg-white/[0.04] text-zinc-400 group-hover:text-white border border-white/[0.08]'
                            }`}
                          >
                            <Icon size={18} strokeWidth={1.8} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-white tracking-tight truncate">
                                {page.title}
                              </span>
                              {page.badge && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                                  {page.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                              {page.subtitle}
                            </p>
                          </div>
                        </div>
                        <ChevronRight
                          size={15}
                          className={`text-zinc-500 group-hover:text-zinc-300 rtl:rotate-180 transition-transform ${
                            isActive ? 'text-white' : ''
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 3: BOTTOM UTILITIES & ACTIONS */}
              <div className="border-t border-white/[0.08] pt-3 pb-[calc(1rem+var(--ticknal-safe-area-bottom,0px))] space-y-2.5">
                {/* Utility Controls: Language Switch + Balance Masking (View/Hide) */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Language Switch */}
                  <button
                    type="button"
                    onClick={handleToggleLanguage}
                    className="py-2.5 px-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-white flex items-center justify-between transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <Globe size={16} className="text-zinc-400 group-hover:text-white transition-colors" />
                      <span className="text-xs font-medium text-white">
                        {locale === 'ar' ? 'اللغة' : 'Language'}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-300 bg-white/[0.08] px-2 py-0.5 rounded">
                      {locale === 'ar' ? 'العربية' : 'English'}
                    </span>
                  </button>

                  {/* Balance Masking View/Hide Button */}
                  <button
                    type="button"
                    onClick={togglePrivacy}
                    className="py-2.5 px-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-white flex items-center justify-between transition-colors cursor-pointer group"
                    title={isPrivacy ? 'Privacy Mode Active (Masked) - Click to Reveal' : 'Values Visible - Click to Mask'}
                  >
                    <div className="flex items-center gap-2">
                      {isPrivacy ? (
                        <EyeOff size={16} className="text-zinc-400 group-hover:text-white transition-colors" />
                      ) : (
                        <Eye size={16} className="text-zinc-400 group-hover:text-white transition-colors" />
                      )}
                      <span className="text-xs font-medium text-white">
                        {locale === 'ar' ? 'الأرصدة' : 'Balances'}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-300 bg-white/[0.08] px-2 py-0.5 rounded tabular-nums">
                      {isPrivacy ? '******' : (locale === 'ar' ? 'مرئي' : 'Visible')}
                    </span>
                  </button>
                </div>

                {/* Sign Out / Sign In Action Button */}
                {userProfile ? (
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={isLoggingOut}
                    className="w-full py-2.5 px-3 rounded-lg bg-loss-num/10 hover:bg-loss-num/20 border border-loss-num/30 text-loss-num text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut size={15} className={isRTL ? 'rotate-180' : ''} />
                    <span>
                      {isLoggingOut
                        ? (locale === 'ar' ? 'جاري الخروج...' : 'Signing out...')
                        : (locale === 'ar' ? 'تسجيل الخروج' : 'Sign Out')}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      onClose();
                      openGuestModal({
                        featureName: 'Account Profile',
                        title: 'Sign In to Ticknal',
                        description: 'Sign in to access your Egyptian market portfolio, automated alerts, and custom strategies.',
                      });
                    }}
                    className="w-full py-2.5 px-3 rounded-lg bg-brand-blue hover:opacity-90 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                  >
                    <LogIn size={15} />
                    <span>{locale === 'ar' ? 'تسجيل الدخول' : 'Sign In'}</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
