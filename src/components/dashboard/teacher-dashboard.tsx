'use client'

import { useEffect, useState } from 'react'
import { DashboardShell, StatCard, type NavItem } from './shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LayoutDashboard, BookOpen, CalendarDays, Users, Radio, Plus, Play, ShieldAlert, Lock, UserPlus, Mail } from 'lucide-react'
import { useApp } from '@/lib/store'
import { toast } from 'sonner'
import { colorOf, fmtDate } from '@/lib/ui'
import { Messenger } from '@/components/messenger/messenger'

const nav: NavItem[] = [
  { id: 'overview', label: 'نمای کلی', icon: LayoutDashboard },
  { id: 'classes', label: 'کلاس‌های من', icon: BookOpen },
  { id: 'sessions', label: 'جلسات', icon: CalendarDays },
  { id: 'students', label: 'دانشجویان', icon: Users },
  { id: 'messenger', label: 'پیام‌رسان', icon: Mail },
]

const colorOptions = ['emerald', 'teal', 'rose', 'amber', 'violet', 'cyan']

export function TeacherDashboard() {
  const { user, enterClassroom } = useApp()
  const canCreateClass = user?.role === 'ADMIN' || user?.canCreateClass !== false
  const canCreateMeeting = user?.role === 'ADMIN' || user?.canCreateMeeting !== false

  const [tab, setTab] = useState('overview')
  const [courses, setCourses] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [allStudents, setAllStudents] = useState<any[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [sessionOpen, setSessionOpen] = useState(false)
  const [enrollOpen, setEnrollOpen] = useState<string | null>(null)
  const [courseStudents, setCourseStudents] = useState<any[]>([])
  const [form, setForm] = useState({ title: '', description: '', color: 'emerald' })
  const [sForm, setSForm] = useState({ courseId: '', title: '', description: '' })

  async function openEnrollment(courseId: string) {
    setEnrollOpen(courseId)
    const res = await fetch(`/api/courses/${courseId}/students`)
    if (res.ok) setCourseStudents((await res.json()).students)
  }
  async function toggleEnroll(studentId: string, enrolled: boolean) {
    if (!enrollOpen) return
    if (enrolled) {
      await fetch(`/api/courses/${enrollOpen}/enrollments?studentId=${studentId}`, { method: 'DELETE' })
      setCourseStudents((prev) => prev.map((s) => (s.id === studentId ? { ...s, enrolled: false } : s)))
      toast.success('دانشجو حذف شد')
    } else {
      await fetch(`/api/courses/${enrollOpen}/enrollments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId }) })
      setCourseStudents((prev) => prev.map((s) => (s.id === studentId ? { ...s, enrolled: true } : s)))
      toast.success('دانشجو اضافه شد')
    }
    loadCourses()
  }

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

  // gather students from course details
  useEffect(() => {
    (async () => {
      const list: any[] = []
      for (const c of courses) {
        const res = await fetch(`/api/courses/${c.id}`)
        if (res.ok) {
          const d = await res.json()
          d.course.enrollments.forEach((e: any) => list.push({ ...e.student, course: c.title }))
        }
      }
      setAllStudents(list)
    })()
  }, [courses])

  async function createCourse() {
    const res = await fetch('/api/courses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) {
      toast.success('کلاس ساخته شد')
      setCreateOpen(false)
      setForm({ title: '', description: '', color: 'emerald' })
      loadCourses()
    } else {
      const d = await res.json(); toast.error(d.error)
    }
  }

  async function createSession() {
    const res = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courseId: sForm.courseId, title: sForm.title, description: sForm.description, scheduledAt: new Date().toISOString() }) })
    if (res.ok) {
      toast.success('جلسه زمان‌بندی شد')
      setSessionOpen(false)
      setSForm({ courseId: '', title: '', description: '' })
      loadSessions()
    }
  }

  async function startSession(sessionId: string, courseId: string) {
    if (!canCreateMeeting) {
      toast.error('شما اجازه برگزاری جلسه ندارید')
      return
    }
    const res = await fetch(`/api/sessions/${sessionId}/start`, { method: 'POST' })
    if (res.ok) {
      enterClassroom(sessionId, courseId)
    } else {
      toast.error('شروع ناموفق بود')
    }
  }

  const liveCount = sessions.filter((s) => s.status === 'LIVE').length

  const permissionBlocked = !canCreateClass || !canCreateMeeting

  return (
    <DashboardShell nav={nav} active={tab} onNavigate={setTab} title="استودیوی استاد" badge="کلاس‌ها را برگزار کنید و دانشجویان را مدیریت کنید">
      {tab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard icon={BookOpen} label="کلاس‌های من" value={courses.length} accent="primary" />
            <StatCard icon={Users} label="کل دانشجویان" value={allStudents.length} accent="emerald" />
            <StatCard icon={CalendarDays} label="جلسات" value={sessions.length} accent="violet" />
            <StatCard icon={Radio} label="اکنون زنده" value={liveCount} accent="rose" />
          </div>

          {permissionBlocked && (
            <Card className="border-amber-500/40 bg-amber-500/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 grid place-items-center shrink-0">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">دسترسی شما توسط مدیر محدود شده است</p>
                    <p className="text-xs text-muted-foreground mt-1">اقدامات زیر غیرفعال شده‌اند:</p>
                    <ul className="mt-2 flex flex-wrap gap-2 text-xs">
                      {!canCreateClass && (
                        <li className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-700 dark:text-amber-300">
                          <Lock className="h-3 w-3" /> ساخت کلاس
                        </li>
                      )}
                      {!canCreateMeeting && (
                        <li className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-700 dark:text-amber-300">
                          <Lock className="h-3 w-3" /> برگزاری جلسه
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">اقدامات سریع</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Dialog open={createOpen} onOpenChange={(o) => { if (canCreateClass) setCreateOpen(o) }}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={canCreateClass ? -1 : 0} className="inline-flex">
                      <DialogTrigger asChild>
                        <Button className="gap-2" disabled={!canCreateClass}>
                          <Plus className="h-4 w-4" /> ساخت کلاس
                          {!canCreateClass && <Lock className="h-3.5 w-3.5" />}
                        </Button>
                      </DialogTrigger>
                    </span>
                  </TooltipTrigger>
                  {!canCreateClass && (
                    <TooltipContent>نیاز به اجازه مدیر</TooltipContent>
                  )}
                </Tooltip>
                <DialogContent>
                  <DialogHeader><DialogTitle>ساخت کلاس جدید</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-1.5"><Label>عنوان</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="ریاضیات ۱۰۱" /></div>
                    <div className="space-y-1.5"><Label>توضیحات</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="این کلاس درباره چیست؟" /></div>
                    <div className="space-y-1.5"><Label>رنگ</Label>
                      <div className="flex gap-2 flex-wrap">
                        {colorOptions.map((c) => (
                          <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} className={`h-8 w-8 rounded-full ${colorOf(c).dot} ${form.color === c ? 'ring-2 ring-offset-2 ring-offset-background ring-primary' : ''}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter><Button onClick={createCourse}>ساخت</Button></DialogFooter>
                </DialogContent>
              </Dialog>
              <Dialog open={sessionOpen} onOpenChange={(o) => { if (canCreateMeeting) setSessionOpen(o) }}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={canCreateMeeting ? -1 : 0} className="inline-flex">
                      <DialogTrigger asChild>
                        <Button variant="outline" className="gap-2" disabled={!canCreateMeeting}>
                          <CalendarDays className="h-4 w-4" /> زمان‌بندی جلسه
                          {!canCreateMeeting && <Lock className="h-3.5 w-3.5" />}
                        </Button>
                      </DialogTrigger>
                    </span>
                  </TooltipTrigger>
                  {!canCreateMeeting && (
                    <TooltipContent>نیاز به اجازه مدیر</TooltipContent>
                  )}
                </Tooltip>
                <DialogContent>
                  <DialogHeader><DialogTitle>زمان‌بندی جلسه زنده</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-1.5"><Label>کلاس</Label>
                      <Select value={sForm.courseId} onValueChange={(v) => setSForm({ ...sForm, courseId: v })}>
                        <SelectTrigger><SelectValue placeholder="انتخاب کلاس" /></SelectTrigger>
                        <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5"><Label>عنوان جلسه</Label><Input value={sForm.title} onChange={(e) => setSForm({ ...sForm, title: e.target.value })} placeholder="زنده: حد و پیوستگی" /></div>
                    <div className="space-y-1.5"><Label>توضیحات</Label><Textarea value={sForm.description} onChange={(e) => setSForm({ ...sForm, description: e.target.value })} /></div>
                  </div>
                  <DialogFooter><Button onClick={createSession} disabled={!sForm.courseId || !sForm.title}>زمان‌بندی و آماده‌سازی</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'classes' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in">
            {courses.map((c) => {
              const col = colorOf(c.color)
              return (
                <Card key={c.id} className="overflow-hidden">
                  <div className={`h-1.5 ${col.dot}`} />
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className={`h-10 w-10 rounded-lg grid place-items-center ${col.bg}`}>
                        <BookOpen className={`h-5 w-5 ${col.text}`} />
                      </div>
                      <Badge variant="secondary" className="text-xs font-mono">{c.code}</Badge>
                    </div>
                    <h3 className="font-semibold mt-3 line-clamp-1">{c.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{c._count?.enrollments || 0} دانشجو</span>
                      <span>{c._count?.sessions || 0} جلسات</span>
                    </div>
                    <Button size="sm" variant="outline" className="w-full mt-3 gap-1.5" onClick={() => openEnrollment(c.id)}>
                      <UserPlus className="h-3.5 w-3.5" /> مدیریت دانشجویان
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
            {courses.length === 0 && <p className="text-sm text-muted-foreground">هنوز کلاسی نیست. اولین کلاس خود را بسازید.</p>}
          </div>

          <Dialog open={!!enrollOpen} onOpenChange={(o) => !o && setEnrollOpen(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>مدیریت دسترسی دانشجویان</DialogTitle></DialogHeader>
              <p className="text-xs text-muted-foreground">دانشجویان فقط کلاس‌هایی را می‌بینند که برایشان تعریف شده است.</p>
              <ScrollArea className="max-h-96 scroll-thin -mx-2 px-2">
                <div className="space-y-1">
                  {courseStudents.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 rounded-lg p-2 hover:bg-accent/50">
                      <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/15 text-primary text-xs">{s.avatar || s.name[0]}</AvatarFallback></Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{s.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{s.email}</div>
                      </div>
                      <Switch checked={s.enrolled} onCheckedChange={(v) => toggleEnroll(s.id, v)} />
                    </div>
                  ))}
                  {courseStudents.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">دانشجویی موجود نیست.</p>}
                </div>
              </ScrollArea>
              <DialogFooter><Button onClick={() => setEnrollOpen(null)}>اتمام</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      {tab === 'sessions' && (
        <Card className="animate-fade-in">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>جلسه</TableHead>
                  <TableHead>کلاس</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead>زمان‌بندی</TableHead>
                  <TableHead className="text-left">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.title}</TableCell>
                    <TableCell className="text-sm">{s.course?.title}</TableCell>
                    <TableCell><Badge variant={s.status === 'LIVE' ? 'default' : 'secondary'} className="text-xs">{s.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(s.scheduledAt)}</TableCell>
                    <TableCell className="text-left">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex" tabIndex={canCreateMeeting ? -1 : 0}>
                            <Button size="sm" className="gap-1" disabled={!canCreateMeeting} onClick={() => startSession(s.id, s.courseId)}>
                              <Play className="h-3.5 w-3.5" /> {s.status === 'LIVE' ? 'ورود' : 'شروع'}
                              {!canCreateMeeting && <Lock className="h-3 w-3" />}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {!canCreateMeeting && (
                          <TooltipContent>نیاز به اجازه مدیر</TooltipContent>
                        )}
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {sessions.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">هنوز جلسه‌ای نیست.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === 'students' && (
        <Card className="animate-fade-in">
          <CardHeader><CardTitle className="text-base">دانشجویان ثبت‌نامی</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>دانشجو</TableHead>
                  <TableHead>ایمیل</TableHead>
                  <TableHead>کلاس</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allStudents.map((s, i) => (
                  <TableRow key={s.id + i}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/15 text-primary text-xs">{s.avatar || s.name[0]}</AvatarFallback></Avatar>
                        <span className="text-sm font-medium">{s.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.email}</TableCell>
                    <TableCell className="text-sm">{s.course}</TableCell>
                  </TableRow>
                ))}
                {allStudents.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-8">هنوز دانشجویی ثبت‌نام نکرده است.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === 'messenger' && <Messenger />}
    </DashboardShell>
  )
}
