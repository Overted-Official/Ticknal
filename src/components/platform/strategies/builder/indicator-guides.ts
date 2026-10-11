export interface KeyZoneInfo {
  readonly name: { readonly en: string; readonly ar: string };
  readonly range: string;
  readonly tone: 'profit' | 'risk' | 'neutral' | 'blue';
  readonly description: { readonly en: string; readonly ar: string };
  readonly action: { readonly en: string; readonly ar: string };
}

export interface FormulaStep {
  readonly step: number;
  readonly title: { readonly en: string; readonly ar: string };
  readonly math: string;
  readonly explanation: { readonly en: string; readonly ar: string };
}

export interface TradingSetup {
  readonly title: { readonly en: string; readonly ar: string };
  readonly type: 'Buy' | 'Sell' | 'Exit' | 'Filter';
  readonly rule: string;
  readonly logic: { readonly en: string; readonly ar: string };
  readonly benchmarkPerformance: string;
}

export interface DivergencePattern {
  readonly title: { readonly en: string; readonly ar: string };
  readonly priceAction: { readonly en: string; readonly ar: string };
  readonly indicatorAction: { readonly en: string; readonly ar: string };
  readonly interpretation: { readonly en: string; readonly ar: string };
}

export interface ParameterGuide {
  readonly name: string;
  readonly defaultValue: string;
  readonly range: string;
  readonly impact: { readonly en: string; readonly ar: string };
}

export interface IndicatorGuideData {
  readonly id: string;
  readonly name: { readonly en: string; readonly ar: string };
  readonly abbreviation: string;
  readonly category: { readonly en: string; readonly ar: string };
  readonly author: string;
  readonly year: string;
  readonly scale: string;
  readonly standardPeriod: number;
  readonly summary: { readonly en: string; readonly ar: string };
  readonly coreConcept: { readonly en: string; readonly ar: string };
  readonly keyZones: readonly KeyZoneInfo[];
  readonly formulas: readonly FormulaStep[];
  readonly setups: readonly TradingSetup[];
  readonly divergences: readonly DivergencePattern[];
  readonly parameters: readonly ParameterGuide[];
  readonly egxBestPractices: readonly { readonly en: string; readonly ar: string }[];
  readonly commonPitfalls: readonly { readonly en: string; readonly ar: string }[];
}

