'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import TicknalBrand from '@/components/ui/TicknalBrand';
import { useTranslation } from '@/lib/i18n';

interface Review {
  id: string;
  quote: string;
  author: string;
  role: string;
}

const EN_REVIEWS: Review[] = [
  {
    id: 'ali-hassan',
    quote: '“This Platform has helped me to save time and serve my clients faster than ever before.”',
    author: 'Ali Hassan',
    role: 'Portfolio Manager',
  },
  {
    id: 'sarah-jenkins',
    quote: '“The automated strategy signals and market alerts cut through the daily noise. It completely transformed my routine.”',
    author: 'Sarah Jenkins',
    role: 'Active Swing Trader',
  },
  {
    id: 'omar-tarek',
    quote: '“Unbelievable depth in sector rotation analysis and real-time execution clarity. A must-have for serious investors.”',
    author: 'Omar Tarek',
    role: 'Investment Analyst',
  },
  {
    id: 'marcus-vance',
    quote: '“Replaced three separate data terminals with Ticknal. The speed, execution tools, and clean interface are in a league of their own.”',
    author: 'Marcus Vance',
    role: 'Private Wealth Investor',
  },
];

const AR_REVIEWS: Review[] = [
  {
    id: 'ali-hassan',
    quote: '“ساعدتني هذه المنصة على توفير الوقت وخدمة عملائي بسرعة وكفاءة لم أعهدها من قبل.”',
    author: 'علي حسن',
    role: 'مدير محافظ استثمارية',
  },
  {
    id: 'sarah-jenkins',
    quote: '“إشارات الاستراتيجيات الآلية وتنبيهات السوق تفلتر الضوضاء اليومية تماماً. لقد غيّرت روتين تداولي بالكامل.”',
    author: 'سارة جنكينز',
    role: 'متداولة نشطة',
  },
  {
    id: 'omar-tarek',
    quote: '“عمق استثنائي في تحليل دوران القطاعات ووضوح فوري في مستويات التنفيذ. أداة لا غنى عنها لكل مستثمر محترف.”',
    author: 'عمر طارق',
    role: 'محلل استثماري',
  },
  {
    id: 'marcus-vance',
    quote: '“استبدلت ثلاث منصات بيانات منفصلة بمنصة تكنال. السرعة وأدوات التحليل وواجهة الاستخدام في مستوى فريد وحدها.”',
    author: 'ماركوس فانس',
    role: 'مستثمر إدارة ثروات',
  },
];

