# Public Pages Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide complete, seamless bilingual English and Arabic localization across all public-facing pages of Ticknal (Landing Page, Compliance & Legal Pages, Authentication, and Public Guest News Wire) with instant language switching and strict compliance with platform design tokens.

**Architecture:**
- Leverage the existing unified `useTranslation` hook and `LocaleProvider` context (`src/lib/i18n`).
- Extend `src/lib/i18n/types.ts`, `en.json`, and `ar.json` with a dedicated, typed `landing` namespace for navigation anchors, headers, and shared public action labels.
- In components containing rich editorial or statutory content (`LandingWorkflowPipeline`, `LandingPricingSection`, `LandingFaqSection`, and legal pages `/compliance`, `/contact`, `/disclaimer`, `/privacy`, `/terms`), implement structured bilingual dictionaries or localized content structures keyed by `locale === 'ar'`, maintaining clean component decomposition and zero hydration mismatches.
- Ensure strict adherence to typography (Cairo `--font-cairo` for Arabic, Geist `font-sans` for English, zero `font-mono`), surface colors (pure black `#000000` / `bg-transparent`), and directional layout mirroring (`isRTL`, `rtl:rotate-180`, direction-aware border-radii).

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind CSS, Framer Motion, TypeScript, `@/lib/i18n` with cookie and `localStorage` persistence.

**Spec:** User request: "can you please check the landing page and its related pages (public pages) and prepare a plan to localize them" + `AGENTS.md` project rules.

## Global Constraints
- Arabic font must strictly be Cairo (`--font-cairo`), English is Geist Sans (`font-sans`).
- Zero `font-mono` anywhere in UI text; use sans-serif with `tabular-nums` for numeric alignment.
- Pure pitch black (`#000000` / `bg-black`) or `bg-transparent` surfaces only; no elevated gray backgrounds and no blue/navy dark tints.
- Brand Wordmark & Logo Typography: `EuclidCircularSemibold` via `<TicknalBrand />`, weight 600, all lowercase `ticknal`, tracking `-0.04em`, `leading-none`.
- Strict Verification Gate: Before concluding any task, run `cmd /c npx tsc --noEmit` and `cmd /c npm run build` exiting with code 0.

## Review Focus
1. **Language switcher synchronization**: toggling language in `LandingNavbar` must call `setLocale('ar' | 'en')` from `useTranslation()`, write the `ticknal_locale` cookie, update `document.documentElement.lang` and `dir="rtl"|"ltr"`, and immediately re-render without reload glitches.
2. **RTL Layout and Geometry Mirroring**: verify that directional clip paths (Hero CTA button slash angle), asymmetrical borders (Footer capsule curve), and icons (Chevrons, Next step arrows) correctly flip when switching to Arabic.
3. **Typography discipline**: verify that no Arabic string renders in fallback monospace or serif and that numeric values retain `tabular-nums` alignment without `font-mono`.
4. **Hydration safety**: ensure client components using locale or cookies do not cause Next.js SSR hydration mismatches.
5. **Legal accuracy**: ensure Egyptian statutory legal terms (FRA regulations, Law 151/2020 on Data Protection, Law 95/1992 on Capital Markets) are accurately translated and cited in Arabic.

---

### Task 1: Connect `LandingNavbar` to `useTranslation()` & Extend i18n Dictionaries for Landing Navigation & Common Public Tokens

**Files:**
- Modify: `src/lib/i18n/types.ts`
- Modify: `src/lib/i18n/dictionaries/en.json`
- Modify: `src/lib/i18n/dictionaries/ar.json`
- Modify: `src/components/landing/LandingNavbar.tsx`

**Interfaces:**
- Consumes: `useTranslation()` from `@/lib/i18n` (`{ locale, setLocale, isRTL, t }`)
- Produces: Typed `landing` namespace in `Dictionary` (`types.ts`) with navigation anchors ('markets', 'assets', 'workflow', 'brokers', 'pricing', 'faq', 'getStarted', 'signIn')

- [ ] **Step 1: Extend `Dictionary` interface in `src/lib/i18n/types.ts`**
  Add `landing` namespace with keys for navbar items, section titles, and action pills:
  ```typescript
  landing: {
    navMarkets: string;
    navAssets: string;
    navWorkflow: string;
    navBrokers: string;
    navPricing: string;
    navFaq: string;
    navGetStarted: string;
    navSignIn: string;
  };
  ```

