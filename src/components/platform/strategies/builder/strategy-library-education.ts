import { ADVANCED_BLOCK_TEMPLATES, localize, type AdvancedBlockTemplate, type AdvancedStrategyNode } from './advanced-strategy-model';
import type { StrategyBuilderIndicatorOption } from './strategy-builder-model';

export interface StrategyLibraryEducation {
  readonly title: string;
  readonly category: string;
  readonly summary: string;
  readonly howItWorks: string;
  readonly howToUse: string;
  readonly example: string;
  readonly caution: string;
  readonly parameters: readonly string[];
  readonly outputs: readonly string[];
  readonly levels: readonly { readonly value: number; readonly label: string; readonly meaning: string }[];
  readonly visualization: 'rsi' | null;
  readonly sourceUrl?: string;
}

type Locale = 'en' | 'ar';

const RSI_SOURCE = 'https://www.tradingview.com/support/solutions/43000502338-relative-strength-index-rsi/';

function formatParameter(value: unknown): string {
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') return String(value);
  return Array.isArray(value) ? value.map(formatParameter).join(', ') : '—';
}

export function getIndicatorEducation(indicator: StrategyBuilderIndicatorOption, locale: Locale): StrategyLibraryEducation {
  const isAr = locale === 'ar';
  const isRsi = ['rsi', 'relative-strength-index', 'typhon-rsi'].includes(indicator.id.toLowerCase())
    || /\bRSI\b/u.test(indicator.name);
  const parameters = Object.entries(indicator.defaultParameters).map(([name, value]) => `${name}: ${formatParameter(value)}`);
  const outputs = indicator.outputs.map((output) => `${output.key} (${output.unit})`);

  if (isRsi) {
    return {
      title: indicator.name,
      category: indicator.category,
      summary: isAr
        ? 'يقيس RSI قوة تحركات الأسعار الأخيرة على مقياس من 0 إلى 100. يساعدك على ملاحظة الزخم، وليس التنبؤ المؤكد بانعكاس السعر.'
        : 'RSI measures the strength of recent price moves on a 0–100 scale. It helps describe momentum; it does not predict a reversal with certainty.',
      howItWorks: isAr
        ? 'يقارن متوسط المكاسب بمتوسط الخسائر خلال عدد محدد من الجلسات. الإعداد الشائع 14 جلسة؛ الفترة الأقصر أكثر حساسية، والأطول أكثر سلاسة.'
        : 'It compares smoothed average gains with smoothed average losses over a chosen number of bars. The common setting is 14 bars; shorter periods react faster and longer periods are smoother.',
      howToUse: isAr
        ? 'أقل من 30 يعني زخم بيع قوي (ذروة بيع)، وفوق 70 يعني زخم شراء قوي (ذروة شراء). مستوى 50 يفصل عادةً بين غلبة المكاسب والخسائر الأخيرة.'
        : 'Below 30 is commonly read as oversold; above 70 as overbought. The 50 midpoint helps show whether recent gains or losses dominate.',
      example: isAr
        ? 'مثال لقاعدة شراء: يتجاوز RSI مستوى 30 صعوداً بعد وجوده تحته. مثال لقاعدة خروج: يهبط RSI دون 70 بعد وجوده فوقها. اختبر القاعدتين على الأسهم والفترة المقصودة قبل الاعتماد عليهما.'
        : 'Example buy rule: RSI crosses above 30 after being below it. Example exit rule: RSI crosses below 70 after being above it. Backtest both against your chosen stocks and period before using them.',
      caution: isAr
        ? 'بلوغ 30 أو 70 ليس إشارة شراء أو بيع تلقائية. قد يبقى RSI عند الأطراف أثناء الاتجاهات القوية؛ استخدم تأكيداً من السعر أو الاتجاه وحدد مخاطرتك.'
        : 'Reaching 30 or 70 is not an automatic buy or sell signal. RSI can stay extreme in a strong trend; use price or trend confirmation and define risk separately.',
      parameters,
      outputs,
      levels: isAr
        ? [
          { value: 70, label: 'ذروة شراء', meaning: 'زخم صعود قوي؛ راقب تباطؤه ولا تفترض انعكاساً فورياً.' },
          { value: 50, label: 'المنتصف', meaning: 'فوقه ترجح المكاسب الأخيرة ودونه ترجح الخسائر.' },
          { value: 30, label: 'ذروة بيع', meaning: 'زخم هبوط قوي؛ راقب عودته فوق المستوى.' },
        ]
        : [
          { value: 70, label: 'Overbought', meaning: 'Strong upward momentum; watch for weakening, not an instant reversal.' },
          { value: 50, label: 'Midpoint', meaning: 'Recent gains dominate above it; recent losses dominate below.' },
          { value: 30, label: 'Oversold', meaning: 'Strong downward momentum; watch for a recovery above the level.' },
        ],
      visualization: 'rsi',
      sourceUrl: RSI_SOURCE,
    };
  }

  if (indicator.id === 'supertrend') {
    return {
      title: indicator.name,
      category: indicator.category,
      summary: isAr ? 'خط اتجاه متحرك يعتمد على متوسط المدى الحقيقي (ATR) وسعر السوق.' : 'An ATR-based trailing trend line that follows price.',
      howItWorks: isAr ? 'يرسم حدين أعلى وأسفل منتصف الشمعة بمسافة تساوي ATR مضروباً في المعامل. ينتقل الخط بين الحدين عندما يعبر السعر مستوى الاتجاه.' : 'It places upper and lower bands around each bar’s midpoint by ATR × multiplier. The line switches bands when price breaks the current trend boundary.',
      howToUse: isAr ? 'اضبط الفترة والمعامل أولاً، ثم اختر التهيئة القياسية أو البدء من الحد العلوي. استخدم «الحد العلوي أولاً» فقط إذا كنت تريد مطابقة استراتيجية بُنيت بهذه الطريقة؛ فهذا الاختيار قد يغير القيم والإشارات.' : 'Set the ATR period and multiplier, then choose standard or upper-band-first initialization. Use upper-band-first to reproduce strategies built with that convention; it can change values and signals.',
      example: isAr ? 'مثال: قارن الإغلاق بخط Supertrend؛ الانتقال فوق الخط قد يدعم شرط شراء. اختبر الفترة والمعامل والتهيئة على نفس البيانات قبل مقارنة النتائج.' : 'Example: compare close with the Supertrend line; moving above it can support a buy condition. Keep the period, multiplier, and initialization identical when comparing backtests.',
      caution: isAr ? 'الخط ليس ضماناً لاتجاه مستقبلي. قد تنتج إشارات متكررة في السوق العرضية، وقد تختلف النتائج إذا تغيرت طريقة التهيئة أو بيانات ATR.' : 'The line does not guarantee a future trend. Sideways markets can produce repeated switches, and changing initialization or ATR data can alter the backtest.',
      parameters,
      outputs,
      levels: [],
      visualization: null,
    };
  }

  if (indicator.id === 'money-flow-index') {
    return {
      title: indicator.name,
      category: indicator.category,
      summary: isAr ? 'مذبذب يقارن تدفق الأموال إلى السهم وخروجها باستخدام السعر وحجم التداول.' : 'A price-and-volume oscillator comparing money flowing into and out of a stock.',
      howItWorks: isAr ? 'يضرب السعر المعتاد في حجم التداول، ثم يقارن التدفقات الموجبة والسالبة خلال الفترة المحددة. الطريقة الكلاسيكية تتبع الحساب التاريخي المستخدم في PSI40 وقد تختلف عن القياسية.' : 'It weights each bar’s typical price by traded volume, then compares positive and negative flows over the chosen period. Classic mode reproduces the historical PSI40 calculation and can differ from Standard.',
      howToUse: isAr ? 'اختر الفترة وطريقة الحساب قبل إضافة المؤشر إلى شرط. ثبّت نفس الطريقة عند مقارنة الاختبارات التاريخية.' : 'Choose the period and calculation method before connecting MFI to a condition. Keep the method fixed when comparing backtests.',
      example: isAr ? 'تجاوز مستوى 20 صعوداً قد يشير إلى تحسن التدفق بعد ضعف؛ اختبره مع اتجاه السعر قبل اعتماده.' : 'Crossing back above 20 may indicate improving flow after weakness; test it alongside price trend before using it.',
      caution: isAr ? 'بلوغ مستوى 20 أو 80 ليس إشارة تداول مستقلة. اختلاف طريقة الحساب قد يغيّر توقيت الاختراقات.' : 'A 20 or 80 reading is not a trade signal by itself. Changing calculation method may shift crossing dates.',
      parameters,
      outputs,
      levels: isAr
        ? [{ value: 80, label: 'تدفق مرتفع', meaning: 'قوة شراء محتملة وليست انعكاساً مؤكداً.' }, { value: 20, label: 'تدفق منخفض', meaning: 'ضعف محتمل ولا يعني شراءً تلقائياً.' }]
        : [{ value: 80, label: 'High flow', meaning: 'Potential buying strength, not a confirmed reversal.' }, { value: 20, label: 'Low flow', meaning: 'Potential weakness, not an automatic buy.' }],
      visualization: null,
    };
  }

  const firstOutput = indicator.outputs[0]?.key;
  return {
    title: indicator.name,
    category: indicator.category,
    summary: indicator.description,
    howItWorks: isAr
      ? `يحسب المحرك هذا المؤشر باستخدام بيانات السوق المتاحة وإعداداته أدناه. راجع وصف ${indicator.name} ومخرجاته قبل دمجه في قاعدة.`
      : `The engine calculates this ${indicator.category.toLowerCase()} item from its available market inputs and the settings below. Check its output before connecting it to a rule.`,
    howToUse: isAr
      ? `أضف المؤشر، ثم اختر المخرج المناسب${firstOutput ? ` (مثل ${firstOutput})` : ''} وحدد شرط مقارنة أو اختراق في قاعدة الشراء أو البيع.`
      : `Add the indicator, choose the output you need${firstOutput ? ` (for example, ${firstOutput})` : ''}, then compare it with a level or another value in a buy or sell rule.`,
    example: isAr
      ? 'ابدأ بالإعدادات الافتراضية، غيّر قيمة واحدة في كل مرة، وقارن نتائج الاختبار التاريخي عبر أسهم وفترات مختلفة.'
      : 'Start with the defaults, change one setting at a time, and compare backtest results across stocks and periods.',
    caution: isAr
      ? 'لا تفترض أن مستوىً معيناً أو تغير المؤشر يمثل إشارة تداول بمفرده. تحقّق من معنى المخرج ووحدته وتوقيت توفر البيانات قبل تفعيل التنبيهات.'
      : 'Do not treat a level or movement as a trade signal by itself. Check the output meaning, unit, and data timing before enabling alerts.',
    parameters,
    outputs,
    levels: [],
    visualization: null,
  };
}

