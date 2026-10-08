import type { Metadata, Viewport } from "next";
import { Geist, Spectral, Cairo } from "next/font/google";
import ServiceWorkerRegistration from "@/components/platform/ServiceWorkerRegistration";
import NativeBridgeProvider from "@/components/platform/NativeBridgeProvider";
import TelemetryTracker from "@/components/telemetry/TelemetryTracker";
import { LocaleProvider } from "@/lib/i18n";
import { getServerLocale, getServerDirection } from "@/lib/i18n/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const spectral = Spectral({
  variable: "--font-spectral",
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
});

const APP_THEME_COLOR = "#000000";


export const metadata: Metadata = {
  title: "Ticknal — The Hyperintelligent Quantitative Trading Platform",
  description: "Algorithmic signals, proprietary PSI & Thoth models, live EGX ingestion, and institutional risk analytics for high-conviction traders.",
  icons: {
    icon: [
      { url: "/Ticknal_icon.svg?v=4", type: "image/svg+xml" },
      { url: "/favicon.ico?v=4", sizes: "any" },
      { url: "/icon-192x192.png?v=4", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png?v=4", sizes: "512x512", type: "image/png" },
    ],
    shortcut: ["/favicon.ico?v=4"],
    apple: [
      { url: "/apple-touch-icon.png?v=4", sizes: "180x180", type: "image/png" },
      { url: "/icon-192x192.png?v=4", sizes: "192x192", type: "image/png" },
    ],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "mobile-web-app-capable": "yes",
    "msapplication-navbutton-color": APP_THEME_COLOR,
    "theme-color": APP_THEME_COLOR,
    "msapplication-TileImage": "/icon-144x144.png?v=4",
    "msapplication-TileColor": "#000000",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: APP_THEME_COLOR },
    { media: "(prefers-color-scheme: dark)", color: APP_THEME_COLOR },
  ],
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getServerLocale();
  const dir = getServerDirection(locale);

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${geistSans.variable} ${cairo.variable} ${spectral.variable} h-full antialiased font-sans bg-plt-base`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col font-sans bg-plt-base text-plt-text overflow-x-hidden max-w-full"
        suppressHydrationWarning
      >
        <LocaleProvider initialLocale={locale}>
          <TelemetryTracker />
          {children}
          <ServiceWorkerRegistration />
          <NativeBridgeProvider />
        </LocaleProvider>
      </body>
    </html>
  );
}