- [ ] **Step 2: Add English and Arabic translations in `en.json` and `ar.json`**
  In `en.json`:
  ```json
  "landing": {
    "navMarkets": "Markets",
    "navAssets": "Assets",
    "navWorkflow": "Workflow",
    "navBrokers": "Brokers",
    "navPricing": "Pricing",
    "navFaq": "FAQ",
    "navGetStarted": "Get started",
    "navSignIn": "Sign In"
  }
  ```
  In `ar.json`:
  ```json
  "landing": {
    "navMarkets": "الأسواق",
    "navAssets": "الأصول",
    "navWorkflow": "آلية العمل",
    "navBrokers": "شركات الوساطة",
    "navPricing": "الأسعار",
    "navFaq": "الأسئلة الشائعة",
    "navGetStarted": "ابدأ الآن",
    "navSignIn": "تسجيل الدخول"
  }
  ```

- [ ] **Step 3: Update `LandingNavbar.tsx` to use `useTranslation`**
  - Replace local `useState<'EN' | 'AR'>` with `const { locale, setLocale, isRTL, t } = useTranslation()`.
  - Connect language toggle button to call `setLocale(locale === 'ar' ? 'en' : 'ar')`.
  - Display `'العربية'` or `'EN'` indicator depending on active language.
  - Localize the nav links and action buttons using `t('landing.navMarkets')`, etc.
  - Add RTL direction classes for padding and separators.

- [ ] **Step 4: Verify typecheck**
  Run: `powershell -Command "npx tsc --noEmit"`
  Expected: Exits with code 0.

- [ ] **Step 5: Commit changes**
  ```bash
  git add src/lib/i18n/types.ts src/lib/i18n/dictionaries/en.json src/lib/i18n/dictionaries/ar.json src/components/landing/LandingNavbar.tsx
  git commit -m "feat(i18n): connect landing navbar to global translation context"
  ```

---

### Task 2: Localize Landing Hero, Live Ticker Marquee, and Device Stage

**Files:**
- Modify: `src/components/landing/LandingHero.tsx`
- Modify: `src/components/landing/LandingTickerMarquee.tsx`
- Modify: `src/components/landing/LandingDeviceStage.tsx`

**Interfaces:**
- Consumes: `useTranslation()` from `@/lib/i18n` (`{ locale, isRTL }`)
- Produces: Localized Hero typography, mirrored RTL polygon clip-path button, and localized marquee header with `tabular-nums` prices

- [ ] **Step 1: Localize `LandingHero.tsx`**
  - Inject `const { locale, isRTL } = useTranslation();`
  - Headline English: "Every Investment in Egypt. / In One Place."
  - Headline Arabic: "كل استثمار في مصر. / في منصة واحدة."
  - Subtitle English: "Institutional technical charting, quantitative signals, and real-time market intelligence — built for high-conviction Egyptian traders."
  - Subtitle Arabic: "رسوم بيانية مؤسسية، إشارات كمية متطورة، وتحليلات فورية للسوق المصري — صُممت للمتداولين المحترفين في مصر."
  - CTA Button English: "Launch Terminal" / Arabic: "افتح منصة التداول"
  - Mirror clip-path and border-radius in RTL:
    `clipPath: isRTL ? 'polygon(10px 0%, 100% 0%, 100% 100%, 0% 100%)' : 'polygon(0% 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)'`
    `rounded-l-md rtl:rounded-l-none rtl:rounded-r-md pl-8 pr-10 rtl:pl-10 rtl:pr-8`

- [ ] **Step 2: Localize `LandingTickerMarquee.tsx`**
  - Inject `const { locale } = useTranslation();`
  - Header Title:
    - EN: "One Terminal for Every Asset in Egypt"
    - AR: "منصة واحدة لجميع الأصول الاستثمارية في مصر"
  - Header Subtitle:
    - EN: "Institutional analytics across 290+ EGX equities, 160+ investment funds, precious metals, and sovereign macro indicators."
    - AR: "تحليلات مؤسسية لأكثر من 290 سهماً بالبورصة المصرية، و160 صندوقاً استثمارياً، والمعادن الثمينة، والمؤشرات السيادية الكلية."
  - Pill Price Details: Ensure prices use `tabular-nums font-sans` and currency label adapts if rendered.

- [ ] **Step 3: Review `LandingDeviceStage.tsx`**
  - Ensure mockups maintain neutral status bar format (`tabular-nums`) and clean branding across both locales.

