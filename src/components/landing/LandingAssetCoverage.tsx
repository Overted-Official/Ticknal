'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronRight } from '@/components/ui/icon-library';
import { useTranslation } from '@/lib/i18n';
import type {
  LandingCoverageCard,
  LandingCoverageAsset,
} from '@/lib/server/landing-queries';

interface LandingAssetCoverageProps {
  initialCards?: LandingCoverageCard[];
}

const DEFAULT_REAL_CARDS: LandingCoverageCard[] = [
  {
    id: 'equities',
    category: 'Egyptian Equities',
    subtitle: 'Top performing EGX stocks by monthly return',
    ctaText: 'See all Egyptian stocks',
    ctaHref: '/markets',
    accentColor: '#089981',
    items: [
      {
        symbol: 'SWDY',
        name: 'Elsewedy Electric',
        sector: 'Industrial Goods',
        price: '120.00',
        unit: 'EGP',
        change: 14.29,
        badge: 'SWDY',
        type: 'stock',
        logoUrl: 'https://s3-symbol-logo.tradingview.com/elswedy-electric.svg',
        points: [108.5, 107.4, 108.4, 108.9, 110.6, 110.7, 112.1, 111.7, 114.1, 115.7, 115.8, 115.5, 115.7, 113.9, 117.2, 115.8, 115.0, 114.9, 114.6, 120.0],
      },
      {
        symbol: 'TMGH',
        name: 'Talaat Moustafa Group',
        sector: 'Real Estate',
        price: '87.70',
        unit: 'EGP',
        change: 0.83,
        badge: 'TMGH',
        type: 'stock',
        logoUrl: 'https://s3-symbol-logo.tradingview.com/t-m-g.svg',
        points: [78.2, 79.5, 80.1, 81.4, 80.8, 82.5, 83.2, 82.6, 84.1, 85.0, 84.5, 86.2, 85.8, 86.9, 87.5, 87.0, 86.8, 87.2, 87.4, 87.7],
      },
      {
        symbol: 'COMI',
        name: 'Commercial International Bank',
        sector: 'Banking',
        price: '127.69',
        unit: 'EGP',
        change: 1.10,
        badge: 'COMI',
        type: 'stock',
        logoUrl: 'https://s3-symbol-logo.tradingview.com/commercial-international-bank-egypt.svg',
        points: [120.5, 121.2, 121.0, 122.4, 123.0, 122.6, 123.8, 124.5, 124.0, 125.2, 125.8, 125.4, 126.1, 126.5, 126.2, 127.0, 127.2, 126.8, 127.4, 127.69],
      },
    ],
  },
  {
    id: 'funds',
    category: 'Mutual & Money Market Funds',
    subtitle: 'Top performing funds across Egyptian asset managers',
    ctaText: 'See all mutual funds',
    ctaHref: '/markets',
    accentColor: '#00E5FF',
    items: [
      {
        symbol: 'AFB',
        name: 'NBE Fund 1 (Balanced)',
        sector: 'Balanced Growth',
        price: '169.93',
        unit: 'EGP',
        change: 16.53,
        badge: 'AFB',
        type: 'fund',
        logoUrl: 'https://kshqrzzohabbsjipkunh.supabase.co/storage/v1/object/public/funds/1777508615629-t9msj6qwgbk.png',
        points: [145.8, 146.5, 147.2, 148.0, 149.4, 151.2, 150.8, 153.1, 154.5, 156.0, 155.4, 157.8, 159.2, 161.0, 162.5, 164.0, 165.8, 167.2, 168.5, 169.93],
      },
      {
        symbol: 'ADF',
        name: 'Al Ahly Dahab Fund',
        sector: 'Gold Fund',
        price: '175.91',
        unit: 'EGP',
        change: 0.13,
        badge: 'ADF',
        type: 'fund',
        logoUrl: 'https://kshqrzzohabbsjipkunh.supabase.co/storage/v1/object/public/funds/1777587912769-0m35y8f5lyg.png',
        points: [170.5, 171.2, 171.0, 171.8, 172.5, 172.2, 173.0, 173.6, 173.2, 174.0, 174.5, 174.2, 174.8, 175.2, 175.0, 175.5, 175.8, 175.6, 175.8, 175.91],
      },
      {
        symbol: 'AZG',
        name: 'Azimut Gold Fund',
        sector: 'Islamic Sharia Gold',
        price: '23.55',
        unit: 'EGP',
        change: 0.07,
        badge: 'AZG',
        type: 'fund',
        logoUrl: 'https://kshqrzzohabbsjipkunh.supabase.co/storage/v1/object/public/funds/1777538713543-q0uscbyqpyh.png',
        points: [22.8, 22.9, 23.0, 23.1, 23.0, 23.2, 23.3, 23.2, 23.4, 23.3, 23.4, 23.5, 23.4, 23.5, 23.4, 23.5, 23.5, 23.52, 23.54, 23.55],
      },
    ],
  },
  {
    id: 'metals',
    category: 'Precious Metals & Bullion',
    subtitle: 'Real-time Egyptian physical bullion benchmarks',
    ctaText: 'See all precious metals',
    ctaHref: '/markets',
    accentColor: '#f59e0b',
    items: [
      {
        symbol: 'GC1!',
        name: 'Gold',
        sector: 'Precious Metals',
        price: '7,010.71',
        unit: 'EGP / g',
        change: 5.80,
        badge: 'GC1!',
        type: 'metal',
        logoUrl: 'https://s3-symbol-logo.tradingview.com/metal/gold.svg',
        points: [6625, 6640, 6680, 6710, 6695, 6750, 6790, 6770, 6830, 6875, 6850, 6910, 6940, 6920, 6970, 6995, 6980, 7000, 7005, 7010.71],
      },
      {
        symbol: 'SI1!',
        name: 'Silver',
        sector: 'Precious Metals',
        price: '84.20',
        unit: 'EGP / g',
        change: 2.10,
        badge: 'SI1!',
        type: 'metal',
        logoUrl: 'https://s3-symbol-logo.tradingview.com/metal/silver.svg',
        points: [78.5, 79.1, 79.0, 80.2, 80.8, 80.5, 81.2, 81.8, 81.5, 82.1, 82.4, 82.0, 82.6, 83.0, 82.8, 83.4, 83.8, 83.5, 83.9, 84.2],
      },
      {
        symbol: 'EGX30',
        name: 'EGX 30 Benchmark',
        sector: 'Sovereign Index',
        price: '31,240.50',
        unit: 'PTS',
        change: 1.45,
        badge: 'EGX30',
        type: 'stock',
        logoUrl: '',
        points: [30100, 30250, 30180, 30420, 30580, 30510, 30720, 30890, 30800, 30950, 31020, 30980, 31100, 31180, 31120, 31200, 31250, 31210, 31230, 31240.5],
      },
    ],
  },
];

