'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { useHeroSceneMode } from '@/components/landing/hero-scenes/useHeroSceneMode';
import { Check, ChevronDown, Search, X } from '@/components/ui/icon-library';

export interface StrategyTickerOption {
  readonly symbol: string;
  readonly companyName: string;
  readonly companyNameAr?: string;
  readonly logoUrl?: string | null;
  readonly sector?: string | null;
}

export const PRESET_STRATEGY_TICKERS: readonly StrategyTickerOption[] = [
  {
    symbol: 'COMI',
    companyName: 'Commercial International Bank',
    companyNameAr: 'البنك التجاري الدولي',
    logoUrl: 'https://s3-symbol-logo.tradingview.com/commercial-international-bank-egypt.svg',
    sector: 'Banking',
  },
  {
    symbol: 'SWDY',
    companyName: 'Elsewedy Electric',
    companyNameAr: 'السويدي إليكتريك',
    logoUrl: 'https://s3-symbol-logo.tradingview.com/elswedy-electric.svg',
    sector: 'Industrials',
  },
  {
    symbol: 'EAST',
    companyName: 'Eastern Company',
    companyNameAr: 'الشركة الشرقية - إيسترن كومباني',
    logoUrl: 'https://s3-symbol-logo.tradingview.com/eastern-company.svg',
    sector: 'Consumer Goods',
  },
  {
    symbol: 'TMGH',
    companyName: 'Talaat Moustafa Group Holding',
    companyNameAr: 'مجموعة طلعت مصطفى القابضة',
    logoUrl: 'https://s3-symbol-logo.tradingview.com/t-m-g.svg',
    sector: 'Real Estate',
  },
  {
    symbol: 'FWRY',
    companyName: 'Fawry for Banking & Payment Technology',
    companyNameAr: 'فوري لتكنولوجيا البنوك والمدفوعات',
    logoUrl: 'https://s3-symbol-logo.tradingview.com/fawry-for-banking-technology-and-electronic-payment.svg',
    sector: 'Fintech',
  },
  {
    symbol: 'ETEL',
    companyName: 'Telecom Egypt',
    companyNameAr: 'المصرية للاتصالات',
    logoUrl: 'https://s3-symbol-logo.tradingview.com/telecom-egypt.svg',
    sector: 'Telecommunications',
  },
  {
    symbol: 'ORAS',
    companyName: 'Orascom Construction PLC',
    companyNameAr: 'أوراسكوم كونستراكشون',
    logoUrl: 'https://s3-symbol-logo.tradingview.com/orascom-construction-plc.svg',
    sector: 'Construction',
  },
  {
    symbol: 'AMOC',
    companyName: 'Alexandria Mineral Oils Company',
    companyNameAr: 'الإسكندرية للزيوت المعدنية',
    logoUrl: 'https://s3-symbol-logo.tradingview.com/alexandria-mineral-oils-company.svg',
    sector: 'Energy',
  },
  {
    symbol: 'ESRS',
    companyName: 'Ezz Steel',
    companyNameAr: 'حديد عز',
    logoUrl: 'https://s3-symbol-logo.tradingview.com/basic-materials--big.svg',
    sector: 'Materials',
  },
  {
    symbol: 'EKHO',
    companyName: 'Egypt Kuwait Holding',
    companyNameAr: 'القابضة المصرية الكويتية',
    logoUrl: 'https://s3-symbol-logo.tradingview.com/egypt-kuwait-holding.svg',
    sector: 'Financial Services',
  },
  {
    symbol: 'HRHO',
    companyName: 'EFG Hermes Holding',
    companyNameAr: 'المجموعة المالية هيرميس',
    logoUrl: 'https://s3-symbol-logo.tradingview.com/efg-hermes-holding.svg',
    sector: 'Financial Services',
  },
  {
    symbol: 'ABUK',
    companyName: 'Abu Qir Fertilizers & Chemical Industries',
    companyNameAr: 'أبو قير للأسمدة والصناعات الكيماوية',
    logoUrl: 'https://s3-symbol-logo.tradingview.com/abu-qir-fertilizers.svg',
    sector: 'Chemicals',
  },
  {
    symbol: 'SKPC',
    companyName: 'Sidi Kerir Petrochemicals Company',
    companyNameAr: 'سيدي كرير للبتروكيماويات',
    logoUrl: 'https://s3-symbol-logo.tradingview.com/sidi-kerir-petrochemicals.svg',
    sector: 'Chemicals',
  },
  {
    symbol: 'MFPC',
    companyName: 'Misr Fertilizers Production Company (MOPCO)',
    companyNameAr: 'مصر لإنتاج الأسمدة (موبكو)',
    logoUrl: 'https://s3-symbol-logo.tradingview.com/misr-fertilizers-production.svg',
    sector: 'Chemicals',
  },
];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface StrategyTickerSearchSelectProps {
  readonly value: string;
  readonly onChange: (ticker: string) => void;
  readonly locale: 'en' | 'ar';
}