- [ ] **Step 4: Verify typecheck**
  Run: `powershell -Command "npx tsc --noEmit"`
  Expected: Exits with code 0.

- [ ] **Step 5: Commit changes**
  ```bash
  git add src/components/landing/LandingHero.tsx src/components/landing/LandingTickerMarquee.tsx src/components/landing/LandingDeviceStage.tsx
  git commit -m "feat(i18n): localize landing hero and marquee components with RTL mirroring"
  ```

---

### Task 3: Localize Landing Asset Coverage, Workflow Pipeline, and Broker Execution Sections

**Files:**
- Modify: `src/components/landing/LandingAssetCoverage.tsx`
- Modify: `src/components/landing/LandingWorkflowPipeline.tsx`
- Modify: `src/components/landing/LandingBrokerWorkflowSection.tsx`

**Interfaces:**
- Consumes: `useTranslation()` from `@/lib/i18n` (`{ locale, isRTL }`)
- Produces: Localized asset categories, 3-step pipeline accordion, and 3-phase broker execution cards

- [ ] **Step 1: Localize `LandingAssetCoverage.tsx`**
  - Inject `const { locale, isRTL } = useTranslation();`
  - Section Title:
    - EN: "One Interface. / Complete Market Coverage."
    - AR: "واجهة واحدة. / تغطية شاملة لكامل السوق."
  - Section Subtitle:
    - EN: "Track high-conviction Egyptian equities, mutual funds, and physical bullion with historical benchmarks and real-time pricing."
    - AR: "تابع الأسهم المصرية الواعدة، وصناديق الاستثمار، والسبائك الذهبية مع بيانات تاريخية وأسعار لحظية مباشرة."
  - Categories:
    - Equities: "Egyptian Equities" / "الأسهم المصرية" — "Top performing EGX stocks by monthly return" / "أفضل أسهم البورصة المصرية أداءً بالعائد الشهري" — CTA: "See all Egyptian stocks" / "عرض جميع الأسهم المصرية"
    - Funds: "Mutual & Money Market Funds" / "صناديق الاستثمار والسيولة" — "Top performing funds across Egyptian asset managers" / "أفضل الصناديق أداءً لدى مديري الأصول في مصر" — CTA: "See all mutual funds" / "عرض جميع صناديق الاستثمار"
    - Metals: "Physical Precious Metals" / "المعادن الثمينة والسبائك" — "Real-time Egyptian bullion prices" / "أسعار الذهب والفضة اللحظية في مصر" — CTA: "See all precious metals" / "عرض جميع المعادن والسبائك"
  - Mobile swipe indicator:
    - EN: "Swipe sideways to view more"
    - AR: "اسحب أفقياً لعرض المزيد"
  - Rotate Chevron icons: `rtl:rotate-180`.

