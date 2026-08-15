import type { Metadata, Viewport } from "next";
import ServiceWorkerRegistration from "@/components/platform/ServiceWorkerRegistration";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuantEGX | Trading Platform",
  description: "Advanced EGX Trading Platform",
};

export const viewport: Viewport = {
  themeColor: "#0F0F0F",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
