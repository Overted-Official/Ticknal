'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Mail, 
  ShieldCheck, 
  Calendar, 
  Copy, 
  Check, 
  LogOut, 
  Smartphone, 
  Monitor, 
  Laptop, 
  Tablet, 
  Globe, 
  Bell, 
  BellOff, 
  Plus, 
  Search, 
  Trash2, 
  ExternalLink, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle,
  Lock,
  Layers,
  X,
  Camera,
  Loader2,
  Target,
  Zap,
  Sparkles,
  Cpu,
  Compass
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAlerts } from '@/components/platform/AlertProvider';
import { useToast } from '@/context/ToastContext';
import { containerStagger, itemFadeInUp } from '@/lib/motion';
import PinSecurityCard from '@/components/platform/settings/PinSecurityCard';
import SubNavTopRail from '@/components/navigation/SubNavTopRail';
import { triggerNativeTestNotification } from '@/lib/native/capacitor-bridge';
import { useSwipeableTabs } from '@/hooks/useSwipeableTabs';

export type SettingsUserProfile = {
  id: string;
  email: string;
  emailConfirmed: boolean;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
  lastSignInAt?: string | null;
  provider: string;
};

export type DeviceInfo = {
  id: number;
  endpoint: string;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MonitoredTicker = {
  symbol: string;
  companyName: string;
  sector: string;
  logoUrl?: string | null;
  isPosition: boolean;
  positionQuantity?: number;
  positionAvgEntry?: number;
  isExplicitAlert: boolean;
  alertEnabled: boolean;
  currentPrice?: number;
};

export type TickerOption = {
  symbol: string;
  companyName: string;
  sector: string;
  logoUrl?: string | null;
};

interface SettingsViewProps {
  userProfile: SettingsUserProfile;
  initialDevices: DeviceInfo[];
  initialMonitoredTickers: MonitoredTicker[];
  allTickers: TickerOption[];
}

function parseUserAgent(ua: string | null): {
  browser: string;
  os: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
} {
  if (!ua) return { browser: 'Web Client', os: 'Unknown OS', deviceType: 'desktop' };

  let os = 'Unknown OS';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os/i.test(ua)) os = 'macOS';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = 'Browser';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/opera|opr/i.test(ua)) browser = 'Opera';

  let deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'desktop';
  if (/ipad/i.test(ua)) deviceType = 'tablet';
  else if (/mobile|iphone|android/i.test(ua)) deviceType = 'mobile';

  return { browser, os, deviceType };
}

function TickerLogo({ symbol, logoUrl }: { symbol: string; logoUrl?: string | null }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="w-7 h-7 rounded-md bg-white/[0.04] border border-white/[0.09] p-0.5 shrink-0 flex items-center justify-center overflow-hidden">
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt={symbol}
          className="w-full h-full object-contain rounded-[3px] bg-transparent"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-[10px] font-bold text-white/50 uppercase font-mono">{symbol.slice(0, 2)}</span>
      )}
    </div>
  );
}

const SETTINGS_TABS = ['profile', 'security', 'devices', 'alerts'] as const;

