import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeApplier } from "@/components/layout/ThemeApplier";
import { RootSyncWrapper } from "@/components/sync/RootSyncWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Growly — make every day count",
  description: "A modern habit tracker and personal growth platform with gamification and social accountability.",
  manifest: "/manifest.json",
};

// Applies the saved theme before first paint so there is no light/dark flash.
const noFlash = `(function(){try{
var raw=localStorage.getItem('growly.data.v1');
var mode='dark',accent='blue';
if(raw){var d=JSON.parse(raw),t=d&&d.settings&&d.settings.theme;if(t){mode=t.mode||'dark';accent=t.accent||'blue';}}
var resolved=mode==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):mode;
var A={blue:['#3b82f6','#60a5fa'],violet:['#8b5cf6','#a78bfa'],cyan:['#06b6d4','#22d3ee'],emerald:['#10b981','#34d399'],rose:['#f43f5e','#fb7185'],amber:['#f59e0b','#fbbf24']};
var a=A[accent]||A.blue,r=document.documentElement;
r.dataset.theme=resolved;r.style.colorScheme=resolved;
r.style.setProperty('--c-accent',a[0]);r.style.setProperty('--c-accent-glow',a[1]);
}catch(e){document.documentElement.dataset.theme='dark';}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="icon" type="image/svg+xml" href="/icon-192.svg" />
        <link rel="apple-touch-icon" href="/icon-192.svg" />
      </head>
      <body className="min-h-full">
        <Script
          id="theme-no-flash"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: noFlash }}
        />
        <Script
          id="register-sw"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `if("serviceWorker"in navigator){window.addEventListener("load",()=>{navigator.serviceWorker.register("/sw.js")})}`,
          }}
        />
        <ThemeApplier />
        <ErrorBoundary>
          <RootSyncWrapper>
            {children}
          </RootSyncWrapper>
        </ErrorBoundary>
      </body>
    </html>
  );
}
