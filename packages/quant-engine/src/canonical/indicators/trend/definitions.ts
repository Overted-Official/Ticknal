import type {
  IndicatorOutputDefinition,
  IndicatorOutputs,
  MarketField,
  TimeSeriesFrame,
  TimeSeriesIndicatorDefinition,
} from '../../contracts';
import {
  atr,
  crossDown,
  crossUp,
  ema,
  linearRegressionEnd,
  rma,
  rollingMax,
  rollingMin,
  sma,
  trueRange,
  wma,
} from '../../core/series';
import { rollingSum } from '../../core/rolling/sum';
import {
  defineCategoryIndicator,
  type CategoryIndicatorSpec,
  type CategoryParameterRule,
} from '../shared/category-definition';
import * as indicatorLogic from './logic';
import { Parameters, Rules, category, event, integer, number, pane, parabolicSar, priceOverlay, supertrend, volume } from './shared';

interface DefinitionInput {
  readonly backlogId: string;
  readonly id: string;
  readonly name: string;
  readonly ar: string;
  readonly description: string;
  readonly requiredFields?: readonly MarketField[];
  readonly defaults: Parameters;
  readonly rules: Rules;
  readonly outputs: readonly IndicatorOutputDefinition[];
  readonly minimumHistory: number;
  readonly compute: CategoryIndicatorSpec<Parameters>['compute'];
  readonly repaintBehavior?: CategoryIndicatorSpec<Parameters>['repaintBehavior'];
  readonly confirmationDelay?: number;
}

function define(input: DefinitionInput): TimeSeriesIndicatorDefinition<Parameters> {
  return defineCategoryIndicator({
    backlogId: input.backlogId,
    id: input.id,
    category: 'trend',
    name: input.name,
    description: { en: input.description, ar: input.ar },
    requiredFields: input.requiredFields ?? ['close'],
    defaults: input.defaults,
    parameterRules: input.rules,
    outputs: input.outputs,
    minimumHistory: input.minimumHistory,
    tags: ['trend'],
    references: ['Ticknal canonical formula specification'],
    repaintBehavior: input.repaintBehavior,
    confirmationDelay: input.confirmationDelay,
    compute: input.compute,
  });
}

