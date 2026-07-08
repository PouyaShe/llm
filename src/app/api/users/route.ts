import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const users = await db.user.findMany({
    select: { id: true, name: true, email: true, role: true, avatar: true, status: true, canCreateClass: true, canCreateMeeting: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ users })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const { name, email, password, role } = await req.json()
    const { hashPassword } = await import('@/lib/auth')
    const hash = await hashPassword(password)
    const user = await db.user.create({
      data: { name, email, password: hash, role, avatar: name.charAt(0).toUpperCase() },
      select: { id: true, name: true, email: true, role: true, avatar: true, status: true, canCreateClass: true, canCreateMeeting: true, createdAt: true },
    })
    return NextResponse.json({ user })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
