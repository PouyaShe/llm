'use client'

import { useState } from 'react'
import { useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GraduationCap, ArrowRight, Loader2, User, Mail, Lock, ShieldCheck, BookOpen } from 'lucide-react'
import { toast } from 'sonner'

export function AuthScreen() {
  const { setView, setUser } = useApp()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [name, setName] = useState('')
  const [remail, setRemail] = useState('')
  const [rpassword, setRpassword] = useState('')
  const [role, setRole] = useState<'STUDENT' | 'TEACHER'>('STUDENT')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      setUser(data.user)
      toast.success(`خوش آمدید، ${data.user.name}!`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !remail || !rpassword) return
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: remail, password: rpassword, role }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registration failed')
      setUser(data.user)
      toast.success(`حساب ساخته شد. خوش آمدید، ${data.user.name}!`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  function fill(emailv: string, pass: string, m: 'login' | 'register') {
    setMode(m)
    setEmail(emailv)
    setPassword(pass)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background mesh-bg">
      <header className="px-4 sm:px-6 h-16 flex items-center">
        <Button variant="ghost" size="sm" onClick={() => setView('landing')} className="gap-1">
          <ArrowRight className="h-4 w-4" /> بازگشت
        </Button>
      </header>

      <div className="flex-1 grid place-items-center px-4 pb-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-6 animate-fade-in">
            <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground grid place-items-center font-bold mx-auto mb-3">
              <GraduationCap className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">به لرن‌لایو خوش آمدید</h1>
            <p className="text-sm text-muted-foreground mt-1">وارد کلاس خود شوید یا حساب جدید بسازید.</p>
          </div>

          <Card className="bg-card/80 backdrop-blur-xl">
            <CardHeader>
              <Tabs value={mode} onValueChange={(v) => setMode(v as 'login' | 'register')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">ورود</TabsTrigger>
                  <TabsTrigger value="register">ثبت‌نام</TabsTrigger>
                </TabsList>
                <TabsContent value="login" className="mt-6">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">ایمیل</Label>
                      <div className="relative">
                        <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@classroom.io" className="pr-9" autoComplete="email" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">رمز عبور</Label>
                      <div className="relative">
                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pr-9" autoComplete="current-password" />
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-11" disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ورود'}
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="register" className="mt-6">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">نام و نام خانوادگی</Label>
                      <div className="relative">
                        <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="نام شما" className="pr-9" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="remail">ایمیل</Label>
                      <div className="relative">
                        <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="remail" type="email" value={remail} onChange={(e) => setRemail(e.target.value)} placeholder="you@classroom.io" className="pr-9" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rpassword">رمز عبور</Label>
                      <div className="relative">
                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="rpassword" type="password" value={rpassword} onChange={(e) => setRpassword(e.target.value)} placeholder="••••••••" className="pr-9" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>می‌خواهم به‌عنوان</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setRole('STUDENT')}
                          className={`flex items-center gap-2 rounded-lg border p-3 text-right transition ${role === 'STUDENT' ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'}`}
                        >
                          <BookOpen className="h-4 w-4" />
                          <div>
                            <div className="text-sm font-medium">دانشجو</div>
                            <div className="text-xs text-muted-foreground">عضویت در کلاس‌ها</div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRole('TEACHER')}
                          className={`flex items-center gap-2 rounded-lg border p-3 text-right transition ${role === 'TEACHER' ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'}`}
                        >
                          <ShieldCheck className="h-4 w-4" />
                          <div>
                            <div className="text-sm font-medium">استاد</div>
                            <div className="text-xs text-muted-foreground">برگزاری کلاس</div>
                          </div>
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-11" disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ساخت حساب'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs">
                <p className="font-medium mb-2">ورود دموی سریع:</p>
                <div className="flex flex-wrap gap-1.5">
                  <Button type="button" variant="outline" size="sm" onClick={() => fill('admin@classroom.io', 'admin123', 'login')}>مدیر</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => fill('teacher@classroom.io', 'teacher123', 'login')}>استاد</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => fill('student@classroom.io', 'student123', 'login')}>دانشجو</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <footer className="mt-auto border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        لرن‌لایو © ۲۰۲۶ — پلتفرم امن کلاس آنلاین
      </footer>
    </div>
  )
}
