import { TourStep } from '@/components/ui/tour';

export const SETTINGS_TOUR_STORAGE_KEY = 'ticknal_settings_tour_v1';

export function getSettingsTourSteps(isAr: boolean): TourStep[] {
  return [
    {
      target: '[data-tour="settings-floating-nav"]',
      title: isAr ? 'شريط التنقل السريع بين الإعدادات' : 'Settings Quick Navigator',
      content: isAr
        ? 'تنقل بسلاسة وبضغطة واحدة بين الملف الشخصي، تفضيلات اللغة والواجهة، رمز الحماية (PIN)، وإدارة الأجهزة المتصلة.'
        : 'Smoothly jump between your Account Profile, Language & Regional Preferences, Passcode PIN Security, and Connected Devices.',
      placement: 'bottom',
      padding: 10,
    },
    {
      target: '[data-tour="settings-profile-section"]',
      title: isAr ? 'الملف الشخصي وهوية الحساب' : 'Account Profile & Identity',
      content: isAr
        ? 'استعرض بيانات حسابك الموثقة، تاريخ الانضمام، مزود تسجيل الدخول، وتفعيل إشعارات المتصفح الفورية لتنبيهات الصفقات والأسعار.'
        : 'View your verified account details, member registration date, identity provider, and configure web push notifications for live market alerts.',
      placement: 'bottom',
      padding: 12,
    },
    {
      target: '[data-tour="settings-preferences-section"]',
      title: isAr ? 'تفضيلات اللغة والعرض الإقليمي' : 'Language & Regional Localization',
      content: isAr
        ? 'بدّل بسلاسة بين الواجهة العربية المتطورة (RTL) والإنجليزية (LTR)، مع تخصيص أسماء الأسهم وعرض العملات وأرقام الجداول.'
        : 'Instantly toggle between modern Arabic (RTL) and English (LTR) interface modes, custom financial numerals, and localized EGX symbol formatting.',
      placement: 'top',
      padding: 12,
    },
    {
      target: '[data-tour="settings-security-section"]',
      title: isAr ? 'رمز الأمان السري والخصوصية المالية' : 'Passcode PIN & Financial Privacy',
      content: isAr
        ? 'عيّن أو حدّث رمز الـ PIN المكوّن من 4 أرقام لحماية محفظتك الاستثمارية، وأرصدتك النقدية، وقفل الشاشة عند مغادرة جهازك.'
        : 'Set or update your 4-digit security PIN to lock your portfolio value, cash balances, and trade orders when leaving your screen unattended.',
      placement: 'top',
      padding: 12,
    },
    {
      target: '[data-tour="settings-devices-section"]',
      title: isAr ? 'الأجهزة المصرحة ورموز الإشعارات' : 'Authorized Devices & Push Tokens',
      content: isAr
        ? 'تحكم في المتصفحات وهواتف iPhone وأندرويد النشطة المرتبطة بحسابك والتي تستقبل إشعارات التنفيذ اللحظية وإشارات البورصة المصرية.'
        : 'Inspect and manage active browser sessions, iPhones, and Android devices paired to your account for instant push alert delivery.',
      placement: 'top',
      padding: 12,
    },
  ];
}
