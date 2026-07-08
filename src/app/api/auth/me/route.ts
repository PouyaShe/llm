import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ user: null })
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true, avatar: true, status: true, canCreateClass: true, canCreateMeeting: true },
  })
  if (!user) return NextResponse.json({ user: null })
  return NextResponse.json({ user })
}
