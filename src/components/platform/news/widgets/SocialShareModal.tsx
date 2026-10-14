'use client';

import React, { useState } from 'react';
import { Check, Copy, Download, X, Share2 } from '@/components/ui/icon-library';
import { useTranslation } from '@/lib/i18n';
import type { MarketNewsItemDTO } from '@/lib/news/news-service';

interface SocialShareModalProps {
  isOpen: boolean;
  item: MarketNewsItemDTO;
  imageUrl?: string | null;
  onClose: () => void;
}

export default function SocialShareModal({
  isOpen,
  item,
  imageUrl,
  onClose,
}: SocialShareModalProps) {
  const { locale } = useTranslation();
  const isAr = locale === 'ar';
  const [copiedType, setCopiedType] = useState<'twitter' | 'linkedin' | 'telegram' | null>(null);

  if (!isOpen) return null;

  const isTake = item.category === 'ticknal_take' || item.source.toLowerCase().includes('ticknal');
  const branding = isTake ? (isAr ? 'نبض تكنال' : 'Ticknal take') : item.source;

  const tickerHashtags = (item.tickers || [])
    .map((t) => `#${t.replace(/[^a-zA-Z0-9]/g, '')}`)
    .join(' ');

  // 1. Twitter / X Formatted Copy (Hook + Core Insight + Tickers + Hashtags)
  const twitterCopy = `${isTake ? '⚡ ' : '📰 '}${branding} | ${item.title}

${item.summary}

${tickerHashtags ? `${tickerHashtags} ` : ''}#EGX #البورصة_المصرية #Ticknal
https://ticknal.com/news?item=${item.id}`;

  // 2. LinkedIn / Telegram Formatted Copy (Detailed Executive Breakdown)
  const linkedinCopy = `📊 ${branding} — Market Intelligence Briefing
${item.title}

${item.summary}

Key Takeaways:
• Verified quantitative analysis by Ticknal Engine
• Tracked Assets: ${(item.tickers || []).join(', ') || 'EGX Equities'}

Explore the full algorithmic terminal: https://ticknal.com/news?item=${item.id}

#EGX #EgyptStockExchange #Trading #Finance #QuantitativeAnalysis #Ticknal`;

  const copyToClipboard = async (text: string, type: 'twitter' | 'linkedin' | 'telegram') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    } catch (err) {
      console.warn('Clipboard write error:', err);
    }
  };

  const handleDownloadCard = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `ticknal-${item.id}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 font-sans select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-black border border-white/15 rounded-xl shadow-2xl p-5 sm:p-6 text-white space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand-blue/20 text-brand-blue flex items-center justify-center">
              <Share2 size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isAr ? 'مشاركة المنشور على وسائل التواصل' : 'Copy for Social Media'}
              </h3>
              <p className="text-xs text-zinc-400">
                {isAr
                  ? 'منشورات جاهزة للنشر الفوري على منصات X ولينكدإن وتيليجرام مع بطاقة التحليل'
                  : 'Ready-to-paste posts formatted for X (Twitter), LinkedIn, and Telegram'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Visual Card Preview & Download Action */}
        {imageUrl && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">
                {isAr ? 'بطاقة التحليل الرسومية (16:9 HD)' : 'Infographic Social Card (16:9 HD)'}
              </span>
              <button
                type="button"
                onClick={handleDownloadCard}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-all cursor-pointer"
              >
                <Download size={13} />
                <span>{isAr ? 'تحميل الصورة' : 'Download Graphic'}</span>
              </button>
            </div>
            <div className="w-full rounded-lg overflow-hidden border border-white/10 bg-black aspect-video flex items-center justify-center">
              <img src={imageUrl} alt="" className="w-full h-full object-contain" />
            </div>
          </div>
        )}

        {/* Social Copy Templates */}
        <div className="space-y-3">
          {/* Twitter / X Box */}
          <div className="p-3.5 rounded-lg border border-white/10 bg-white/[0.02] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">X / Twitter</span>
                <span className="text-[10px] text-zinc-500 font-medium">(Optimized Hook + Tickers)</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(twitterCopy, 'twitter')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                  copiedType === 'twitter'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-white text-black hover:bg-neutral-200'
                }`}
              >
                {copiedType === 'twitter' ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedType === 'twitter' ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ لـ X' : 'Copy for X')}</span>
              </button>
            </div>
            <p className="text-xs text-zinc-300 line-clamp-3 font-sans leading-relaxed select-text">
              {twitterCopy}
            </p>
          </div>

          {/* LinkedIn Box */}
          <div className="p-3.5 rounded-lg border border-white/10 bg-white/[0.02] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">LinkedIn / Telegram</span>
                <span className="text-[10px] text-zinc-500 font-medium">(Executive Analysis + Bullets)</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(linkedinCopy, 'linkedin')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                  copiedType === 'linkedin'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-white/10 hover:bg-white/20 border border-white/20 text-white'
                }`}
              >
                {copiedType === 'linkedin' ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedType === 'linkedin' ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ لـ LinkedIn' : 'Copy for LinkedIn')}</span>
              </button>
            </div>
            <p className="text-xs text-zinc-300 line-clamp-3 font-sans leading-relaxed select-text">
              {linkedinCopy}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
