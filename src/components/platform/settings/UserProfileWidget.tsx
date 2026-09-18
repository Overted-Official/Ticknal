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
      <div className="bg-[#121214] border border-[#27272a] rounded-xl p-5 sm:p-6 space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-[#222225]">
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
                  className="w-16 h-16 shrink-0 aspect-square rounded-full border-2 border-[#27272a] object-cover bg-[#18181b] group-hover:opacity-75 transition-opacity"
                />
              ) : (
                <div className="w-16 h-16 shrink-0 aspect-square rounded-full border border-[#27272a] bg-[#18181b] flex items-center justify-center text-lg font-bold text-white font-sans shadow-inner group-hover:opacity-75 transition-opacity">
                  {initials}
                </div>
              )}

              {/* Camera hover overlay */}
              <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                {isUploadingAvatar ? (
                  <Loader2 size={18} className="animate-spin text-white" />
                ) : (
                  <Camera size={18} className="text-white/90" />
                )}
              </div>

              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#089981] border-2 border-[#121214]" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">{userProfile.name}</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#089981]/10 border border-[#089981]/25 text-[#089981] shrink-0">
                  <ShieldCheck size={11} />
                  Verified
                </span>
              </div>
              <p className="text-xs text-[#787b86] mt-0.5 truncate">{userProfile.email}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-[#787b86]">
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
                  className="text-[#2962ff] hover:text-[#448aff] inline-flex items-center gap-1 cursor-pointer font-medium transition-colors"
                >
                  <Camera size={11} />
                  <span>{isUploadingAvatar ? 'Uploading...' : 'Change Photo'}</span>
                </button>
              </div>

              {avatarUploadStatus && (
                <div className="mt-2 text-[11px] text-[#089981] font-sans flex items-center gap-1">
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
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-[#f23645] bg-[#f23645]/10 hover:bg-[#f23645]/20 border border-[#f23645]/30 transition-colors cursor-pointer shrink-0"
          >
            <LogOut size={14} />
            <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
          </button>
        </div>

        {/* Account Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div className="p-3.5 sm:p-4 rounded-lg bg-[#18181b] border border-[#27272a] hover:border-[#3f3f46] transition-colors min-w-0">
            <span className="text-[11px] font-medium text-[#787b86] block mb-1">Email Address</span>
            <div className="text-xs font-sans font-semibold text-[#d1d4dc] break-all">{userProfile.email}</div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-lg bg-[#18181b] border border-[#27272a] hover:border-[#3f3f46] transition-colors min-w-0">
            <span className="text-[11px] font-medium text-[#787b86] block mb-1">User Account UID</span>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-[#d1d4dc] truncate">{userProfile.id}</span>
              <button
                type="button"
                onClick={handleCopyUid}
                className="p-1 rounded text-[#787b86] hover:text-white hover:bg-[#222226] transition-colors shrink-0 cursor-pointer"
                title="Copy User ID"
              >
                {copiedUid ? <Check size={13} className="text-[#089981]" /> : <Copy size={13} />}
              </button>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-lg bg-[#18181b] border border-[#27272a] hover:border-[#3f3f46] transition-colors min-w-0">
            <span className="text-[11px] font-medium text-[#787b86] block mb-1">Portfolio Mode</span>
            <div className="text-xs font-sans font-semibold text-[#d1d4dc]">Automated PSI Triggers</div>
          </div>
        </div>
      </div>
    </div>
  );
}
