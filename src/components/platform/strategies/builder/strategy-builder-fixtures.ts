export type BacktestGranularity = 'sector' | 'industryGroup' | 'industry' | 'ticker';
export type BacktestViewMode = 'heatmap' | 'table';
export type BacktestTimeframe = '1M' | '3M' | '6M' | 'YTD' | '1Y';

export interface StrategyProfile {
  readonly id: 'psi' | 'psi_v2' | 'hydra';
  readonly name: string;
  readonly shortName: string;
  readonly description: string;
  readonly coreSignals: readonly string[];
  readonly buyRule: string;
  readonly sellRule: string;
}

export interface BacktestRow {
  readonly id: string;
  readonly name: string;
  readonly returnPct: number;
  readonly alphaPct: number;
  readonly winRate: number;
  readonly trades: number;
}

export const ARABIC_ROW_NAMES: Readonly<Record<string, string>> = {
  banks: 'البنوك',
  'real-estate': 'العقارات',
  resources: 'الموارد الأساسية',
  financials: 'الخدمات المالية غير المصرفية',
  telecom: 'الاتصالات',
  food: 'الأغذية والمشروبات',
  healthcare: 'الرعاية الصحية',
  industrial: 'السلع الصناعية',
  'commercial-banks': 'البنوك التجارية',
  'property-developers': 'التطوير العقاري',
  'metals-mining': 'المعادن والتعدين',
  payments: 'المدفوعات والتكنولوجيا المالية',
  'mobile-telecom': 'اتصالات المحمول',
  'packaged-food': 'الأغذية المعبأة',
  pharma: 'الأدوية',
  engineering: 'الخدمات الهندسية',
  'universal-banks': 'البنوك الشاملة',
  residential: 'التطوير السكني',
  steel: 'منتجو الصلب',
  'digital-payments': 'المدفوعات الرقمية',
  wireless: 'الخدمات اللاسلكية',
  dairy: 'منتجات الألبان',
  'generic-drugs': 'الأدوية المثيلة',
  construction: 'الإنشاءات الثقيلة',
};

export const STRATEGY_PROFILES: readonly StrategyProfile[] = [
  {
    id: 'psi',
    name: 'Typhon Strategy',
    shortName: 'TYPHON',
    description: 'Cyclical and mean-reversion model built around the Master Index and median daily movement.',
    coreSignals: ['Master Index', 'Median Daily Move', 'ATR trailing range'],
    buyRule: 'Enters when the Master Index crosses one of its configured recovery levels.',
    sellRule: 'Exits at the AYM target or when the ATR profit-protection trail is reached.',
  },
  {
    id: 'psi_v2',
    name: 'Cerberus Strategy',
    shortName: 'CERBERUS',
    description: 'A stateful swing model that combines zone, upward momentum, and downward pressure.',
    coreSignals: ['PSI Zone', 'PSI Up', 'PSI Down', 'Regime direction'],
    buyRule: 'Requires a zone recovery together with enough upward PSI momentum.',
    sellRule: 'Responds to zone deterioration, downward PSI pressure, or its protective exits.',
  },
  {
    id: 'hydra',
    name: 'Hydra Strategy',
    shortName: 'HYDRA',
    description: 'Adaptive volatility and swing-regime model with momentum re-entry logic.',
    coreSignals: ['Fast EWMA regime', 'Adaptive volatility', 'Momentum re-entry', 'Exhaustion filter'],
    buyRule: 'Enters when the volatility regime and momentum re-entry conditions align.',
    sellRule: 'Uses an adaptive trailing stop and filters exhausted market states.',
  },
];