export default function LoginLeftArtPanel() {
  const { locale, isRTL } = useTranslation();
  const [currentReviewIdx, setCurrentReviewIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const reviews = locale === 'ar' ? AR_REVIEWS : EN_REVIEWS;

  // Auto-advance reviews every 6s (pausing when hovered)
  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(() => {
      setCurrentReviewIdx((prev) => (prev + 1) % reviews.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isHovered, reviews.length]);

  // Curvature ribbon geometry
  const curves = [
    { id: 1, d: 'M -50,640 C 140,680 280,650 650,450', opacity: 0.08, width: 1, pulseSpeed: 10, pulseDelay: 0, hasPulse: true },
    { id: 2, d: 'M -50,660 C 145,700 290,665 650,465', opacity: 0.10, width: 1.2, pulseSpeed: 14, pulseDelay: 4, hasPulse: false },
    { id: 3, d: 'M -50,680 C 150,720 300,680 650,480', opacity: 0.13, width: 1.5, pulseSpeed: 9, pulseDelay: 1.5, hasPulse: true },
    { id: 4, d: 'M -50,700 C 160,740 320,690 650,510', opacity: 0.17, width: 1.5, pulseSpeed: 12, pulseDelay: 5.5, hasPulse: false },
    { id: 5, d: 'M -50,720 C 170,760 340,700 650,540', opacity: 0.22, width: 2.0, pulseSpeed: 8, pulseDelay: 0.5, hasPulse: true },
    { id: 6, d: 'M -50,740 C 180,780 360,710 650,570', opacity: 0.28, width: 2.2, pulseSpeed: 11, pulseDelay: 3, hasPulse: true },
    { id: 7, d: 'M -50,760 C 190,800 380,720 650,600', opacity: 0.20, width: 1.5, pulseSpeed: 9.5, pulseDelay: 7, hasPulse: false },
    { id: 8, d: 'M -50,780 C 200,820 400,730 650,630', opacity: 0.15, width: 1.5, pulseSpeed: 13, pulseDelay: 3.5, hasPulse: true },
    { id: 9, d: 'M -50,800 C 210,840 420,740 650,660', opacity: 0.11, width: 1.0, pulseSpeed: 10.5, pulseDelay: 8, hasPulse: false },
    { id: 10, d: 'M -50,820 C 220,860 440,750 650,690', opacity: 0.08, width: 1.0, pulseSpeed: 15, pulseDelay: 2, hasPulse: true },
    { id: 11, d: 'M -50,840 C 230,880 460,760 650,720', opacity: 0.06, width: 1.0, pulseSpeed: 12, pulseDelay: 5, hasPulse: false },
    { id: 12, d: 'M -50,860 C 240,900 480,770 650,750', opacity: 0.04, width: 1.0, pulseSpeed: 17, pulseDelay: 9, hasPulse: false },
  ];

  return (
    <div
      className={`hidden lg:flex flex-col justify-between w-1/2 min-h-screen p-12 xl:p-16 relative overflow-hidden bg-black ${
        isRTL ? 'border-l border-white/[0.08]' : 'border-r border-white/[0.08]'
      } select-none font-sans`}
    >
      {/* Background Graphic: Fine Sweeping Geometric Streamlines with Living Energy Flow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg
          viewBox="0 0 650 1000"
          preserveAspectRatio="none"
          className="w-full h-full object-cover"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Base static stroke gradient */}
            <linearGradient id="waveStroke" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.02" />
              <stop offset="40%" stopColor="#ffffff" stopOpacity="0.32" />
              <stop offset="80%" stopColor="#ffffff" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            {/* Glowing traveling energy pulse gradient */}
            <linearGradient id="wavePulseStroke" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.04" />
              <stop offset="35%" stopColor="#ffffff" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="65%" stopColor="#ffffff" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.04" />
            </linearGradient>

            {/* Radiant soft bloom filter for energy streaks */}
            <filter id="pulseGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Organic gentle undulation of the whole curve field */}
          <motion.g
            animate={{
              y: [0, -8, 2, 0],
              rotate: [0, -0.4, 0.2, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{ transformOrigin: '15% 70%' }}
          >
            {/* 1. Base Ribbon Lines */}
            {curves.map((curve) => (
              <path
                key={`base-${curve.id}`}
                d={curve.d}
                fill="none"
                stroke="url(#waveStroke)"
                strokeWidth={curve.width}
                strokeOpacity={curve.opacity}
              />
            ))}

            {/* 2. Soft-Tailed Animated Energy Pulses travelling along the curves */}
            {curves
              .filter((c) => c.hasPulse)
              .map((curve) => (
                <React.Fragment key={`pulse-group-${curve.id}`}>
                  {/* Outer soft feather tail */}
                  <motion.path
                    d={curve.d}
                    fill="none"
                    stroke="url(#wavePulseStroke)"
                    strokeWidth={curve.width + 1.2}
                    strokeLinecap="round"
                    strokeOpacity={0.35}
                    strokeDasharray="200 850"
                    initial={{ strokeDashoffset: 0 }}
                    animate={{ strokeDashoffset: -1050 }}
                    transition={{
                      duration: curve.pulseSpeed,
                      repeat: Infinity,
                      ease: 'linear',
                      delay: curve.pulseDelay,
                    }}
                  />

                  {/* Luminous core head */}
                  <motion.path
                    d={curve.d}
                    fill="none"
                    stroke="url(#wavePulseStroke)"
                    strokeWidth={curve.width + 0.5}
                    strokeLinecap="round"
                    filter="url(#pulseGlow)"
                    strokeDasharray="90 960"
                    initial={{ strokeDashoffset: 0 }}
                    animate={{ strokeDashoffset: -1050 }}
                    transition={{
                      duration: curve.pulseSpeed,
                      repeat: Infinity,
                      ease: 'linear',
                      delay: curve.pulseDelay,
                    }}
                  />
                </React.Fragment>
              ))}
          </motion.g>
        </svg>

        {/* Dynamic Ambient breathing backlight */}
        <motion.div
          animate={{
            opacity: [0.02, 0.05, 0.02],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute bottom-1/4 right-0 w-96 h-96 bg-white rounded-full blur-[130px] pointer-events-none"
        />

        <motion.div
          animate={{
            opacity: [0.03, 0.06, 0.03],
            scale: [1, 1.12, 1],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1.5,
          }}
          className="absolute bottom-16 left-6 w-80 h-80 bg-white rounded-full blur-[110px] pointer-events-none"
        />
      </div>

      {/* Top Left: Ticknal Brand Identity */}
      <div className="relative z-10">
        <TicknalBrand size="lg" />
      </div>

      {/* Bottom Left: Animated Testimonials / Reviews Carousel */}
      <div
        className="relative z-10 max-w-lg"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="min-h-[125px] flex flex-col justify-end">
          <AnimatePresence mode="wait">
            <motion.div
              key={reviews[currentReviewIdx].id}
              initial={{ opacity: 0, y: 8, filter: 'blur(3px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(3px)' }}
              transition={{
                duration: 0.35,
                ease: [0.4, 0, 0.2, 1],
              }}
            >
              <blockquote className="text-lg sm:text-xl font-normal text-zinc-100 leading-relaxed tracking-normal">
                {reviews[currentReviewIdx].quote}
              </blockquote>
              <div className="flex items-center gap-2 mt-3.5">
                <span className="text-sm font-medium text-white tracking-tight">
                  ~ {reviews[currentReviewIdx].author}
                </span>
                <span className="text-xs text-zinc-500 font-normal">
                  · {reviews[currentReviewIdx].role}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Minimalist Interactive Progress Pill Indicators */}
        <div className="flex items-center gap-2 mt-5">
          {reviews.map((review, idx) => {
            const isActive = idx === currentReviewIdx;
            return (
              <button
                key={review.id}
                type="button"
                onClick={() => setCurrentReviewIdx(idx)}
                className="group py-1 cursor-pointer focus:outline-none"
                aria-label={`View testimonial by ${review.author}`}
              >
                <div
                  className={`h-1 rounded-full transition-all duration-300 ${
                    isActive
                      ? 'w-7 bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]'
                      : 'w-2 bg-white/20 group-hover:bg-white/40'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

