'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, usePathname } from 'next/navigation';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import {
  X,
  Zap,
  ArrowRightLeft,
  Shield,
  Settings,
  Globe,
  Sun,
  Moon,
  Eye,
  EyeOff,
  LogOut,
  LogIn,
  User,
  ChevronRight,
  Bell,
  BellOff,
} from '@/components/ui/icon-library';
import TicknalBrand from '@/components/ui/TicknalBrand';
import UserProfileWidget, { type SettingsUserProfile } from '@/components/platform/settings/UserProfileWidget';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { useTranslation } from '@/lib/i18n';
import { toast } from '@/components/ui/sonner';
import { useGuestGuard } from '@/context/GuestGuardContext';
import { createClient } from '@/lib/supabase/client';
import { useAlerts } from '@/components/platform/AlertProvider';
import { isNativePlatform } from '@/lib/native/capacitor-bridge';
import InlineSpinner from '@/components/ui/InlineSpinner';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface MobileMoreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMoreDrawer({ isOpen, onClose }: MobileMoreDrawerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const { locale, setLocale, isRTL, t } = useTranslation();
  const { isGuest, isLoading: isGuestLoading, requireAuth, openGuestModal } = useGuestGuard();
  const { isPrivacy, togglePrivacy } = usePrivacyMode();
  const { ensurePushSubscription, permission } = useAlerts();

  const [mounted, setMounted] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isUpdatingPush, setIsUpdatingPush] = useState(false);
  const [probeComplete, setProbeComplete] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Probe browser/native push notification subscription state
  useEffect(() => {
    let active = true;

    async function probePush() {
      try {
        if (isNativePlatform()) {
          const { checkNativePushStatus } = await import('@/lib/native/capacitor-bridge');
          const granted = await checkNativePushStatus();
          if (active) setIsSubscribed(granted);
          return;
        }

        if (
          typeof window !== 'undefined' &&
          'serviceWorker' in navigator &&
          'PushManager' in window
        ) {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          if (active) {
            setIsSubscribed(Boolean(sub && Notification.permission === 'granted'));
          }
        }
      } catch {
        // Silently retain current state
      } finally {
        if (active) setProbeComplete(true);
      }
    }

    probePush();
    return () => {
      active = false;
    };
  }, []);

  // Sync if AlertProvider permission changes to granted
  useEffect(() => {
    if (permission === 'granted') {
      setIsSubscribed(true);
    }
  }, [permission]);

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
    isOpen && !isGuest && !isGuestLoading ? '/api/profile' : null,
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
        title: locale === 'ar' ? 'الأرصدة والسيولة' : 'Cash & Balances',
        subtitle: locale === 'ar' ? 'أرصدة الحسابات والمراجعة الشهرية' : 'Account balances & monthly check-in',
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
              href: '/console/users',
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

  // Theme switch handler
  const isLightTheme = mounted && resolvedTheme === 'light';
  const handleToggleTheme = () => {
    const nextTheme = isLightTheme ? 'dark' : 'light';
    setTheme(nextTheme);
    if (nextTheme === 'light') {
      toast.success(
        locale === 'ar' ? 'تم تفعيل الوضع الفاتح' : 'Light Mode Activated',
        locale === 'ar' ? 'تم تحديث ألوان الواجهة والرسوم البيانية' : 'Interface surfaces switched to high-contrast light theme'
      );
    } else {
      toast.success(
        locale === 'ar' ? 'تم تفعيل الوضع الداكن' : 'Dark Mode Activated',
        locale === 'ar' ? 'تمت استعادة واجهة Ticknal السوداء بالكامل' : 'Pure black institutional terminal restored'
      );
    }
  };

  // Push notification toggle handler
  const handleTogglePush = async (checked: boolean) => {
    setIsUpdatingPush(true);
    try {
      if (checked) {
        const res = await ensurePushSubscription({ forceResubscribe: true });
        if (res.success) {
          setIsSubscribed(true);
          toast.success(
            locale === 'ar' ? 'تم تفعيل الإشعارات الفورية' : 'Push Notifications Enabled',
            locale === 'ar'
              ? 'ستصلك إشارات التداول وأهم الأخبار العاجلة على هذا الجهاز'
              : 'Real-time trade signals & urgent takes will now alert this device'
          );
        } else {
          toast.error(
            locale === 'ar' ? 'تعذر تفعيل الإشعارات' : 'Could not enable notifications',
            res.error ||
              (locale === 'ar'
                ? 'يرجى مراجعة إذن الإشعارات في متصفحك أو هاتفك'
                : 'Check notification permissions in your browser or phone settings')
          );
        }
      } else {
        if (
          typeof window !== 'undefined' &&
          'serviceWorker' in navigator &&
          'PushManager' in window
        ) {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`, {
              method: 'DELETE',
            }).catch(() => {});
            await sub.unsubscribe();
          }
        }
        setIsSubscribed(false);
        toast.info(
          locale === 'ar' ? 'تم إيقاف الإشعارات الفورية' : 'Push Notifications Disabled',
          locale === 'ar'
            ? 'تم إيقاف استلام التنبيهات على هذا الجهاز'
            : 'Push alerts silenced on this device'
        );
      }
    } catch {
      toast.error(
        locale === 'ar' ? 'حدث خطأ غير متوقع' : 'Unexpected error',
        locale === 'ar'
          ? 'تعذر تحديث إعدادات الإشعارات'
          : 'Could not update notification preferences'
      );
    } finally {
      setIsUpdatingPush(false);
    }
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
            className="fixed inset-0 bg-plt-overlay backdrop-blur-xs"
          />

          {/* Drawer Sheet — Strictly Pure Black, Sharp Edges, Mobile Optimized */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="relative z-modal-content w-full bg-plt-base text-plt-text border-t border-plt-border shadow-2xl flex flex-col max-h-[88vh] rounded-none overflow-hidden select-none"
          >
            {/* Ticknal signature gradient top hairline */}
            <div className="h-[2px] w-full bg-gradient-to-r from-[#00BCE6] via-[#2962FF] to-[#D500F9] shrink-0" />

            {/* Drag handle pill */}
            <div
              className="w-full flex items-center justify-center pt-2 pb-1 cursor-pointer"
              onClick={onClose}
              aria-label="Drag handle to close"
            >
              <div className="w-10 h-1 rounded-full bg-plt-hover hover:bg-plt-active transition-colors" />
            </div>

            {/* Header Row */}
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-plt-border-soft shrink-0">
              <div className="flex items-center gap-2">
                <TicknalBrand iconSize={18} showText={true} />
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-plt-muted hover:text-plt-text hover:bg-plt-hover transition-colors cursor-pointer"
                aria-label={locale === 'ar' ? 'إغلاق' : 'Close'}
              >
                <X size={18} />
              </button>
            </div>

            {/* Main Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 custom-scrollbar">
              {/* SECTION 1: ACCOUNT PROFILE FROM SETTINGS */}
              <div className="border-b border-plt-border-soft pb-4">
                {userProfile ? (
                  <UserProfileWidget userProfile={userProfile} hideSignOutButton={true} />
                ) : isGuest ? (
                  <div className="w-full min-w-0 py-2">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-14 h-14 shrink-0 rounded-full bg-plt-hover border border-plt-border flex items-center justify-center text-plt-muted shadow-inner">
                        <User size={22} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-base font-bold text-plt-text tracking-tight truncate">
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
                            ? 'bg-plt-active border border-plt-border-strong text-plt-text'
                            : 'bg-plt-hover/50 hover:bg-plt-hover border border-plt-border-soft text-plt-subtle hover:text-plt-text'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                              isActive
                                ? 'bg-plt-active text-plt-text border border-plt-border-strong'
                                : 'bg-plt-hover text-plt-muted group-hover:text-plt-text border border-plt-border-soft'
                            }`}
                          >
                            <Icon size={18} strokeWidth={1.8} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-plt-text tracking-tight truncate">
                                {page.title}
                              </span>
                              {page.badge && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                                  {page.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-plt-muted truncate mt-0.5">
                              {page.subtitle}
                            </p>
                          </div>
                        </div>
                        <ChevronRight
                          size={15}
                          className={`text-plt-muted group-hover:text-plt-subtle rtl:rotate-180 transition-transform ${
                            isActive ? 'text-plt-text' : ''
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 3: BOTTOM UTILITIES & ACTIONS */}
              <div className="border-t border-plt-border-soft pt-3 pb-[calc(1rem+var(--ticknal-safe-area-bottom,0px))] space-y-2.5">
                {/* Utility Controls: Language Switch + Balance Masking (View/Hide) */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Language Switch */}
                  <button
                    type="button"
                    onClick={handleToggleLanguage}
                    className="py-2.5 px-3 rounded-lg bg-plt-hover/50 hover:bg-plt-hover border border-plt-border text-plt-text flex items-center justify-between transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <Globe size={16} className="text-plt-muted group-hover:text-plt-text transition-colors" />
                      <span className="text-xs font-medium text-plt-text">
                        {locale === 'ar' ? 'اللغة' : 'Language'}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-plt-subtle bg-plt-active px-2 py-0.5 rounded">
                      {locale === 'ar' ? 'العربية' : 'English'}
                    </span>
                  </button>

                  {/* Balance Masking View/Hide Button */}
                  <button
                    type="button"
                    onClick={togglePrivacy}
                    className="py-2.5 px-3 rounded-lg bg-plt-hover/50 hover:bg-plt-hover border border-plt-border text-plt-text flex items-center justify-between transition-colors cursor-pointer group"
                    title={isPrivacy ? 'Privacy Mode Active (Masked) - Click to Reveal' : 'Values Visible - Click to Mask'}
                  >
                    <div className="flex items-center gap-2">
                      {isPrivacy ? (
                        <EyeOff size={16} className="text-plt-muted group-hover:text-plt-text transition-colors" />
                      ) : (
                        <Eye size={16} className="text-plt-muted group-hover:text-plt-text transition-colors" />
                      )}
                      <span className="text-xs font-medium text-plt-text">
                        {locale === 'ar' ? 'الأرصدة' : 'Balances'}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-plt-subtle bg-plt-active px-2 py-0.5 rounded tabular-nums">
                      {isPrivacy ? '******' : (locale === 'ar' ? 'مرئي' : 'Visible')}
                    </span>
                  </button>
                </div>

                {/* Theme / Appearance Quick Switch */}
                <button
                  type="button"
                  onClick={handleToggleTheme}
                  className="w-full py-2.5 px-3 rounded-lg bg-plt-hover/50 hover:bg-plt-hover border border-plt-border text-plt-text flex items-center justify-between transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    {isLightTheme ? (
                      <Sun size={16} className="text-plt-muted group-hover:text-plt-text transition-colors" />
                    ) : (
                      <Moon size={16} className="text-plt-muted group-hover:text-plt-text transition-colors" />
                    )}
                    <span className="text-xs font-medium text-plt-text">
                      {locale === 'ar' ? 'مظهر الواجهة' : 'Appearance'}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-plt-subtle bg-plt-active px-2 py-0.5 rounded">
                    {isLightTheme
                      ? (locale === 'ar' ? 'الوضع الفاتح' : 'Light Mode')
                      : (locale === 'ar' ? 'الوضع الداكن' : 'Dark Mode')}
                  </span>
                </button>

                {/* Push Notifications Quick Switch */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => !isUpdatingPush && handleTogglePush(!isSubscribed)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (!isUpdatingPush) handleTogglePush(!isSubscribed);
                    }
                  }}
                  className={`w-full py-2.5 px-3 rounded-lg bg-plt-hover/50 hover:bg-plt-hover border border-plt-border text-plt-text flex items-center justify-between transition-colors cursor-pointer group select-none ${
                    isUpdatingPush ? 'opacity-70 cursor-wait' : ''
                  }`}
                  aria-label={locale === 'ar' ? 'تفعيل أو تعطيل الإشعارات الفورية' : 'Toggle push notifications'}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-4 h-4 flex items-center justify-center shrink-0">
                      {isSubscribed ? (
                        <Bell size={16} className="text-profit-num" />
                      ) : (
                        <BellOff size={16} className="text-plt-muted group-hover:text-plt-text transition-colors" />
                      )}
                    </div>
                    <div className="flex flex-col text-left rtl:text-right min-w-0">
                      <span className="text-xs font-medium text-plt-text truncate">
                        {locale === 'ar' ? 'الإشعارات الفورية' : 'Push Notifications'}
                      </span>
                      <span className="text-[10px] text-plt-muted truncate">
                        {isSubscribed
                          ? (locale === 'ar' ? 'مفعّل على هذا الجهاز' : 'Active on this device')
                          : (locale === 'ar' ? 'إشارات التداول والتنبيهات' : 'Signals & market takes')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {probeComplete && (
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          isSubscribed ? 'text-profit-num bg-profit-num/10' : 'text-plt-muted bg-plt-active'
                        }`}
                      >
                        {isSubscribed ? (locale === 'ar' ? 'مفعّل' : 'ON') : (locale === 'ar' ? 'معطل' : 'OFF')}
                      </span>
                    )}
                    <div
                      className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                        isSubscribed ? 'bg-profit-num' : 'bg-plt-active'
                      }`}
                    >
                      {isUpdatingPush ? (
                        <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-xs">
                          <InlineSpinner className="h-3 w-3 text-zinc-800" label="Updating notifications" />
                        </div>
                      ) : (
                        <div
                          className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform duration-200 ease-out ${
                            isSubscribed ? (isRTL ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'
                          }`}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Divider before Sign Out / Sign In to prevent accidental clicks */}
                <div className="my-1.5 h-px w-full bg-plt-border-soft" />

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