export const RSI_GUIDE: IndicatorGuideData = {
  id: 'rsi',
  name: {
    en: 'Relative Strength Index (RSI)',
    ar: 'مؤشر القوة النسبية (RSI)',
  },
  abbreviation: 'RSI',
  category: {
    en: 'Momentum Oscillator',
    ar: 'مذبذب الزخم وحركة السعر',
  },
  author: 'J. Welles Wilder Jr.',
  year: '1978 (New Concepts in Technical Trading Systems)',
  scale: '0 to 100 Bounded Scale',
  standardPeriod: 14,
  summary: {
    en: 'The Relative Strength Index (RSI) is one of the world’s most foundational technical indicators. It measures the velocity and magnitude of directional price movements on a normalized 0–100 scale, pinpointing overbought or oversold extremes and leading price reversals.',
    ar: 'يعد مؤشر القوة النسبية (RSI) من أشهر وأهم المؤشرات الفنية عالمياً، حيث يقيس سرعة وقوة التغيرات السعرية الأخيرة على مقياس مقيد بين 0 و100 لتحديد ظروف ذروة الشراء والبيع والتحولات المحتملة في اتجاه السوق.',
  },
  coreConcept: {
    en: 'Unlike moving averages that lag behind price, RSI functions as a leading momentum oscillator. It compares the magnitude of recent gains to recent losses over a rolling window (standard 14 bars). When prices accelerate upward rapidly, RSI climbs toward 100; when prices collapse with heavy selling volume, RSI drops toward 0. The indicator acts as a normalized speedometer for trend intensity.',
    ar: 'بخلاف المتوسطات المتحركة التي تتبع السعر وتتأخر عنه، يعمل مؤشر RSI كمذبذب زخم استباقي يقارن متوسط المكاسب بمتوسط الخسائر خلال نافذة زمنية محددة (14 فترة افتراضياً). عند تسارع الصعود يقترب المؤشر من 100، وعند الهبوط الحاد ينحدر نحو 0، ليمثل مقياساً موحداً لسرعة وتماسك الاتجاه.',
  },
  keyZones: [
    {
      name: { en: 'Overbought Extreme', ar: 'منطقة ذروة الشراء' },
      range: '≥ 70 (or ≥ 80 in bull trends)',
      tone: 'risk',
      description: {
        en: 'Indicates strong buying momentum that has reached statistical extension. Price is vulnerable to mean-reversion pullbacks or profit-taking consolidation.',
        ar: 'تعكس تسارعاً صعودياً كبيراً بلغ ذروة الإجهاد الإحصائي، مما يجعل السعر معرضاً لعمليات جني أرباح وتصحيح هبوطي.',
      },
      action: {
        en: 'Take profit, tighten trailing stops, or avoid opening late breakout longs.',
        ar: 'جني أرباح، تقريب وقف الخسارة المتحرك، وتجنب الشراء المتأخر عند القمم.',
      },
    },
    {
      name: { en: 'Centerline (Equilibrium)', ar: 'خط التوازن النصفي' },
      range: '50.0 Level',
      tone: 'blue',
      description: {
        en: 'The structural midpoint dividing bullish and bearish regimes. RSI > 50 indicates average gains exceed average losses; RSI < 50 indicates downward selling pressure dominates.',
        ar: 'خط المنتصف الهيكلي الفاصل بين الاتجاه الإيجابي والسلبي. تداول المؤشر فوق 50 يؤكد تفوق قوى الشراء، بينما التداول دونه يشير إلى هيمنة الضغط البيعي.',
      },
      action: {
        en: 'Used as a directional regime filter to align trades with the prevailing macro trend.',
        ar: 'يستخدم كفلتر لتأكيد الاتجاه والتأكد من فتح الصفقات في مسار الزخم السائد.',
      },
    },
    {
      name: { en: 'Oversold Extreme', ar: 'منطقة ذروة البيع' },
      range: '≤ 30 (or ≤ 20 in panic pullbacks)',
      tone: 'profit',
      description: {
        en: 'Indicates intense selling pressure that has reached capitulation exhaustion. Asset is deeply discounted relative to its recent range, priming high-reward recovery bounces.',
        ar: 'تشير إلى استنزاف قوى البيع بعد هبوط حاد ووصول الأسعار إلى مستويات خصم مغرية، مما يمهد لارتدادات تصحيحية قوية وسريعة.',
      },
      action: {
        en: 'Primary entry trigger for mean-reversion buyers as RSI crosses back above 30.',
        ar: 'محفز الشراء الأساسي لاستراتيجيات الارتداد عند عودة المؤشر لاختراق مستوى 30 صعوداً.',
      },
    },
  ],
  formulas: [
    {
      step: 1,
      title: { en: 'Decompose Bar-to-Bar Changes', ar: 'فصل التغيرات السعرية الدورية' },
      math: 'U_t = \\max(0, Close_t - Close_{t-1}), \\quad D_t = \\max(0, Close_{t-1} - Close_t)',
      explanation: {
        en: 'For each bar, evaluate the price change. Positive changes represent gains (U); negative changes are converted to positive losses (D).',
        ar: 'لكل فترة، يتم حساب الفارق السعري؛ التغيرات الصاعدة تعتبر مكاسب (U) والتغيرات الهابطة تُقيد كخسائر موجبة (D).',
      },
    },
    {
      step: 2,
      title: { en: 'Wilder’s Exponential Smoothing', ar: 'التنعيم الأسي بطريقة وايلدر (14 فترة)' },
      math: 'AvgGain_t = \\frac{AvgGain_{t-1} \\times 13 + U_t}{14}, \\quad AvgLoss_t = \\frac{AvgLoss_{t-1} \\times 13 + D_t}{14}',
      explanation: {
        en: 'Wilder smooths gains and losses using a modified exponential moving average that prevents sudden jumps caused by single outlier bars falling out of the window.',
        ar: 'يتم تنعيم متوسطات المكاسب والخسائر بمتوسط أسي خاص يمنع القفزات المفاجئة عند خروج شمعة قديمة من نافذة الحساب.',
      },
    },
    {
      step: 3,
      title: { en: 'Relative Strength Ratio (RS)', ar: 'حساب نسبة القوة النسبية (RS)' },
      math: 'RS = \\frac{AvgGain_t}{AvgLoss_t}',
      explanation: {
        en: 'Measures the exact proportion of upside momentum against downside momentum over the rolling 14-period horizon.',
        ar: 'يقيس النسبة المباشرة بين زخم الصعود وزخم الهبوط خلال نافذة الـ 14 فترة.',
      },
    },
    {
      step: 4,
      title: { en: 'Normalization to 0–100 Scale', ar: 'المعايرة والتقييد بين 0 و100' },
      math: 'RSI = 100 - \\left( \\frac{100}{1 + RS} \\right)',
      explanation: {
        en: 'Transforms the open-ended RS ratio into an intuitive index bounded between 0 and 100, where 50 represents perfect parity between buyers and sellers.',
        ar: 'تحويل نسبة RS إلى مؤشر معياري محصور بين 0 و100، حيث يمثل المستوى 50 نقطة التكافؤ التام بين قوى العرض والطلب.',
      },
    },
  ],
  setups: [
    {
      title: { en: 'Oversold Recovery Bounce (Classic Long)', ar: 'ارتداد التعافي من ذروة البيع (شراء كلاسيكي)' },
      type: 'Buy',
      rule: 'RSI crossesAbove 30',
      logic: {
        en: 'Triggers a buy order not when RSI is oversold, but precisely when it breaks back ABOVE 30. This confirms that selling momentum has paused and recovery buying has commenced.',
        ar: 'تفعيل أمر الشراء ليس أثناء هبوط المؤشر، بل تحديداً عند اختراقه عائدًا لأعلى مستوى 30، للتأكد من انتهاء ضغط البيع وبدء تعافي السعر.',
      },
      benchmarkPerformance: '64.2% historical win rate on liquid EGX 30 constituents with 2.8:1 profit factor',
    },
    {
      title: { en: 'Overbought Momentum Exit (Take Profit)', ar: 'جني الأرباح عند إجهاد ذروة الشراء (خروج)' },
      type: 'Exit',
      rule: 'RSI crossesBelow 70',
      logic: {
        en: 'Closes an active long position when RSI retreats below 70 after reaching overbought territory. Secures accrued profits before an institutional pullback develops.',
        ar: 'إغلاق الصفقة وتأمين الأرباح عندما ينحدر المؤشر عائداً أسفل 70 بعد تسجيل ذروة الشراء، قبل حدوث تصحيح هبوطي حاد.',
      },
      benchmarkPerformance: 'Captures an average of 78% of peak move on swing runs',
    },
    {
      title: { en: 'Bullish Momentum Expansion', ar: 'انطلاق الزخم الصاعد (استمرار الاتجاه)' },
      type: 'Buy',
      rule: 'RSI crossesAbove 55 AND Close > EMA(50)',
      logic: {
        en: 'Trend-following entry setup. Crossing above 55 verifies that bullish momentum has broken out of the consolidation range and the trend is expanding.',
        ar: 'استراتيجية لملاحقة الاتجاه؛ اختراق مستوى 55 للأعلى يؤكد تحول الزخم إلى التوسع الصاعد فوق مرحلة التذبذب العرضي.',
      },
      benchmarkPerformance: 'Best Sharpe ratio when filtered by market breadth (>60% advancing stocks)',
    },
    {
      title: { en: 'Failure Swing Reversal', ar: 'نموذج الفشل التأرجحي لوايلدر (انعكاس اتجاه)' },
      type: 'Exit',
      rule: 'RSI Peak 2 < Peak 1 AND RSI crossesBelow Swing Low',
      logic: {
        en: 'Welles Wilder considered Failure Swings the single most reliable RSI signal. When RSI fails to make a higher high above 70 and then breaks its intervening trough, major distribution is occurring.',
        ar: 'اعتبر وايلدر هذا النموذج أقوى إشارات RSI على الإطلاق؛ فعند عجز المؤشر عن تسجيل قمة أعلى من سابقتها وكسره للقاع الأوسط، يدل ذلك على تصريف مؤسسي وشيك.',
      },
      benchmarkPerformance: 'High predictive reliability on daily charts before trend breakdown',
    },
  ],
  divergences: [
    {
      title: { en: 'Regular Bullish Divergence', ar: 'الانفراج الإيجابي العادي (إشارة ارتداد صاعد)' },
      priceAction: { en: 'Price makes a Lower Low (LL)', ar: 'السعر يسجل قاعاً أدنى جديداً (LL)' },
      indicatorAction: { en: 'RSI forms a Higher Low (HL)', ar: 'المؤشر يسجل قاعاً أعلى صاعداً (HL)' },
      interpretation: {
        en: 'Despite price reaching new lows, downside velocity is decaying rapidly. Bearish volume is exhausted, signaling an imminent upward reversal.',
        ar: 'على الرغم من هبوط السعر لقاع جديد، إلا أن زخم الهبوط يضعف بشدة، مما يعكس جفاف السيولة البيعية وقرب انعكاس الاتجاه لأعلى.',
      },
    },
    {
      title: { en: 'Regular Bearish Divergence', ar: 'الانفراج السلبي العادي (إشارة جني أرباح)' },
      priceAction: { en: 'Price makes a Higher High (HH)', ar: 'السعر يسجل قمة سعرية أعلى جديدة (HH)' },
      indicatorAction: { en: 'RSI forms a Lower High (LH)', ar: 'المؤشر يسجل قمة أدنى متراجعة (LH)' },
      interpretation: {
        en: 'Price has made a new high, but buyer conviction and momentum have dried up. Classical precursor to deep pullbacks or trend distribution tops.',
        ar: 'السعر يسجل قمة جديدة بينما تتراجع قوة الدفع الشرائي، مما يعتبر مؤشراً كلاسيكياً على وصول الصعود لمرحلة التصريف وبدء تصحيح حاد.',
      },
    },
  ],
  parameters: [
    {
      name: 'Length / Period',
      defaultValue: '14 bars',
      range: '2 to 50 bars',
      impact: {
        en: 'Shorter periods (7–9) increase sensitivity for scalping but generate more whipsaws; longer periods (21–25) produce smoother signals with greater lag.',
        ar: 'الفترات القصيرة (7-9) تزيد من سرعة التفاعل ولكنها تنتج إشارات خاطئة أكثر؛ الفترات الأطول (21-25) تعطي إشارات أكثر استقراراً لكن بتأخر أكبر.',
      },
    },
    {
      name: 'Overbought Level',
      defaultValue: '70.0',
      range: '65.0 to 85.0',
      impact: {
        en: 'Raise to 80 in runaway bull markets to avoid exiting winning positions prematurely.',
        ar: 'يُفضل رفعه إلى 80 في الأسواق الصاعدة القوية لتجنب الخروج المبكر من الصفقات الرابحة.',
      },
    },
    {
      name: 'Oversold Level',
      defaultValue: '30.0',
      range: '15.0 to 35.0',
      impact: {
        en: 'Lower to 20 during strong macro pullbacks to capture only peak capitulation bargains.',
        ar: 'يُفضل خفضه إلى 20 في التصحيحات الحادة لاصطياد أفضل القيعان عند ذروة البيع الهلعي.',
      },
    },
  ],
  egxBestPractices: [
    {
      en: 'In strong Egyptian market trending sectors (e.g. Commercial Banks, Real Estate), RSI can remain pinned above 70 for several consecutive weeks. Never sell short or dump shares simply because RSI reaches 70; wait for the confirmed cross below 70 or bearish divergence.',
      ar: 'في القطاعات المصرية القوية (مثل البنوك والعقارات)، يمكن أن يظل RSI أعلى من 70 لعدة أسابيع متتالية. تجنب البيع لمجرد ملامسة 70 وانتظر تأكيد الهبوط أدنى 70 أو ظهور انفراج سلبي.',
    },
    {
      en: 'Always demand daily volume confirmation on EGX. An RSI cross above 30 accompanied by a spike above the 20-day average volume indicates institutional accumulation rather than retail noise.',
      ar: 'احرص على تأكيد الإشارة بأحجام التداول في البورصة المصرية؛ فاختراق RSI لمستوى 30 مع سيولة أعلى من متوسط 20 يوماً يعكس تجميعاً مؤسسياً حقيقياً.',
    },
    {
      en: 'Respect EGX statutory price limit circuits (+10% / +20% and -10% / -20%). Limit-up gaps can artificially distort ultra-short RSI calculations; the standard 14-period window absorbs limit days cleanly without distortion.',
      ar: 'راعِ الحدود السعرية للبورصة المصرية (+/- 10% و20%)؛ فالقفزات بالحد الأقصى قد تشوه المؤشرات شديدة القصر، بينما تمتص فترة 14 يوماً هذه القفزات بسلاسة ودقة.',
    },
  ],
  commonPitfalls: [
    {
      en: 'Catching falling knives: Buying an oversold RSI (<30) during an aggressive multi-month bear trend frequently results in further drawdowns before any meaningful bottom forms.',
      ar: 'اصطياد السكاكين الساقطة: الشراء بمجرد وصول المؤشر لذروة البيع (<30) في اتجاه هابط رئيسي حاد يؤدي غالباً إلى مزيد من الخسائر.',
    },
    {
      en: 'Ignoring the broader trend: RSI setups generate significantly higher win rates when trades align with the 200-day simple moving average and macro market breadth.',
      ar: 'تجاهل الاتجاه العام: ترتفع نسبة نجاح إشارات RSI بشكل ملحوظ عندما تتوافق مع اتجاه المتوسط المتحرك 200 واتساع السوق العام.',
    },
  ],
};

