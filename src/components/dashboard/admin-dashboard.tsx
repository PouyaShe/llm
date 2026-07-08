'use client'

import { useEffect, useState } from 'react'
import { DashboardShell, StatCard, type NavItem } from './shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LayoutDashboard, Users, BookOpen, CalendarDays, Video, ShieldCheck, UserCheck, MessageSquare, Radio, Plus, Search, VideoOff, Lock, UserPlus, Mail } from 'lucide-react'
import { useApp } from '@/lib/store'
import { toast } from 'sonner'
import { colorOf, fmtDate, timeAgo } from '@/lib/ui'
import { Messenger } from '@/components/messenger/messenger'

const nav: NavItem[] = [
  { id: 'overview', label: 'نمای کلی', icon: LayoutDashboard },
  { id: 'users', label: 'کاربران', icon: Users },
  { id: 'classes', label: 'کلاس‌ها', icon: BookOpen },
  { id: 'sessions', label: 'جلسات', icon: CalendarDays },
  { id: 'messenger', label: 'پیام‌رسان', icon: Mail },
]

interface UserRow {
  id: string
  name: string
  email: string
  role: string
  avatar: string | null
  status: string
  canCreateClass: boolean
  canCreateMeeting: boolean
  createdAt: string
}

interface Stats {
  totalUsers: number
  teachers: number
  students: number
  admins: number
  totalCourses: number
  totalSessions: number
  liveSessions: number
  totalMessages: number
  recordings: number
}

