'use client';

import React, { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
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
  const [imageError, setImageError] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUploadStatus, setAvatarUploadStatus] = useState<string | null>(null);
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
      const parts = userProfile.name.trim().split(/\s+/);
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return userProfile.name.slice(0, 2).toUpperCase();
    }
    return userProfile.email ? userProfile.email.slice(0, 2).toUpperCase() : 'TR';
  }, [userProfile.name, userProfile.email]);

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
      setImageError(false);
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
    <div className="w-full min-w-0 py-2">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
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
            {avatarUrl && !imageError ? (
              <img
                src={avatarUrl}
                alt={userProfile.name}
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
                className="w-16 h-16 shrink-0 aspect-square rounded-full object-cover bg-black group-hover:opacity-75 transition-opacity"
              />
            ) : (
              <div className="w-16 h-16 shrink-0 aspect-square rounded-full bg-white/[0.08] flex items-center justify-center text-lg font-bold text-white font-sans shadow-inner group-hover:opacity-75 transition-opacity">
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

            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-profit-num border-2 border-black" />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
              {userProfile.name}
            </h2>
            <p className="text-xs text-text-muted mt-0.5 truncate">{userProfile.email}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-text-muted">
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
                className="text-brand-blue hover:opacity-80 inline-flex items-center gap-1 cursor-pointer font-medium transition-colors"
              >
                <Camera size={11} />
                <span>{isUploadingAvatar ? 'Uploading...' : 'Change Photo'}</span>
              </button>
            </div>

            {avatarUploadStatus && (
              <div className="mt-2 text-[11px] text-profit-num font-sans flex items-center gap-1">
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
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-loss-num bg-loss-num/10 hover:bg-loss-num/20 border border-loss-num/30 transition-colors cursor-pointer shrink-0"
        >
          <LogOut size={14} />
          <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
        </button>
      </div>
    </div>
  );
}
