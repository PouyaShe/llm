import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, createSession, setSessionCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role } = await req.json()
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
    }
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }
    const finalRole = role === 'TEACHER' ? 'TEACHER' : 'STUDENT' // cannot self-register as ADMIN
    const hash = await hashPassword(password)
    const user = await db.user.create({
      data: { name, email, password: hash, role: finalRole, avatar: name.charAt(0).toUpperCase() },
    })
    const token = await createSession({ userId: user.id, email: user.email, name: user.name, role: user.role as any })
    await setSessionCookie(token)
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, canCreateClass: user.canCreateClass, canCreateMeeting: user.canCreateMeeting } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
