'use client';

import Image from 'next/image';

const logos = [
  { name: 'Hawthorne', src: '/images/landing/Y8lOtnq1Ar9DpGXVGgvvwz818.svg', width: 128, height: 28 },
  { name: 'Westbridge', src: '/images/landing/bynHVo7ZvHysBYU8fxv4A87JLU.svg', width: 140, height: 28 },
  { name: 'Lattice', src: '/images/landing/rVnY8H86KzqwZXZe8e6z9JDA4.svg', width: 150, height: 28 },
  { name: 'Gantry', src: '/images/landing/RKHz1mTbGeFr3dPLIsJLak.svg', width: 110, height: 26 },
  { name: '53 CAPITAL', src: '/images/landing/YVvnfFSHAbI8EwOuHwLdToqCzBY.svg', width: 100, height: 22 },
  { name: 'NORTHRIDGE', src: '/images/landing/R4DQ1pneIOA2Hn64yiHexN2BgI.svg', width: 145, height: 24 },
  { name: 'Greythorn', src: '/images/landing/QtfbMcpLNJxzcqop0YvedvV2haA.svg', width: 155, height: 26 },
];

export default function TrustedBy() {
  return (
    <section className="py-12 sm:py-16 overflow-hidden w-full max-w-full bg-[#030303] relative border-b border-white/[0.06]">
      {/* Edge gradient fade masks */}
      <div className="absolute inset-y-0 left-0 w-24 sm:w-48 bg-gradient-to-r from-[#030303] to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-24 sm:w-48 bg-gradient-to-l from-[#030303] to-transparent z-10 pointer-events-none" />

      <div className="relative flex overflow-hidden w-full">
        <div className="animate-marquee flex items-center shrink-0">
          {[...logos, ...logos].map((logo, idx) => (
            <div
              key={idx}
              className="mx-8 sm:mx-14 shrink-0 opacity-55 hover:opacity-100 transition-opacity duration-300 filter brightness-125"
            >
              <Image
                src={logo.src}
                alt={logo.name}
                width={logo.width}
                height={logo.height}
                className="h-5 sm:h-6 w-auto object-contain filter invert brightness-200"
              />
            </div>
          ))}
        </div>
        <div className="animate-marquee flex items-center shrink-0" aria-hidden="true">
          {[...logos, ...logos].map((logo, idx) => (
            <div
              key={`dup-${idx}`}
              className="mx-8 sm:mx-14 shrink-0 opacity-55 hover:opacity-100 transition-opacity duration-300 filter brightness-125"
            >
              <Image
                src={logo.src}
                alt={logo.name}
                width={logo.width}
                height={logo.height}
                className="h-5 sm:h-6 w-auto object-contain filter invert brightness-200"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

