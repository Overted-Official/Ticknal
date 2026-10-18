'use client';

import React, { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Share2,
} from '@/components/ui/icon-library';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useTranslation } from '@/lib/i18n';
import type { MarketNewsItemDTO } from '@/lib/news/news-service';

interface SocialSharePopoverProps {
  item: MarketNewsItemDTO;
  displayTitle: string;
  displayText: string;
  isArabic: boolean;
  wideUrl?: string | null;
  squareUrl?: string | null;
  trigger?: React.ReactNode;
}

export default function SocialShareModal({
  item,
  displayTitle,
  displayText,
  isArabic,
  wideUrl,
  squareUrl,
  trigger,
}: SocialSharePopoverProps) {
  const { locale } = useTranslation();
  const isAr = isArabic || locale === 'ar';
  const [copiedState, setCopiedState] = useState<'all' | 'link' | 'image' | 'x' | 'linkedin' | 'facebook' | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const isTake = item.category === 'ticknal_take' || item.source.toLowerCase().includes('ticknal');
  const branding = isTake ? (isAr ? 'نبض تكنال' : 'Ticknal take') : item.source;

  const langParam = isAr ? 'ar' : 'en';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ticknal.com';
  const shareUrl = `${origin}/news?item=${encodeURIComponent(item.id)}${isAr ? '&lang=ar' : ''}`;
  const publicShareUrl = `https://ticknal.com/news?item=${encodeURIComponent(item.id)}${isAr ? '&lang=ar' : ''}`;
  const ogPngEndpoint = `/api/news/og?id=${encodeURIComponent(item.id)}&lang=${langParam}&variant=wide`;
  const previewImgSrc = wideUrl || squareUrl || ogPngEndpoint;

  const tickerHashtags = (item.tickers || [])
    .map((t) => `#${t.replace(/[^a-zA-Z0-9]/g, '')}`)
    .filter((t) => t.length > 1)
    .join(' ');

  const cleanHeadline = (displayTitle || item.title.split(/\s*---AR---\s*|\s*\|\|\|\s*/)[0] || '').trim();
  const cleanBody = (displayText || item.summary.split(/\s*---AR---\s*|\s*\|\|\|\s*/)[0] || '').trim();

  // Full social post text (Active language only — never duplicated)
  const fullSocialText = `${isTake ? '⚡ ' : '📰 '}${branding} — ${cleanHeadline}

${cleanBody}

${tickerHashtags ? `${tickerHashtags} ` : ''}#EGX #البورصة_المصرية #Ticknal
${publicShareUrl}`;

  // Concise X / Twitter post text so URL + text fits comfortably
  const shortBody = cleanBody.length > 180 ? `${cleanBody.slice(0, 177)}…` : cleanBody;
  const xIntentText = `${isTake ? '⚡ ' : '📰 '}${branding}: ${cleanHeadline}\n\n${shortBody}\n\n${tickerHashtags ? `${tickerHashtags} ` : ''}#EGX #Ticknal`;

  const flashCopied = (type: typeof copiedState) => {
    setCopiedState(type);
    setTimeout(() => setCopiedState(null), 2400);
  };

  const fetchPngBlob = async (): Promise<Blob | null> => {
    try {
      const res = await fetch(ogPngEndpoint);
      if (!res.ok) return null;
      return await res.blob();
    } catch {
      return null;
    }
  };

  // Copies both the PNG image (when supported by browser clipboard) AND/OR text+link
  const handleCopyPostAndImage = async () => {
    try {
      await navigator.clipboard.writeText(fullSocialText);
      flashCopied('all');
    } catch (err) {
      console.warn('Clipboard copy error:', err);
    }
  };

  const handleCopyImageOnly = async () => {
    try {
      setIsDownloading(true);
      const pngBlob = await fetchPngBlob();
      if (pngBlob && typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': pngBlob,
          }),
        ]);
        flashCopied('image');
      } else {
        await handleDownloadPng();
      }
    } catch {
      await handleDownloadPng();
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadPng = async () => {
    try {
      setIsDownloading(true);
      const pngBlob = await fetchPngBlob();
      if (pngBlob) {
        const blobUrl = URL.createObjectURL(pngBlob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `ticknal-${item.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } else if (previewImgSrc) {
        const link = document.createElement('a');
        link.href = previewImgSrc;
        link.download = `ticknal-${item.id}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      flashCopied('link');
    } catch {}
  };

  // Native Web Share API with PNG image file + text + redirect link
  const handleNativeShare = async () => {
    try {
      const pngBlob = await fetchPngBlob();
      if (pngBlob && navigator.canShare) {
        const file = new File([pngBlob], `ticknal-${item.id}.png`, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: cleanHeadline,
            text: `${cleanHeadline}\n\n${cleanBody}`,
            url: shareUrl,
            files: [file],
          });
          return;
        }
      }
      if (navigator.share) {
        await navigator.share({
          title: cleanHeadline,
          text: `${cleanHeadline}\n\n${cleanBody}`,
          url: shareUrl,
        });
        return;
      }
      await handleCopyPostAndImage();
    } catch {
      // User cancelled share sheet
    }
  };

  const handleShareX = async () => {
    try {
      await navigator.clipboard.writeText(fullSocialText);
      flashCopied('x');
    } catch {}
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(xIntentText)}&url=${encodeURIComponent(publicShareUrl)}`;
    window.open(intentUrl, '_blank', 'noopener,noreferrer,width=600,height=520');
  };

  const handleShareLinkedIn = async () => {
    try {
      await navigator.clipboard.writeText(fullSocialText);
      flashCopied('linkedin');
    } catch {}
    const intentUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicShareUrl)}`;
    window.open(intentUrl, '_blank', 'noopener,noreferrer,width=620,height=560');
  };

  const handleShareFacebook = async () => {
    try {
      await navigator.clipboard.writeText(fullSocialText);
      flashCopied('facebook');
    } catch {}
    const intentUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicShareUrl)}&quote=${encodeURIComponent(fullSocialText)}`;
    window.open(intentUrl, '_blank', 'noopener,noreferrer,width=620,height=540');
  };

  const handleShareWhatsApp = () => {
    const intentUrl = `https://wa.me/?text=${encodeURIComponent(fullSocialText)}`;
    window.open(intentUrl, '_blank', 'noopener,noreferrer');
  };

  const handleShareTelegram = () => {
    const intentUrl = `https://t.me/share/url?url=${encodeURIComponent(publicShareUrl)}&text=${encodeURIComponent(`${isTake ? '⚡ ' : '📰 '}${branding} — ${cleanHeadline}\n\n${cleanBody}`)}`;
    window.open(intentUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger || (
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="h-7 px-2 sm:px-2.5 rounded-[8px] border border-plt-border bg-plt-base hover:bg-plt-hover hover:border-plt-border-soft transition-all flex items-center gap-1.5 text-plt-subtle hover:text-plt-text cursor-pointer select-none text-[11.5px] font-medium shrink-0"
            title={isAr ? 'مشاركة المنشور' : 'Share Post'}
          >
            <Share2 size={13} className="text-plt-subtle shrink-0" />
            <span className="hidden sm:inline">{isAr ? 'نشر' : 'Social'}</span>
          </button>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={8}
        showArrow
        onClick={(e) => e.stopPropagation()}
        className="w-[340px] sm:w-[380px] p-3.5 bg-black border border-plt-border text-plt-text rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] space-y-3 font-sans select-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-plt-text">
              {isAr ? 'مشاركة البطاقة والمنشور' : 'Share Social Card & Post'}
            </span>
          </div>
          <span className="text-[10px] text-plt-faint font-medium px-1.5 py-0.5 rounded bg-plt-hover border border-plt-border-soft">
            {isAr ? 'صورة + نص + رابط' : 'Image + Text + Link'}
          </span>
        </div>

        {/* Rich Social Link Card Preview (Facebook / LinkedIn / X Unfurl Style) */}
        <div className="rounded-lg overflow-hidden border border-plt-border bg-black">
          <div className="w-full aspect-[16/9] bg-black overflow-hidden relative border-b border-plt-border-soft">
            <img
              src={previewImgSrc}
              alt={cleanHeadline}
              className="w-full h-full object-cover block bg-black"
              loading="lazy"
            />
          </div>
          <div className="p-2.5 space-y-1 bg-black" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-between text-[10px] text-[#00BCE6] font-semibold">
              <span>ticknal.com/news</span>
              <ExternalLink size={10} className="text-plt-faint" />
            </div>
            <p className="text-[11.5px] font-semibold text-plt-text line-clamp-1 leading-snug">
              {cleanHeadline}
            </p>
            <p className="text-[10.5px] text-plt-muted line-clamp-2 leading-normal">
              {cleanBody}
            </p>
          </div>
        </div>

        {/* Direct Social Platform Share Buttons */}
        <div className="grid grid-cols-5 gap-1.5">
          <button
            type="button"
            onClick={handleShareX}
            className="h-8 rounded-lg border border-plt-border bg-plt-base hover:bg-plt-hover text-plt-text text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title="Share on X (Twitter)"
          >
            <span>X</span>
          </button>
          <button
            type="button"
            onClick={handleShareLinkedIn}
            className="h-8 rounded-lg border border-plt-border bg-plt-base hover:bg-plt-hover text-plt-text text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title="Share on LinkedIn"
          >
            <span>in</span>
          </button>
          <button
            type="button"
            onClick={handleShareFacebook}
            className="h-8 rounded-lg border border-plt-border bg-plt-base hover:bg-plt-hover text-plt-text text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title="Share on Facebook"
          >
            <span>FB</span>
          </button>
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="h-8 rounded-lg border border-plt-border bg-plt-base hover:bg-plt-hover text-emerald-400 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title="Share on WhatsApp"
          >
            <span>WA</span>
          </button>
          <button
            type="button"
            onClick={handleShareTelegram}
            className="h-8 rounded-lg border border-plt-border bg-plt-base hover:bg-plt-hover text-[#1d9bf0] text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title="Share on Telegram"
          >
            <span>TG</span>
          </button>
        </div>

        {/* Status Toast inside Popover when platform share copies caption */}
        {(copiedState === 'x' || copiedState === 'linkedin' || copiedState === 'facebook') && (
          <div className="px-2.5 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10.5px] font-medium flex items-center gap-1.5">
            <Check size={12} className="shrink-0" />
            <span>
              {isAr
                ? 'تم نسخ النص والرابط للحافظة! الصقه مباشرة في المنشور.'
                : 'Caption & link copied! Paste directly into your post.'}
            </span>
          </div>
        )}

        {/* Primary Action Buttons: Copy Text+Link, Copy PNG Image, Download PNG, Native Share */}
        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={handleCopyPostAndImage}
            className={`h-8 px-2.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              copiedState === 'all'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-white text-black hover:bg-neutral-200'
            }`}
          >
            {copiedState === 'all' ? <Check size={12} /> : <Copy size={12} />}
            <span>
              {copiedState === 'all'
                ? isAr
                  ? 'تم نسخ المنشور!'
                  : 'Copied Post + Link!'
                : isAr
                ? 'نسخ النص + الرابط'
                : 'Copy Text + Link'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleCopyImageOnly}
            disabled={isDownloading}
            className={`h-8 px-2.5 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              copiedState === 'image'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'border-plt-border bg-plt-base hover:bg-plt-hover text-plt-text'
            }`}
          >
            {copiedState === 'image' ? <Check size={12} /> : <Copy size={12} />}
            <span>
              {copiedState === 'image'
                ? isAr
                  ? 'تم نسخ الصورة!'
                  : 'Image Copied!'
                : isAr
                ? 'نسخ صورة البطاقة'
                : 'Copy Card Image'}
            </span>
          </button>
        </div>

        <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-plt-border-soft">
          <button
            type="button"
            onClick={handleCopyLink}
            className="h-7 px-2 rounded-md hover:bg-plt-hover text-[11px] text-plt-subtle hover:text-plt-text flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedState === 'link' ? (
              <Check size={11} className="text-emerald-400" />
            ) : (
              <ExternalLink size={11} />
            )}
            <span>
              {copiedState === 'link'
                ? isAr
                  ? 'تم نسخ الرابط'
                  : 'Link Copied'
                : isAr
                ? 'نسخ رابط المنشور'
                : 'Copy Direct Link'}
            </span>
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={isDownloading}
              className="h-7 px-2 rounded-md border border-plt-border-soft hover:border-plt-border bg-plt-base hover:bg-plt-hover text-[11px] text-plt-subtle hover:text-plt-text flex items-center gap-1 transition-colors cursor-pointer"
              title="Download PNG Card"
            >
              <Download size={11} />
              <span>PNG</span>
            </button>

            <button
              type="button"
              onClick={handleNativeShare}
              className="h-7 px-2 rounded-md border border-plt-border-soft hover:border-plt-border bg-plt-base hover:bg-plt-hover text-[11px] text-plt-subtle hover:text-plt-text flex items-center gap-1 transition-colors cursor-pointer"
              title="Share via Device Sheet"
            >
              <Share2 size={11} />
              <span>{isAr ? 'مشاركة' : 'Share'}</span>
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