- [ ] **Step 2: Localize `LandingWorkflowPipeline.tsx`**
  - Inject `const { locale, isRTL } = useTranslation();`
  - Section Title:
    - EN: "You Don't Have to Watch Everything."
    - AR: "لا داعي لمتابعة كل شاردة وواردة بنفسك."
  - Section Subtitle:
    - EN: "In three simple steps, Ticknal cuts through the daily noise and turns the entire Egyptian market into clear, effortless decisions."
    - AR: "في ثلاث خطوات واضحة، تفلتر المنصة الضوضاء اليومية وتحول بيانات السوق المصري إلى قرارات استثمارية دقيقة وحاسمة."
  - Step 1:
    - Title EN: "Spot the Trend in One Glance." / AR: "رصد الاتجاه بنظرة واحدة."
    - Desc EN: "Stop relying on unverified Facebook tips and Telegram rumors. Track institutional hot money in real-time—see whether Foreign, Arab, and Egyptian institutions are accumulating or offloading before you enter." / AR: "توقف عن الاعتماد على شائعات تيليجرام وتوصيات فيسبوك غير الموثقة. تتبع سيولة المؤسسات في الوقت الفعلي — واعرف توجهات المؤسسات الأجنبية والعربية والمصرية قبل دخول الصفقة."
    - Pills: ['Real-time Net Flow', 'Sector Breadth & Heatmap'] / ['صافي تدفقات السيولة الفورية', 'اتساع القطاعات والخريطة الحرارية']
  - Step 2:
    - Title EN: "Test Your Idea with Zero Code." / AR: "اختبر استراتيجيتك بدون كتابة سطر كود."
    - Desc EN: "Don't gamble your capital on a hunch. Pick from 50+ institutional indicators with point-and-click simplicity, and backtest your setup against 5+ years of Egyptian market data in seconds." / AR: "لا تخاطر برأس مالك على مجرد تخمين. اختر من بين أكثر من 50 مؤشراً فنياً مؤسسياً بنقرة زر، واختبر استراتيجيتك بأثر رجعي على بيانات البورصة المصرية لأكثر من 5 سنوات في ثوانٍ."
    - Pills: ['Point & Click Indicator Selection', 'Instant Win Rate & Profit Factor'] / ['اختيار المؤشرات بنقرة زر', 'نسبة النجاح وعامل الربح اللحظي']
  - Step 3:
    - Title EN: "Set It and Walk Away." / AR: "اضبط التنبيهات وانطلق."
    - Desc EN: "You don't have to stare at charts for hours. Define your rules once; Ticknal monitors the market 24/7 and delivers real-time push alerts to your phone the second a setup triggers." / AR: "لست مضطراً للجلوس لساعات أمام الشاشات. حدد شروط استراتيجيتك مرة واحدة، وتتولى المنصة مراقبة السوق على مدار الساعة وإرسال تنبيهات فورية لهاتفك فور تحقق الشروط."
    - Pills: ['24/7 Background Market Scanning', 'Instant Telegram & Push Notifications'] / ['مسح السوق المستمر على مدار الساعة', 'تنبيهات فورية عبر الهاتف وتيليجرام']
  - Step Badges: "Step 01" / "الخطوة 01", "{idx + 1} of {STEPS.length}" / "{idx + 1} من {STEPS.length}"
  - Next Button Arrow: `<ArrowRight className="w-4 h-4 rtl:rotate-180" />`

- [ ] **Step 3: Localize `LandingBrokerWorkflowSection.tsx`**
  - Inject `const { locale } = useTranslation();`
  - Section Title:
    - EN: "Ticknal gives you edge, Brokers Execute."
    - AR: "تمنحك المنصة التفوق التحليلي، ووسيطك يتولى التنفيذ."
  - Section Subtitle:
    - EN: "Ticknal acts as your strategy and decision engine. You retain complete capital custody and execute orders directly through the licensed Egyptian broker of your choice."
    - AR: "تعمل المنصة كمحرك لاستراتيجياتك وقراراتك الاستثمارية. تحتفظ بكامل الوصاية على أموالك وتنفذ صفقاتك بنفسك وبأمان عبر وسيطك المصري المرخص المفضل."
  - Phase 1:
    - Title EN: "Setup Your Strategies" / AR: "اضبط استراتيجياتك"
    - Desc EN: "Define technical indicators, entry triggers, and stop-loss rules on Ticknal with zero code. Backtest setups across 15+ years of Egyptian market data." / AR: "حدد المؤشرات الفنية، وإشارات الدخول، وقواعد وقف الخسارة بنقرة زر وبدون كود. اختبر الاستراتيجية على بيانات البورصة المصرية لأكثر من 15 عاماً."
  - Phase 2:
    - Title EN: "Get Real-Time Alerts" / AR: "احصل على تنبيهات فورية"
    - Desc EN: "Ticknal monitors 290+ EGX order books around the clock. The second your strategy conditions trigger, receive instant push and Telegram alerts." / AR: "تراقب المنصة دفاتر أوامر أكثر من 290 سهماً مصرياً طوال جلسات التداول. وفور تحقق شروط استراتيجيتك، تصلك تنبيهات لحظية عبر الهاتف وتيليجرام."
  - Phase 3:
    - Title EN: "Execute on Your Broker" / AR: "نفّذ عبر وسيطك المفضل"
    - Desc EN: "Execute trades yourself with 100% conviction directly on Thndr, Telda, EFG Hermes, or your preferred Egyptian broker. Your funds never leave your broker." / AR: "نفّذ أوامر الشراء والبيع بنفسك وبثقة تامة عبر ثندر (Thndr)، تيلدا (Telda)، هيرميس (EFG Hermes)، أو أي وسيط مصري مرخص. أموالك تبقى دائماً في حسابك لدى الوسيط."
  - Phase Badges: "Phase 0{idx + 1}" / "المرحلة 0{idx + 1}", "{idx + 1} of {total}" / "{idx + 1} من {total}"

