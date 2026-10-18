'use client';

import React from 'react';
import { motion } from 'framer-motion';
import SettingsHeader from './SettingsHeader';
import SettingsFloatingNav from './SettingsFloatingNav';
import UserProfileWidget, { type SettingsUserProfile } from './UserProfileWidget';
import PinSecurityCard from './PinSecurityCard';
import PushNotificationCard from './PushNotificationCard';
import PushDevicesWidget, { type DeviceInfo } from './PushDevicesWidget';
import LanguagePreferencesCard from './LanguagePreferencesCard';
import ThemePreferencesCard from './ThemePreferencesCard';
import { useTranslation } from '@/lib/i18n';
import { containerStagger, itemFadeInUp } from '@/lib/motion';
import { Tour, useTour } from '@/components/ui/tour';
import { getSettingsTourSteps, SETTINGS_TOUR_STORAGE_KEY } from '@/lib/tours/settings-tour-config';

export type { SettingsUserProfile, DeviceInfo };

interface SettingsPageViewProps {
  userProfile: SettingsUserProfile;
  initialDevices: DeviceInfo[];
}

export default function SettingsPageView({
  userProfile,
  initialDevices = [],
}: SettingsPageViewProps) {
  const { t, isRTL } = useTranslation();

  const tour = useTour(SETTINGS_TOUR_STORAGE_KEY);
  const tourSteps = React.useMemo(() => getSettingsTourSteps(isRTL), [isRTL]);
  const hasAutoStartedRef = React.useRef(false);

  // Auto-start Settings page walkthrough for first-time visitors (strictly once on mount)
  React.useEffect(() => {
    if (hasAutoStartedRef.current) return;
    hasAutoStartedRef.current = true;

    if (!tour.seen()) {
      const timer = setTimeout(() => {
        tour.start();
        tour.markSeen();
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [tour]);

  return (
    <div className="command-surface-page flex-1 h-full w-full max-w-full flex flex-col min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar bg-plt-base text-plt-text select-none font-sans">
      {/* 1. Header (Breadcrumbs & Actions) */}
      <div className="px-4 sm:px-6 pt-3 pb-1 shrink-0 bg-plt-base">
        <SettingsHeader onStartTour={tour.start} />
      </div>

      {/* 2. Sticky Floating Navigation Bar */}
      <div data-tour="settings-floating-nav" className="w-full">
        <SettingsFloatingNav devicesCount={initialDevices.length} />
      </div>

      {/* 3. Main Sections Stack (Single Continuous Long Page) */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerStagger}
        className="app-page page-sections-stack pb-28 md:pb-24 pt-2 space-y-10"
      >
        {/* SECTION 1: ACCOUNT PROFILE */}
        <motion.section
          id="section-profile"
          data-tour="settings-profile-section"
          variants={itemFadeInUp}
          className="section-container scroll-mt-20 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-border-subtle">
            <div className="flex flex-col gap-0.5">
              <h2 className="section-title">{t('settings.profileTitle')}</h2>
              <p className="section-subtitle">
                {t('settings.profileSubtitle')}
              </p>
            </div>
          </div>
          <UserProfileWidget userProfile={userProfile} />

          <div className="border-t border-border-subtle pt-4">
            <PushNotificationCard />
          </div>
        </motion.section>

        {/* SECTION 2: PREFERENCES, THEME & LANGUAGE */}
        <motion.section
          id="section-preferences"
          data-tour="settings-preferences-section"
          variants={itemFadeInUp}
          className="section-container scroll-mt-20 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-border-subtle">
            <div className="flex flex-col gap-0.5">
              <h2 className="section-title">{t('settings.languageTitle')}</h2>
              <p className="section-subtitle">
                {t('settings.languageSubtitle')}
              </p>
            </div>
          </div>
          <ThemePreferencesCard />
          <div className="border-t border-border-subtle pt-4">
            <LanguagePreferencesCard />
          </div>
        </motion.section>

        {/* SECTION 3: SECURITY & PASSCODE PIN */}
        <motion.section
          id="section-security"
          data-tour="settings-security-section"
          variants={itemFadeInUp}
          className="section-container scroll-mt-20 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-border-subtle">
            <div className="flex flex-col gap-0.5">
              <h2 className="section-title">{t('settings.securityTitle')}</h2>
              <p className="section-subtitle">
                {t('settings.securitySubtitle')}
              </p>
            </div>
          </div>
          <PinSecurityCard />
        </motion.section>

        {/* SECTION 4: CONNECTED DEVICES & NOTIFICATIONS */}
        <motion.section
          id="section-devices"
          data-tour="settings-devices-section"
          variants={itemFadeInUp}
          className="section-container scroll-mt-20 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-border-subtle">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <h2 className="section-title">{t('settings.devicesTitle')}</h2>
                {initialDevices.length > 0 && (
                  <span className="badge-count">{initialDevices.length}</span>
                )}
              </div>
              <p className="section-subtitle">
                {t('settings.devicesSubtitle')}
              </p>
            </div>
          </div>
          <PushDevicesWidget initialDevices={initialDevices} />
        </motion.section>
      </motion.div>

      {/* In-App Tour Walkthrough Portal */}
      <Tour
        steps={tourSteps}
        open={tour.open}
        onOpenChange={tour.setOpen}
        index={tour.index}
        onIndexChange={tour.setIndex}
        onFinish={tour.markSeen}
        onSkip={tour.markSeen}
        dark
      />
    </div>
  );
}
