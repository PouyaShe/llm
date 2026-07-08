'use client'

import { useEffect, useState } from 'react'
import { DashboardShell, StatCard, type NavItem } from './shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { LayoutDashboard, BookOpen, CalendarDays, KeyRound, Play, Video, Users } from 'lucide-react'
import { useApp } from '@/lib/store'
import { toast } from 'sonner'
import { colorOf, fmtDate } from '@/lib/ui'

const nav: NavItem[] = [
  { id: 'overview', label: 'نمای کلی', icon: LayoutDashboard },
  { id: 'classes', label: 'کلاس‌های من', icon: BookOpen },
  { id: 'sessions', label: 'جلسات زنده', icon: CalendarDays },
]

export function StudentDashboard() {
  const { enterClassroom } = useApp()
  const [tab, setTab] = useState('overview')
  const [courses, setCourses] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [joinOpen, setJoinOpen] = useState(false)
  const [code, setCode] = useState('')

  async function loadCourses() {
    const res = await fetch('/api/courses')
    if (res.ok) setCourses((await res.json()).courses)
  }
  async function loadSessions() {
    const res = await fetch('/api/sessions')
    if (res.ok) setSessions((await res.json()).sessions)
  }
  useEffect(() => {
    loadCourses()
    loadSessions()
  }, [])

  async function joinByCode() {
    const res = await fetch('/api/courses/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) })
    if (res.ok) {
      const d = await res.json()
      toast.success(`به ${d.course.title} پیوستید`)
      setJoinOpen(false)
      setCode('')
      loadCourses()
    } else {
      const d = await res.json(); toast.error(d.error || 'کد نامعتبر')
    }
  }

  async function joinSession(s: any) {
    enterClassroom(s.id, s.courseId)
  }

  const liveSessions = sessions.filter((s) => s.status === 'LIVE')

  return (
    <DashboardShell nav={nav} active={tab} onNavigate={setTab} title="پنل دانشجو" badge="در کلاس‌ها عضو شوید و در جلسات زنده شرکت کنید">
      {tab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard icon={BookOpen} label="کلاس‌های من" value={courses.length} accent="primary" />
            <StatCard icon={CalendarDays} label="جلسات" value={sessions.length} accent="violet" />
            <StatCard icon={Video} label="اکنون زنده" value={liveSessions.length} accent="rose" />
            <StatCard icon={Users} label="همکلاسی‌ها" value="—" accent="emerald" />
          </div>
          {liveSessions.length > 0 && (
            <Card className="border-rose-500/30 bg-rose-500/5">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Video className="h-4 w-4 text-rose-500" /> اکنون زنده</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {liveSessions.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-3">
                    <div className={`h-9 w-9 rounded-lg grid place-items-center ${colorOf(s.course?.color).bg}`}><Video className={`h-4 w-4 ${colorOf(s.course?.color).text}`} /></div>
                    <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{s.title}</div><div className="text-xs text-muted-foreground truncate">{s.course?.title}</div></div>
                    <Button size="sm" className="gap-1" onClick={() => joinSession(s)}><Play className="h-3.5 w-3.5" /> پیوستن</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle className="text-base">کلاس‌های اخیر</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {courses.slice(0, 4).map((c) => {
                const col = colorOf(c.color)
                return (
                  <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
                    <div className={`h-9 w-9 rounded-lg grid place-items-center ${col.bg}`}><BookOpen className={`h-4 w-4 ${col.text}`} /></div>
                    <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{c.title}</div><div className="text-xs text-muted-foreground">توسط {c.teacher?.name}</div></div>
                  </div>
                )
              })}
              {courses.length === 0 && <p className="text-sm text-muted-foreground">برای شروع با یک کد در کلاسی عضو شوید.</p>}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'classes' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-end">
            <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
              <DialogTrigger asChild><Button className="gap-2"><KeyRound className="h-4 w-4" /> عضویت با کد</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>عضویت در کلاس</DialogTitle></DialogHeader>
                <div className="space-y-1.5">
                  <Label>کد کلاس</Label>
                  <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="MATH101" className="font-mono uppercase" />
                  <p className="text-xs text-muted-foreground">کد کلاس را از استاد خود بگیرید.</p>
                </div>
                <DialogFooter><Button onClick={joinByCode} disabled={!code}>پیوستن</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => {
              const col = colorOf(c.color)
              return (
                <Card key={c.id} className="overflow-hidden">
                  <div className={`h-1.5 ${col.dot}`} />
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className={`h-10 w-10 rounded-lg grid place-items-center ${col.bg}`}><BookOpen className={`h-5 w-5 ${col.text}`} /></div>
                      <Badge variant="secondary" className="text-xs font-mono">{c.code}</Badge>
                    </div>
                    <h3 className="font-semibold mt-3 line-clamp-1">{c.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <Avatar className="h-6 w-6"><AvatarFallback className="bg-primary/15 text-primary text-[10px]">{c.teacher?.avatar || c.teacher?.name?.[0]}</AvatarFallback></Avatar>
                      <span className="text-xs text-muted-foreground">{c.teacher?.name}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            {courses.length === 0 && <p className="text-sm text-muted-foreground col-span-full">هنوز در کلاسی عضو نشده‌اید.</p>}
          </div>
        </div>
      )}

      {tab === 'sessions' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in">
          {sessions.map((s) => {
            const col = colorOf(s.course?.color)
            const live = s.status === 'LIVE'
            return (
              <Card key={s.id} className={`overflow-hidden ${live ? 'border-rose-500/40' : ''}`}>
                <div className={`h-1.5 ${col.dot}`} />
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className={`h-10 w-10 rounded-lg grid place-items-center ${col.bg}`}><Video className={`h-5 w-5 ${col.text}`} /></div>
                    {live ? <Badge className="text-xs gap-1 bg-rose-500"><span className="h-1.5 w-1.5 rounded-full bg-white rec-pulse" /> زنده</Badge> : <Badge variant="secondary" className="text-xs">{s.status}</Badge>}
                  </div>
                  <h3 className="font-semibold mt-3 line-clamp-1">{s.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{s.course?.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{fmtDate(s.scheduledAt)}</p>
                  <Button size="sm" className="w-full mt-3 gap-1" variant={live ? 'default' : 'outline'} onClick={() => joinSession(s)} disabled={s.status === 'ENDED'}>
                    <Play className="h-3.5 w-3.5" /> {live ? 'پیوستن' : s.status === 'ENDED' ? 'پایان‌یافته' : 'ورود'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
          {sessions.length === 0 && <p className="text-sm text-muted-foreground col-span-full">جلسه‌ای موجود نیست.</p>}
        </div>
      )}
    </DashboardShell>
  )
}