export const STRATEGY_PROFILE_ARABIC: Readonly<Record<StrategyProfile['id'], Omit<StrategyProfile, 'id' | 'shortName'>>> = {
  psi: {
    name: 'استراتيجية تايفون',
    description: 'نموذج دوري وارتداد إلى المتوسط يعتمد على المؤشر الرئيسي ومتوسط الحركة اليومية.',
    coreSignals: ['المؤشر الرئيسي', 'متوسط الحركة اليومية', 'نطاق ATR المتحرك'],
    buyRule: 'يدخل عندما يعبر المؤشر الرئيسي أحد مستويات التعافي المحددة.',
    sellRule: 'يخرج عند هدف AYM أو عند الوصول إلى مسار حماية الأرباح باستخدام ATR.',
  },
  psi_v2: {
    name: 'استراتيجية سيربيروس',
    description: 'نموذج تأرجح حالتي يجمع بين المنطقة والزخم الصاعد والضغط الهابط.',
    coreSignals: ['منطقة PSI', 'PSI الصاعد', 'PSI الهابط', 'اتجاه النظام'],
    buyRule: 'يتطلب تعافي المنطقة مع زخم صاعد كافٍ من PSI.',
    sellRule: 'يستجيب لتدهور المنطقة أو ضغط PSI الهابط أو مخارج الحماية.',
  },
  hydra: {
    name: 'استراتيجية هيدرا',
    description: 'نموذج تكيفي للتذبذب ونظام التأرجح مع منطق إعادة الدخول بالزخم.',
    coreSignals: ['نظام EWMA السريع', 'التذبذب التكيفي', 'إعادة الدخول بالزخم', 'مرشح الإرهاق'],
    buyRule: 'يدخل عندما تتوافق حالة التذبذب مع شروط إعادة الدخول بالزخم.',
    sellRule: 'يستخدم وقفاً متحركاً تكيفياً ويستبعد حالات السوق المرهقة.',
  },
};

const SECTORS: readonly BacktestRow[] = [
  { id: 'banks', name: 'Banks', returnPct: 24.6, alphaPct: 9.4, winRate: 68, trades: 22 },
  { id: 'real-estate', name: 'Real Estate', returnPct: 19.8, alphaPct: 6.2, winRate: 64, trades: 31 },
  { id: 'resources', name: 'Basic Resources', returnPct: 16.1, alphaPct: 4.7, winRate: 59, trades: 18 },
  { id: 'financials', name: 'Non-bank Financials', returnPct: 14.2, alphaPct: 2.9, winRate: 58, trades: 25 },
  { id: 'telecom', name: 'Telecommunications', returnPct: 11.6, alphaPct: 1.4, winRate: 57, trades: 12 },
  { id: 'food', name: 'Food & Beverages', returnPct: 8.4, alphaPct: -1.3, winRate: 52, trades: 17 },
  { id: 'healthcare', name: 'Healthcare', returnPct: 5.1, alphaPct: -3.8, winRate: 46, trades: 11 },
  { id: 'industrial', name: 'Industrial Goods', returnPct: -2.7, alphaPct: -7.1, winRate: 38, trades: 8 },
];

const INDUSTRY_GROUPS: readonly BacktestRow[] = [
  { id: 'commercial-banks', name: 'Commercial Banks', returnPct: 25.3, alphaPct: 10.1, winRate: 70, trades: 18 },
  { id: 'property-developers', name: 'Property Developers', returnPct: 21.4, alphaPct: 7.6, winRate: 65, trades: 24 },
  { id: 'metals-mining', name: 'Metals & Mining', returnPct: 18.7, alphaPct: 5.9, winRate: 62, trades: 14 },
  { id: 'payments', name: 'Payments & Fintech', returnPct: 15.8, alphaPct: 4.2, winRate: 61, trades: 9 },
  { id: 'mobile-telecom', name: 'Mobile Telecom', returnPct: 10.9, alphaPct: 0.8, winRate: 55, trades: 10 },
  { id: 'packaged-food', name: 'Packaged Food', returnPct: 7.2, alphaPct: -2.1, winRate: 49, trades: 12 },
  { id: 'pharma', name: 'Pharmaceuticals', returnPct: 3.8, alphaPct: -4.4, winRate: 44, trades: 10 },
  { id: 'engineering', name: 'Engineering Services', returnPct: -4.1, alphaPct: -8.6, winRate: 35, trades: 7 },
];

const INDUSTRIES: readonly BacktestRow[] = [
  { id: 'universal-banks', name: 'Universal Banks', returnPct: 26.1, alphaPct: 10.8, winRate: 71, trades: 16 },
  { id: 'residential', name: 'Residential Development', returnPct: 22.7, alphaPct: 8.9, winRate: 67, trades: 20 },
  { id: 'steel', name: 'Steel Producers', returnPct: 17.9, alphaPct: 5.1, winRate: 60, trades: 11 },
  { id: 'digital-payments', name: 'Digital Payments', returnPct: 16.4, alphaPct: 4.9, winRate: 63, trades: 8 },
  { id: 'wireless', name: 'Wireless Services', returnPct: 9.8, alphaPct: 0.3, winRate: 54, trades: 9 },
  { id: 'dairy', name: 'Dairy Products', returnPct: 6.5, alphaPct: -2.8, winRate: 47, trades: 8 },
  { id: 'generic-drugs', name: 'Generic Drugs', returnPct: 2.6, alphaPct: -5.2, winRate: 42, trades: 8 },
  { id: 'construction', name: 'Heavy Construction', returnPct: -5.6, alphaPct: -9.7, winRate: 33, trades: 6 },
];