function buildSparklinePath(points: number[], width = 280, height = 75) {
  if (!points || points.length < 2) {
    return {
      path: `M 0,${height / 2} L ${width},${height / 2}`,
      lastPoint: { x: width, y: height / 2 },
    };
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const paddingY = 8;
  const usableHeight = height - paddingY * 2;

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - paddingY - ((p - min) / range) * usableHeight;
    return { x, y };
  });

  let d = `M ${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const curr = coords[i];
    const cpX1 = prev.x + (curr.x - prev.x) * 0.45;
    const cpY1 = prev.y;
    const cpX2 = curr.x - (curr.x - prev.x) * 0.45;
    const cpY2 = curr.y;
    d += ` C ${cpX1.toFixed(1)},${cpY1.toFixed(1)} ${cpX2.toFixed(1)},${cpY2.toFixed(1)} ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`;
  }

  return { path: d, lastPoint: coords[coords.length - 1] };
}

function ItemAvatar({ item, size = 'md' }: { item: LandingCoverageAsset; size?: 'sm' | 'md' }) {
  const [imgFailed, setImgFailed] = useState(false);
  const isSm = size === 'sm';
  const dimensionClass = isSm ? 'w-6 h-6' : 'w-9 h-9';
  const fontSize = isSm ? 'text-[9px]' : 'text-xs';

  if (item.logoUrl && !imgFailed) {
    return (
      <div className={`relative ${dimensionClass} rounded-full overflow-hidden bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.logoUrl}
          alt={item.symbol}
          className="w-full h-full object-contain p-0.5 rounded-full"
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative ${dimensionClass} rounded-full bg-white/[0.08] border border-white/15 flex items-center justify-center shrink-0 text-white font-bold ${fontSize} select-none`}
    >
      {item.badge ? item.badge.slice(0, 2) : item.symbol.slice(0, 2)}
    </div>
  );
}

function CategoryCard({
  card,
  index,
}: {
  card: LandingCoverageCard;
  index: number;
}) {
  const { locale } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hasEntered, setHasEntered] = useState(false);

  const selectedItem = card.items[selectedIndex] || card.items[0];
  const points = selectedItem?.points || [100, 105, 102, 110, 115, 118, 120];
  const isPositive = (selectedItem?.change ?? 0) >= 0;
  const sparkline = buildSparklinePath(points, 280, 80);

  const strokeColor = card.accentColor || (isPositive ? '#089981' : '#f23645');

  // Localized Titles and Subtitles
  const categoryTitle =
    card.id === 'equities'
      ? locale === 'ar'
        ? 'الأسهم المصرية'
        : card.category
      : card.id === 'funds'
      ? locale === 'ar'
        ? 'صناديق الاستثمار والسيولة'
        : card.category
      : card.id === 'metals'
      ? locale === 'ar'
        ? 'المعادن الثمينة والسبائك'
        : card.category
      : card.category;

  const categorySubtitle =
    card.id === 'equities'
      ? locale === 'ar'
        ? 'أفضل أسهم البورصة المصرية أداءً بالعائد الشهري'
        : card.subtitle
      : card.id === 'funds'
      ? locale === 'ar'
        ? 'أفضل الصناديق أداءً لدى مديري الأصول في مصر'
        : card.subtitle
      : card.id === 'metals'
      ? locale === 'ar'
        ? 'أسعار الذهب والفضة اللحظية في مصر'
        : card.subtitle
      : card.subtitle;

  const ctaLabel =
    card.id === 'equities'
      ? locale === 'ar'
        ? 'عرض جميع الأسهم المصرية'
        : card.ctaText
      : card.id === 'funds'
      ? locale === 'ar'
        ? 'عرض جميع صناديق الاستثمار'
        : card.ctaText
      : card.id === 'metals'
      ? locale === 'ar'
        ? 'عرض جميع المعادن والسبائك'
        : card.ctaText
      : card.ctaText;

  const listHeader =
    card.id === 'metals'
      ? locale === 'ar'
        ? 'المعادن الثمينة المرجعية'
        : 'Benchmark Precious Metals'
      : locale === 'ar'
      ? 'أفضل الأصول حسب العائد'
      : 'Top Assets by Return';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      onViewportEnter={() => setHasEntered(true)}
      transition={{ duration: 0.55, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="group relative flex flex-col justify-between rounded-[24px] bg-black border border-white/[0.08] hover:border-white/20 transition-all duration-300 p-5 sm:p-6 shadow-xl w-full"
    >
      <div>
        {/* Card Header: Category + Subtitle */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {categoryTitle}
            </h3>
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: card.accentColor || '#3b82f6' }}
            />
          </div>
          <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
            {categorySubtitle}
          </p>
        </div>

        {/* Featured Asset Showcase (Top selected item) */}
        <motion.div
          key={selectedItem.symbol}
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5 mb-3"
        >
          {/* Top Info Row */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <ItemAvatar item={selectedItem} size="md" />
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate">
                  {selectedItem.name}
                </div>
                <div className="text-[11px] text-zinc-400 font-medium">
                  {selectedItem.symbol}
                  {selectedItem.sector ? ` • ${selectedItem.sector}` : ''}
                </div>
              </div>
            </div>

            {/* Price & Change Badge */}
            <div className="flex flex-col items-end shrink-0">
              <div className="text-sm font-bold text-white tabular-nums">
                {selectedItem.price}
                {selectedItem.unit ? ` ${selectedItem.unit}` : ''}
              </div>
              <div
                className={`text-[11px] font-semibold tabular-nums ${
                  isPositive ? 'text-[#089981]' : 'text-[#f23645]'
                }`}
              >
                {isPositive ? '+' : ''}
                {selectedItem.change.toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Sparkline Graphic (1 Month Trend) */}
          <div className="relative w-full h-[85px] mt-1 pt-1 flex flex-col justify-end">
            <svg
              viewBox="0 0 280 80"
              preserveAspectRatio="none"
              className="w-full h-[65px] overflow-visible"
            >
              <defs>
                <linearGradient id={`grad-${card.id}-${selectedItem.symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={strokeColor} stopOpacity="0.32" />
                  <stop offset="85%" stopColor={strokeColor} stopOpacity="0.04" />
                  <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Area fill */}
              <motion.path
                d={`${sparkline.path} L 280,80 L 0,80 Z`}
                fill={`url(#grad-${card.id}-${selectedItem.symbol})`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              />

              {/* Glowing Stroke */}
              <motion.path
                d={sparkline.path}
                fill="none"
                stroke={strokeColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={hasEntered ? { pathLength: 1 } : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  duration: hasEntered ? 0 : 0.65,
                  delay: hasEntered ? 0 : index * 0.09 + 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
              />

              {/* Glowing Circular Dot at the end of the line */}
              <motion.circle
                cx={sparkline.lastPoint.x}
                cy={sparkline.lastPoint.y}
                r="5"
                fill={strokeColor}
                fillOpacity="0.35"
                initial={hasEntered ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  duration: hasEntered ? 0.2 : 0.3,
                  delay: hasEntered ? 0 : index * 0.09 + 0.55,
                }}
              />
              <motion.circle
                cx={sparkline.lastPoint.x}
                cy={sparkline.lastPoint.y}
                r="2.5"
                fill="#ffffff"
                stroke={strokeColor}
                strokeWidth="1.5"
                initial={hasEntered ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  duration: hasEntered ? 0.2 : 0.3,
                  delay: hasEntered ? 0 : index * 0.09 + 0.55,
                }}
              />
            </svg>

            {/* Timeframe Label */}
            <div className="text-[11px] font-medium text-zinc-500 text-center select-none pt-1">
              {locale === 'ar' ? 'شهر واحد' : '1 month'}
            </div>
          </div>
        </motion.div>

        {/* Market Signals-style Row Items */}
        <div className="mt-3 pt-2 border-t border-white/[0.06]">
          <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-2 pb-1.5">
            {listHeader}
          </div>

          <div className="divide-y divide-white/[0.06]">
            {card.items.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const itemPositive = item.change >= 0;

              return (
                <button
                  key={item.symbol}
                  type="button"
                  onClick={() => setSelectedIndex(idx)}
                  className={`group/row flex w-full min-w-0 items-center gap-3 px-2 py-2.5 transition-colors cursor-pointer text-left rtl:text-right rounded-lg ${
                    isSelected
                      ? 'bg-white/[0.08]'
                      : 'hover:bg-white/[0.04]'
                  }`}
                >
                  <ItemAvatar item={item} size="sm" />

                  {/* Middle & Right: Market Signals 2-line layout */}
                  <div className="min-w-0 flex-1">
                    {/* Line 1: Asset Name + Price */}
                    <div className="flex min-w-0 items-baseline justify-between gap-2">
                      <span
                        className={`min-w-0 truncate text-[13px] font-semibold transition-colors ${
                          isSelected
                            ? 'text-white'
                            : 'text-zinc-200 group-hover/row:text-blue-400'
                        }`}
                      >
                        {item.name}
                      </span>
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-white">
                        {item.price}
                        {item.unit ? ` ${item.unit}` : ''}
                      </span>
                    </div>

                    {/* Line 2: Symbol • Sector + ROI */}
                    <div className="mt-0.5 flex min-w-0 items-baseline justify-between gap-2 text-[11px]">
                      <span className="min-w-0 truncate text-zinc-400">
                        <span className="font-semibold text-zinc-300">
                          {item.symbol}
                        </span>
                        <span className="px-1 text-zinc-600">•</span>
                        <span>{item.sector}</span>
                      </span>
                      <span
                        className={`shrink-0 tabular-nums font-semibold ${
                          itemPositive ? 'text-[#089981]' : 'text-[#f23645]'
                        }`}
                      >
                        {itemPositive ? '+' : ''}
                        {item.change.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Call to action footer link */}
      <div className="mt-4 pt-3 border-t border-white/[0.06]">
        <Link
          href={card.ctaHref}
          className="text-xs sm:text-[13px] font-medium text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center gap-1 group/link cursor-pointer"
        >
          <span>{ctaLabel}</span>
          <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180 transition-transform group-hover/link:translate-x-0.5 rtl:group-hover/link:-translate-x-0.5" />
        </Link>
      </div>
    </motion.div>
  );
}

export default function LandingAssetCoverage({
  initialCards = [],
}: LandingAssetCoverageProps) {
  const { locale } = useTranslation();
  const [activeSlide, setActiveSlide] = useState(0);

  const cards = initialCards && initialCards.length > 0 ? initialCards : DEFAULT_REAL_CARDS;

  return (
    <section id="products" className="relative w-full bg-transparent py-16 sm:py-24 select-none font-sans overflow-hidden">
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col items-center text-center gap-2 mb-10 sm:mb-14 max-w-2xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="section-title text-center text-white"
          >
            <span>{locale === 'ar' ? 'ثلاث ركائز استثمارية. ' : 'Three Asset Pillars. '}</span>
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="inline-block bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(90deg, #0099ff 0%, #2962ff 50%, #a822ff 100%)',
              }}
            >
              {locale === 'ar' ? 'تغطية شاملة للسوق.' : 'Complete Market Coverage.'}
            </motion.span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="section-subtitle text-center text-zinc-400"
          >
            {locale === 'ar'
              ? 'تابع الأسهم المصرية الواعدة، وصناديق الاستثمار، والسبائك الذهبية مع بيانات تاريخية وأسعار لحظية مباشرة.'
              : 'Track high-conviction Egyptian equities, mutual funds, and physical bullion with historical benchmarks and real-time pricing.'}
          </motion.p>
        </div>

        {/* Responsive Layout: Desktop 3-Card Grid with compact gap | Mobile Swipable Carousel */}
        <div
          className="flex md:grid md:grid-cols-3 gap-2.5 lg:gap-3 w-full overflow-x-auto md:overflow-visible snap-x snap-mandatory pb-4 pt-1 px-4 sm:px-6 md:px-0 -mx-4 sm:-mx-6 md:mx-0 scrollbar-none"
          onScroll={(e) => {
            const container = e.currentTarget;
            const scrollLeft = container.scrollLeft;
            const itemWidth = container.offsetWidth * 0.84;
            const slide = Math.round(scrollLeft / itemWidth);
            setActiveSlide(Math.min(Math.max(slide, 0), 2));
          }}
        >
          {cards.map((card, index) => (
            <div
              key={card.id}
              className="w-[84vw] max-w-[340px] sm:w-[350px] md:w-full md:max-w-none shrink-0 snap-center"
            >
              <CategoryCard card={card} index={index} />
            </div>
          ))}
        </div>

        {/* Mobile Swipe Cue & Carousel Dots */}
        <div className="flex md:hidden flex-col items-center gap-2 mt-2">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeSlide === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/20'
                }`}
              />
            ))}
          </div>
          <span className="text-[11px] text-zinc-500 font-medium">
            {locale === 'ar' ? 'اسحب أفقياً لعرض المزيد' : 'Swipe sideways to view more'}
          </span>
        </div>
      </div>
    </section>
  );
}