function TickerLogoAvatar({
  logoUrl,
  symbol,
  size = 28,
}: {
  readonly logoUrl?: string | null;
  readonly symbol: string;
  readonly size?: number;
}) {
  const [imgError, setImgError] = useState(false);

  if (logoUrl && !imgError) {
    return (
      <div
        className="rounded-full bg-white/10 border border-white/15 overflow-hidden flex items-center justify-center shrink-0 p-0.5"
        style={{ width: size, height: size }}
      >
        <img
          src={logoUrl}
          alt={symbol}
          className="w-full h-full object-contain rounded-full"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className="rounded-full bg-white/10 border border-white/15 flex items-center justify-center shrink-0 text-white/80 font-sans font-bold"
      style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.38)) }}
    >
      {symbol.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function StrategyTickerSearchSelect({
  value,
  onChange,
  locale,
}: StrategyTickerSearchSelectProps) {
  const isAr = locale === 'ar';
  const isLandingScene = useHeroSceneMode();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch all tickers from API for comprehensive EGX coverage
  const { data: apiTickers } = useSWR<
    Array<{ symbol: string; companyName?: string; logoUrl?: string; sector?: string }>
  >(isLandingScene ? null : '/api/tickers', fetcher, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
  });

  // Merge presets with API tickers
  const allTickers = useMemo<readonly StrategyTickerOption[]>(() => {
    const map = new Map<string, StrategyTickerOption>();

    // Start with presets (curated high-fidelity SVG logos & Arabic names)
    for (const preset of PRESET_STRATEGY_TICKERS) {
      map.set(preset.symbol.toUpperCase(), preset);
    }

    // Merge API tickers if available
    if (Array.isArray(apiTickers)) {
      for (const t of apiTickers) {
        const cleanSymbol = (t.symbol || '').replace('.CA', '').toUpperCase();
        if (!cleanSymbol) continue;
        const existing = map.get(cleanSymbol);
        if (existing) {
          if (!existing.logoUrl && t.logoUrl) {
            map.set(cleanSymbol, { ...existing, logoUrl: t.logoUrl });
          }
        } else {
          map.set(cleanSymbol, {
            symbol: cleanSymbol,
            companyName: t.companyName || cleanSymbol,
            logoUrl: t.logoUrl || null,
            sector: t.sector || null,
          });
        }
      }
    }

    return Array.from(map.values());
  }, [apiTickers]);

  // Find currently selected ticker
  const selectedTicker = useMemo<StrategyTickerOption>(() => {
    const clean = value.replace('.CA', '').toUpperCase();
    const found = allTickers.find((item) => item.symbol.toUpperCase() === clean);
    return (
      found ?? {
        symbol: clean,
        companyName: clean,
        logoUrl: null,
      }
    );
  }, [allTickers, value]);

  // Filter tickers by search input
  const filteredTickers = useMemo(() => {
    if (!searchTerm.trim()) return allTickers;
    const query = searchTerm.trim().toLowerCase();
    return allTickers.filter((item) => {
      const matchSymbol = item.symbol.toLowerCase().includes(query);
      const matchName = item.companyName.toLowerCase().includes(query);
      const matchNameAr = item.companyNameAr ? item.companyNameAr.toLowerCase().includes(query) : false;
      const matchSector = item.sector ? item.sector.toLowerCase().includes(query) : false;
      return matchSymbol || matchName || matchNameAr || matchSector;
    });
  }, [allTickers, searchTerm]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Focus search input when opened, reset search on close
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  // Keyboard navigation (Escape closes)
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  const selectedDisplayName =
    isAr && selectedTicker.companyNameAr ? selectedTicker.companyNameAr : selectedTicker.companyName;

  return (
    <div ref={containerRef} className="relative select-none">
      {/* Wider trigger button displaying circular Logo, Full company name & symbol */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={isAr ? 'اختر السهم' : 'Select ticker'}
        className={`flex h-10 w-56 sm:w-64 cursor-pointer items-center justify-between gap-2.5 rounded-xl border bg-black px-3 font-sans transition-all outline-none ${
          isOpen
            ? 'border-white/30 ring-1 ring-white/10'
            : 'border-plt-border hover:border-white/20'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1 text-left rtl:text-right">
          <TickerLogoAvatar
            logoUrl={selectedTicker.logoUrl}
            symbol={selectedTicker.symbol}
            size={24}
          />
          <div className="flex flex-col min-w-0 flex-1 leading-tight">
            <span className="text-xs font-semibold text-white truncate font-sans">
              {selectedDisplayName}
            </span>
            <span className="text-[10px] font-medium text-white/50 font-sans tabular-nums mt-0.5">
              {selectedTicker.symbol}
            </span>
          </div>
        </div>

        <ChevronDown
          size={14}
          className={`shrink-0 text-white/40 transition-transform duration-150 ml-1 rtl:mr-1 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu (Search input + format: circular Logo, Full name, symbol) */}
      {isOpen && (
        <div
          role="listbox"
          aria-label={isAr ? 'قائمة الأسهم' : 'Tickers list'}
          className="absolute end-0 top-full z-50 mt-1.5 w-72 sm:w-80 rounded-xl border border-white/15 bg-black p-2 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-100 space-y-1.5"
        >
          {/* Search field */}
          <div className="relative flex items-center">
            <Search
              size={13}
              className="absolute start-2.5 text-white/40 pointer-events-none"
            />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={isAr ? 'ابحث عن سهم أو اسم شركة...' : 'Search ticker or company name...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 w-full bg-white/[0.05] border border-white/10 rounded-lg ps-8 pe-7 text-xs font-sans text-white placeholder:text-white/40 focus:outline-none focus:border-white/30"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute end-2 p-1 text-white/40 hover:text-white cursor-pointer"
                aria-label={isAr ? 'مسح البحث' : 'Clear search'}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* List of Tickers */}
          <div className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar pr-0.5">
            {filteredTickers.length === 0 ? (
              <div className="py-6 text-center text-xs text-white/40 font-sans">
                {isAr ? `لا توجد أسهم مطابقة لـ "${searchTerm}"` : `No stocks matching "${searchTerm}"`}
              </div>
            ) : (
              filteredTickers.map((item) => {
                const isSelected = item.symbol.toUpperCase() === selectedTicker.symbol.toUpperCase();
                const displayName = isAr && item.companyNameAr ? item.companyNameAr : item.companyName;

                return (
                  <button
                    key={item.symbol}
                    role="option"
                    type="button"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(item.symbol);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-left rtl:text-right transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-white/10 border border-white/15'
                        : 'hover:bg-white/[0.06] text-white/80 hover:text-white'
                    }`}
                  >
                    {/* circular Logo   Full name
                                          symbol */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <TickerLogoAvatar
                        logoUrl={item.logoUrl}
                        symbol={item.symbol}
                        size={28}
                      />

                      <div className="flex flex-col min-w-0 flex-1 leading-tight">
                        <span className="text-xs font-semibold text-white truncate font-sans">
                          {displayName}
                        </span>
                        <span className="text-[10px] font-medium text-white/50 font-sans tabular-nums mt-0.5">
                          {item.symbol}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <Check size={14} className="text-plt-profit shrink-0 ml-1.5 rtl:mr-1.5" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer count */}
          <div className="pt-1.5 px-1 border-t border-white/[0.08] flex items-center justify-between text-[10px] text-white/40 font-sans">
            <span>
              {filteredTickers.length} {isAr ? 'سهم متاح' : `stock${filteredTickers.length !== 1 ? 's' : ''}`}
            </span>
            <span>{isAr ? 'البورصة المصرية EGX' : 'Egyptian Exchange'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
