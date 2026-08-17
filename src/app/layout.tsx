import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ServiceWorkerRegistration from "@/components/platform/ServiceWorkerRegistration";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QuantEGX | Trading Platform",
  description: "Advanced EGX Trading Platform",
  icons: {
    icon: [
      { url: "/QuantEGX_icon.svg", type: "image/svg+xml" },
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
    "msapplication-navbutton-color": "#000000",
    "theme-color": "#000000",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#000000" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased font-sans bg-black`}
      style={{ backgroundColor: "#000000", colorScheme: "dark" }}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col font-sans bg-black text-white"
        style={{ backgroundColor: "#000000", colorScheme: "dark" }}
        suppressHydrationWarning
      >
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
