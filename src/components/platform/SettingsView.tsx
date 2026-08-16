'use client';

import { useState, useMemo, useEffect } from 'react';
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
  X
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAlerts } from '@/components/platform/AlertProvider';
import { containerStagger, itemFadeInUp } from '@/lib/motion';

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

export default function SettingsView({
  userProfile,
  initialDevices,
  initialMonitoredTickers,
  allTickers,
}: SettingsViewProps) {
  const router = useRouter();
  const { ensurePushSubscription, permission } = useAlerts();

  const [activeTab, setActiveTab] = useState<'profile' | 'devices' | 'alerts'>('profile');
  const [devices, setDevices] = useState<DeviceInfo[]>(initialDevices);
  const [monitoredTickers, setMonitoredTickers] = useState<MonitoredTicker[]>(initialMonitoredTickers);
  const [copiedUid, setCopiedUid] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [deletingDeviceId, setDeletingDeviceId] = useState<number | null>(null);

  // Search and Filter for Monitored Tickers
  const [tickerFilter, setTickerFilter] = useState<'ALL' | 'POSITIONS' | 'ALERTS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState('');
  const [togglingSymbol, setTogglingSymbol] = useState<string | null>(null);

  // Current client user agent
  const [clientUa, setClientUa] = useState<string>('');
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setClientUa(navigator.userAgent);
    }
  }, []);

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

  const handleEnablePush = async () => {
    setIsEnablingPush(true);
    setPushStatus(null);
    try {
      const res = await ensurePushSubscription();
      if (res.success) {
        setPushStatus('Notifications enabled successfully on this device!');
        // Refresh device list
        const devRes = await fetch('/api/push/subscribe');
        if (devRes.ok) {
          const data = await devRes.json();
          setDevices(data.subscriptions ?? []);
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
      className="flex h-full min-h-0 flex-col overflow-auto bg-transparent text-white pb-12 relative z-10"
    >
      {/* Top Header Banner */}
      <div className="border-b border-white/[0.09] px-6 py-5 shrink-0">
        <motion.div variants={itemFadeInUp} className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-plt-orange" />
              <h1 className="text-lg font-medium tracking-[-0.02em] text-white">Settings</h1>
            </div>
            <p className="mt-0.5 text-[13px] text-white/30">
              Account profile, active devices, and real-time market alert triggers
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium text-white/60 hover:text-white bg-white/[0.03] border border-white/[0.09] hover:border-white/[0.18] hover:bg-white/[0.06] transition-all"
            >
              <span>Dashboard</span>
              <span className="text-plt-orange">→</span>
            </Link>
            <Link
              href="/positions"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium text-white/60 hover:text-white bg-white/[0.03] border border-white/[0.09] hover:border-white/[0.18] hover:bg-white/[0.06] transition-all"
            >
              <span>Manage Positions</span>
              <span className="text-plt-orange">→</span>
            </Link>
            <Link
              href="/charts"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium text-white/60 hover:text-white bg-white/[0.03] border border-white/[0.09] hover:border-white/[0.18] hover:bg-white/[0.06] transition-all"
            >
              <span>Open Charts</span>
              <span className="text-plt-orange">→</span>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Main Settings Canvas */}
      <div className="p-4 md:p-6 space-y-6 w-full">
        {/* Navigation Tabs */}
        <motion.div variants={itemFadeInUp} className="flex items-center gap-2 border-b border-white/[0.09] pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'profile'
                ? 'bg-white/[0.10] text-white border border-white/[0.15] shadow-sm'
                : 'text-white/40 hover:text-white/80 hover:bg-white/[0.03]'
            }`}
          >
            <User size={14} className={activeTab === 'profile' ? 'text-plt-orange' : 'text-white/40'} />
            <span>Account Profile</span>
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
            <Smartphone size={14} className={activeTab === 'devices' ? 'text-plt-orange' : 'text-white/40'} />
            <span>Connected Devices</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/[0.06] text-white/60">
              {devices.length}
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
            <Bell size={14} className={activeTab === 'alerts' ? 'text-plt-orange' : 'text-white/40'} />
            <span>Monitored Tickers & Alerts</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/[0.06] text-white/60">
              {monitoredTickers.length}
            </span>
          </button>
        </motion.div>

        {/* TAB 1: ACCOUNT PROFILE */}
        {activeTab === 'profile' && (
          <motion.div variants={itemFadeInUp} className="space-y-6">
            {/* User Profile Card */}
            <div className="border border-white/[0.09] rounded-md bg-black p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-white/[0.08]">
                <div className="flex items-center gap-4">
                  {/* Avatar (Google profile picture or initials) */}
                  <div className="relative">
                    {userProfile.avatarUrl ? (
                      <img
                        src={userProfile.avatarUrl}
                        alt={userProfile.name}
                        className="w-16 h-16 rounded-full border-2 border-white/[0.12] object-cover bg-white/[0.04]"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full border border-white/[0.12] bg-gradient-to-tr from-white/[0.06] to-white/[0.12] flex items-center justify-center text-lg font-bold text-white font-mono shadow-inner">
                        {initials}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#22c55e] border-2 border-black" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-base font-semibold text-white tracking-tight">{userProfile.name}</h2>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e]">
                        <ShieldCheck size={11} />
                        Verified
                      </span>
                    </div>
                    <p className="text-xs text-white/40 mt-0.5">{userProfile.email}</p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-white/30">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        Member since {memberSince}
                      </span>
                      <span>•</span>
                      <span className="capitalize">Auth: {userProfile.provider}</span>
                    </div>
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
                  <div className="text-xs font-mono font-medium text-plt-orange">Automated PSI Triggers</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: CONNECTED DEVICES */}
        {activeTab === 'devices' && (
          <motion.div variants={itemFadeInUp} className="space-y-6">
            {/* Device Info Header Card */}
            <div className="border border-white/[0.09] rounded-md bg-black p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/[0.08]">
                <div>
                  <h2 className="text-[13px] font-medium text-white tracking-[-0.02em]">Registered Push Notification Devices</h2>
                  <p className="mt-1 text-xs text-white/40">
                    Devices subscribed to receive instantaneous trade triggers and stop-loss notifications.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleEnablePush}
                  disabled={isEnablingPush}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium text-white bg-plt-orange hover:bg-plt-orange/90 transition-all shrink-0"
                >
                  <Bell size={14} />
                  <span>{isEnablingPush ? 'Registering...' : 'Enable on This Device'}</span>
                </button>
              </div>

              {pushStatus && (
                <div className="mb-4 p-3 rounded-md bg-white/[0.03] border border-white/[0.08] text-xs text-white/70 flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-plt-orange shrink-0" />
                  <span>{pushStatus}</span>
                </div>
              )}

              {/* Devices Grid */}
              {devices.length === 0 ? (
                <div className="py-12 text-center text-xs text-white/35">
                  <Smartphone size={32} className="mx-auto mb-2 text-white/20" />
                  No devices currently registered for push notifications. Click &quot;Enable on This Device&quot; to receive live signals.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {devices.map((device) => {
                    const { browser, os, deviceType } = parseUserAgent(device.userAgent);
                    const isCurrent = clientUa && device.userAgent && clientUa.includes(device.userAgent.slice(0, 40));

                    const DeviceIcon = 
                      deviceType === 'mobile' ? Smartphone :
                      deviceType === 'tablet' ? Tablet :
                      deviceType === 'desktop' && os === 'macOS' ? Laptop :
                      Monitor;

                    return (
                      <div
                        key={device.id}
                        className="p-4 rounded-md bg-white/[0.02] border border-white/[0.08] flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-md bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/60 shrink-0">
                            <DeviceIcon size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-white">{browser} on {os}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#22c55e]">
                                  This Device
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-white/35 mt-0.5 font-mono">
                              Active since {new Date(device.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteDevice(device.id)}
                          disabled={deletingDeviceId === device.id}
                          className="p-1.5 rounded text-white/30 hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
                          title="Remove Device"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* TAB 3: MONITORED TICKERS & ALERTS */}
        {activeTab === 'alerts' && (
          <motion.div variants={itemFadeInUp} className="space-y-6">
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
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium text-white bg-plt-orange hover:bg-plt-orange/90 transition-all shrink-0"
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

              {/* Monitored Tickers Table */}
              <div className="overflow-x-auto">
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
                          <td className="py-3 px-3 text-white/50">{ticker.sector}</td>

                          {/* Monitoring Type Badge */}
                          <td className="py-3 px-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {ticker.isPosition && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-plt-orange/10 border border-plt-orange/20 text-plt-orange">
                                  <Lock size={10} />
                                  Active Holding
                                </span>
                              )}
                              {ticker.isExplicitAlert && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/[0.06] border border-white/[0.12] text-white/80">
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
                              <span className="inline-flex items-center gap-1.5 text-[11px] text-[#22c55e] font-mono font-medium" title="Auto-enabled for open portfolio holding">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                                Always ON
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleAlert(ticker.symbol, ticker.alertEnabled)}
                                disabled={togglingSymbol === ticker.symbol}
                                className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-all ${
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
                                href={`/charts?symbol=${ticker.symbol}`}
                                className="p-1 rounded text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
                                title="Open in Charts"
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
                  <Bell size={16} className="text-plt-orange" />
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
                          className="px-3 py-1 rounded bg-plt-orange hover:bg-plt-orange/90 text-white text-xs font-medium shrink-0 transition-colors"
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
