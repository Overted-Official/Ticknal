import React from 'react';
import Skeleton from '@/components/ui/Skeleton';

export default function SettingsLoading() {
  return (
    <div className="command-surface-page flex-1 h-full w-full max-w-full flex flex-col min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar bg-black text-white select-none font-sans">
      {/* 1. Header (Breadcrumbs & Title Skeleton) */}
      <div className="px-4 sm:px-6 pt-3 pb-1 shrink-0 bg-black">
        <header className="flex items-center justify-between gap-4 select-none pb-1 font-sans">
          <div className="flex items-center gap-2">
            <div className="h-4 w-12 rounded-xs bg-white/[0.04] animate-pulse" />
            <span className="text-xs text-white/30">/</span>
            <div className="h-7 w-28 rounded-md bg-white/[0.08] animate-pulse" />
          </div>
        </header>
      </div>

      {/* 2. Floating Navigation Bar Skeleton */}
      <div className="sticky top-0 z-30 w-full py-2.5 sm:py-3 px-3 sm:px-6 pointer-events-none flex items-center justify-center">
        <div className="rounded-full border border-white/15 bg-black/90 backdrop-blur-xl p-1 sm:p-1.5 flex items-center gap-2">
          {['Profile', 'Preferences', 'Security', 'Devices'].map((tab) => (
            <div
              key={tab}
              className="h-7 w-20 sm:w-24 rounded-full bg-white/[0.06] animate-pulse"
            />
          ))}
        </div>
      </div>

      {/* 3. Main Sections Stack Skeleton */}
      <div className="app-page page-sections-stack pb-28 md:pb-24 pt-2 space-y-10 px-4 sm:px-6 max-w-4xl mx-auto w-full">
        {/* SECTION 1: ACCOUNT PROFILE SKELETON */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1 pb-2 border-b border-white/[0.06]">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3.5 w-64" />
          </div>

          <div className="border border-white/[0.08] p-5 rounded-2xl bg-black space-y-5">
            <div className="flex items-center gap-4">
              <Skeleton variant="circular" className="w-16 h-16 shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3.5 w-56" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-white/[0.06]">
              <div className="p-3 border border-white/[0.06] rounded-xl space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="p-3 border border-white/[0.06] rounded-xl space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: PREFERENCES SKELETON */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1 pb-2 border-b border-white/[0.06]">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3.5 w-72" />
          </div>

          <div className="border border-white/[0.08] p-5 rounded-2xl bg-black space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="p-4 border border-white/[0.06] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton variant="circular" className="h-4 w-4" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 3: SECURITY SKELETON */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1 pb-2 border-b border-white/[0.06]">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-60" />
          </div>

          <div className="border border-white/[0.08] p-5 rounded-2xl bg-black space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton variant="circular" className="w-10 h-10" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
              </div>
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
