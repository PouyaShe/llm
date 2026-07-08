'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { GraduationCap, LogOut, Moon, Sun, Menu, X } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

export interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export function DashboardShell({
  nav,
  active,
  onNavigate,
  title,
  badge,
  children,
}: {
  nav: NavItem[]
  active: string
  onNavigate: (id: string) => void
  title: string
  badge?: string
  children: React.ReactNode
}) {
  const { user, logout } = useApp()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  useEffect(() => setMounted(true), [])

  const roleColor =
    user?.role === 'ADMIN' ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
    : user?.role === 'TEACHER' ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400'
    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'

  const roleLabel = user?.role === 'ADMIN' ? 'مدیر' : user?.role === 'TEACHER' ? 'استاد' : 'دانشجو'

  return (
    <div className="min-h-screen flex flex-col bg-background" dir="rtl">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:flex w-64 shrink-0 flex-col border-l border-border/60 bg-sidebar">
          <div className="h-16 flex items-center gap-2 px-5 border-b border-border/60">
            <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground grid place-items-center">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold leading-tight">لرن‌لایو</div>
              <div className="text-[10px] text-muted-foreground leading-tight">کلاس آنلاین ۲۰۲۶</div>
            </div>
          </div>
          <nav className="flex-1 p-3 space-y-1">
            {nav.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                  active === item.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
          <div className="p-3 border-t border-border/60">
            <div className="flex items-center gap-2 rounded-lg p-2">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/15 text-primary font-semibold">
                  {user?.avatar || user?.name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{user?.name}</div>
                <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={logout} className="w-full mt-1 gap-2 text-muted-foreground">
              <LogOut className="h-4 w-4" /> خروج
            </Button>
          </div>
        </aside>

        {/* Mobile sidebar */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
            <aside className="relative w-64 bg-sidebar border-l border-border flex flex-col animate-fade-in">
              <div className="h-16 flex items-center justify-between px-5 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground grid place-items-center">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <span className="font-bold">لرن‌لایو</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <nav className="flex-1 p-3 space-y-1">
                {nav.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { onNavigate(item.id); setMobileOpen(false) }}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                      active === item.id ? 'bg-primary text-primary-foreground' : 'hover:bg-sidebar-accent'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                ))}
              </nav>
              <div className="p-3 border-t border-border/60">
                <Button variant="ghost" size="sm" onClick={logout} className="w-full gap-2">
                  <LogOut className="h-4 w-4" /> خروج
                </Button>
              </div>
            </aside>
          </div>
        )}

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 shrink-0 border-b border-border/60 bg-background/80 backdrop-blur flex items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold leading-tight">{title}</h1>
                {badge && <p className="text-xs text-muted-foreground">{badge}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn('hidden sm:inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', roleColor)}>
                {roleLabel}
              </span>
              {mounted && (
                <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                  {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
              )}
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/15 text-primary font-semibold">
                  {user?.avatar || user?.name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto scroll-thin p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

export function StatCard({ icon: Icon, label, value, accent = 'primary' }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; accent?: string }) {
  const accents: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    rose: 'bg-rose-500/10 text-rose-500',
    violet: 'bg-violet-500/10 text-violet-500',
    amber: 'bg-amber-500/10 text-amber-500',
    emerald: 'bg-emerald-500/10 text-emerald-500',
    cyan: 'bg-cyan-500/10 text-cyan-500',
  }
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className={cn('h-9 w-9 rounded-lg grid place-items-center', accents[accent])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight">{value}</div>
    </div>
  )
}