- [ ] **Step 4: Verify typecheck**
  Run: `powershell -Command "npx tsc --noEmit"`
  Expected: Exits with code 0.

- [ ] **Step 5: Commit changes**
  ```bash
  git add src/components/landing/LandingAssetCoverage.tsx src/components/landing/LandingWorkflowPipeline.tsx src/components/landing/LandingBrokerWorkflowSection.tsx
  git commit -m "feat(i18n): localize asset coverage, workflow pipeline and broker execution sections"
  ```

---

### Task 4: Localize Landing Pricing Section, FAQ, Final CTA, and Asymmetric Footer

**Files:**
- Modify: `src/components/landing/LandingPricingSection.tsx`
- Modify: `src/components/landing/LandingFaqSection.tsx`
- Modify: `src/components/landing/LandingCtaSection.tsx`
- Modify: `src/components/landing/LandingFooter.tsx`

**Interfaces:**
- Consumes: `useTranslation()` from `@/lib/i18n` (`{ locale, isRTL, t }`)
- Produces: Bilingual pricing matrix with Egyptian Pound (ج.م / EGP) pricing, interactive FAQ, high-conviction CTA, and RTL-mirrored asymmetric footer capsule

- [ ] **Step 1: Localize `LandingPricingSection.tsx`**
  - Inject `const { locale, isRTL } = useTranslation();`
  - Section Title:
    - EN: "Invest with Conviction for Less Than One Bad Trade"
    - AR: "استثمر بثقة وتفوق بأقل من تكلفة صفقة خاسرة واحدة"
  - Section Subtitle:
    - EN: "Start free with full Egyptian market coverage. Upgrade to Plus for real-time alerts or Elite for institutional indicators."
    - AR: "ابدأ مجاناً مع تغطية شاملة لكامل السوق المصري. وقم بالترقية إلى Plus لتنبيهات فورية أو Elite للحصول على المؤشرات الكمية المؤسسية."
  - Billing Cycle Toggle: "Monthly" / "شهري", "Annual" / "سنوي", "Save up to 17%" / "وفر حتى 17%"
  - Tier details:
    - Free ("Starter"): "Free Forever" / "مجاني دائماً", "0 EGP" / "0 ج.م", "Everything you need to track the Egyptian market" / "كل ما تحتاجه لمتابعة حركة السوق المصري", CTA: "Get Started Free" / "ابدأ مجاناً الآن"
    - Plus: "Plus" / "Most Popular" / "الأكثر طلباً", "50 EGP / mo" / "50 ج.م / شهرياً", CTA: "Start 30-Day Free Trial" / "ابدأ فترة تجريبية مجانية لمدة 30 يوماً"
    - Elite: "Elite" / "Institutional Edge" / "التفوق المؤسسي", "95 EGP / mo" / "95 ج.م / شهرياً", CTA: "Start 30-Day Free Trial" / "ابدأ فترة تجريبية مجانية لمدة 30 يوماً"
  - Localize the entire `PRICING_FEATURES` list with English/Arabic labels and custom feature quantities.
  - Guarantees & Security Badges:
    - "30-Day Money-Back Guarantee" / "ضمان استرداد الأموال لمدة 30 يوماً"
    - "Secure local Egyptian payment methods: Fawry, Meeza, and Bank Cards" / "طرق دفع مصرية محلية آمنة وموثوقة: فوري، ميزة، والبطاقات البنكية"

- [ ] **Step 2: Localize `LandingFaqSection.tsx`**
  - Inject `const { locale } = useTranslation();`
  - Editorial note:
    - EN: "Got questions? We've answered the most common ones below. Still curious? Feel free to reach out to us directly – we're here to help."
    - AR: "لديك استفسار؟ أجبنا عن الأسئلة الأكثر شيوعاً أدناه. هل لديك سؤال آخر؟ يسعدنا دائماً تواصلك معنا مباشرة – نحن هنا لمساعدتك."
  - Buttons: "Get Started" / "ابدأ الآن", Tooltips for grid and scroll buttons.
  - All 6 FAQ items localized in Arabic with accurate regulatory wording (FRA compliance statement, freemium model, 290+ EGX coverage, no-code backtesting, real-time alerts).
  - Apply `text-left rtl:text-right` for editorial paragraphs and headers.

