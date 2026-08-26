'use client';

import Image from 'next/image';

const partners = [
  '/landing/6xI5kQjUKKrgVyRoUCVWR6cHX4.svg',
  '/landing/BRJNpifhR4jJOWtFwOgzXIxldb4.svg',
  '/landing/fBYQkJHyHc8lUdNjLz35Zirlj4o.svg',
  '/landing/LXyDxhsFoENCqFpmHWz2gATtns.svg',
  '/landing/MVdFFtR0dYqoAB8A0HprrBnhRw.svg',
  '/landing/MXcSKcz8KzfRW7rro51fxByzZBM.svg',
];

export default function TrustedBy() {
  return (
    <section className="py-12 overflow-hidden w-full max-w-full">
      <div className="max-w-248 w-full max-w-full min-w-0 mx-auto px-4 mb-6 text-center">
        <p className="text-xs font-medium text-plt-muted tracking-widest">
          Trusted By Industry Leaders & Institutional Desks
        </p>
      </div>

      <div className="relative flex overflow-hidden w-full max-w-full min-w-0 group">
        <div className="animate-marquee flex whitespace-nowrap items-center group-hover:pause">
          {[...partners, ...partners, ...partners].map((logo, idx) => (
            <div key={idx} className="mx-6 md:mx-12 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
              <Image src={logo} alt="Partner Logo" width={96} height={32} className="h-6 w-auto object-contain" />
            </div>
          ))}
        </div>
        <div className="animate-marquee flex whitespace-nowrap items-center absolute top-0 group-hover:pause">
          {[...partners, ...partners, ...partners].map((logo, idx) => (
            <div key={idx + 100} className="mx-6 md:mx-12 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
              <Image src={logo} alt="Partner Logo" width={96} height={32} className="h-6 w-auto object-contain" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