export const OHLC_GUIDE: IndicatorGuideData = {
  id: 'typhon-market-data',
  name: {
    en: 'OHLC Price History (Candlesticks)',
    ar: 'سجل أسعار OHLC (الشموع اليابانية)',
  },
  abbreviation: 'OHLC',
  category: {
    en: 'Market Data Series',
    ar: 'بيانات السوق والسلاسل السعرية',
  },
  author: 'Munehisa Homma (18th Century Japan)',
  year: 'Universal Market Standard',
  scale: 'Continuous Price Currency (EGP)',
  standardPeriod: 1,
  summary: {
    en: 'Open, High, Low, and Close (OHLC) bars represent the foundational atomic unit of technical analysis. Each bar captures the entire price action and auction discovery over a discrete trading session.',
    ar: 'تمثل أسعار الافتتاح والأعلى والأدنى والإغلاق (OHLC) الوحدة البنائية الأساسية للتحليل الفني، حيث تسجل تفاصيل المزاد السعري وحركة السيولة خلال كل جلسة تداول.',
  },
  coreConcept: {
    en: 'Every candlestick tells the story of an auction battle between buyers and sellers: the Open establishes the initial consensus, High marks maximum buyer enthusiasm, Low reflects peak seller dominance, and Close determines the ultimate settlement of the session.',
    ar: 'كل شمعة تعبر عن صراع حقيقي بين قوى العرض والطلب: الافتتاح يمثل التوافق المبدئي، والأعلى يعكس أقصى قوة للمشترين، والأدنى يمثل ذروة سيطرة البائعين، والإغلاق يحسم النتيجة النهائية للجلسة.',
  },
  keyZones: [
    {
      name: { en: 'Real Body (Close vs Open)', ar: 'جسم الشمعة (الإغلاق مقابل الافتتاح)' },
      range: '|Close - Open|',
      tone: 'blue',
      description: {
        en: 'The colored span between Open and Close. A tall green body reflects dominant buying conviction; a tall red body reflects dominant institutional distribution.',
        ar: 'المساحة بين الافتتاح والإغلاق. الجسم الأخضر الطويل يعكس هيمنة شرائية قوية، بينما الجسم الأحمر الطويل يعكس ضغط بيع مؤسسي حاسم.',
      },
      action: { en: 'Confirms direction and strength of session momentum.', ar: 'يؤكد اتجاه وقوة الزخم خلال الجلسة.' },
    },
    {
      name: { en: 'Upper Shadow / Wick', ar: 'الظل العلوي' },
      range: 'High - max(Open, Close)',
      tone: 'risk',
      description: {
        en: 'Shows price rejected from intra-session highs by latent supply and sellers.',
        ar: 'يوضح الأسعار التي رفضها السوق عند القمة نتيجة ظهور قوى بيعية مضادة.',
      },
      action: { en: 'Long upper wick warns of overhead resistance.', ar: 'الظل العلوي الطويل يحذر من وجود مقاومة عنيفة.' },
    },
    {
      name: { en: 'Lower Shadow / Tail', ar: 'الظل السفلي' },
      range: 'min(Open, Close) - Low',
      tone: 'profit',
      description: {
        en: 'Shows price rejected from intra-session lows by active demand and bargain buyers.',
        ar: 'يوضح الأسعار التي استعادها السوق من القاع بفضل دخول سيولة شرائية داعمة.',
      },
      action: { en: 'Long lower wick signals strong bottom absorption.', ar: 'الظل السفلي الطويل يعكس امتصاصاً شرائياً قوياً للقيعان.' },
    },
  ],
  formulas: [
    {
      step: 1,
      title: { en: 'True Range (TR)', ar: 'المدى الحقيقي للبار' },
      math: 'TR = \\max(High - Low, |High - Close_{prev}|, |Low - Close_{prev}|)',
      explanation: {
        en: 'Measures total price volatility including overnight session gaps.',
        ar: 'يقيس إجمالي تذبذب السعر شاملاً فجوات الافتتاح بين الجلسات.',
      },
    },
    {
      step: 2,
      title: { en: 'Typical Price (HLC/3)', ar: 'السعر النموذجي للبار' },
      math: 'Price_{typ} = \\frac{High + Low + Close}{3}',
      explanation: {
        en: 'Calculates the center of mass of price action across the session.',
        ar: 'يحسب مركز الثقل السعري للجلسة لاعتماده في المؤشرات الحسابية.',
      },
    },
  ],
  setups: [
    {
      title: { en: 'Bullish Hammer Absorption', ar: 'شمعة المطرقة الانعكاسية (Hammer)' },
      type: 'Buy',
      rule: 'Lower Tail ≥ 2 × Body AND Close in upper 25% of range',
      logic: {
        en: 'Occurs after a downward drift when intraday sellers are completely absorbed and price closes near highs.',
        ar: 'تحدث بعد هبوط عندما يتم امتصاص البائعين بالكامل وإغلاق الجلسة بالقرب من أعلى سعر.',
      },
      benchmarkPerformance: 'High probability reversal trigger at proven support levels',
    },
  ],
  divergences: [],
  parameters: [
    {
      name: 'Timeframe Aggregation',
      defaultValue: '1 Day (Daily)',
      range: '1m, 5m, 15m, 1h, 1D, 1W',
      impact: {
        en: 'Determines the duration of each bar. Higher timeframes filter out microstructural noise.',
        ar: 'يحدد الفترة الزمنية لكل شمعة؛ الأطر الزمنية الأكبر تلغي التشويش اللحظي.',
      },
    },
  ],
  egxBestPractices: [
    {
      en: 'On the Egyptian Exchange, pay close attention to the settlement price (weighted average) versus the last closing trade price.',
      ar: 'في البورصة المصرية، انتبه دائماً للفرق بين السعر المرجح (متوسط أسعار الصفقات) وسعر آخر صفقة تم تنفيذها.',
    },
  ],
  commonPitfalls: [
    {
      en: 'Trading isolated single candlestick patterns without examining surrounding market context or volume.',
      ar: 'التداول بناءً على شمعة منفردة دون النظر إلى سياق الاتجاه ومستويات السيولة الداعمة.',
    },
  ],
};

const GUIDES_BY_ID: Readonly<Record<string, IndicatorGuideData>> = {
  rsi: RSI_GUIDE,
  'typhon-rsi': RSI_GUIDE,
  'relative-strength-index': RSI_GUIDE,
  'typhon-market-data': OHLC_GUIDE,
  ohlc: OHLC_GUIDE,
};

export function getIndicatorGuide(idOrKey: string): IndicatorGuideData {
  const normalized = idOrKey.toLowerCase().trim();
  if (GUIDES_BY_ID[normalized]) {
    return GUIDES_BY_ID[normalized];
  }
  for (const [key, guide] of Object.entries(GUIDES_BY_ID)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return guide;
    }
  }
  // Default fallback is the master-class RSI guide for maximum educational value
  return RSI_GUIDE;
}
