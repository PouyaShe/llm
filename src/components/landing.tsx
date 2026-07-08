'use client'

import { useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  GraduationCap,
  Video,
  PenLine,
  ScreenShare,
  MessageSquare,
  Users,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Moon,
  Sun,
  CheckCircle2,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

const features = [
  { icon: Video, title: 'ویدیو زنده تا ۶۴ نفر', desc: 'ویدیو و صدای HD چندکاربره با فشردن برای صحبت و تشخیص گوینده فعال.' },
  { icon: PenLine, title: 'وایت‌برد تعاملی', desc: 'بوم مشترک بلادرنگ که فوراً برای همه شرکت‌کنندگان همگام‌سازی می‌شود.' },
  { icon: ScreenShare, title: 'اشتراک صفحه', desc: 'کل صفحه یا تنها یک پنجره را با یک کلیک به اشتراک بگذارید.' },
  { icon: MessageSquare, title: 'چت و پیام خصوصی', desc: 'چت دائمی اتاق به‌همراه پیام خصوصی به استاد.' },
  { icon: Users, title: 'دسترسی مبتنی بر نقش', desc: 'پنل‌های مدیر، استاد و دانشجو با کنترل زنده دسترسی‌ها.' },
  { icon: ShieldCheck, title: 'امن به‌صورت پیش‌فرض', desc: 'رمزهای عبور هش‌شده، نشست‌های JWT و جریان‌های رسانه‌ای آماده برای TLS.' },
]

const stats = [
  { value: '64', label: 'شرکت‌کننده' },
  { value: '3', label: 'پنل نقش' },
  { value: '∞', label: 'کلاس' },
  { value: '2026', label: 'طراحی' },
]

export function Landing() {
  const { setView } = useApp()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <div className="min-h-screen flex flex-col bg-background mesh-bg">
      {/* Nav */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground grid place-items-center font-bold">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg tracking-tight">LearnLive</span>
            <span className="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/15 text-primary">2026</span>
          </div>
          <div className="flex items-center gap-2">
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label="تغییر تم"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            )}
            <Button variant="ghost" onClick={() => setView('login')}>
              ورود
            </Button>
            <Button onClick={() => setView('register')} className="gap-1">
              شروع کنید <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-16 sm:pt-24 pb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground mb-6 animate-fade-in">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            کلاس مدرن، بازطراحی‌شده برای ۲۰۲۶
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05] animate-fade-in">
            زنده آموزش بده. با هم یاد بگیر.
            <br />
            <span className="bg-gradient-to-r from-primary via-emerald-500 to-teal-400 bg-clip-text text-transparent">
              یک پلتفرم، کلاس‌های بی‌نهایت.
            </span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto animate-fade-in">
            ویدیو کنفرانس تا ۶۴ شرکت‌کننده، وایت‌برد تعاملی، اشتراک صفحه، چت واقعی و کنترل کامل مدیر/استاد/دانشجو — آماده برای استفاده عملیاتی.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in">
            <Button size="lg" onClick={() => setView('register')} className="gap-2 px-8 h-12 text-base">
              ساخت حساب کاربری <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => setView('login')} className="h-12 text-base px-8">
              قبلاً حساب دارم
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {stats.map((s) => (
              <Card key={s.label} className="p-4 bg-card/60 backdrop-blur">
                <div className="text-3xl font-bold text-primary">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </Card>
            ))}
          </div>

          {/* Demo accounts hint */}
          <div className="mt-8 inline-flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/50 px-2.5 py-1">
              <CheckCircle2 className="h-3 w-3 text-primary" /> دمو: admin@classroom.io / admin123
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/50 px-2.5 py-1">
              <CheckCircle2 className="h-3 w-3 text-primary" /> teacher@classroom.io / teacher123
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/50 px-2.5 py-1">
              <CheckCircle2 className="h-3 w-3 text-primary" /> student@classroom.io / student123
            </span>
          </div>
        </div>

        {/* Features */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pb-20">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <Card
                key={f.title}
                className="p-6 bg-card/60 backdrop-blur hover:border-primary/40 hover:shadow-lg transition-all animate-fade-in"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary grid place-items-center mb-4">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg">{f.title}</h3>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/60 bg-card/40 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <span>لرن‌لایو — پلتفرم کلاس آنلاین</span>
          </div>
          <p>ساخته‌شده با Next.js 16، WebRTC، Socket.io و Prisma.</p>
        </div>
      </footer>
    </div>
  )
}