const BLOCK_USAGE: Readonly<Record<string, { en: string; ar: string }>> = {
  'market-input': { en: 'Choose an OHLCV field or benchmark series. Connect its output to an indicator, calculation, or comparison rule.', ar: 'اختر حقل OHLCV أو سلسلة مرجعية، ثم صل مخرجه بمؤشر أو حساب أو قاعدة مقارنة.' },
  parameter: { en: 'Give a fixed value a clear name, then reuse it in several connected rules instead of repeating the number.', ar: 'سمّ قيمة ثابتة بوضوح ثم أعد استخدامها في قواعد متصلة بدلاً من تكرار الرقم.' },
  indicator: { en: 'Choose a specific library indicator, set its period and output, then connect that output to a calculation or condition.', ar: 'اختر مؤشراً من المكتبة وحدد فترته ومخرجه ثم صل المخرج بحساب أو شرط.' },
  'weighted-composite': { en: 'Connect at least two values, normalize values with unlike scales, then assign weights to express their relative influence.', ar: 'صل قيمتين على الأقل، ووحّد المقاييس المختلفة، ثم حدد أوزاناً تعبر عن تأثير كل قيمة.' },
  'condition-score': { en: 'Add up to 12 comparisons. Each passing comparison earns its weight; the output is earned weight divided by total weight, on a 0–100 scale. Compare with a fixed level or another earlier series. Missing values earn no points. Combine several score cards with a weighted calculation for larger models.', ar: 'أضف حتى 12 مقارنة. كل مقارنة صحيحة تكسب وزنها؛ الناتج هو الوزن المكتسب مقسوماً على إجمالي الأوزان، من 0 إلى 100. قارن بمستوى ثابت أو سلسلة سابقة. القيم المفقودة لا تكسب نقاطاً. ادمج عدة بطاقات تقييم بحساب موزون للنماذج الكبيرة.' },
  'ticker-select': { en: 'Choose a default calculation and an alternate calculation, then list the companies that use the alternate. Every other company uses the default. Both calculations remain visible and editable upstream.', ar: 'اختر الحساب الافتراضي والبديل، ثم أدرج الشركات التي تستخدم البديل. بقية الشركات تستخدم الافتراضي. يبقى كلا الحسابين ظاهرين وقابلين للتعديل في المراحل السابقة.' },
  transform: { en: 'Connect one series. Smooth it with EMA or Wilder RMA, shift it back by completed bars, take its absolute value, or normalize it. EMA can start from the first valid value or wait for a full period; choose the startup that matches your model.', ar: 'صل سلسلة واحدة. نعّمها باستخدام EMA أو RMA أو ارجع بها إلى جلسات مكتملة سابقة أو خذ قيمتها المطلقة أو وحّدها. يمكن أن يبدأ EMA من أول قيمة صالحة أو بعد اكتمال الفترة؛ اختر التهيئة المطابقة لنموذجك.' },
  'rolling-statistic': { en: 'Connect a value and choose an extreme, mean, median, or percentile rank over a completed rolling window. Percentile rank runs from 0 to 100 and splits ties at their midpoint.', ar: 'صل قيمة واختر قيمة قصوى أو متوسطاً أو وسيطاً أو ترتيباً مئوياً خلال نافذة مكتملة. يتراوح الترتيب المئوي من 0 إلى 100 ويحسب القيم المتساوية من منتصف ترتيبها.' },
  'math-operation': { en: 'Connect at least two values. Add, subtract, multiply, divide, or choose the smallest or largest current input. Use lag and absolute difference to build causal measures such as True Range.', ar: 'صل قيمتين على الأقل. اجمع أو اطرح أو اضرب أو اقسم أو اختر أصغر أو أكبر مدخل حالي. استخدم الإرجاع للخلف والفرق المطلق لبناء مقاييس سببية مثل المدى الحقيقي.' },
  condition: { en: 'Connect a value, choose a comparison or crossover, and set the level that must be met before a buy signal appears.', ar: 'صل قيمة، واختر مقارنة أو اختراقاً، وحدد المستوى المطلوب قبل ظهور إشارة شراء.' },
  'sell-condition': { en: 'Connect a value, choose a comparison or crossover, and set the level that closes an open position.', ar: 'صل قيمة، واختر مقارنة أو اختراقاً، وحدد المستوى الذي يغلق الصفقة المفتوحة.' },
  'priority-trigger': { en: 'Connect a calculated value, list the priority levels, and let a crossing of an enabled level trigger the entry.', ar: 'صل قيمة محسوبة، وحدد مستويات الأولوية، ودع اختراق مستوى مفعل يطلق إشارة الدخول.' },
  'position-memory': { en: 'Capture a connected value when a position opens or closes; choose whether to keep it fixed or update it each bar.', ar: 'احفظ قيمة متصلة عند فتح أو إغلاق الصفقة؛ اختر تثبيتها أو تحديثها كل جلسة.' },
  'rolling-state': { en: 'Track the highest or lowest connected value since entry and pass it to a later exit rule.', ar: 'تتبع أعلى أو أدنى قيمة متصلة منذ الدخول ومررها إلى قاعدة خروج لاحقة.' },
  'dynamic-target': { en: 'Connect a price-distance value and set its multiplier. A position exits when close reaches entry plus that distance.', ar: 'صل قيمة مسافة سعرية وحدد مضاعفها. يحدث الخروج عندما يصل الإغلاق إلى سعر الدخول مضافاً إليه تلك المسافة.' },
  'trailing-exit': { en: 'Track the high since entry and set an ATR distance. The exit level follows favorable movement without moving backward.', ar: 'تتبع القمة منذ الدخول وحدد مسافة ATR. يتبع مستوى الخروج الحركة المواتية دون أن يعود إلى الخلف.' },
};

