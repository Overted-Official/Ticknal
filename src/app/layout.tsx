import type { Metadata, Viewport } from "next";
import { Geist, Spectral } from "next/font/google";
import ServiceWorkerRegistration from "@/components/platform/ServiceWorkerRegistration";
import NativeBridgeProvider from "@/components/platform/NativeBridgeProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const spectral = Spectral({
  variable: "--font-spectral",
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
});

const APP_THEME_COLOR = "black";


export const metadata: Metadata = {
  title: "Ticknal — The Hyperintelligent Quantitative Trading Platform",
  description: "Algorithmic signals, proprietary PSI & Thoth models, live EGX ingestion, and institutional risk analytics for high-conviction traders.",
  icons: {
    icon: [
      { url: "/Ticknal_icon.svg?v=2", type: "image/svg+xml" },
      { url: "/favicon.ico?v=2", sizes: "any" },
      { url: "/icon-192x192.png?v=2", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png?v=2", sizes: "512x512", type: "image/png" },
    ],
    shortcut: ["/favicon.ico?v=2"],
    apple: [
      { url: "/apple-touch-icon.png?v=2", sizes: "180x180", type: "image/png" },
      { url: "/icon-192x192.png?v=2", sizes: "192x192", type: "image/png" },
    ],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "mobile-web-app-capable": "yes",
    "msapplication-navbutton-color": APP_THEME_COLOR,
    "theme-color": APP_THEME_COLOR,
    "msapplication-TileImage": "/icon-144x144.png?v=2",
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${spectral.variable} h-full antialiased font-sans bg-plt-base`}
      suppressHydrationWarning
    >

      <body
        className="min-h-full flex flex-col font-sans bg-plt-base text-plt-text"
        suppressHydrationWarning
      >
        {children}
        <ServiceWorkerRegistration />
        <NativeBridgeProvider />
      </body>
    </html>
  );
}
