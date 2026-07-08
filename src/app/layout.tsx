import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export const metadata: Metadata = {
  title: "لرن‌لایو — پلتفرم کلاس آنلاین ۲۰۲۶",
  description: "پلتفرم مدرن کلاس آنلاین با ویدیو کنفرانس، وایت‌برد تعاملی، اشتراک صفحه و چت واقعی.",
  keywords: ["کلاس آنلاین", "ویدیو کنفرانس", "وایت‌برد", "آموزش مجازی", "کلاس زنده"],
  authors: [{ name: "LearnLive" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body
        className={`${vazirmatn.variable} font-sans antialiased bg-background text-foreground`}
        style={{ fontFamily: 'var(--font-vazirmatn), system-ui, sans-serif' }}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
          <Toaster />
          <SonnerToaster richColors position="top-left" />
        </ThemeProvider>
      </body>
    </html>
  );
}