export function AdminDashboard() {
  const { enterClassroom } = useApp()
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentUsers, setRecentUsers] = useState<UserRow[]>([])
  const [recentSessions, setRecentSessions] = useState<any[]>([])
  const [users, setUsers] = useState<UserRow[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [enrollOpen, setEnrollOpen] = useState<string | null>(null)
  const [courseStudents, setCourseStudents] = useState<any[]>([])

  const [nu, setNu] = useState({ name: '', email: '', password: '', role: 'STUDENT' })

  async function loadStats() {
    const res = await fetch('/api/stats')
    if (res.ok) {
      const d = await res.json()
      setStats(d.stats)
      setRecentUsers(d.recentUsers)
      setRecentSessions(d.recentSessions)
    }
  }
  async function loadUsers() {
    const res = await fetch('/api/users')
    if (res.ok) setUsers((await res.json()).users)
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
    loadStats()
    loadUsers()
    loadCourses()
    loadSessions()
  }, [])

  async function updateUser(id: string, patch: Partial<UserRow>) {
    const res = await fetch(`/api/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
    if (res.ok) {
      const { user } = await res.json()
      setUsers((prev) => prev.map((u) => (u.id === id ? user : u)))
      toast.success('کاربر به‌روزرسانی شد')
    }
  }

  async function createUser() {
    const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nu) })
    if (res.ok) {
      toast.success('کاربر ساخته شد')
      setCreateOpen(false)
      setNu({ name: '', email: '', password: '', role: 'STUDENT' })
      loadUsers()
      loadStats()
    } else {
      const d = await res.json()
      toast.error(d.error || 'خطا')
    }
  }

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

  const filteredUsers = users.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))

  const roleLabel = (r: string) => r === 'ADMIN' ? 'مدیر' : r === 'TEACHER' ? 'استاد' : 'دانشجو'

  return (
    <DashboardShell nav={nav} active={tab} onNavigate={setTab} title="مرکز کنترل مدیر" badge="مدیریت کاربران، کلاس‌ها و جلسات زنده">
      {tab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Users} label="کل کاربران" value={stats?.totalUsers ?? '—'} accent="primary" />
            <StatCard icon={ShieldCheck} label="اساتید" value={stats?.teachers ?? '—'} accent="violet" />
            <StatCard icon={UserCheck} label="دانشجویان" value={stats?.students ?? '—'} accent="emerald" />
            <StatCard icon={Radio} label="اکنون زنده" value={stats?.liveSessions ?? '—'} accent="rose" />
            <StatCard icon={BookOpen} label="کلاس‌ها" value={stats?.totalCourses ?? '—'} accent="cyan" />
            <StatCard icon={CalendarDays} label="جلسات" value={stats?.totalSessions ?? '—'} accent="amber" />
            <StatCard icon={MessageSquare} label="پیام‌ها" value={stats?.totalMessages ?? '—'} accent="primary" />
            <StatCard icon={Video} label="ضبط‌ها" value={stats?.recordings ?? '—'} accent="violet" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">کاربران اخیر</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {recentUsers.length === 0 && <p className="text-sm text-muted-foreground">هنوز کاربری نیست.</p>}
                {recentUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/15 text-primary text-xs">{u.avatar || u.name[0]}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{u.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                    </div>
                    <Badge variant="secondary" className="text-xs">{roleLabel(u.role)}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">جلسات اخیر</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {recentSessions.length === 0 && <p className="text-sm text-muted-foreground">هنوز جلسه‌ای نیست.</p>}
                {recentSessions.map((s) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg grid place-items-center ${colorOf(s.course?.color).bg}`}>
                      <Video className={`h-4 w-4 ${colorOf(s.course?.color).text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{s.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{s.course?.title}</div>
                    </div>
                    <Badge variant={s.status === 'LIVE' ? 'default' : 'secondary'} className="text-xs">{s.status === 'LIVE' ? 'زنده' : s.status === 'ENDED' ? 'پایان' : 'زمان‌بندی'}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="جستجوی کاربران..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> کاربر جدید</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>ساخت کاربر</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5"><Label>نام</Label><Input value={nu.name} onChange={(e) => setNu({ ...nu, name: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>ایمیل</Label><Input value={nu.email} onChange={(e) => setNu({ ...nu, email: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>رمز عبور</Label><Input value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>نقش</Label>
                    <Select value={nu.role} onValueChange={(v) => setNu({ ...nu, role: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STUDENT">دانشجو</SelectItem>
                        <SelectItem value="TEACHER">استاد</SelectItem>
                        <SelectItem value="ADMIN">مدیر</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter><Button onClick={createUser}>ساخت</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[70vh] scroll-thin">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>کاربر</TableHead>
                      <TableHead>نقش</TableHead>
                      <TableHead>وضعیت</TableHead>
                      <TableHead>دسترسی استاد</TableHead>
                      <TableHead>عضویت</TableHead>
                      <TableHead className="text-left">عملیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/15 text-primary text-xs">{u.avatar || u.name[0]}</AvatarFallback></Avatar>
                            <div>
                              <div className="text-sm font-medium">{u.name}</div>
                              <div className="text-xs text-muted-foreground">{u.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select value={u.role} onValueChange={(v) => updateUser(u.id, { role: v })}>
                            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="STUDENT">دانشجو</SelectItem>
                              <SelectItem value="TEACHER">استاد</SelectItem>
                              <SelectItem value="ADMIN">مدیر</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.status === 'ACTIVE' ? 'default' : 'destructive'} className="text-xs">{u.status === 'ACTIVE' ? 'فعال' : 'معلق'}</Badge>
                        </TableCell>
                        <TableCell>
                          {u.role === 'TEACHER' ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs flex items-center gap-1"><BookOpen className="h-3 w-3" /> ساخت کلاس</span>
                                <Switch checked={u.canCreateClass} onCheckedChange={(v) => updateUser(u.id, { canCreateClass: v })} />
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs flex items-center gap-1"><Video className="h-3 w-3" /> برگزاری جلسه</span>
                                <Switch checked={u.canCreateMeeting} onCheckedChange={(v) => updateUser(u.id, { canCreateMeeting: v })} />
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{timeAgo(u.createdAt)}</TableCell>
                        <TableCell className="text-left">
                          <Button variant="ghost" size="sm" onClick={() => updateUser(u.id, { status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' })}>
                            {u.status === 'ACTIVE' ? 'تعلیق' : 'فعال‌سازی'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'classes' && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                      <span>{c._count?.sessions || 0} جلسه</span>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">توسط {c.teacher?.name}</div>
                    <Button size="sm" variant="outline" className="w-full mt-3 gap-1.5" onClick={() => openEnrollment(c.id)}>
                      <UserPlus className="h-3.5 w-3.5" /> مدیریت دانشجویان
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
            {courses.length === 0 && <p className="text-sm text-muted-foreground col-span-full">هنوز کلاسی نیست.</p>}
          </div>

          {/* Enrollment management dialog */}
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
        </div>
      )}

      {tab === 'sessions' && (
        <div className="space-y-4 animate-fade-in">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[70vh] scroll-thin">
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
                        <TableCell><Badge variant={s.status === 'LIVE' ? 'default' : 'secondary'} className="text-xs">{s.status === 'LIVE' ? 'زنده' : s.status === 'ENDED' ? 'پایان' : 'زمان‌بندی'}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtDate(s.scheduledAt)}</TableCell>
                        <TableCell className="text-left">
                          <Button size="sm" variant="outline" onClick={() => enterClassroom(s.id, s.courseId)}>ورود</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {sessions.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">هنوز جلسه‌ای نیست.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'messenger' && <Messenger />}
    </DashboardShell>
  )
}