- [ ] **Step 3: Localize `LandingCtaSection.tsx`**
  - Inject `const { locale, isRTL } = useTranslation();`
  - Headline: "Your Next Trade Deserves Precision." / "صفقتك القادمة تستحق أقصى درجات الدقة."
  - Subtitle: "Join thousands of Egyptian investors using Ticknal to track 290+ equities, backtest quantitative strategies, and execute with conviction." / "انضم إلى آلاف المستثمرين في مصر الذين يستخدمون المنصة لمتابعة أكثر من 290 سهماً، واختبار الاستراتيجيات الكمية، والتنفيذ بأعلى درجات الثقة."
  - Google Button: "Continue with Google" / "المتابعة باستخدام Google"
  - Email Link: "Or register with email — Create free account" / "أو التسجيل عبر البريد الإلكتروني — أنشئ حساباً مجانياً"
  - Mobile App Banner: "Or download the mobile companion" / "أو حمّل التطبيق المرافق للهاتف"
  - Reassurance status rail:
    - "Instant Setup" / "تشغيل فوري"
    - "No Credit Card Required" / "لا حاجة لبطاقة ائتمان"
    - "Free Forever Tier" / "باقة مجانية مدى الحياة"
    - "Full Capital Custody" / "أمان كامل لأموالك"

- [ ] **Step 4: Localize `LandingFooter.tsx` and Mirror Asymmetric Capsule**
  - Inject `const { locale, isRTL } = useTranslation();`
  - Asymmetric Capsule Geometry in RTL:
    - LTR: `rounded-l-[36px] sm:rounded-l-[52px] lg:rounded-l-[9999px] rounded-r-none pl-4 ... pr-0` (flush on right)
    - RTL: `rounded-r-[36px] sm:rounded-r-[52px] lg:rounded-r-[9999px] rounded-l-none pr-4 ... pl-0` (flush on left)
  - Left Dome Tagline:
    - EN: "Financial intelligence for Egypt. One trade at a time!"
    - AR: "ذكاء مالي لمصر. صفقة تلو الأخرى!"
  - Copyright:
    - EN: "© {year} Ticknal Technologies S.A.E."
    - AR: "© {year} شركة تكنال للحلول التكنولوجية (ش.م.م)"
    - "Engineered for high-conviction Egyptian investors." / "صُممت خصيصاً للمستثمرين وأصحاب القرارات الحاسمة في مصر."
  - Column 1: "Platform" / "المنصة", "Markets Overview" / "نظرة عامة على الأسواق", "SuperCharts" / "الرسوم البيانية المتقدمة", "Market Wire" / "أخبار وبيانات السوق"
  - Column 2: "Support" / "الدعم والمساعدة", "Contact Us" / "تواصل معنا", "FRA Compliance" / "التوافق مع الرقابة المالية", "Privacy Policy" / "سياسة الخصوصية", "Terms of Service" / "شروط الخدمة", "Risk Disclosure" / "إخلاء المسؤولية والمخاطر"
  - Column 3: "Get the Latest from Ticknal." / "اشترك للحصول على آخر التحديثات.", Placeholder: "Email Address" / "البريد الإلكتروني", Button: "Subscribe" / "اشتراك", Success: "Joined" / "تم الاشتراك", "Follow Us" / "تابعنا"
  - Brand Wordmark: Keep lowercase `ticknal` in `EuclidCircularSemibold`.

- [ ] **Step 5: Verify typecheck**
  Run: `powershell -Command "npx tsc --noEmit"`
  Expected: Exits with code 0.

- [ ] **Step 6: Commit changes**
  ```bash
  git add src/components/landing/LandingPricingSection.tsx src/components/landing/LandingFaqSection.tsx src/components/landing/LandingCtaSection.tsx src/components/landing/LandingFooter.tsx
  git commit -m "feat(i18n): localize pricing, FAQ, CTA and footer with RTL geometry mirroring"
  ```

---

### Task 5: Localize Statutory Public Legal & Compliance Pages (`/compliance`, `/contact`, `/disclaimer`, `/privacy`, `/terms`)

**Files:**
- Modify: `src/app/compliance/page.tsx`
- Modify: `src/app/contact/page.tsx`
- Modify: `src/app/disclaimer/page.tsx`
- Modify: `src/app/privacy/page.tsx`
- Modify: `src/app/terms/page.tsx`

**Interfaces:**
- Consumes: `useTranslation()` from `@/lib/i18n` (`{ locale, isRTL }`)
- Produces: Complete bilingual legal documentation adhering to Egyptian Financial Regulatory Authority (FRA) requirements and Egyptian Data Protection Law 151/2020

