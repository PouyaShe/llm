'use client'

import { useEffect } from 'react'
import { useApp } from '@/lib/store'
import { Landing } from '@/components/landing'
import { AuthScreen } from '@/components/auth/auth-screen'
import { Dashboard } from '@/components/dashboard/dashboard'
import { Classroom } from '@/components/classroom/classroom'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const { user, loading, view, setUser, setLoading } = useApp()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' })
        const data = await res.json()
        if (!cancelled) {
          if (data.user) setUser(data.user)
          else {
            setUser(null)
            setLoading(false)
          }
        }
      } catch {
        if (!cancelled) {
          setUser(null)
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (view === 'classroom' && user) {
    return <Classroom />
  }

  if (!user) {
    if (view === 'login' || view === 'register') return <AuthScreen />
    return <Landing />
  }

  return <Dashboard />
}
