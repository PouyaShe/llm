import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// List users that the current admin/teacher can DM (other admins + teachers, not students, not self)
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const users = await db.user.findMany({
    where: {
      role: { in: ['ADMIN', 'TEACHER'] },
      id: { not: session.userId },
      status: 'ACTIVE',
    },
    select: { id: true, name: true, email: true, role: true, avatar: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ users })
}