- [ ] **Step 1: Localize `/compliance` (`src/app/compliance/page.tsx`)**
  - Inject `const { locale } = useTranslation();`
  - Breadcrumbs: Home / Legal & Regulatory / FRA Compliance Statement -> الرئيسية / الشؤون القانونية والتنظيمية / بيان التوافق مع الهيئة العامة للرقابة المالية
  - Badge: "Official Regulatory Statement • Arab Republic of Egypt" -> "بيان تنظيمي رسمي • جمهورية مصر العربية"
  - Hero Title: "Financial Regulatory Authority (FRA) Compliance Statement" -> "بيان التوافق مع الهيئة العامة للرقابة المالية (FRA)"
  - Executive summary 4 cards (Platform, Custody, Non-Advisory, Market Data).
  - Complete 7 statutory articles localized in authoritative Egyptian legal Arabic (Scope, Zero Fund Acceptance, No Robo-Advisory, No Brokerage Execution, EGX Data Disclosure, User Assumption of Risk, Legal Inquiries).

- [ ] **Step 2: Localize `/contact` (`src/app/contact/page.tsx`)**
  - Inject `const { locale } = useTranslation();`
  - Breadcrumbs: Home / Support / Contact & Inquiries -> الرئيسية / الدعم والمساعدة / التواصل والاستفسارات المؤسسية
  - Badge: "Official Communication Channels • Cairo, Egypt" -> "قنوات الاتصال الرسمية • القاهرة، مصر"
  - Hero Title: "Contact & Corporate Inquiries" -> "التواصل والاستفسارات المؤسسية"
  - 4 Department cards (Customer Care, Institutional Partnerships, Regulatory & Legal, Security & Bug Bounty).
  - Interactive Contact Form labels, placeholders, department dropdown, and submit button ("Send Inquiry" / "إرسال الاستفسار", "Inquiry Dispatched" / "تم إرسال استفسارك بنجاح").

- [ ] **Step 3: Localize `/disclaimer` (`src/app/disclaimer/page.tsx`)**
  - Inject `const { locale } = useTranslation();`
  - Breadcrumbs: Home / Legal & Regulatory / Risk Disclosure -> الرئيسية / الشؤون القانونية والتنظيمية / إخلاء المسؤولية وإفصاح المخاطر
  - Statutory Risk Disclosure Title & Articles:
    - High-risk nature of Egyptian equities and derivatives under Law 95/1992.
    - Hypothetical backtesting limitations and algorithmic performance disclaimer.
    - Independent financial advisory disclaimer.

- [ ] **Step 4: Localize `/privacy` (`src/app/privacy/page.tsx`)**
  - Inject `const { locale } = useTranslation();`
  - Breadcrumbs: Home / Legal & Regulatory / Privacy Policy -> الرئيسية / الشؤون القانونية والتنظيمية / سياسة الخصوصية
  - Statutory Data Protection Title & Articles conforming strictly to Egyptian Personal Data Protection Law No. 151 of 2020.
  - Data controller identity (Ticknal Technologies S.A.E.), data categories, encryption standards, user privacy rights, and revocation procedures.

- [ ] **Step 5: Localize `/terms` (`src/app/terms/page.tsx`)**
  - Inject `const { locale } = useTranslation();`
  - Breadcrumbs: Home / Legal & Regulatory / Terms of Service -> الرئيسية / الشؤون القانونية والتنظيمية / شروط وأحكام الخدمة
  - Complete Terms of Service covering subscription plans, intellectual property, account security, termination, and Cairo Courts exclusive jurisdiction.

- [ ] **Step 6: Verify typecheck**
  Run: `powershell -Command "npx tsc --noEmit"`
  Expected: Exits with code 0.

- [ ] **Step 7: Commit changes**
  ```bash
  git add src/app/compliance/page.tsx src/app/contact/page.tsx src/app/disclaimer/page.tsx src/app/privacy/page.tsx src/app/terms/page.tsx
  git commit -m "feat(i18n): localize compliance, contact, disclaimer, privacy and terms legal pages"
  ```

---

### Task 6: Localize Authentication Entry & Public Guest Market Wire (`/login`, `/signup`, `/news`)

**Files:**
- Modify: `src/components/auth/LoginRightAuthPanel.tsx`
- Modify: `src/components/auth/LoginLeftArtPanel.tsx`
- Modify: `src/app/signup/page.tsx`
- Modify: `src/components/platform/news/widgets/NewsFeedTimeline.tsx`