const TICKERS: readonly BacktestRow[] = [
  { id: 'COMI', name: 'COMI', returnPct: 31.8, alphaPct: 14.2, winRate: 75, trades: 8 },
  { id: 'SWDY', name: 'SWDY', returnPct: 27.4, alphaPct: 12.1, winRate: 71, trades: 7 },
  { id: 'TMGH', name: 'TMGH', returnPct: 24.9, alphaPct: 9.6, winRate: 69, trades: 9 },
  { id: 'FWRY', name: 'FWRY', returnPct: 21.5, alphaPct: 8.3, winRate: 66, trades: 6 },
  { id: 'EAST', name: 'EAST', returnPct: 17.2, alphaPct: 5.4, winRate: 63, trades: 5 },
  { id: 'ABUK', name: 'ABUK', returnPct: 13.7, alphaPct: 3.1, winRate: 58, trades: 7 },
  { id: 'ETEL', name: 'ETEL', returnPct: 10.4, alphaPct: 0.7, winRate: 55, trades: 6 },
  { id: 'ORAS', name: 'ORAS', returnPct: 7.8, alphaPct: -1.6, winRate: 50, trades: 5 },
  { id: 'JUFO', name: 'JUFO', returnPct: 4.2, alphaPct: -3.5, winRate: 45, trades: 4 },
  { id: 'PHAR', name: 'PHAR', returnPct: -1.9, alphaPct: -6.4, winRate: 38, trades: 4 },
  { id: 'ORWE', name: 'ORWE', returnPct: -4.8, alphaPct: -9.1, winRate: 33, trades: 3 },
  { id: 'ESRS', name: 'ESRS', returnPct: -8.2, alphaPct: -12.5, winRate: 29, trades: 4 },
];

export interface BacktestTickerItem {
  readonly id: string;
  readonly symbol: string;
  readonly name: string;
  readonly nameAr: string;
  readonly returnPct: number;
  readonly alphaPct: number;
  readonly winRate: number;
  readonly trades: number;
  readonly endPrice: number;
  readonly logoUrl?: string | null;
}

export interface BacktestGroupItem {
  readonly id: string;
  readonly name: string;
  readonly nameAr: string;
  readonly returnPct: number;
  readonly alphaPct: number;
  readonly winRate: number;
  readonly trades: number;
  readonly tickers: readonly BacktestTickerItem[];
}