const BLOCK_CAUTION: Readonly<Record<string, { en: string; ar: string }>> = {
  marketData: { en: 'Use data that was available on each historical bar; future data would make a backtest misleading.', ar: 'استخدم البيانات التي كانت متاحة في كل جلسة تاريخية؛ بيانات المستقبل تجعل الاختبار مضللاً.' },
  indicators: { en: 'An indicator value is an input to a rule, not a buy or sell instruction on its own.', ar: 'قيمة المؤشر مدخل لقاعدة وليست أمراً مستقلاً بالشراء أو البيع.' },
  calculate: { en: 'Check units and scale before combining values. Compare the new output with the original series in a backtest.', ar: 'تحقق من الوحدات والمقياس قبل دمج القيم، وقارن الناتج بالسلاسل الأصلية في اختبار تاريخي.' },
  rules: { en: 'A rule is evaluated on completed market data; test how often it triggers and what happens after the signal.', ar: 'تُقيّم القاعدة على بيانات السوق المكتملة؛ اختبر تكرار تفعيلها وما يحدث بعد الإشارة.' },
  combine: { en: 'Many thresholds can overfit past prices. Test the levels on companies and periods outside the design sample.', ar: 'قد يؤدي كثرة المستويات إلى ملاءمة مفرطة للماضي. اختبرها على شركات وفترات خارج عينة التصميم.' },
  holding: { en: 'This value exists only while a position is open. Check its initialization and whether it updates each bar.', ar: 'توجد هذه القيمة فقط أثناء فتح الصفقة. تحقق من تهيئتها ومن تحديثها كل جلسة.' },
  protect: { en: 'An exit rule can limit a modeled loss but cannot guarantee an execution price or avoid market gaps.', ar: 'قد تحد قاعدة الخروج من خسارة النموذج لكنها لا تضمن سعر التنفيذ أو تجنب فجوات السوق.' },
};

