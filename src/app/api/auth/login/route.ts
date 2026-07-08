import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createSession, setSessionCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }
    const user = await db.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
    if (user.status === 'SUSPENDED') {
      return NextResponse.json({ error: 'Account suspended. Contact admin.' }, { status: 403 })
    }
    const ok = await verifyPassword(password, user.password)
    if (!ok) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
    const token = await createSession({ userId: user.id, email: user.email, name: user.name, role: user.role as any })
    await setSessionCookie(token)
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, canCreateClass: user.canCreateClass, canCreateMeeting: user.canCreateMeeting } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