export const BACKTEST_GROUPS: readonly BacktestGroupItem[] = [
  {
    id: 'commercial-banks',
    name: 'Commercial Banks',
    nameAr: 'البنوك التجارية',
    returnPct: 25.3,
    alphaPct: 10.1,
    winRate: 70,
    trades: 18,
    tickers: [
      { id: 'COMI', symbol: 'COMI', name: 'Commercial Int\'l Bank', nameAr: 'البنك التجاري الدولي', returnPct: 31.8, alphaPct: 14.2, winRate: 75, trades: 8, endPrice: 82.0, logoUrl: 'https://s3-symbol-logo.tradingview.com/commercial-international-bank-egypt.svg' },
      { id: 'ADIB', symbol: 'ADIB', name: 'Abu Dhabi Islamic Bank', nameAr: 'مصرف أبوظبي الإسلامي', returnPct: 22.4, alphaPct: 8.5, winRate: 68, trades: 6, endPrice: 46.5, logoUrl: 'https://s3-symbol-logo.tradingview.com/abu-dhabi-islamic-bank-egypt.svg' },
      { id: 'QNBA', symbol: 'QNBA', name: 'QNB AlAhli', nameAr: 'بنك قطر الوطني', returnPct: 18.2, alphaPct: 6.1, winRate: 65, trades: 4, endPrice: 34.2, logoUrl: 'https://s3-symbol-logo.tradingview.com/qnb-alahli-sae.svg' },
    ],
  },
  {
    id: 'property-developers',
    name: 'Property Developers',
    nameAr: 'التطوير العقاري',
    returnPct: 21.4,
    alphaPct: 7.6,
    winRate: 65,
    trades: 24,
    tickers: [
      { id: 'TMGH', symbol: 'TMGH', name: 'Talaat Moustafa Group', nameAr: 'مجموعة طلعت مصطفى', returnPct: 24.9, alphaPct: 9.6, winRate: 69, trades: 9, endPrice: 61.8, logoUrl: 'https://s3-symbol-logo.tradingview.com/t-m-g.svg' },
      { id: 'PHDC', symbol: 'PHDC', name: 'Palm Hills', nameAr: 'بالم هيلز للتعمير', returnPct: 20.1, alphaPct: 7.3, winRate: 63, trades: 8, endPrice: 4.92, logoUrl: 'https://s3-symbol-logo.tradingview.com/palm-hills-developments-sae.svg' },
      { id: 'HELI', symbol: 'HELI', name: 'Heliopolis Housing', nameAr: 'مصر الجديدة للإسكان', returnPct: 16.8, alphaPct: 4.9, winRate: 60, trades: 7, endPrice: 11.45, logoUrl: 'https://s3-symbol-logo.tradingview.com/heliopolis-housing.svg' },
    ],
  },
  {
    id: 'metals-mining',
    name: 'Metals & Mining',
    nameAr: 'المعادن والتعدين',
    returnPct: 18.7,
    alphaPct: 5.9,
    winRate: 62,
    trades: 14,
    tickers: [
      { id: 'MICH', symbol: 'MICH', name: 'Misr Chemical Industries', nameAr: 'مصر لصناعة الكيماويات', returnPct: 28.6, alphaPct: 13.8, winRate: 72, trades: 6, endPrice: 38.0, logoUrl: 'https://s3-symbol-logo.tradingview.com/basic-materials--big.svg' },
      { id: 'IRON', symbol: 'IRON', name: 'Egyptian Iron & Steel', nameAr: 'الحديد والصلب المصرية', returnPct: 17.2, alphaPct: 5.4, winRate: 61, trades: 4, endPrice: 18.5, logoUrl: 'https://s3-symbol-logo.tradingview.com/basic-materials--big.svg' },
      { id: 'ESRS', symbol: 'ESRS', name: 'Ezz Steel', nameAr: 'حديد عز', returnPct: -8.2, alphaPct: -12.5, winRate: 29, trades: 4, endPrice: 92.0, logoUrl: 'https://s3-symbol-logo.tradingview.com/basic-materials--big.svg' },
    ],
  },
  {
    id: 'payments',
    name: 'Payments & Fintech',
    nameAr: 'المدفوعات والتكنولوجيا المالية',
    returnPct: 15.8,
    alphaPct: 4.2,
    winRate: 61,
    trades: 9,
    tickers: [
      { id: 'FWRY', symbol: 'FWRY', name: 'Fawry', nameAr: 'فوري لتكنولوجيا المدفوعات', returnPct: 21.5, alphaPct: 8.3, winRate: 66, trades: 6, endPrice: 9.2, logoUrl: 'https://s3-symbol-logo.tradingview.com/fawry-for-banking-technology-and-electronic-payment.svg' },
      { id: 'EFIN', symbol: 'EFIN', name: 'e-finance', nameAr: 'إي فاينانس للاستثمارات', returnPct: 12.4, alphaPct: 2.7, winRate: 58, trades: 3, endPrice: 24.1, logoUrl: 'https://s3-symbol-logo.tradingview.com/e-finance-for-digital-and-financial-investments.svg' },
    ],
  },
  {
    id: 'engineering',
    name: 'Engineering & Industrial',
    nameAr: 'الخدمات الهندسية والصناعية',
    returnPct: 10.2,
    alphaPct: 1.8,
    winRate: 51,
    trades: 15,
    tickers: [
      { id: 'SWDY', symbol: 'SWDY', name: 'Elsewedy Electric', nameAr: 'السويدي إليكتريك', returnPct: 27.4, alphaPct: 12.1, winRate: 71, trades: 7, endPrice: 68.5, logoUrl: 'https://s3-symbol-logo.tradingview.com/elswedy-electric.svg' },
      { id: 'ORAS', symbol: 'ORAS', name: 'Orascom Construction', nameAr: 'أوراسكوم للإنشاءات', returnPct: 7.8, alphaPct: -1.6, winRate: 50, trades: 5, endPrice: 245.0, logoUrl: 'https://s3-symbol-logo.tradingview.com/orascom-construction-plc.svg' },
      { id: 'ORWE', symbol: 'ORWE', name: 'Oriental Weavers', nameAr: 'النساجون الشرقيون', returnPct: -4.8, alphaPct: -9.1, winRate: 33, trades: 3, endPrice: 23.8, logoUrl: 'https://s3-symbol-logo.tradingview.com/oriental-weavers.svg' },
    ],
  },
  {
    id: 'mobile-telecom',
    name: 'Mobile Telecom',
    nameAr: 'اتصالات المحمول',
    returnPct: 10.9,
    alphaPct: 0.8,
    winRate: 55,
    trades: 10,
    tickers: [
      { id: 'ETEL', symbol: 'ETEL', name: 'Telecom Egypt', nameAr: 'المصرية للاتصالات', returnPct: 10.4, alphaPct: 0.7, winRate: 55, trades: 6, endPrice: 41.6, logoUrl: 'https://s3-symbol-logo.tradingview.com/telecom-egypt.svg' },
      { id: 'RAYA', symbol: 'RAYA', name: 'Raya Holding', nameAr: 'راية القابضة', returnPct: 11.6, alphaPct: 1.1, winRate: 56, trades: 4, endPrice: 4.15, logoUrl: 'https://s3-symbol-logo.tradingview.com/raya-holding-for-financial-investments.svg' },
    ],
  },
  {
    id: 'packaged-food',
    name: 'Packaged Food & Consumer',
    nameAr: 'الأغذية والمشروبات',
    returnPct: 7.2,
    alphaPct: -2.1,
    winRate: 49,
    trades: 12,
    tickers: [
      { id: 'EAST', symbol: 'EAST', name: 'Eastern Company', nameAr: 'الشرقية للدخان', returnPct: 17.2, alphaPct: 5.4, winRate: 63, trades: 5, endPrice: 35.0, logoUrl: 'https://s3-symbol-logo.tradingview.com/eastern-company.svg' },
      { id: 'EFID', symbol: 'EFID', name: 'Edita Food', nameAr: 'إيديتا للصناعات الغذائية', returnPct: 6.8, alphaPct: -1.9, winRate: 48, trades: 3, endPrice: 32.5, logoUrl: 'https://s3-symbol-logo.tradingview.com/edita-food-industries.svg' },
      { id: 'JUFO', symbol: 'JUFO', name: 'Juhayna', nameAr: 'جهينة للصناعات الغذائية', returnPct: 4.2, alphaPct: -3.5, winRate: 45, trades: 4, endPrice: 22.4, logoUrl: 'https://s3-symbol-logo.tradingview.com/juhayna-food-industries.svg' },
    ],
  },
  {
    id: 'pharma',
    name: 'Pharmaceuticals & Health',
    nameAr: 'الأدوية والرعاية الصحية',
    returnPct: 3.8,
    alphaPct: -4.4,
    winRate: 44,
    trades: 10,
    tickers: [
      { id: 'ISPH', symbol: 'ISPH', name: 'Ibnsina Pharma', nameAr: 'ابن سينا فارما', returnPct: 8.2, alphaPct: -0.5, winRate: 49, trades: 4, endPrice: 4.8, logoUrl: 'https://s3-symbol-logo.tradingview.com/ibnsina-pharma.svg' },
      { id: 'RMDA', symbol: 'RMDA', name: 'Rameda', nameAr: 'العاشر من رمضان (راميدا)', returnPct: 4.1, alphaPct: -3.2, winRate: 44, trades: 2, endPrice: 2.75, logoUrl: 'https://s3-symbol-logo.tradingview.com/tenth-of-ramadan-pharmaceutical-industries-and-diagnostic-reagents-rameda.svg' },
      { id: 'PHAR', symbol: 'PHAR', name: 'EIPICO', nameAr: 'المصرية الدولية للأدوية', returnPct: -1.9, alphaPct: -6.4, winRate: 38, trades: 4, endPrice: 52.0, logoUrl: 'https://s3-symbol-logo.tradingview.com/egyptian-international-pharmaceutical-industries-eipico.svg' },
    ],
  },
];

export const BACKTEST_ROWS: Readonly<Record<BacktestGranularity, readonly BacktestRow[]>> = {
  sector: SECTORS,
  industryGroup: INDUSTRY_GROUPS,
  industry: INDUSTRIES,
  ticker: TICKERS,
};