export function getBlockEducation(template: AdvancedBlockTemplate, locale: Locale): StrategyLibraryEducation {
  const isAr = locale === 'ar';
  return {
    title: localize(template.title, locale),
    category: isAr ? 'كتلة سير عمل' : 'Workflow block',
    summary: localize(template.description, locale),
    howItWorks: isAr
      ? 'تقرأ هذه الكتلة مدخلاتها من الكتل المتصلة قبلها، وتقدم نتيجتها للكتل المتصلة بعدها حسب ترتيب سير العمل.'
      : 'This block reads the upstream values connected to it and passes its result to downstream blocks in workflow order.',
    howToUse: localize(BLOCK_USAGE[template.id] ?? template.description, locale),
    example: isAr
      ? 'أضف الكتلة إلى مرحلتها، اضبط إعداداتها، ثم صلها بالمدخلات والقاعدة التالية. شغّل التحليلات لمقارنة الأثر.'
      : 'Add it to its stage, configure it, then connect its inputs and next rule. Run analytics to compare the effect.',
    caution: localize(BLOCK_CAUTION[template.libraryGroup], locale),
    parameters: [],
    outputs: [],
    levels: [],
    visualization: null,
  };
}

export function getNodeEducation(
  node: AdvancedStrategyNode,
  indicators: readonly StrategyBuilderIndicatorOption[],
  locale: Locale,
): StrategyLibraryEducation {
  const indicatorId = node.parameters?.indicatorId;
  const indicator = indicators.find((item) => item.id === indicatorId)
    ?? (node.id === 'typhon-rsi' ? indicators.find((item) => /\bRSI\b/u.test(item.name) || item.id === 'relative-strength-index') : undefined);
  if (indicator) return getIndicatorEducation(indicator, locale);

  const template = ADVANCED_BLOCK_TEMPLATES.find((item) => item.id === node.templateId);
  const base = template ? getBlockEducation(template, locale) : null;
  const title = node.customName || localize(node.title, locale);
  const summary = localize(node.summary, locale);
  if (base) return { ...base, title, summary };

  const isAr = locale === 'ar';
  return {
    title,
    category: isAr ? 'كتلة سير عمل' : 'Workflow block',
    summary,
    howItWorks: summary,
    howToUse: node.kind === 'input'
      ? (isAr
        ? 'هذه كتلة مصدر توفر بيانات السوق للكتل التالية. صل مخرجها بمؤشر أو حساب أو قاعدة تحتاج هذه البيانات.'
        : 'This source block supplies market data to later blocks. Connect its output to an indicator, calculation, or rule that needs the data.')
      : (isAr
        ? 'تتصل هذه الكتلة بمخرجات مراحل سابقة وتوفر قيمة أو شرطاً للمراحل التالية. راجع مسار الاتصالات لفهم دورها في الاستراتيجية.'
        : 'This block receives upstream values and supplies a value or condition to later stages. Follow its connections to understand its role in the strategy.'),
    example: isAr
      ? 'افحص المدخلات والمخرجات المتصلة، ثم قارن أثر هذه الكتلة على نتائج التحليلات.'
      : 'Inspect its connected inputs and outputs, then compare its effect in analytics.',
    caution: isAr
      ? 'الوصف يشرح وظيفة الكتلة، لا يضمن أداء الاستراتيجية أو دقة الإشارة على كل سهم.'
      : 'The description explains the block; it does not guarantee strategy performance or signal accuracy for every stock.',
    parameters: Object.entries(node.parameters ?? {}).map(([name, value]) => `${name}: ${formatParameter(value)}`),
    outputs: node.outputName ? [node.outputName] : [],
    levels: [],
    visualization: null,
  };
}