export const TREND_DEFINITIONS: readonly TimeSeriesIndicatorDefinition<object>[] = Object.freeze([
  define({ backlogId: 'TRD-001', id: 'simple-moving-average', name: 'Simple Moving Average (SMA)', ar: 'المتوسط المتحرك البسيط', description: 'Arithmetic mean of closing prices over a rolling period.', defaults: { period: 20 }, rules: { period: integer() }, outputs: [priceOverlay('sma', 'SMA')], minimumHistory: 20, compute: indicatorLogic.simpleMovingAverage }),
  define({ backlogId: 'TRD-002', id: 'exponential-moving-average', name: 'Exponential Moving Average (EMA)', ar: 'المتوسط المتحرك الأسي', description: 'Exponentially weighted average of closing prices.', defaults: { period: 20 }, rules: { period: integer() }, outputs: [priceOverlay('ema', 'EMA')], minimumHistory: 20, compute: indicatorLogic.exponentialMovingAverage }),
  define({ backlogId: 'TRD-003', id: 'weighted-moving-average', name: 'Weighted Moving Average (WMA)', ar: 'المتوسط المتحرك المرجح', description: 'Linearly weighted rolling average that emphasizes recent closes.', defaults: { period: 20 }, rules: { period: integer() }, outputs: [priceOverlay('wma', 'WMA')], minimumHistory: 20, compute: indicatorLogic.weightedMovingAverage }),
  define({ backlogId: 'TRD-004', id: 'wilder-moving-average', name: 'Wilder Moving Average (RMA)', ar: 'متوسط وايلدر المتحرك', description: 'Wilder recursive moving average of closing prices.', defaults: { period: 14 }, rules: { period: integer() }, outputs: [priceOverlay('rma', 'RMA')], minimumHistory: 14, compute: indicatorLogic.wilderMovingAverage }),
  define({ backlogId: 'TRD-005', id: 'double-exponential-moving-average', name: 'Double EMA (DEMA)', ar: 'المتوسط الأسي المزدوج', description: 'Reduced-lag moving average calculated as two EMAs minus an EMA of the EMA.', defaults: { period: 20 }, rules: { period: integer() }, outputs: [priceOverlay('dema', 'DEMA')], minimumHistory: 39, compute: indicatorLogic.doubleExponentialMovingAverage }),
  define({ backlogId: 'TRD-006', id: 'triple-exponential-moving-average', name: 'Triple EMA (TEMA)', ar: 'المتوسط الأسي الثلاثي', description: 'Reduced-lag triple exponential moving average.', defaults: { period: 20 }, rules: { period: integer() }, outputs: [priceOverlay('tema', 'TEMA')], minimumHistory: 58, compute: indicatorLogic.tripleExponentialMovingAverage }),
  define({ backlogId: 'TRD-007', id: 'hull-moving-average', name: 'Hull Moving Average (HMA)', ar: 'متوسط هال المتحرك', description: 'Weighted moving-average combination designed to reduce lag.', defaults: { period: 20 }, rules: { period: integer(2) }, outputs: [priceOverlay('hma', 'HMA')], minimumHistory: 24, compute: indicatorLogic.hullMovingAverage }),
  define({ backlogId: 'TRD-008', id: 'kaufman-adaptive-moving-average', name: 'Kaufman Adaptive Moving Average (KAMA)', ar: 'متوسط كوفمان المتكيف', description: 'Efficiency-ratio adaptive moving average.', defaults: { efficiencyPeriod: 10, fast: 2, slow: 30 }, rules: { efficiencyPeriod: integer(), fast: integer(), slow: integer() }, outputs: [priceOverlay('kama', 'KAMA')], minimumHistory: 11, compute: indicatorLogic.kaufmanAdaptiveMovingAverage }),
  define({ backlogId: 'TRD-009', id: 'fractal-adaptive-moving-average', name: 'Fractal Adaptive Moving Average (FRAMA)', ar: 'المتوسط المتحرك المتكيف كسرياً', description: 'Adaptive average driven by rolling fractal dimension.', requiredFields: ['high', 'low'], defaults: { period: 16 }, rules: { period: integer(4) }, outputs: [priceOverlay('frama', 'FRAMA')], minimumHistory: 16, compute: indicatorLogic.fractalAdaptiveMovingAverage }),
  define({ backlogId: 'TRD-010', id: 'variable-index-dynamic-average', name: 'Variable Index Dynamic Average (VIDYA)', ar: 'المتوسط الديناميكي المتغير', description: 'Momentum-adaptive exponential average.', defaults: { period: 14, momentumPeriod: 9 }, rules: { period: integer(), momentumPeriod: integer() }, outputs: [priceOverlay('vidya', 'VIDYA')], minimumHistory: 15, compute: indicatorLogic.variableIndexDynamicAverage }),
  define({ backlogId: 'TRD-011', id: 'mcginley-dynamic', name: 'McGinley Dynamic', ar: 'مؤشر ماكجينلي الديناميكي', description: 'Adaptive smoother that adjusts for relative price speed.', defaults: { period: 14 }, rules: { period: integer() }, outputs: [priceOverlay('mcginley', 'McGinley Dynamic')], minimumHistory: 2, compute: indicatorLogic.mcginleyDynamic }),
  define({ backlogId: 'TRD-012', id: 'arnaud-legoux-moving-average', name: 'Arnaud Legoux Moving Average (ALMA)', ar: 'متوسط أرنو ليجو المتحرك', description: 'Gaussian-weighted moving average with configurable offset and sigma.', defaults: { period: 9, offsetPct: 85, sigma: 6 }, rules: { period: integer(2), offsetPct: number(0, 100), sigma: number(0.1, 100) }, outputs: [priceOverlay('alma', 'ALMA')], minimumHistory: 9, compute: indicatorLogic.arnaudLegouxMovingAverage }),
  define({ backlogId: 'TRD-013', id: 'least-squares-moving-average', name: 'Least Squares Moving Average (LSMA)', ar: 'متوسط المربعات الصغرى', description: 'Rolling linear-regression endpoint.', defaults: { period: 25 }, rules: { period: integer() }, outputs: [priceOverlay('lsma', 'LSMA')], minimumHistory: 25, compute: indicatorLogic.leastSquaresMovingAverage }),
  define({ backlogId: 'TRD-014', id: 'triangular-moving-average', name: 'Triangular Moving Average (TMA)', ar: 'المتوسط المتحرك المثلثي', description: 'Twice-smoothed simple moving average.', defaults: { period: 20 }, rules: { period: integer(2) }, outputs: [priceOverlay('tma', 'TMA')], minimumHistory: 20, compute: indicatorLogic.triangularMovingAverage }),
  define({ backlogId: 'TRD-015', id: 'zero-lag-exponential-moving-average', name: 'Zero-Lag EMA (ZLEMA)', ar: 'المتوسط الأسي صفري التأخر', description: 'EMA of a lag-compensated price series.', defaults: { period: 20 }, rules: { period: integer(2) }, outputs: [priceOverlay('zlema', 'ZLEMA')], minimumHistory: 29, compute: indicatorLogic.zeroLagExponentialMovingAverage }),
  define({ backlogId: 'TRD-016', id: 'moving-average-ribbon', name: 'Moving Average Ribbon', ar: 'شريط المتوسطات المتحركة', description: 'Four moving averages showing alignment and compression.', defaults: { short: 5, medium: 10, long: 20, anchor: 50 }, rules: { short: integer(), medium: integer(), long: integer(), anchor: integer() }, outputs: [priceOverlay('ma_short', 'Short MA'), priceOverlay('ma_medium', 'Medium MA'), priceOverlay('ma_long', 'Long MA'), priceOverlay('ma_anchor', 'Anchor MA')], minimumHistory: 50, compute: indicatorLogic.movingAverageRibbon }),
  define({ backlogId: 'TRD-017', id: 'guppy-multiple-moving-average', name: 'Guppy Multiple Moving Average (GMMA)', ar: 'متوسطات جوبي المتعددة', description: 'Short and long EMA groups representing trader and investor horizons.', defaults: {}, rules: {}, outputs: [3, 5, 8, 10, 12, 15, 30, 35, 40, 45, 50, 60].map((period) => priceOverlay(`ema_${period}`, `EMA ${period}`)), minimumHistory: 60, compute: indicatorLogic.guppyMultipleMovingAverage }),
  define({ backlogId: 'TRD-018', id: 'moving-average-slope', name: 'Moving-average slope', ar: 'ميل المتوسط المتحرك', description: 'One-bar slope and percentage slope of a selected moving average.', defaults: { period: 20 }, rules: { period: integer() }, outputs: [pane('slope', 'Slope', 'price'), pane('normalized_slope', 'Normalized slope', 'percent')], minimumHistory: 21, compute: indicatorLogic.movingAverageSlope }),
  define({ backlogId: 'TRD-019', id: 'moving-average-distance', name: 'Moving-average distance', ar: 'المسافة من المتوسط المتحرك', description: 'Percentage distance between close and its moving average.', defaults: { period: 20 }, rules: { period: integer() }, outputs: [pane('distance_pct', 'Distance', 'percent')], minimumHistory: 20, compute: indicatorLogic.movingAverageDistance }),
  define({ backlogId: 'TRD-020', id: 'moving-average-spread', name: 'Moving-average spread', ar: 'فارق المتوسطات المتحركة', description: 'Absolute and percentage spread between fast and slow averages.', defaults: { fast: 12, slow: 26 }, rules: { fast: integer(), slow: integer() }, outputs: [pane('spread', 'Spread', 'price'), pane('spread_pct', 'Spread percentage', 'percent')], minimumHistory: 26, compute: indicatorLogic.movingAverageSpread }),
  define({ backlogId: 'TRD-021', id: 'moving-average-crossover', name: 'Moving-average crossover', ar: 'تقاطع المتوسطات المتحركة', description: 'Bullish and bearish events when fast and slow averages cross.', defaults: { fast: 12, slow: 26 }, rules: { fast: integer(), slow: integer() }, outputs: [event('cross_up', 'Bullish crossover'), event('cross_down', 'Bearish crossover')], minimumHistory: 27, compute: indicatorLogic.movingAverageCrossover }),
  define({ backlogId: 'TRD-022', id: 'moving-average-compression', name: 'Moving-average compression', ar: 'انضغاط المتوسطات المتحركة', description: 'Percentage width of a four-average ribbon.', defaults: { short: 5, medium: 10, long: 20, anchor: 50 }, rules: { short: integer(), medium: integer(), long: integer(), anchor: integer() }, outputs: [pane('compression_pct', 'Compression', 'percent')], minimumHistory: 50, compute: indicatorLogic.movingAverageCompression }),
  define({ backlogId: 'TRD-023', id: 'moving-average-trend-score', name: 'Moving-average trend score', ar: 'درجة اتجاه المتوسطات', description: 'Counts bullish or bearish ordering across a moving-average ribbon.', defaults: {}, rules: {}, outputs: [pane('score', 'Trend score', 'count'), category('alignment_state', 'Alignment state')], minimumHistory: 50, compute: indicatorLogic.movingAverageTrendScore }),
  define({ backlogId: 'TRD-024', id: 'macd', name: 'MACD', ar: 'مؤشر تقارب وتباعد المتوسطات', description: 'Difference between fast and slow EMAs with signal and histogram.', defaults: { fast: 12, slow: 26, signal: 9 }, rules: { fast: integer(), slow: integer(), signal: integer() }, outputs: [pane('macd', 'MACD', 'price'), pane('signal', 'Signal', 'price'), pane('histogram', 'Histogram', 'price')], minimumHistory: 34, compute: indicatorLogic.macd }),
  define({ backlogId: 'TRD-025', id: 'percentage-price-oscillator', name: 'Percentage Price Oscillator (PPO)', ar: 'مذبذب السعر النسبي', description: 'Fast-versus-slow EMA spread expressed as a percentage.', defaults: { fast: 12, slow: 26, signal: 9 }, rules: { fast: integer(), slow: integer(), signal: integer() }, outputs: [pane('ppo', 'PPO', 'percent'), pane('signal', 'Signal', 'percent'), pane('histogram', 'Histogram', 'percent')], minimumHistory: 34, compute: indicatorLogic.percentagePriceOscillator }),
  define({ backlogId: 'TRD-026', id: 'percentage-volume-oscillator', name: 'Percentage Volume Oscillator (PVO)', ar: 'مذبذب الحجم النسبي', description: 'Fast-versus-slow volume EMA spread expressed as a percentage.', requiredFields: ['volume'], defaults: { fast: 12, slow: 26, signal: 9 }, rules: { fast: integer(), slow: integer(), signal: integer() }, outputs: [pane('pvo', 'PVO', 'percent'), pane('signal', 'Signal', 'percent'), pane('histogram', 'Histogram', 'percent')], minimumHistory: 34, compute: indicatorLogic.percentageVolumeOscillator }),
  define({ backlogId: 'TRD-027', id: 'trix', name: 'TRIX', ar: 'مؤشر تريكس', description: 'One-bar rate of change of a triple-smoothed EMA.', defaults: { period: 15, signal: 9 }, rules: { period: integer(), signal: integer() }, outputs: [pane('trix', 'TRIX', 'percent'), pane('signal', 'Signal', 'percent')], minimumHistory: 45, compute: indicatorLogic.trix }),
  define({ backlogId: 'TRD-028', id: 'aroon', name: 'Aroon', ar: 'مؤشر أرون', description: 'Recency of rolling highs and lows.', requiredFields: ['high', 'low'], defaults: { period: 14 }, rules: { period: integer() }, outputs: [pane('aroon_up', 'Aroon Up', 'percent'), pane('aroon_down', 'Aroon Down', 'percent'), pane('oscillator', 'Aroon Oscillator', 'percent')], minimumHistory: 15, compute: indicatorLogic.aroon }),
  define({ backlogId: 'TRD-029', id: 'vortex-indicator', name: 'Vortex Indicator', ar: 'مؤشر الدوامة', description: 'Positive and negative trend movement normalized by true range.', requiredFields: ['high', 'low', 'close'], defaults: { period: 14 }, rules: { period: integer() }, outputs: [pane('vi_plus', 'VI+', 'dimensionless'), pane('vi_minus', 'VI−', 'dimensionless')], minimumHistory: 15, compute: indicatorLogic.vortexIndicator }),
  define({ backlogId: 'TRD-030', id: 'directional-movement-index', name: 'Directional Movement Index (DMI)', ar: 'مؤشر الحركة الاتجاهية', description: 'Positive and negative directional pressure.', requiredFields: ['high', 'low', 'close'], defaults: { period: 14 }, rules: { period: integer() }, outputs: [pane('plus_di', '+DI', 'percent'), pane('minus_di', '−DI', 'percent')], minimumHistory: 15, compute: indicatorLogic.directionalMovementIndex }),
  define({ backlogId: 'TRD-031', id: 'average-directional-index', name: 'Average Directional Index (ADX)', ar: 'متوسط مؤشر الحركة الاتجاهية', description: 'Trend strength derived from directional movement.', requiredFields: ['high', 'low', 'close'], defaults: { period: 14 }, rules: { period: integer() }, outputs: [pane('adx', 'ADX', 'percent'), pane('plus_di', '+DI', 'percent'), pane('minus_di', '−DI', 'percent')], minimumHistory: 28, compute: indicatorLogic.averageDirectionalIndex }),
  define({ backlogId: 'TRD-032', id: 'adx-rating', name: 'ADX Rating (ADXR)', ar: 'تصنيف متوسط الحركة الاتجاهية', description: 'Average of current ADX and ADX one period earlier.', requiredFields: ['high', 'low', 'close'], defaults: { period: 14 }, rules: { period: integer() }, outputs: [pane('adxr', 'ADXR', 'percent')], minimumHistory: 42, compute: indicatorLogic.adxRating }),
  define({ backlogId: 'TRD-033', id: 'supertrend', name: 'Supertrend', ar: 'سوبر ترند', description: 'ATR-based trailing trend line and direction state.', requiredFields: ['high', 'low', 'close'], defaults: { period: 10, multiplier: 3 }, rules: { period: integer(), multiplier: number(0.1, 20) }, outputs: [priceOverlay('line', 'Supertrend'), category('direction', 'Direction', 'overlay')], minimumHistory: 10, compute: indicatorLogic.supertrend }),
  define({ backlogId: 'TRD-034', id: 'parabolic-sar', name: 'Parabolic SAR', ar: 'مؤشر الوقف والانعكاس المكافئ', description: 'Accelerating trend-following stop and reversal line.', requiredFields: ['high', 'low', 'close'], defaults: { stepPct: 2, maximumPct: 20 }, rules: { stepPct: number(0.1, 20), maximumPct: number(1, 100) }, outputs: [priceOverlay('sar', 'SAR'), category('direction', 'Direction', 'overlay')], minimumHistory: 3, compute: indicatorLogic.parabolicSar }),
  define({ backlogId: 'TRD-035', id: 'ichimoku-cloud', name: 'Ichimoku Cloud', ar: 'سحابة إيشيموكو', description: 'Conversion, base, leading-span, and lagging lines.', requiredFields: ['high', 'low', 'close'], defaults: { conversion: 9, base: 26, span: 52, displacement: 26 }, rules: { conversion: integer(), base: integer(), span: integer(), displacement: integer() }, outputs: [priceOverlay('tenkan', 'Tenkan-sen'), priceOverlay('kijun', 'Kijun-sen'), priceOverlay('span_a', 'Senkou Span A'), priceOverlay('span_b', 'Senkou Span B'), priceOverlay('chikou', 'Chikou Span')], minimumHistory: 52, compute: indicatorLogic.ichimokuCloud }),
  define({ backlogId: 'TRD-036', id: 'donchian-trend-state', name: 'Donchian Trend State', ar: 'حالة اتجاه دونشيان', description: 'Rolling price channel with breakout state.', requiredFields: ['high', 'low', 'close'], defaults: { period: 20 }, rules: { period: integer() }, outputs: [priceOverlay('upper', 'Upper'), priceOverlay('lower', 'Lower'), priceOverlay('middle', 'Middle'), category('breakout_state', 'Breakout state', 'overlay')], minimumHistory: 21, compute: indicatorLogic.donchianTrendState }),
  define({ backlogId: 'TRD-037', id: 'chandelier-trend-state', name: 'Chandelier Trend State', ar: 'حالة اتجاه تشاندلير', description: 'ATR trailing lines anchored to rolling extremes.', requiredFields: ['high', 'low', 'close'], defaults: { period: 22, multiplier: 3 }, rules: { period: integer(), multiplier: number(0.1, 20) }, outputs: [priceOverlay('long_stop', 'Long stop'), priceOverlay('short_stop', 'Short stop')], minimumHistory: 22, compute: indicatorLogic.chandelierTrendState }),
  define({ backlogId: 'TRD-038', id: 'trend-intensity-index', name: 'Trend Intensity Index (TII)', ar: 'مؤشر شدة الاتجاه', description: 'Share of rolling absolute deviation occurring above a moving average.', defaults: { period: 30 }, rules: { period: integer(2) }, outputs: [pane('tii_0_100', 'TII', 'percent')], minimumHistory: 45, compute: indicatorLogic.trendIntensityIndex }),
  define({ backlogId: 'TRD-039', id: 'vertical-horizontal-filter', name: 'Vertical Horizontal Filter (VHF)', ar: 'مرشح الاتجاه الأفقي والرأسي', description: 'Rolling price range divided by cumulative absolute movement.', defaults: { period: 28 }, rules: { period: integer(2) }, outputs: [pane('vhf', 'VHF')], minimumHistory: 29, compute: indicatorLogic.verticalHorizontalFilter }),
  define({ backlogId: 'TRD-040', id: 'mass-index', name: 'Mass Index', ar: 'مؤشر الكتلة', description: 'Sum of ratios between single- and double-smoothed trading ranges.', requiredFields: ['high', 'low'], defaults: { emaPeriod: 9, sumPeriod: 25 }, rules: { emaPeriod: integer(), sumPeriod: integer() }, outputs: [pane('mass_index', 'Mass Index')], minimumHistory: 41, compute: indicatorLogic.massIndex }),
]);

export const TREND_DEFINITIONS_BY_ID = new Map(
  TREND_DEFINITIONS.map((definition) => [definition.id, definition] as const),
);
