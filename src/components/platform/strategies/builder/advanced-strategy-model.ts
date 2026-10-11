export type AdvancedNodeKind = 'input' | 'calculation' | 'decision' | 'state' | 'exit' | 'output';

export type AdvancedStageId = 'inputs' | 'signal' | 'entry' | 'state' | 'exit' | 'output';

export type AdvancedBlockLibraryGroup =
  | 'marketData'
  | 'indicators'
  | 'calculate'
  | 'rules'
  | 'combine'
  | 'holding'
  | 'protect';

export interface LocalizedAdvancedCopy {
  readonly en: string;
  readonly ar: string;
}

export function localize(copy: LocalizedAdvancedCopy, locale: 'en' | 'ar'): string {
  return locale === 'ar' ? copy.ar : copy.en;
}

export interface AdvancedNodeDetail {
  readonly label: LocalizedAdvancedCopy;
  readonly value: LocalizedAdvancedCopy;
}

export interface AdvancedNodeMetric {
  readonly label: LocalizedAdvancedCopy;
  readonly value: string;
  readonly emphasis?: boolean;
}

export interface AdvancedStrategyNode {
  readonly id: string;
  readonly stage: AdvancedStageId;
  readonly kind: AdvancedNodeKind;
  readonly title: LocalizedAdvancedCopy;
  readonly summary: LocalizedAdvancedCopy;
  readonly templateId?: string;
  readonly customName?: string;
  readonly outputName?: string;
  readonly connections?: readonly string[];
  readonly parameters?: Readonly<Record<string, string>>;
  readonly details?: readonly AdvancedNodeDetail[];
  readonly metrics?: readonly AdvancedNodeMetric[];
  readonly tags?: readonly string[];
  readonly protected?: boolean;
}

export interface AdvancedStrategyStage {
  readonly id: AdvancedStageId;
  readonly number: string;
  readonly title: LocalizedAdvancedCopy;
  readonly description: LocalizedAdvancedCopy;
  readonly branchLabel?: LocalizedAdvancedCopy;
}

export interface AdvancedBlockTemplate {
  readonly id: string;
  readonly stage: AdvancedStageId;
  readonly kind: AdvancedNodeKind;
  readonly libraryGroup: AdvancedBlockLibraryGroup;
  readonly title: LocalizedAdvancedCopy;
  readonly description: LocalizedAdvancedCopy;
}

export const ADVANCED_STAGES: readonly AdvancedStrategyStage[] = [
  {
    id: 'inputs',
    number: '01',
    title: { en: 'Market data', ar: 'بيانات السوق' },
    description: { en: 'Choose the data the strategy can read.', ar: 'اختر البيانات التي يمكن للاستراتيجية قراءتها.' },
  },
  {
    id: 'signal',
    number: '02',
    title: { en: 'Indicators & calculations', ar: 'المؤشرات والحسابات' },
    description: { en: 'Turn market data into useful values.', ar: 'حوّل بيانات السوق إلى قيم مفيدة.' },
  },
  {
    id: 'entry',
    number: '03',
    title: { en: 'Rules & logic', ar: 'القواعد والمنطق' },
    description: { en: 'Create conditions and combine them.', ar: 'أنشئ الشروط واربطها معاً.' },
  },
  {
    id: 'state',
    number: '04',
    title: { en: 'While holding', ar: 'أثناء الاحتفاظ' },
    description: { en: 'Remember and update values after buying.', ar: 'احفظ وحدّث القيم بعد الشراء.' },
  },
  {
    id: 'exit',
    number: '05',
    title: { en: 'Protect the trade', ar: 'حماية الصفقة' },
    description: { en: 'Add targets, stops and trailing protection.', ar: 'أضف الأهداف وإيقاف الخسارة والحماية المتحركة.' },
    branchLabel: { en: 'OR', ar: 'أو' },
  },
  {
    id: 'output',
    number: '06',
    title: { en: 'Buy / Sell', ar: 'شراء / بيع' },
    description: { en: 'Send the final rules to Buy Logic or Sell Logic.', ar: 'أرسل القواعد النهائية إلى منطق الشراء أو البيع.' },
  },
];

