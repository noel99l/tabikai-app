import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";
import { ToastProvider } from "@/components/toast";

export const metadata: Metadata = {
  title: "突然の旅会アプリ",
  description: "団体旅行企画のイベント・費用管理アプリ「突然の旅会アプリ」",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "旅会アプリ",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icon-180.png", // iOS ホーム画面アイコン
  },
};

export const viewport: Viewport = {
  themeColor: "#ffdc4a",
  width: "device-width",
  initialScale: 1,
  // ホーム画面PWAで env(safe-area-inset-*) を有効にする(ホームインジケータとの重なり回避)
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className="font-sans">
        <PwaRegister />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