export default function SettingsView({
  userProfile,
  initialDevices,
  initialMonitoredTickers,
  allTickers,
}: SettingsViewProps) {
  const router = useRouter();
  const { ensurePushSubscription, permission } = useAlerts();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'devices' | 'alerts'>('profile');

  const { swipeHandlers } = useSwipeableTabs({
    tabs: SETTINGS_TABS,
    activeTab,
    onTabChange: (newTab) => setActiveTab(newTab),
  });

  const [devices, setDevices] = useState<DeviceInfo[]>(initialDevices);
  const [monitoredTickers, setMonitoredTickers] = useState<MonitoredTicker[]>(initialMonitoredTickers);
  const [copiedUid, setCopiedUid] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [deletingDeviceId, setDeletingDeviceId] = useState<number | null>(null);

  // Avatar Upload State
  const [avatarUrl, setAvatarUrl] = useState<string | null>(userProfile.avatarUrl);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUploadStatus, setAvatarUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search and Filter for Monitored Tickers
  const [tickerFilter, setTickerFilter] = useState<'ALL' | 'POSITIONS' | 'ALERTS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState('');
  const [togglingSymbol, setTogglingSymbol] = useState<string | null>(null);

  const { toast } = useToast();
  const [alertStrategyScope, setAlertStrategyScope] = useState<'all' | 'psi' | 'psi_v2' | 'thoth_egx_macro'>('all');
  const [isSavingScope, setIsSavingScope] = useState(false);

  // Load saved strategy scope preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ticknal_alert_strategy_scope') ?? localStorage.getItem('quantegx_alert_strategy_scope');
      if (saved && (saved === 'all' || saved === 'psi' || saved === 'psi_v2' || saved === 'thoth_egx_macro')) {
        setAlertStrategyScope(saved as any);
      }
    } catch (e) {}

    fetch('/api/alerts/preferences')
      .then((r) => r.json())
      .then((data) => {
        if (data?.scope && (data.scope === 'all' || data.scope === 'psi' || data.scope === 'psi_v2' || data.scope === 'thoth_egx_macro')) {
          setAlertStrategyScope(data.scope);
          try {
            localStorage.setItem('ticknal_alert_strategy_scope', data.scope);
          } catch (e) {}
        }
      })
      .catch(() => {});
  }, []);

  const handleStrategyScopeChange = async (newScope: 'all' | 'psi' | 'psi_v2' | 'thoth_egx_macro') => {
    setAlertStrategyScope(newScope);
    try {
      localStorage.setItem('ticknal_alert_strategy_scope', newScope);
    } catch (e) {}

    setIsSavingScope(true);
    try {
      const res = await fetch('/api/alerts/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: newScope }),
      });
      if (res.ok) {
        const label =
          newScope === 'all'
            ? 'All Active Strategies'
            : newScope === 'psi'
            ? 'PSI Strategy Only'
            : newScope === 'psi_v2'
            ? 'PSI V2 Strategy Only'
            : 'Thoth EGX Macro Only';
        toast.success('Strategy Scope Updated', `Alerts and opportunities set to ${label}.`);
      }
    } catch (e) {
      toast.error('Save Error', 'Failed to save alert preference to server.');
    } finally {
      setIsSavingScope(false);
    }
  };

  // Current client user agent
  const [clientUa, setClientUa] = useState<string>('');
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setClientUa(navigator.userAgent);
    }
  }, []);

  // Auto-sync push subscription if already granted by browser
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      ensurePushSubscription().then((res) => {
        if (res.success) {
          fetch('/api/push/subscribe')
            .then((r) => r.json())
            .then((data) => {
              if (data.devices || data.subscriptions) {
                setDevices(data.devices || data.subscriptions);
              }
            })
            .catch(() => {});
        }
      }).catch(() => {});
    }
  }, [ensurePushSubscription]);

  const handleCopyUid = () => {
    navigator.clipboard.writeText(userProfile.id);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/');
      router.refresh();
    } catch (e) {
      console.error('Error logging out:', e);
      setIsLoggingOut(false);
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setAvatarUploadStatus('File size must be under 5MB.');
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarUploadStatus(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setAvatarUploadStatus(`Upload failed: ${data.error || 'Unknown error'}`);
        return;
      }

      setAvatarUrl(data.avatarUrl);
      setAvatarUploadStatus('Profile photo updated successfully!');
      setTimeout(() => setAvatarUploadStatus(null), 4000);
    } catch (err) {
      console.error('Unexpected avatar upload error:', err);
      setAvatarUploadStatus('An error occurred during upload.');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleEnablePush = async () => {
    setIsEnablingPush(true);
    setPushStatus(null);
    try {
      const res = await ensurePushSubscription({ forceResubscribe: true });
      if (res.success) {
        setPushStatus('Notifications enabled successfully on this device!');
        // Refresh device list
        const devRes = await fetch('/api/push/subscribe');
        if (devRes.ok) {
          const data = await devRes.json();
          setDevices(data.subscriptions || data.devices || []);
        }
      } else {
        setPushStatus(res.error || 'Failed to enable notifications. Please check browser permissions.');
      }
    } catch {
      setPushStatus('An unexpected error occurred while requesting notification access.');
    } finally {
      setIsEnablingPush(false);
    }
  };

  const handleTestPush = async () => {
    setIsEnablingPush(true);
    setPushStatus(null);
    try {
      // Ensure subscription is active and synced with current VAPID keys
      await ensurePushSubscription({ forceResubscribe: false }).catch(() => {});

      // 1. Trigger immediate native heads-up notification if running on Android device
      await triggerNativeTestNotification(
        '🟢 Ticknal Signal Test',
        'BUY Signal triggered for COMI at 84.50 EGP (Target: 92.00, Stop: 81.00)'
      );

      // 2. Dispatch server-side push alert
      const res = await fetch('/api/notifications/test', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setPushStatus('🟢 Test notification dispatched! Check your status bar & notification tray.');
        // Refresh device list
        const devRes = await fetch('/api/push/subscribe');
        if (devRes.ok) {
          const devData = await devRes.json();
          setDevices(devData.subscriptions || devData.devices || []);
        }
      } else {
        setPushStatus(data.error || 'Failed to send test notification.');
      }
    } catch {
      setPushStatus('Failed to dispatch test notification.');
    } finally {
      setIsEnablingPush(false);
    }
  };

  const handleDeleteDevice = async (id: number) => {
    setDeletingDeviceId(id);
    try {
      const res = await fetch(`/api/push/subscribe?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDevices((prev) => prev.filter((d) => d.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete device:', err);
    } finally {
      setDeletingDeviceId(null);
    }
  };

  const handleToggleAlert = async (symbol: string, currentEnabled: boolean) => {
    setTogglingSymbol(symbol);
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, enabled: !currentEnabled }),
      });
      if (res.ok) {
        setMonitoredTickers((prev) =>
          prev.map((t) => (t.symbol === symbol ? { ...t, alertEnabled: !currentEnabled, isExplicitAlert: true } : t))
        );
      }
    } catch (err) {
      console.error('Failed to toggle alert:', err);
    } finally {
      setTogglingSymbol(null);
    }
  };

  const handleDeleteCustomAlert = async (symbol: string) => {
    setTogglingSymbol(symbol);
    try {
      const res = await fetch(`/api/alerts?symbol=${symbol}`, { method: 'DELETE' });
      if (res.ok) {
        setMonitoredTickers((prev) => {
          return prev
            .map((t) => {
              if (t.symbol === symbol) {
                if (t.isPosition) {
                  return { ...t, isExplicitAlert: false, alertEnabled: true };
                }
                return null;
              }
              return t;
            })
            .filter(Boolean) as MonitoredTicker[];
        });
      }
    } catch (err) {
      console.error('Failed to delete alert:', err);
    } finally {
      setTogglingSymbol(null);
    }
  };

  const handleAddAlert = async (ticker: TickerOption) => {
    setTogglingSymbol(ticker.symbol);
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: ticker.symbol, enabled: true }),
      });
      if (res.ok) {
        setMonitoredTickers((prev) => {
          const exists = prev.find((t) => t.symbol === ticker.symbol);
          if (exists) {
            return prev.map((t) => (t.symbol === ticker.symbol ? { ...t, alertEnabled: true, isExplicitAlert: true } : t));
          }
          return [
            ...prev,
            {
              symbol: ticker.symbol,
              companyName: ticker.companyName,
              sector: ticker.sector,
              logoUrl: ticker.logoUrl,
              isPosition: false,
              isExplicitAlert: true,
              alertEnabled: true,
            },
          ];
        });
        setIsAddModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to add alert:', err);
    } finally {
      setTogglingSymbol(null);
    }
  };

  // Filtered monitored tickers
  const filteredMonitoredTickers = useMemo(() => {
    return monitoredTickers.filter((t) => {
      if (tickerFilter === 'POSITIONS' && !t.isPosition) return false;
      if (tickerFilter === 'ALERTS' && !t.isExplicitAlert) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          t.symbol.toLowerCase().includes(query) ||
          t.companyName.toLowerCase().includes(query) ||
          t.sector.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [monitoredTickers, tickerFilter, searchQuery]);

  // Filtered search results for Add Alert modal
  const addModalSearchResults = useMemo(() => {
    if (!addSearchQuery.trim()) return allTickers.slice(0, 15);
    const query = addSearchQuery.toLowerCase();
    return allTickers
      .filter(
        (t) =>
          t.symbol.toLowerCase().includes(query) ||
          t.companyName.toLowerCase().includes(query) ||
          t.sector.toLowerCase().includes(query)
      )
      .slice(0, 20);
  }, [allTickers, addSearchQuery]);

  const memberSince = useMemo(() => {
    try {
      return new Date(userProfile.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  }, [userProfile.createdAt]);

  const initials = useMemo(() => {
    if (userProfile.name) {
      const parts = userProfile.name.trim().split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return userProfile.name.slice(0, 2).toUpperCase();
    }
    return userProfile.email.slice(0, 2).toUpperCase();
  }, [userProfile.name, userProfile.email]);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerStagger}
      className="flex-1 h-full w-full min-h-0 flex flex-col overflow-hidden bg-transparent text-white relative z-10"
    >
      {/* 1. Mobile Top Rail */}
      <SubNavTopRail
        activeTab={activeTab}
        onChange={(val) => setActiveTab(val as any)}
        items={[
          { label: 'Profile', value: 'profile', icon: User },
          { label: 'Security & PIN', value: 'security', icon: ShieldCheck },
          { label: 'Devices', value: 'devices', icon: Smartphone, badge: devices.length },
          { label: 'Alerts', value: 'alerts', icon: Bell, badge: monitoredTickers.length },
        ]}
      />

      <div {...swipeHandlers} className="flex-1 h-full w-full min-h-0 overflow-y-auto pb-28 md:pb-24 touch-pan-y">
        {/* Top Header Banner */}
        <div className="border-b border-white/[0.09] px-4 md:px-6 py-4 md:py-5 shrink-0">
          <motion.div variants={itemFadeInUp} className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="w-2 h-2 rounded-full bg-white/60" />
                <h1 className="text-lg font-medium tracking-[-0.02em] text-white">Settings</h1>
              </div>
              <p className="mt-0.5 text-[13px] text-white/30 truncate">
                Account profile, security PIN, devices, and alert triggers
              </p>
            </div>

            <div className="hidden md:flex items-center gap-2">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium text-white/60 hover:text-white bg-white/[0.03] border border-white/[0.09] hover:border-white/[0.18] hover:bg-white/[0.06] transition-all"
              >
                <span>Dashboard</span>
                <span className="text-white/40">→</span>
              </Link>
              <Link
                href="/positions"
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium text-white/60 hover:text-white bg-white/[0.03] border border-white/[0.09] hover:border-white/[0.18] hover:bg-white/[0.06] transition-all"
              >
                <span>Manage Positions</span>
                <span className="text-white/40">→</span>
              </Link>
              <Link
                href="/invest"
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium text-white/60 hover:text-white bg-white/[0.03] border border-white/[0.09] hover:border-white/[0.18] hover:bg-white/[0.06] transition-all"
              >
                <span>Open Invest</span>
                <span className="text-white/40">→</span>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Main Settings Canvas */}
        <div className="p-4 md:p-6 space-y-2 w-full">
          {/* Navigation Tabs (Desktop Only) */}
          <motion.div variants={itemFadeInUp} className="hidden md:flex items-center gap-2 border-b border-white/[0.09] pb-3">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'profile'
                  ? 'bg-white/[0.10] text-white border border-white/[0.15] shadow-sm'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/[0.03]'
              }`}
            >
              <User size={14} className={activeTab === 'profile' ? 'text-white' : 'text-white/40'} />
              <span>Account Profile</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'security'
                  ? 'bg-white/[0.10] text-white border border-white/[0.15] shadow-sm'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/[0.03]'
              }`}
            >
              <ShieldCheck size={14} className={activeTab === 'security' ? 'text-white' : 'text-white/40'} />
              <span>Security & PIN</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('devices')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'devices'
                  ? 'bg-white/[0.10] text-white border border-white/[0.15] shadow-sm'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/[0.03]'
              }`}
            >
              <Smartphone size={14} className={activeTab === 'devices' ? 'text-white' : 'text-white/40'} />
              <span>Connected Devices</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/[0.06] text-white/60">
                {Math.max(1, devices.length)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('alerts')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'alerts'
                  ? 'bg-white/[0.10] text-white border border-white/[0.15] shadow-sm'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/[0.03]'
              }`}
            >
              <Bell size={14} className={activeTab === 'alerts' ? 'text-white' : 'text-white/40'} />
              <span>Monitored Tickers & Alerts</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/[0.06] text-white/60">
                {monitoredTickers.length}
              </span>
            </button>
          </motion.div>

        {/* TAB 1: ACCOUNT PROFILE */}
        {activeTab === 'profile' && (
          <motion.div variants={itemFadeInUp} className="space-y-2">
            {/* User Profile Card */}
            <div className="border border-white/[0.09] rounded-md bg-black p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-white/[0.08]">
                <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
                  {/* Avatar (with upload trigger) */}
                  <div 
                    className="relative group cursor-pointer shrink-0 w-16 h-16 aspect-square"
                    onClick={() => fileInputRef.current?.click()}
                    title="Click to upload profile photo"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={userProfile.name}
                        className="w-16 h-16 shrink-0 aspect-square rounded-full border-2 border-white/[0.12] object-cover bg-white/[0.04] group-hover:opacity-75 transition-opacity"
                      />
                    ) : (
                      <div className="w-16 h-16 shrink-0 aspect-square rounded-full border border-white/[0.12] bg-gradient-to-tr from-white/[0.06] to-white/[0.12] flex items-center justify-center text-lg font-bold text-white font-mono shadow-inner group-hover:opacity-75 transition-opacity">
                        {initials}
                      </div>
                    )}

                    {/* Camera hover overlay */}
                    <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      {isUploadingAvatar ? (
                        <Loader2 size={18} className="animate-spin text-white" />
                      ) : (
                        <Camera size={18} className="text-white/90" />
                      )}
                    </div>

                    <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#22c55e] border-2 border-black" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-base font-semibold text-white tracking-tight truncate">{userProfile.name}</h2>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] shrink-0">
                        <ShieldCheck size={11} />
                        Verified
                      </span>
                    </div>
                    <p className="text-xs text-white/40 mt-0.5 truncate">{userProfile.email}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-white/30">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        Member since {memberSince}
                      </span>
                      <span>•</span>
                      <span className="capitalize">Auth: {userProfile.provider}</span>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                        className="text-white/60 hover:text-white hover:underline inline-flex items-center gap-1"
                      >
                        <Camera size={11} />
                        <span>{isUploadingAvatar ? 'Uploading...' : 'Change Photo'}</span>
                      </button>
                    </div>

                    {avatarUploadStatus && (
                      <div className="mt-2 text-[11px] text-plt-profit font-mono flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        <span>{avatarUploadStatus}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isLoggingOut}
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium text-[#ef4444] bg-[#ef4444]/10 hover:bg-[#ef4444]/15 border border-[#ef4444]/25 transition-all"
                >
                  <LogOut size={14} />
                  <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
                </button>
              </div>

              {/* Account Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-6">
                <div className="p-4 rounded-md bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-[11px] font-medium text-white/35 block mb-1">Email Address</span>
                  <div className="text-xs font-mono font-medium text-white/90 break-all">{userProfile.email}</div>
                </div>

                <div className="p-4 rounded-md bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-[11px] font-medium text-white/35 block mb-1">User Account UID</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-white/60 truncate">{userProfile.id}</span>
                    <button
                      type="button"
                      onClick={handleCopyUid}
                      className="p-1 rounded text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors shrink-0"
                      title="Copy User ID"
                    >
                      {copiedUid ? <Check size={13} className="text-[#22c55e]" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-md bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-[11px] font-medium text-white/35 block mb-1">Portfolio Mode</span>
                  <div className="text-xs font-mono font-medium text-plt-text">Automated PSI Triggers</div>
                </div>
              </div>
            </div>

            {/* Passcode Security Card */}
            <PinSecurityCard />
          </motion.div>
        )}

        {/* TAB 2: SECURITY & PIN */}
        {activeTab === 'security' && (
          <motion.div variants={itemFadeInUp} className="space-y-2">
            <PinSecurityCard />
          </motion.div>
        )}

        {/* TAB 2: CONNECTED DEVICES & SESSIONS */}
        {activeTab === 'devices' && (() => {
          const currentClient = parseUserAgent(clientUa || (typeof navigator !== 'undefined' ? navigator.userAgent : ''));
          const CurrentDeviceIcon =
            currentClient.deviceType === 'mobile' ? Smartphone :
            currentClient.deviceType === 'tablet' ? Tablet :
            currentClient.os === 'macOS' ? Laptop :
            Monitor;

          const isCurrentDeviceSubscribed = devices.some(
            (d) => clientUa && d.userAgent && (clientUa.includes(d.userAgent.slice(0, 30)) || d.userAgent.includes(clientUa.slice(0, 30)))
          ) || permission === 'granted';

          return (
            <motion.div variants={itemFadeInUp} className="space-y-4">
              {/* 1. CURRENT ACTIVE SESSION CARD */}
              <div className="border border-white/[0.09] rounded-md bg-black p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
                    <h2 className="text-[13px] font-medium text-white tracking-[-0.02em]">Current Active Session</h2>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#22c55e]">
                    Connected Now
                  </span>
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-md bg-white/[0.02] border border-white/[0.07]">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-md bg-white/[0.05] border border-white/[0.10] flex items-center justify-center text-white/80 shrink-0">
                      <CurrentDeviceIcon size={22} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white truncate">
                          {currentClient.browser} on {currentClient.os}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-white/[0.06] text-white/60">
                          {currentClient.deviceType}
                        </span>
                      </div>
                      <div className="text-[11px] text-white/40 mt-0.5 truncate font-mono">
                        {isCurrentDeviceSubscribed ? (
                          <span className="text-[#22c55e] flex items-center gap-1.5">
                            <CheckCircle2 size={12} />
                            Subscribed to instantaneous trade signals & stop-loss alerts
                          </span>
                        ) : (
                          <span className="text-white/45 flex items-center gap-1.5">
                            <BellOff size={12} />
                            Push alerts inactive on this browser session
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
                    <button
                      type="button"
                      onClick={isCurrentDeviceSubscribed ? handleTestPush : handleEnablePush}
                      disabled={isEnablingPush}
                      className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium transition-all w-full md:w-auto ${
                        isCurrentDeviceSubscribed
                          ? 'text-white bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12]'
                          : 'text-black bg-white hover:bg-white/90 shadow-sm font-semibold'
                      }`}
                    >
                      <Bell size={14} />
                      <span>
                        {isEnablingPush
                          ? 'Connecting...'
                          : isCurrentDeviceSubscribed
                          ? 'Send Test Push Alert'
                          : 'Enable Push on This Device'}
                      </span>
                    </button>
                  </div>
                </div>

                {pushStatus && (
                  <div className="mt-4 p-3 rounded-md bg-white/[0.03] border border-white/[0.08] text-xs text-white/70 flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-plt-profit shrink-0" />
                    <span>{pushStatus}</span>
                  </div>
                )}
              </div>

              {/* 2. REGISTERED PUSH & MOBILE DEVICES */}
              <div className="border border-white/[0.09] rounded-md bg-black p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-white/[0.08]">
                  <div>
                    <h2 className="text-[13px] font-medium text-white tracking-[-0.02em]">
                      Linked Notification Devices ({devices.length})
                    </h2>
                    <p className="mt-1 text-xs text-white/40">
                      All browsers and mobile apps linked to your Ticknal account for real-time trade signals.
                    </p>
                  </div>
                </div>

                {devices.length === 0 ? (
                  <div className="py-8 px-4 text-center rounded-md bg-white/[0.01] border border-dashed border-white/[0.08]">
                    <Smartphone size={28} className="mx-auto mb-2 text-white/20" />
                    <p className="text-xs text-white/50 font-medium">No additional background devices registered</p>
                    <p className="text-[11px] text-white/30 mt-1 max-w-sm mx-auto">
                      Click &quot;Enable Push on This Device&quot; above to link this browser, or log in from the Ticknal Android app to receive instant trade notifications.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {devices.map((device) => {
                      const { browser, os, deviceType } = parseUserAgent(device.userAgent);
                      const isCurrent = clientUa && device.userAgent && (clientUa.includes(device.userAgent.slice(0, 30)) || device.userAgent.includes(clientUa.slice(0, 30)));

                      const DeviceIcon =
                        deviceType === 'mobile' ? Smartphone :
                        deviceType === 'tablet' ? Tablet :
                        deviceType === 'desktop' && os === 'macOS' ? Laptop :
                        Monitor;

                      return (
                        <div
                          key={device.id}
                          className="p-3.5 rounded-md bg-white/[0.02] border border-white/[0.08] flex items-center justify-between gap-3 hover:border-white/[0.14] transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-md bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/60 shrink-0">
                              <DeviceIcon size={18} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-white truncate">
                                  {device.userAgent?.startsWith('Native App') ? device.userAgent : `${browser} on ${os}`}
                                </span>
                                {isCurrent && (
                                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#22c55e] shrink-0">
                                    Current
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-white/35 mt-0.5 font-mono">
                                Registered {new Date(device.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteDevice(device.id)}
                            disabled={deletingDeviceId === device.id}
                            className="p-1.5 rounded text-white/30 hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors shrink-0"
                            title="Disconnect Device"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })()}

        {/* TAB 3: MONITORED TICKERS & ALERTS */}
        {activeTab === 'alerts' && (
          <motion.div variants={itemFadeInUp} className="space-y-4">
            {/* Strategy Scope Selector Card */}
            <div className="border border-white/[0.09] rounded-md bg-black p-6">
              <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.12] flex items-center justify-center text-white/60">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-[13px] font-medium text-white tracking-[-0.02em] flex items-center gap-2">
                      <span>Signal & Alert Strategy Scope</span>
                      {isSavingScope && <span className="text-[10px] text-plt-muted animate-pulse font-mono">Syncing...</span>}
                    </h2>
                    <p className="mt-0.5 text-xs text-white/40">
                      Choose which models send push notifications and populate the dashboard Buy/Sell Opportunity tables.
                    </p>
                  </div>
                </div>
              </div>

              {/* 4 Strategy Scope Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {/* 1. All Strategies */}
                <div
                  onClick={() => handleStrategyScopeChange('all')}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                    alertStrategyScope === 'all'
                      ? 'bg-white/[0.06] border-white/60 shadow-[0_0_15px_rgba(255,255,255,0.10)]'
                      : 'bg-white/[0.02] border-white/[0.08] hover:border-white/[0.18] hover:bg-white/[0.04]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Zap className={`w-4 h-4 ${alertStrategyScope === 'all' ? 'text-white' : 'text-white/40'}`} />
                        <span className="text-xs font-bold text-white">All Strategies</span>
                      </div>
                      <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[11px] text-white/40 leading-relaxed">
                      Receive alerts from PSI, PSI V2, and Thoth EGX Macro. Each alert is clearly tagged with its originating model.
                    </p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="text-[9px] font-mono text-white/30">Scope: Multi-Model</span>
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      alertStrategyScope === 'all' ? 'border-white bg-white' : 'border-white/30'
                    }`}>
                      {alertStrategyScope === 'all' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                    </div>
                  </div>
                </div>

                {/* 2. PSI Strategy */}
                <div
                  onClick={() => handleStrategyScopeChange('psi')}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                    alertStrategyScope === 'psi'
                      ? 'bg-cyan-500/10 border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.12)]'
                      : 'bg-white/[0.02] border-white/[0.08] hover:border-white/[0.18] hover:bg-white/[0.04]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Target className={`w-4 h-4 ${alertStrategyScope === 'psi' ? 'text-cyan-400' : 'text-white/40'}`} />
                        <span className="text-xs font-bold text-white">PSI Strategy Only</span>
                      </div>
                      <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">
                        PSI
                      </span>
                    </div>
                    <p className="text-[11px] text-white/40 leading-relaxed">
                      Only trigger alerts and opportunities from the multi-indicator PSI inflection and consensus engine.
                    </p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="text-[9px] font-mono text-white/30">Scope: PSI Rules</span>
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      alertStrategyScope === 'psi' ? 'border-cyan-400 bg-cyan-400' : 'border-white/30'
                    }`}>
                      {alertStrategyScope === 'psi' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                    </div>
                  </div>
                </div>

                {/* 3. PSI V2 Strategy */}
                <div
                  onClick={() => handleStrategyScopeChange('psi_v2')}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                    alertStrategyScope === 'psi_v2'
                      ? 'bg-emerald-500/10 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.12)]'
                      : 'bg-white/[0.02] border-white/[0.08] hover:border-white/[0.18] hover:bg-white/[0.04]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Compass className={`w-4 h-4 ${alertStrategyScope === 'psi_v2' ? 'text-emerald-400' : 'text-white/40'}`} />
                        <span className="text-xs font-bold text-white">PSI V2 Strategy Only</span>
                      </div>
                      <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                        PSI V2
                      </span>
                    </div>
                    <p className="text-[11px] text-white/40 leading-relaxed">
                      Only trigger alerts and opportunities from the 3-PSI Vector Architecture (PSI Zone & Up/Down Momentum).
                    </p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="text-[9px] font-mono text-white/30">Scope: 3-PSI Vector</span>
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      alertStrategyScope === 'psi_v2' ? 'border-emerald-400 bg-emerald-400' : 'border-white/30'
                    }`}>
                      {alertStrategyScope === 'psi_v2' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                    </div>
                  </div>
                </div>

                {/* 4. Thoth EGX Macro */}
                <div
                  onClick={() => handleStrategyScopeChange('thoth_egx_macro')}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                    alertStrategyScope === 'thoth_egx_macro'
                      ? 'bg-purple-500/10 border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.12)]'
                      : 'bg-white/[0.02] border-white/[0.08] hover:border-white/[0.18] hover:bg-white/[0.04]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Cpu className={`w-4 h-4 ${alertStrategyScope === 'thoth_egx_macro' ? 'text-purple-400' : 'text-white/40'}`} />
                        <span className="text-xs font-bold text-white">Thoth EGX Macro Only</span>
                      </div>
                      <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/25">
                        Deep Learning
                      </span>
                    </div>
                    <p className="text-[11px] text-white/40 leading-relaxed">
                      Only trigger alerts and opportunities from the Thoth Transformer Exhaustion Prediction model.
                    </p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="text-[9px] font-mono text-white/30">Scope: AI Model</span>
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      alertStrategyScope === 'thoth_egx_macro' ? 'border-purple-400 bg-purple-400' : 'border-white/30'
                    }`}>
                      {alertStrategyScope === 'thoth_egx_macro' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Monitored Tickers Card */}
            <div className="border border-white/[0.09] rounded-md bg-black p-6">
              {/* Header & Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/[0.08]">
                <div>
                  <h2 className="text-[13px] font-medium text-white tracking-[-0.02em]">Monitored Tickers & Trigger Subscriptions</h2>
                  <p className="mt-1 text-xs text-white/40">
                    Open positions are automatically monitored for buy/sell/stop signals. You can also add custom watch alerts for other stocks.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium text-black bg-white hover:bg-white/90 transition-all shrink-0"
                >
                  <Plus size={14} />
                  <span>Add Ticker Alert</span>
                </button>
              </div>

              {/* Filters & Search Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-1 bg-white/[0.03] p-0.5 rounded-md border border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setTickerFilter('ALL')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                      tickerFilter === 'ALL'
                        ? 'bg-white/[0.12] text-white shadow-sm font-semibold'
                        : 'text-white/40 hover:text-white/80'
                    }`}
                  >
                    All ({monitoredTickers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTickerFilter('POSITIONS')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                      tickerFilter === 'POSITIONS'
                        ? 'bg-white/[0.12] text-white shadow-sm font-semibold'
                        : 'text-white/40 hover:text-white/80'
                    }`}
                  >
                    Active Holdings ({monitoredTickers.filter((t) => t.isPosition).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTickerFilter('ALERTS')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                      tickerFilter === 'ALERTS'
                        ? 'bg-white/[0.12] text-white shadow-sm font-semibold'
                        : 'text-white/40 hover:text-white/80'
                    }`}
                  >
                    Custom Watch ({monitoredTickers.filter((t) => t.isExplicitAlert).length})
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search symbol, company..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-md bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-white/25 focus:outline-none focus:border-white/20 transition-colors font-mono"
                  />
                </div>
              </div>

              {/* Mobile View: Clean Card List */}
              <div className="md:hidden divide-y divide-white/[0.04]">
                {filteredMonitoredTickers.length === 0 ? (
                  <div className="py-8 text-center text-white/30 text-xs">
                    No monitored tickers found matching the current filter.
                  </div>
                ) : (
                  filteredMonitoredTickers.map((ticker) => (
                    <div key={ticker.symbol} className="py-3.5 space-y-2">
                      {/* Top Row: Symbol, Company & Price */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <TickerLogo symbol={ticker.symbol} logoUrl={ticker.logoUrl} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-xs text-white">{ticker.symbol}</span>
                              <span className="text-[10px] font-mono text-white/35 px-1.5 py-0.2 rounded bg-white/[0.03] border border-white/[0.05] truncate max-w-[110px]">
                                {ticker.sector}
                              </span>
                            </div>
                            <span className="text-[11px] text-white/40 truncate block mt-0.5">
                              {ticker.companyName}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-mono text-xs font-semibold text-white/90">
                            {ticker.currentPrice ? `${ticker.currentPrice.toFixed(2)} EGP` : '—'}
                          </div>
                          {ticker.isPosition ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-[#22c55e] font-mono font-medium mt-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                              Always ON
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleAlert(ticker.symbol, ticker.alertEnabled)}
                              disabled={togglingSymbol === ticker.symbol}
                              className={`mt-0.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-all ${
                                ticker.alertEnabled
                                  ? 'bg-[#22c55e]/10 border border-[#22c55e]/25 text-[#22c55e]'
                                  : 'bg-white/[0.03] border border-white/[0.08] text-white/40'
                              }`}
                            >
                              {ticker.alertEnabled ? 'Active' : 'Muted'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Bottom Row: Badges & Quick Actions */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.03]">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {ticker.isPosition && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium whitespace-nowrap bg-plt-profit/10 border border-plt-profit/20 text-plt-profit">
                              <Lock size={10} />
                              Active Holding
                            </span>
                          )}
                          {ticker.isExplicitAlert && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium whitespace-nowrap bg-white/[0.06] border border-white/[0.12] text-white/80">
                              <Bell size={10} />
                              Custom Alert
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Link
                            href={`/invest?ticker=${ticker.symbol}&view=chart`}
                            className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
                            title="Open in Invest"
                          >
                            <TrendingUp size={14} />
                          </Link>

                          {ticker.isExplicitAlert && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomAlert(ticker.symbol)}
                              disabled={togglingSymbol === ticker.symbol}
                              className="p-1.5 rounded text-white/30 hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
                              title="Remove Alert"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop View: Monitored Tickers Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[11px] font-medium text-white/35">
                      <th className="py-2.5 px-3">Ticker</th>
                      <th className="py-2.5 px-3">Sector</th>
                      <th className="py-2.5 px-3">Monitoring Type</th>
                      <th className="py-2.5 px-3 text-right">Current Price</th>
                      <th className="py-2.5 px-3 text-center">Alert Trigger</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredMonitoredTickers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-white/30 text-xs">
                          No monitored tickers found matching the current filter.
                        </td>
                      </tr>
                    ) : (
                      filteredMonitoredTickers.map((ticker) => (
                        <tr key={ticker.symbol} className="hover:bg-white/[0.02] transition-colors group">
                          {/* Ticker & Company */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <TickerLogo symbol={ticker.symbol} logoUrl={ticker.logoUrl} />
                              <div>
                                <span className="font-mono font-semibold text-white block">{ticker.symbol}</span>
                                <span className="text-[11px] text-white/40 truncate max-w-[160px] block">
                                  {ticker.companyName}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Sector */}
                          <td className="py-3 px-3 text-white/50 truncate max-w-[140px]">{ticker.sector}</td>

                          {/* Monitoring Type Badge */}
                          <td className="py-3 px-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {ticker.isPosition && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium whitespace-nowrap bg-plt-profit/10 border border-plt-profit/20 text-plt-profit">
                                  <Lock size={10} />
                                  Active Holding
                                </span>
                              )}
                              {ticker.isExplicitAlert && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium whitespace-nowrap bg-white/[0.06] border border-white/[0.12] text-white/80">
                                  <Bell size={10} />
                                  Custom Alert
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Current Price */}
                          <td className="py-3 px-3 text-right font-mono font-medium text-white/90">
                            {ticker.currentPrice ? `${ticker.currentPrice.toFixed(2)} EGP` : '—'}
                          </td>

                          {/* Alert Trigger Status Toggle */}
                          <td className="py-3 px-3 text-center">
                            {ticker.isPosition ? (
                              <span className="inline-flex items-center gap-1.5 text-[11px] text-[#22c55e] font-mono font-medium whitespace-nowrap" title="Auto-enabled for open portfolio holding">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                                Always ON
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleAlert(ticker.symbol, ticker.alertEnabled)}
                                disabled={togglingSymbol === ticker.symbol}
                                className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-all whitespace-nowrap ${
                                  ticker.alertEnabled
                                    ? 'bg-[#22c55e]/10 border border-[#22c55e]/25 text-[#22c55e] hover:bg-[#22c55e]/20'
                                    : 'bg-white/[0.03] border border-white/[0.08] text-white/40 hover:text-white/70'
                                }`}
                              >
                                {ticker.alertEnabled ? 'Active' : 'Muted'}
                              </button>
                            )}
                          </td>

                          {/* Quick Actions */}
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/invest?ticker=${ticker.symbol}&view=chart`}
                                className="p-1 rounded text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
                                title="Open in Invest"
                              >
                                <TrendingUp size={14} />
                              </Link>

                              {ticker.isExplicitAlert && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustomAlert(ticker.symbol)}
                                  disabled={togglingSymbol === ticker.symbol}
                                  className="p-1 rounded text-white/30 hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
                                  title="Remove Alert"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </div>
      </div>

      {/* Add Alert Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-md bg-[#0a0a0a] border border-white/[0.12] shadow-2xl p-5 flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-white/80" />
                  <h3 className="text-sm font-medium text-white">Add Stock Trigger Alert</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-white/40 hover:text-white p-1"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="my-4 relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  value={addSearchQuery}
                  onChange={(e) => setAddSearchQuery(e.target.value)}
                  placeholder="Search by EGX symbol or company..."
                  className="w-full pl-8 pr-3 py-2 rounded-md bg-white/[0.04] border border-white/[0.09] text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/20 font-mono"
                  autoFocus
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 pr-1 divide-y divide-white/[0.04]">
                {addModalSearchResults.map((t) => {
                  const isAlreadyMonitored = monitoredTickers.some((m) => m.symbol === t.symbol && m.alertEnabled);

                  return (
                    <div
                      key={t.symbol}
                      className="pt-2 pb-2 flex items-center justify-between gap-3 hover:bg-white/[0.02] px-2 rounded-md transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <TickerLogo symbol={t.symbol} logoUrl={t.logoUrl} />
                        <div className="min-w-0">
                          <span className="font-mono font-semibold text-xs text-white block">{t.symbol}</span>
                          <span className="text-[11px] text-white/40 truncate block">{t.companyName}</span>
                        </div>
                      </div>

                      {isAlreadyMonitored ? (
                        <span className="text-[11px] font-mono text-[#22c55e] px-2 py-1 bg-[#22c55e]/10 rounded border border-[#22c55e]/20 shrink-0">
                          Subscribed
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddAlert(t)}
                          disabled={togglingSymbol === t.symbol}
                          className="px-3 py-1 rounded bg-white hover:bg-white/90 text-black text-xs font-medium shrink-0 transition-colors"
                        >
                          + Add Alert
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