export const TYPHON_BLUEPRINT_NODES: readonly AdvancedStrategyNode[] = [
  {
    id: 'typhon-market-data',
    stage: 'inputs',
    kind: 'input',
    title: { en: 'OHLC price history', ar: 'سجل أسعار OHLC' },
    summary: { en: 'Open, high, low and close bars ordered through time.', ar: 'أسعار الافتتاح والأعلى والأدنى والإغلاق مرتبة زمنياً.' },
    tags: ['OPEN', 'HIGH', 'LOW', 'CLOSE'],
    protected: true,
  },
  {
    id: 'typhon-parameter-profile',
    stage: 'inputs',
    kind: 'input',
    title: { en: 'Locked parameter profile', ar: 'ملف معلمات محمي' },
    summary: { en: 'Selects the optimized profile for the ticker and timeframe.', ar: 'يختار ملف الإعدادات المحسن للسهم والإطار الزمني.' },
    details: [
      { label: { en: 'Resolution', ar: 'الاختيار' }, value: { en: 'Ticker + timeframe', ar: 'السهم + الإطار الزمني' } },
      { label: { en: 'Fallback', ar: 'البديل' }, value: { en: 'Protected defaults', ar: 'الإعدادات المحمية الافتراضية' } },
    ],
    protected: true,
  },
  {
    id: 'typhon-rsi',
    stage: 'inputs',
    kind: 'input',
    templateId: 'indicator',
    title: { en: 'Relative Strength Index (RSI)', ar: 'مؤشر القوة النسبية (RSI)' },
    summary: { en: 'Momentum oscillator evaluating overbought (70) and oversold (30) levels.', ar: 'مذبذب زخم عبر 14 فترة يقيم مستويات ذروة الشراء (70) وذروة البيع (30).' },
    tags: ['MOMENTUM', 'OSCILLATOR', 'RSI(14)'],
    parameters: { period: '14', overbought: '70', oversold: '30' },
    details: [
      { label: { en: 'Period', ar: 'الفترة' }, value: { en: '14 bars', ar: '14 فترة' } },
      { label: { en: 'Overbought', ar: 'ذروة الشراء' }, value: { en: '≥ 70', ar: '≥ 70' } },
      { label: { en: 'Oversold', ar: 'ذروة البيع' }, value: { en: '≤ 30', ar: '≤ 30' } },
    ],
    protected: true,
  },
  {
    id: 'typhon-master-index',
    stage: 'signal',
    kind: 'calculation',
    title: { en: 'Weighted Master Index', ar: 'المؤشر الرئيسي الموزون' },
    summary: { en: 'Normalizes eight signals to a 0–100 scale and combines them by weight.', ar: 'يوحد ثماني إشارات على مقياس من 0 إلى 100 ثم يدمجها بالأوزان.' },
    metrics: [
      { label: { en: 'Normalized price', ar: 'السعر الموحّد' }, value: '15%' },
      { label: { en: 'RSI', ar: 'RSI' }, value: '10%' },
      { label: { en: 'Banker score', ar: 'درجة Banker' }, value: '5%' },
      { label: { en: 'Bollinger position', ar: 'موضع بولينجر' }, value: '4%' },
      { label: { en: 'Supertrend distance', ar: 'مسافة Supertrend' }, value: '47%', emphasis: true },
      { label: { en: 'Directional movement', ar: 'الحركة الاتجاهية' }, value: '10%' },
      { label: { en: 'MA spread', ar: 'فارق المتوسطات' }, value: '4%' },
      { label: { en: 'Price slope', ar: 'ميل السعر' }, value: '1%' },
    ],
    protected: true,
  },
  {
    id: 'typhon-smoothing',
    stage: 'signal',
    kind: 'calculation',
    title: { en: 'Dynamic EMA smoothing', ar: 'تنعيم EMA ديناميكي' },
    summary: { en: 'Smooths the raw composite over three periods to produce the Master Index.', ar: 'ينعم المركب الخام عبر ثلاث فترات لإنتاج المؤشر الرئيسي.' },
    details: [
      { label: { en: 'Method', ar: 'الطريقة' }, value: { en: 'EMA', ar: 'EMA' } },
      { label: { en: 'Period', ar: 'الفترة' }, value: { en: '3 bars', ar: '3 فترات' } },
    ],
    protected: true,
  },
  {
    id: 'typhon-entry',
    stage: 'entry',
    kind: 'decision',
    title: { en: 'Priority level crossover', ar: 'اختراق مستوى حسب الأولوية' },
    summary: { en: 'While flat, buy when the Master Index crosses above an enabled entry level.', ar: 'عند عدم وجود صفقة، يتم الشراء عندما يعبر المؤشر الرئيسي مستوى دخول مفعل.' },
    details: [
      { label: { en: 'Required state', ar: 'الحالة المطلوبة' }, value: { en: 'No open position', ar: 'لا توجد صفقة مفتوحة' } },
      { label: { en: 'Priority', ar: 'الأولوية' }, value: { en: '23.6 → 14.6 → 38.2 → 50.0 → 61.8', ar: '23.6 ← 14.6 ← 38.2 ← 50.0 ← 61.8' } },
      { label: { en: 'Signal', ar: 'الإشارة' }, value: { en: 'BUY', ar: 'شراء' } },
    ],
    protected: true,
  },
  {
    id: 'typhon-position-state',
    stage: 'state',
    kind: 'state',
    title: { en: 'Active position memory', ar: 'ذاكرة الصفقة النشطة' },
    summary: { en: 'Captures entry values and updates trade extremes on every bar.', ar: 'يحفظ قيم الدخول ويحدث أعلى وأدنى قيم الصفقة مع كل فترة.' },
    tags: ['ENTRY PRICE', 'HIGHEST HIGH', 'LOWEST LOW', 'ACTIVE BARS'],
    details: [
      { label: { en: 'At entry', ar: 'عند الدخول' }, value: { en: 'Freeze entry price and target', ar: 'تثبيت سعر الدخول والهدف' } },
      { label: { en: 'While active', ar: 'أثناء الصفقة' }, value: { en: 'Update highest high and lowest low', ar: 'تحديث أعلى قمة وأدنى قاع' } },
    ],
    protected: true,
  },
  {
    id: 'typhon-aym-target',
    stage: 'exit',
    kind: 'exit',
    title: { en: 'AYM take profit', ar: 'جني أرباح AYM' },
    summary: { en: 'Closes at a dynamic target derived from the median daily move.', ar: 'يغلق عند هدف ديناميكي مشتق من متوسط الحركة اليومية.' },
    details: [
      { label: { en: 'Target', ar: 'الهدف' }, value: { en: 'Entry × (1 + MDM × multiplier)', ar: 'الدخول × (1 + MDM × المضاعف)' } },
      { label: { en: 'Gate', ar: 'الشرط الإضافي' }, value: { en: 'Adjusted index below its limit', ar: 'المؤشر المعدل أدنى من حده' } },
      { label: { en: 'Signal', ar: 'الإشارة' }, value: { en: 'SELL — Target', ar: 'بيع — هدف' } },
    ],
    protected: true,
  },
  {
    id: 'typhon-atr-trail',
    stage: 'exit',
    kind: 'exit',
    title: { en: 'ATR profit protection', ar: 'حماية الأرباح باستخدام ATR' },
    summary: { en: 'Trails the highest price and activates only while the trade remains profitable.', ar: 'يتتبع أعلى سعر ولا يتفعل إلا عندما تظل الصفقة رابحة.' },
    details: [
      { label: { en: 'Trail', ar: 'المسار' }, value: { en: 'Highest high − ATR(14) × distance', ar: 'أعلى قمة − ATR(14) × المسافة' } },
      { label: { en: 'Protection', ar: 'الحماية' }, value: { en: 'Close must remain above entry', ar: 'يجب أن يظل الإغلاق أعلى من الدخول' } },
      { label: { en: 'Signal', ar: 'الإشارة' }, value: { en: 'SELL — Trail', ar: 'بيع — مسار' } },
    ],
    protected: true,
  },
  {
    id: 'typhon-buy-logic',
    stage: 'output',
    kind: 'output',
    title: { en: 'Buy Logic', ar: 'منطق الشراء' },
    summary: { en: 'Receives the qualified priority crossover and emits the entry event.', ar: 'يستقبل اختراق الأولوية المؤهل ويصدر حدث الدخول.' },
    tags: ['BUY'],
    protected: true,
  },
  {
    id: 'typhon-sell-logic',
    stage: 'output',
    kind: 'output',
    title: { en: 'Sell Logic', ar: 'منطق البيع' },
    summary: { en: 'Receives either protected exit branch and emits its named exit event.', ar: 'يستقبل أي مسار خروج محمي ويصدر حدث الخروج المسمى.' },
    tags: ['SELL_TP', 'SELL_TRAIL'],
    protected: true,
  },
];

