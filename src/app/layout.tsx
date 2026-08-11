import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import ServiceWorkerRegistration from "@/components/platform/ServiceWorkerRegistration";
import "./globals.css";

const aeonikFont = Outfit({
  variable: "--font-aeonik",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QuantEGX | Trading Platform",
  description: "Advanced EGX Trading Platform",
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${aeonikFont.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