**Interfaces:**
- Consumes: `useTranslation()` from `@/lib/i18n` (`{ locale, isRTL }`)
- Produces: Fully localized login and signup entry views with translated customer review quotes and empty state handling in the guest market wire

- [ ] **Step 1: Localize `LoginRightAuthPanel.tsx`**
  - Inject `const { locale, isRTL } = useTranslation();`
  - Header back link: "Home" / "الرئيسية", rotate chevron in RTL: `rtl:rotate-180`.
  - Main Title: "Sign In or Join Now!" / "تسجيل الدخول أو إنشاء حساب جديد"
  - Subtitle: "login or create your ticknal account." / "سجّل الدخول أو أنشئ حسابك في تكنال."
  - Google button: "Continue with Google" / "المتابعة باستخدام Google"
  - Spinner label: "Connecting to Google..." / "جارٍ الاتصال بـ Google..."
  - Terms and Privacy disclaimer:
    - EN: "By clicking continue, you agree to our Terms of Service and Privacy Policy"
    - AR: "بالمتابعة، أنت توافق على شروط الخدمة وسياسة الخصوصية الخاصة بنا."

- [ ] **Step 2: Localize `LoginLeftArtPanel.tsx`**
  - Inject `const { locale } = useTranslation();`
  - Add Arabic quotes and roles for the customer reviews:
    - Ali Hassan (Portfolio Manager) -> علي حسن (مدير محافظ استثمارية)
    - Sarah Jenkins (Active Swing Trader) -> سارة جنكينز (متداولة نشطة)
    - Omar Tarek (Investment Analyst) -> عمر طارق (محلل استثماري)
    - Marcus Vance (Private Wealth Investor) -> ماركوس فانس (مستثمر إدارة ثروات)
  - Directional border: `border-r border-white/[0.08] rtl:border-r-0 rtl:border-l`.

- [ ] **Step 3: Update `src/app/signup/page.tsx`**
  - Add localized loading label for registration redirect:
    `label={locale === 'ar' ? 'جارٍ فتح التسجيل...' : 'Opening registration...'}`

- [ ] **Step 4: Localize empty states in `NewsFeedTimeline.tsx`**
  - Inject `const { locale } = useTranslation();`
  - Title: "No market posts found" / "لم يتم العثور على منشورات في السوق"
  - Desc: "No filings match your active filters. Try searching a different keyword or resetting your feed." / "لا توجد إفصاحات تطابق خيارات التصفية الحالية. جرّب كلمة بحث أخرى أو أعد ضبط التصفية."
  - Button: "Reset Feed Filters" / "إعادة ضبط التصفية"

- [ ] **Step 5: Verify typecheck**
  Run: `powershell -Command "npx tsc --noEmit"`
  Expected: Exits with code 0.

- [ ] **Step 6: Commit changes**
  ```bash
  git add src/components/auth/LoginRightAuthPanel.tsx src/components/auth/LoginLeftArtPanel.tsx src/app/signup/page.tsx src/components/platform/news/widgets/NewsFeedTimeline.tsx
  git commit -m "feat(i18n): localize auth screens and guest market wire feed"
  ```

---

### Task 7: Full System Verification Gate (Typechecking, Production Build, and Runtime Verification)

**Files:**
- Entire repository

**Interfaces:**
- Preconditions: All 6 preceding localization tasks implemented and individually committed
- Postconditions: Zero TypeScript errors, zero build errors, zero runtime exceptions

- [ ] **Step 1: Run TypeScript compiler check**
  Run: `powershell -Command "npx tsc --noEmit"`
  Expected: Exits with code 0 (no type errors).

- [ ] **Step 2: Run Production Next.js build**
  Run: `powershell -Command "npm run build"`
  Expected: Exits with code 0 (all routes compile and statically optimize without errors).

- [ ] **Step 3: Verify console and runtime health**
  - Verify that landing page `/` renders cleanly in both LTR (English) and RTL (Arabic).
  - Verify that language toggle persists cookie `ticknal_locale`.
  - Verify that legal pages (`/compliance`, `/contact`, `/disclaimer`, `/privacy`, `/terms`) load with proper typography and layout.
  - Verify that auth pages (`/login`, `/signup`) and guest wire (`/news`) operate with zero hydration mismatches.
