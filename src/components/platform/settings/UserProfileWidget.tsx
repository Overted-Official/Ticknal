'use client';

import React, { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Calendar,
  Copy,
  Check,
  LogOut,
  Camera,
  Loader2,
  CheckCircle2,
} from '@/components/ui/icon-library';
import { createClient } from '@/lib/supabase/client';
import PinSecurityCard from './PinSecurityCard';

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

interface UserProfileWidgetProps {
  userProfile: SettingsUserProfile;
}

export default function UserProfileWidget({ userProfile }: UserProfileWidgetProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(userProfile.avatarUrl);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUploadStatus, setAvatarUploadStatus] = useState<string | null>(null);
  const [copiedUid, setCopiedUid] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const memberSince = useMemo(() => {
    try {
      return new Date(userProfile.createdAt).toLocaleDateString('en-US', {
        month: 'short',
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
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setAvatarUploadStatus('File size exceeds 2MB limit.');
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarUploadStatus(null);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

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

  return (
    <div className="w-full min-w-0 relative space-y-4">
      {/* Main Profile Card */}
      <div className="border border-white/[0.09] rounded-md bg-black p-5 sm:p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
            {/* Avatar with upload trigger */}
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

              <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-plt-profit border-2 border-plt-base" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-base font-semibold text-white tracking-tight truncate">{userProfile.name}</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-plt-profit-soft border border-plt-profit-border text-plt-profit shrink-0">
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
                  className="text-white/60 hover:text-white hover:underline inline-flex items-center gap-1 cursor-pointer"
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
            className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium text-plt-risk bg-plt-risk-soft hover:bg-plt-risk-soft border border-plt-risk-border transition-all cursor-pointer"
          >
            <LogOut size={14} />
            <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
          </button>
        </div>

        {/* Account Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-6">
          <div className="p-4 rounded-md bg-white/[0.02] border border-white/[0.06] min-w-0">
            <span className="text-[11px] font-medium text-white/35 block mb-1">Email Address</span>
            <div className="text-xs font-mono font-medium text-white/90 break-all">{userProfile.email}</div>
          </div>

          <div className="p-4 rounded-md bg-white/[0.02] border border-white/[0.06] min-w-0">
            <span className="text-[11px] font-medium text-white/35 block mb-1">User Account UID</span>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-white/60 truncate">{userProfile.id}</span>
              <button
                type="button"
                onClick={handleCopyUid}
                className="p-1 rounded text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors shrink-0 cursor-pointer"
                title="Copy User ID"
              >
                {copiedUid ? <Check size={13} className="text-plt-profit" /> : <Copy size={13} />}
              </button>
            </div>
          </div>

          <div className="p-4 rounded-md bg-white/[0.02] border border-white/[0.06] min-w-0">
            <span className="text-[11px] font-medium text-white/35 block mb-1">Portfolio Mode</span>
            <div className="text-xs font-mono font-medium text-plt-text">Automated PSI Triggers</div>
          </div>
        </div>
      </div>

      {/* Embedded PIN security widget */}
      <PinSecurityCard />
    </div>
  );
}