export const ADVANCED_BLOCK_TEMPLATES: readonly AdvancedBlockTemplate[] = [
  { id: 'market-input', stage: 'inputs', kind: 'input', libraryGroup: 'marketData', title: { en: 'Market data', ar: 'بيانات السوق' }, description: { en: 'OHLCV, benchmark or another available series.', ar: 'OHLCV أو مؤشر مرجعي أو سلسلة أخرى متاحة.' } },
  { id: 'parameter', stage: 'inputs', kind: 'input', libraryGroup: 'marketData', title: { en: 'Reusable value', ar: 'قيمة قابلة لإعادة الاستخدام' }, description: { en: 'A named value reused across several blocks.', ar: 'قيمة مسماة يعاد استخدامها في عدة كتل.' } },
  { id: 'indicator', stage: 'signal', kind: 'calculation', libraryGroup: 'indicators', title: { en: 'Indicator', ar: 'مؤشر' }, description: { en: 'Add one indicator from the Ticknal library.', ar: 'أضف مؤشراً من مكتبة Ticknal.' } },
  { id: 'weighted-composite', stage: 'signal', kind: 'calculation', libraryGroup: 'calculate', title: { en: 'Weighted calculation', ar: 'حساب موزون' }, description: { en: 'Normalize and combine several values by weight.', ar: 'وحّد وادمج عدة قيم حسب الأوزان.' } },
  { id: 'transform', stage: 'signal', kind: 'calculation', libraryGroup: 'calculate', title: { en: 'Transform or smooth', ar: 'تحويل أو تنعيم' }, description: { en: 'Apply EMA, SMA, normalization or another transformation.', ar: 'طبق EMA أو SMA أو التوحيد أو تحويلاً آخر.' } },
  { id: 'rolling-statistic', stage: 'signal', kind: 'calculation', libraryGroup: 'calculate', title: { en: 'Rolling statistic', ar: 'إحصاء متحرك' }, description: { en: 'Calculate a moving minimum, maximum, mean or median.', ar: 'احسب الحد الأدنى أو الأقصى أو المتوسط أو الوسيط المتحرك.' } },
  { id: 'math-operation', stage: 'signal', kind: 'calculation', libraryGroup: 'calculate', title: { en: 'Math operation', ar: 'عملية حسابية' }, description: { en: 'Add, subtract, multiply or divide available values.', ar: 'اجمع أو اطرح أو اضرب أو اقسم القيم المتاحة.' } },
  { id: 'condition', stage: 'entry', kind: 'decision', libraryGroup: 'rules', title: { en: 'Create a rule', ar: 'إنشاء قاعدة' }, description: { en: 'Compare two values or detect a crossover.', ar: 'قارن قيمتين أو اكتشف اختراقاً.' } },
  { id: 'priority-trigger', stage: 'entry', kind: 'decision', libraryGroup: 'combine', title: { en: 'Combine or prioritize rules', ar: 'دمج القواعد أو ترتيبها' }, description: { en: 'Join rules with AND/OR or evaluate them in order.', ar: 'اربط القواعد باستخدام و/أو أو قيّمها بالترتيب.' } },
  { id: 'position-memory', stage: 'state', kind: 'state', libraryGroup: 'holding', title: { en: 'Remember a value', ar: 'تذكر قيمة' }, description: { en: 'Store entry values and update them while holding.', ar: 'احفظ قيم الدخول وحدثها أثناء الاحتفاظ.' } },
  { id: 'rolling-state', stage: 'state', kind: 'state', libraryGroup: 'holding', title: { en: 'Track high or low', ar: 'تتبع أعلى أو أدنى قيمة' }, description: { en: 'Track an extreme since the position opened.', ar: 'تتبع قيمة قصوى منذ فتح الصفقة.' } },
  { id: 'dynamic-target', stage: 'exit', kind: 'exit', libraryGroup: 'protect', title: { en: 'Profit target', ar: 'هدف ربح' }, description: { en: 'Calculate a fixed or dynamic profit target.', ar: 'احسب هدف ربح ثابتاً أو ديناميكياً.' } },
  { id: 'trailing-exit', stage: 'exit', kind: 'exit', libraryGroup: 'protect', title: { en: 'Stop or trailing protection', ar: 'إيقاف أو حماية متحركة' }, description: { en: 'Protect the trade with a stop or trailing rule.', ar: 'احمِ الصفقة بإيقاف أو قاعدة متحركة.' } },
];

