import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import ServiceWorkerRegistration from "@/components/platform/ServiceWorkerRegistration";
import NativeBridgeProvider from "@/components/platform/NativeBridgeProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const APP_THEME_COLOR = "black";

export const metadata: Metadata = {
  title: "Ticknal | Trading Platform",
  description: "Advanced EGX Trading Platform",
  icons: {
    icon: [
      { url: "/Ticknal_icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "mobile-web-app-capable": "yes",
    "msapplication-navbutton-color": APP_THEME_COLOR,
    "theme-color": APP_THEME_COLOR,
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
      className={`${geistSans.variable} h-full antialiased font-sans bg-plt-base`}
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
