import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeApplier } from "@/components/ThemeApplier";
import { AppShell } from "@/components/layout/AppShell";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "project_101 — habit tracker",
  description: "A modern, spreadsheet-style habit & task tracker.",
};

// Applies the saved theme before first paint so there is no light/dark flash.
const noFlash = `(function(){try{
var raw=localStorage.getItem('project101.data.v1');
var mode='dark',accent='blue';
if(raw){var d=JSON.parse(raw),t=d&&d.settings&&d.settings.theme;if(t){mode=t.mode||'dark';accent=t.accent||'blue';}}
var resolved=mode==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):mode;
var A={blue:['#3b82f6','#60a5fa'],violet:['#8b5cf6','#a78bfa'],cyan:['#06b6d4','#22d3ee'],emerald:['#10b981','#34d399'],rose:['#f43f5e','#fb7185'],amber:['#f59e0b','#fbbf24']};
var a=A[accent]||A.blue,r=document.documentElement;
r.dataset.theme=resolved;r.style.colorScheme=resolved;
r.style.setProperty('--c-accent',a[0]);r.style.setProperty('--c-accent-glow',a[1]);
}catch(e){document.documentElement.dataset.theme='dark';}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlash }} />
      </head>
      <body className="min-h-full">
        <ThemeApplier />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