export function createAdvancedDraftNodes(): readonly AdvancedStrategyNode[] {
  return [
    {
      id: 'custom-market-data',
      stage: 'inputs',
      kind: 'input',
      title: { en: 'Primary market series', ar: 'سلسلة السوق الأساسية' },
      summary: { en: 'OHLCV data for the ticker currently being evaluated.', ar: 'بيانات OHLCV للسهم الجاري تقييمه.' },
      outputName: 'market_ohlcv',
      connections: [],
      parameters: { series: 'ohlcv' },
      tags: ['OHLCV'],
      protected: true,
    },
    {
      id: 'custom-buy-logic',
      stage: 'output',
      kind: 'output',
      title: { en: 'Buy Logic', ar: 'منطق الشراء' },
      summary: { en: 'Connect the final rule that should open a position.', ar: 'اربط القاعدة النهائية التي يجب أن تفتح الصفقة.' },
      templateId: 'buy-terminal',
      outputName: 'BUY',
      connections: [],
      parameters: { combineMode: 'all' },
      protected: true,
    },
    {
      id: 'custom-sell-logic',
      stage: 'output',
      kind: 'output',
      title: { en: 'Sell Logic', ar: 'منطق البيع' },
      summary: { en: 'Connect any rule that should close the position.', ar: 'اربط أي قاعدة يجب أن تغلق الصفقة.' },
      templateId: 'sell-terminal',
      outputName: 'SELL',
      connections: [],
      parameters: { combineMode: 'any' },
      protected: true,
    },
  ];
}

